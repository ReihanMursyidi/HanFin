"use server";

import type { Content } from "@google/genai";
import {
  CATEGORIES,
  transactionSchema,
} from "@/constants/transaction-constant";
import { createAI } from "./instance";

export async function extractReceiptData(formData: FormData) {
  const file = formData.get("file");

  if (!file || !(file instanceof File) || file.size === 0) {
    throw new Error("Invalid or empty file uploaded.");
  }

  const mimeType = file.type || "image/jpeg";
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  const ai = createAI();

  const contents: Content[] = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `
            <role>
              You are an AI finance assistant specializing in extracting structured transaction details from receipts and invoices.
            </role>
            <instruction>
              Extract transaction details from the provided receipt image and map them to a JSON object.
              The JSON object must contain these exact fields:
              - "amount": positive number representing total cost. Default to 0 if not visible.
              - "type": either 'income' or 'expense' (most receipts are 'expense').
              - "category": pick the single most accurate category from this list: [${CATEGORIES.join(", ")}].
              - "description": concise text summarizing the merchant/items, capitalized first letter.
              - "date": transaction date in YYYY-MM-DD format. Use current date if not defined or relative (e.g. 'today').
            </instruction>
            <context>
              Current Date: ${new Date().toISOString()}
            </context>
          `,
        },
      ],
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("AI failed to extract text from the receipt.");
    }

    const rawData = JSON.parse(response.text);
    const transaction = transactionSchema.parse(rawData);

    return transaction;
  } catch (error) {
    console.error("[Extract Receipt Error]:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to process receipt: ${error.message}`
        : "Failed to extract transaction data from receipt.",
    );
  }
}
