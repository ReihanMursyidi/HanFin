"use server";

import { Type, type FunctionDeclaration, type Content } from "@google/genai";
import { revalidatePath } from "next/cache";
import { createAI } from "@/features/ai/instance";
import {
  createMarketTransaction,
  deleteMarketTransaction,
  getMarketTransactions,
} from "./action";
import {
  CRYPTO_ASSETS,
  STOCK_ASSETS,
  type AssetType,
  type Currency,
} from "@/constants/market-constant";
import { convertCurrency } from "@/lib/format";
import {
  getCryptoMarketData,
  getExchangeRateUSDIDR,
  getStockMarketData,
} from "./market-data";
import { createClient } from "@/lib/supabase/server";

const AI_MODEL = "gemini-3-flash-preview";

// ==========================================
// FUNCTION DECLARATIONS UNTUK AI TOOL CALLING
// ==========================================

const createMarketTransactionDeclaration: FunctionDeclaration = {
  name: "create_market_transaction",
  description:
    "Mencatat transaksi pasar baru (Beli atau Jual saham/crypto). Panggil fungsi ini jika pengguna ingin membeli atau menjual aset.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description:
          "Simbol aset ringkas (contoh: BBCA, BBRI, BMRI, TLKM, BTC, ETH, SOL, BNB).",
      },
      transaction_type: {
        type: Type.STRING,
        enum: ["buy", "sell"],
        description:
          "Tipe transaksi: 'buy' untuk beli/entry/dca, atau 'sell' untuk jual/tp/cut loss.",
      },
      quantity: {
        type: Type.NUMBER,
        description:
          "Jumlah kuantitas aset. Untuk Saham Indonesia, jika pengguna sebut 'lot', KONVERSI KE LEMBAR (1 lot = 100 lembar). Untuk Crypto, masukan jumlah unit asli (misal: 0.05).",
      },
      price_per_unit: {
        type: Type.NUMBER,
        description:
          "Harga per unit/lembar murni. Jika pengguna TIDAK menyebutkan harga di dalam instruksi, isi dengan angka 0.",
      },
      notes: {
        type: Type.STRING,
        description: "Catatan opsional transaksi.",
      },
    },
    required: ["symbol", "transaction_type", "quantity"],
  },
};

const deleteMarketTransactionDeclaration = {
  name: "delete_market_transaction",
  description: "Menghapus transaksi pasar terakhir berdasarkan simbol aset.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "Simbol aset yang transaksinya ingin dihapus.",
      },
    },
    required: ["symbol"],
  },
};

