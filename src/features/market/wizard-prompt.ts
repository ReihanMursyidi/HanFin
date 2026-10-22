import type { Content } from "@google/genai";
import { CRYPTO_ASSETS, STOCK_ASSETS } from "@/constants/market-constant";
import { AssetType, Currency } from "./types";

// Daftar aset valid sesuai kelas aset yang sedang dipakai
export function getAssetOptions(assetType: AssetType) {
  return assetType === "stocks" ? STOCK_ASSETS : CRYPTO_ASSETS;
}

// 1. HELPER: PARSING & VALIDASI INPUT WIZARD
export async function parseMarketWizardInput(formData: FormData) {
  const type = (formData.get("type") as "audio" | "text") || "text";
  const file = formData.get("file");
  const request = (formData.get("request") as string) || "";
  const assetType = (formData.get("assetType") as AssetType) || "stocks";
  const userCurrency = (formData.get("currency") as Currency) || "IDR";

  if (
    type === "audio" &&
    (!file || !(file instanceof File) || file.size === 0)
  ) {
    throw new Error("File audio tidak valid untuk diproses.");
  }

  let mimeType = "";
  let base64Data = "";

  if (type === "audio" && file instanceof File) {
    mimeType = file.type || "audio/webm";
    const arrayBuffer = await file.arrayBuffer();
    base64Data = Buffer.from(arrayBuffer).toString("base64");
  }

  return { type, request, assetType, userCurrency, mimeType, base64Data };
}

// 2. HELPER: KONSTRUKSI PROMPT AWAL WIZARD
export function buildMarketWizardContents(
  type: "audio" | "text",
  request: string,
  assetType: AssetType,
  userCurrency: Currency,
  mimeType: string,
  base64Data: string,
): Content[] {
  const assetListText = getAssetOptions(assetType)
    .map((a) => `${a.shortSymbol} (${a.name})`)
    .join(", ");

  return [
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
}
