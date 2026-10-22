"use server";

import { revalidatePath } from "next/cache";
import { createAI } from "@/features/ai/instance";
import { convertCurrency } from "@/lib/format";
import {
  createMarketTransaction,
  deleteMarketTransaction,
  getMarketTransactions,
} from "./action";
import {
  getCryptoMarketData,
  getExchangeRateUSDIDR,
  getStockMarketData,
} from "./market-data";
import {
  createMarketTransactionDeclaration,
  deleteMarketTransactionDeclaration,
} from "./wizard-declarations";
import {
  buildMarketWizardContents,
  getAssetOptions,
  parseMarketWizardInput,
} from "./wizard-prompt";
import { AssetType, Currency } from "./types";

const AI_MODEL = "gemini-3-flash-preview";

// 3. HELPER: EKSEKUSI TOOL CALL BERDASARKAN NAMA FUNGSI
async function executeMarketToolCall(
  name: string,
  args: Record<string, unknown>,
  assetType: AssetType,
  userCurrency: Currency,
  type: "audio" | "text",
): Promise<Record<string, unknown>> {
  const assetOptions = getAssetOptions(assetType);

  switch (name) {
    case "create_market_transaction": {
      const symbolArg = String(args?.symbol || "").toUpperCase();
      const txType = args?.transaction_type;
      if (txType !== "buy" && txType !== "sell") {
        throw new Error("Tipe transaksi harus 'buy' atau 'sell'.");
      }
      const quantity = Number(args?.quantity) || 0;
      let pricePerUnit = Number(args?.price_per_unit) || 0;
      const notes = (args?.notes as string) || null;

      if (quantity <= 0) {
        throw new Error("Nominal kuantitas harus lebih besar dari 0.");
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

      return {
        status: "success",
        message: `Transaksi ${txType.toUpperCase()} ${symbol} berhasil dicatat.`,
        quantity,
        pricePerUnit,
        totalAmount,
      };
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
      return {
        status: "success",
        message: `Transaksi ${symbolArg} berhasil dihapus.`,
      };
    }

    default:
      throw new Error(`Fungsi tidak dikenal: ${name}`);
  }
}

export async function handleMarketWizardTools(formData: FormData) {
  const { type, request, assetType, userCurrency, mimeType, base64Data } =
    await parseMarketWizardInput(formData);

  const contents = buildMarketWizardContents(
    type,
    request,
    assetType,
    userCurrency,
    mimeType,
    base64Data,
  );

  const ai = createAI();
  const MAX_LOOPS = 5;

  for (let loopCount = 0; loopCount < MAX_LOOPS; loopCount++) {
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

    if (!functionCalls || functionCalls.length === 0) {
      revalidatePath("/home/financial-market/stocks");
      revalidatePath("/home/financial-market/crypto");
      return response.text || "Proses transaksi selesai.";
    }

    if (response.candidates?.[0]?.content) {
      contents.push(response.candidates[0].content);
    }

    const functionResponseParts = await Promise.all(
      functionCalls.map(async ({ name, args, id }) => {
        let resultData: Record<string, unknown>;
        const callName = name ?? "";

        try {
          resultData = await executeMarketToolCall(
            callName,
            (args as Record<string, unknown>) || {},
            assetType,
            userCurrency,
            type,
          );
        } catch (err) {
          resultData = {
            status: "error",
            error: err instanceof Error ? err.message : "Eksekusi gagal.",
          };
        }

        return {
          functionResponse: {
            name: callName,
            response: { result: resultData },
            id: id ?? "",
          },
        };
      }),
    );

    contents.push({
      role: "user",
      parts: functionResponseParts,
    });
  }

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");
  return "Proses transaksi selesai.";
}