// ==========================================
// MAIN WIZARD HANDLER
// ==========================================
export async function MarketWizardTransaction(
  promptText: string,
  assetType: AssetType,
  userCurrency: Currency = "IDR",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (!promptText || promptText.trim().length === 0) {
    throw new Error("Perintah transaksi tidak boleh kosong.");
  }

  const assetOptions = assetType === "stocks" ? STOCK_ASSETS : CRYPTO_ASSETS;
  const assetListText = assetOptions
    .map((a) => `${a.shortSymbol} (${a.name})`)
    .join(", ");

  const prompt = `
    <role>
      Financial Market Transaction Parser Agent.
    </role>
    <instruction>
      Extract structured financial market transaction data (${assetType.toUpperCase()}) from the user's natural language input.
      Return ONLY a valid JSON object without any additional text or markdown formatting.
    </instruction>
    <context>
      - Target Asset Class: ${assetType.toUpperCase()}
      - Valid Assets: [${assetListText}]
      - Default Currency: ${userCurrency}
    </context>
    <input>
      ${promptText}
    </input>
    <rules>
      1. "transaction_type": Must be "buy" (keywords: buy, beli, dca, entry, serok, etc.) or "sell" (keywords: sell, jual, tp, take profit, cut loss, etc.).
      2. "symbol": Match the short symbol from the valid asset list (e.g., "BBCA", "BTC").
      3. "quantity":
        - For "stocks" (Indonesian Stocks): Users often specify "lot". 1 LOT = 100 SHARES. 
          Always convert "quantity" to total pure SHARES (e.g., 10 lots -> 1000, 1 lot -> 100).
        - For "crypto": Use exact unit quantity (e.g., 0.5, 1.2, 0.05).
      4. "price_per_unit": Numerical price per single share/unit.
        If the user does NOT specify a price in the text, return a null value.
      5. Success Output Schema:
        {
          "success": true,
          "symbol": "STRING",
          "transaction_type": "buy" | "sell",
          "quantity": NUMBER,
          "price_per_unit": NUMBER | null,
          "notes": "STRING"
        }
      6. Failure Output Schema (if input is ambiguous, missing price/quantity, or asset is unrecognized):
        {
          "success": false,
          "errorMessage": "STRING (brief explanation in Indonesian)"
        }
    </rules>
  `;

  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    if (!parsed.success) {
      throw new Error(
        parsed.errorMessage ||
          "Format instruksi transaksi tidak dapat dipahami.",
      );
    }

    const matchedAsset = assetOptions.find(
      (a) => a.shortSymbol.toUpperCase() === parsed.symbol?.toUpperCase(),
    );

    const symbol = matchedAsset?.shortSymbol || parsed.symbol.toUpperCase();
    const assetName = matchedAsset?.name || symbol;
    const quantity = Number(parsed.quantity);

    let pricePerUnit = Number(parsed.price_per_unit) || 0;

    if (pricePerUnit <= 0) {
      const fxRate = await getExchangeRateUSDIDR();
      const marketData =
        assetType === "crypto"
          ? await getCryptoMarketData()
          : await getStockMarketData();

      const matchedMarketItem = marketData.find(
        (m) => m.symbol.toUpperCase() === symbol.toUpperCase(),
      );

      if (!matchedMarketItem || !matchedMarketItem.price) {
        throw new Error(
          `Harga real-time untuk ${symbol} tidak ditemukan. Harap masukkan harga secara manual.`,
        );
      }

      const baseMarketCurrency: Currency =
        assetType === "crypto" ? "USD" : "IDR";
      pricePerUnit = convertCurrency(
        matchedMarketItem.price,
        baseMarketCurrency,
        userCurrency,
        fxRate,
      );
    }

    const totalAmount = quantity * pricePerUnit;

    // Eksekusi pencatatan transaksi & sync portfolio
    const createdTx = await createMarketTransaction({
      symbol,
      asset_name: assetName,
      asset_type: assetType,
      transaction_type: parsed.transaction_type,
      quantity,
      price_per_unit: pricePerUnit,
      total_amount: totalAmount,
      currency: userCurrency,
      notes: parsed.notes || `Input via AI Wizard: "${promptText}"`,
    });

    return {
      success: true,
      symbol,
      transactionType: parsed.transaction_type as "buy" | "sell",
      quantity,
      pricePerUnit,
      totalAmount,
      createdTx,
    };
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Gagal memproses instruksi transaksi via AI.",
    );
  }
}

export async function handleMarketWizardTools(formData: FormData) {
  const type = (formData.get("type") as "audio" | "text") || "text";
  const file = formData.get("file");
  const request = (formData.get("request") as string) || "";
  const assetType = (formData.get("assetType") as AssetType) || "stocks";
  const userCurrency = (formData.get("currency") as Currency) || "IDR";

  if (type === "audio") {
    if (!file || !(file instanceof File) || file.size === 0) {
      throw new Error("File audio tidak valid untuk diproses.");
    }
  }

  let mimeType = "";
  let base64Data = "";

  if (type === "audio" && file instanceof File) {
    mimeType = file.type || "audio/webm";
    const arrayBuffer = await file.arrayBuffer();
    base64Data = Buffer.from(arrayBuffer).toString("base64");
  }

  const assetOptions = assetType === "stocks" ? STOCK_ASSETS : CRYPTO_ASSETS;
  const assetListText = assetOptions
    .map((a) => `${a.shortSymbol} (${a.name})`)
    .join(", ");

  const contents: Content[] = [
    {
      role: "user",
      parts: [
        ...(type === "audio"
          ? [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ]
          : []),
        {
          text: `
            <role>
              You are an AI Wizard Financial Assistant managing ${assetType.toUpperCase()} market transactions via ${type}.
            </role>
            <strict_rules>
              1. DO NOT CALL ANY FUNCTION/TOOL if the input is noise, random words/garbage, general conversation irrelevant to market transactions, or does not contain a clear transaction intention (buy/sell). 
              2. DO NOT guess, fabricate, or assume asset symbols, quantities, or prices if the user has not explicitly stated them. 
              3. ONLY call 'create_market_transaction' if the user explicitly mentions a financial action (buy/sell) AND an asset name/symbol found in the list of valid assets: [${assetListText}]. 
              4. If the input is irrelevant, unclear, or not a transaction instruction, DO NOT CALL ANY FUNCTION. Simply return a text response in Indonesian explaining that the instruction cannot be understood as a market transaction. 
            </strict_rules>
            <instruction>
              - Extract transaction intent from ${type === "text" ? "the provided text" : "the audio file"} in Bahasa Indonesia.
              - Target Category: ${assetType.toUpperCase()}
              - Valid Symbols: [${assetListText}]
              - Target Currency: ${userCurrency}
              - For Indonesian Stocks: 1 LOT = 100 LEMBAR. Quantity argument MUST be passed in total LEMBAR.
              - If price_per_unit is not stated, set it to 0.
              - Call 'create_market_transaction' or 'delete_market_transaction' functions accordingly.
              - Provide a concise final summary in Bahasa Indonesia once tool executions complete.
            </instruction>
            <context>
              Current Date: ${new Date().toISOString()}
            </context>
            ${type === "text" ? `<input>Text to extract: ${request}</input>` : ""}
          `,
        },
      ],
    },
  ];

  const ai = createAI();
  let running = true;
  let loopCount = 0;
  const MAX_LOOPS = 5;

  while (running && loopCount < MAX_LOOPS) {
    loopCount++;

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents,
      config: {
        tools: [
          {
            functionDeclarations: [
              createMarketTransactionDeclaration,
              deleteMarketTransactionDeclaration,
            ],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      if (response.candidates?.[0]?.content) {
        contents.push(response.candidates[0].content);
      }

      const functionResponseParts = await Promise.all(
        functionCalls.map(async (functionCall) => {
          const { name, args, id } = functionCall;
          let resultData: Record<string, unknown> = {};

          try {
            switch (name) {
              case "create_market_transaction": {
                const symbolArg = String(args?.symbol || "").toUpperCase();
                const txType =
                  (args?.transaction_type as "buy" | "sell") || "buy";
                const quantity = Number(args?.quantity) || 0;
                let pricePerUnit = Number(args?.price_per_unit) || 0;
                const notes = (args?.notes as string) || null;

                if (quantity <= 0) {
                  throw new Error(
                    "Nominal kuantitas harus lebih besar dari 0.",
                  );
                }

                const matchedAsset = assetOptions.find(
                  (a) => a.shortSymbol.toUpperCase() === symbolArg,
                );
                const symbol = matchedAsset?.shortSymbol || symbolArg;
                const assetName = matchedAsset?.name || symbol;

                // Otomatis fetch harga pasar terkini jika pengguna tidak memberikan harga
                if (pricePerUnit <= 0) {
                  const fxRate = await getExchangeRateUSDIDR();
                  const marketData =
                    assetType === "crypto"
                      ? await getCryptoMarketData()
                      : await getStockMarketData();

                  const matchedItem = marketData.find(
                    (m) => m.symbol.toUpperCase() === symbol.toUpperCase(),
                  );

                  if (matchedItem && matchedItem.price) {
                    const baseMarketCurrency: Currency =
                      assetType === "crypto" ? "USD" : "IDR";
                    pricePerUnit = convertCurrency(
                      matchedItem.price,
                      baseMarketCurrency,
                      userCurrency,
                      fxRate,
                    );
                  } else {
                    throw new Error(
                      `Harga real-time untuk ${symbol} tidak ditemukan. Harap sebutkan harga secara eksplisit.`,
                    );
                  }
                }

                const totalAmount = quantity * pricePerUnit;

                await createMarketTransaction({
                  symbol,
                  asset_name: assetName,
                  asset_type: assetType,
                  transaction_type: txType,
                  quantity,
                  price_per_unit: pricePerUnit,
                  total_amount: totalAmount,
                  currency: userCurrency,
                  notes: notes || `Input via AI Market Wizard (${type})`,
                });

                resultData = {
                  status: "success",
                  message: `Transaksi ${txType.toUpperCase()} ${symbol} berhasil dicatat.`,
                  quantity,
                  pricePerUnit,
                  totalAmount,
                };
                break;
              }

              case "delete_market_transaction": {
                const symbolArg = String(args?.symbol || "").toUpperCase();
                const existingTxs = await getMarketTransactions(assetType, 20);
                const targetTx = existingTxs.find(
                  (tx) => tx.symbol.toUpperCase() === symbolArg,
                );

                if (!targetTx) {
                  throw new Error(
                    `Transaksi untuk aset ${symbolArg} tidak ditemukan di riwayat.`,
                  );
                }

                await deleteMarketTransaction(targetTx.id);
                resultData = {
                  status: "success",
                  message: `Transaksi ${symbolArg} berhasil dihapus.`,
                };
                break;
              }

              default:
                throw new Error(`Fungsi tidak dikenal: ${name}`);
            }
          } catch (err) {
            resultData = {
              status: "error",
              error: err instanceof Error ? err.message : "Eksekusi gagal.",
            };
          }

          return {
            functionResponse: {
              name,
              response: { result: resultData },
              id,
            },
          };
        }),
      );

      contents.push({
        role: "user",
        parts: functionResponseParts,
      });
    } else {
      running = false;
      revalidatePath("/home/financial-market/stocks");
      revalidatePath("/home/financial-market/crypto");
      return response.text || "Proses transaksi selesai.";
    }
  }

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");
  return "Proses transaksi selesai.";
}
