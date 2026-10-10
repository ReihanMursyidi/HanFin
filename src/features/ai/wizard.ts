"use server";

import type { Content } from "@google/genai";
import z from "zod";
import {
  CATEGORIES,
  transactionSchema,
} from "@/constants/transaction-constant";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../transaction/action";
import { findEmbedding } from "./embedding";
import {
  createTransactionDeclaration,
  deleteTransactionDeclaration,
  getTransactionDeclaration,
  updateTransactionDeclaration,
} from "./functionTransaction";
import { createAI } from "./instance";

// 1. HANDLE WIZARD INPUT (Direct Text Input)
export async function handleWizardInput(message: string) {
  const cleanMessage = message.trim();
  if (!cleanMessage) {
    throw new Error("Message content cannot be empty.");
  }

  const contents = `
    <role>
      You are an AI Wizard finance assistant who can extract transaction details from text.
    </role>
    <instruction>
      Extract the transaction details from the following text and return it as a structured JSON object.
      The JSON object must have exactly these fields:
      - "amount": a positive number representing the cost. Default to 0 if not provided.
      - "type": type of transaction, either 'income' or 'expense'.
      - "category": choose the most appropriate category from this exact list: [${CATEGORIES.join(", ")}].
      - "description": a short string describing the transaction, first letter capitalized.
      - "date": date of transaction in YYYY-MM-DD format. Assume current date if relative terms like 'today' or 'just now' are used. If not defined, use current date.
    </instruction>
    <context>
      Current Date: ${new Date().toISOString()}
    </context>
    <input>
      Text to extract: ${cleanMessage}
    </input>
  `;

  const ai = createAI();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(transactionSchema),
      },
    });

    if (!response.text) {
      throw new Error("AI failed to parse transaction from input.");
    }

    const rawData = JSON.parse(response.text);
    const transaction = transactionSchema.parse(rawData);

    if (transaction.amount <= 0) {
      throw new Error(
        "Cannot create transaction with invalid amount (must be greater than 0).",
      );
    }

    await createTransaction(transaction);
    return "Create transaction success";
  } catch (error) {
    console.error("[Wizard Input Error]:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to process wizard input.",
    );
  }
}

// 2. HANDLE WIZARD TOOLS (Multi-turn Function Calling)
export async function handleWizardTools(formData: FormData) {
  const type = formData.get("type") as "audio" | "text";
  const file = formData.get("file");
  const request = (formData.get("request") as string) || "";

  if (type === "audio") {
    if (!file || !(file instanceof File) || file.size === 0) {
      throw new Error("Valid audio file is required for audio processing.");
    }
  }

  let mimeType = "";
  let base64Data = "";

  if (type === "audio" && file instanceof File) {
    mimeType = file.type || "audio/mp3";
    const arrayBuffer = await file.arrayBuffer();
    base64Data = Buffer.from(arrayBuffer).toString("base64");
  }

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
              You are an AI Wizard finance assistant who manages financial transactions via ${type}.
            </role>
            <instruction>
              - Extract transaction intent from ${type === "text" ? "the provided text" : "the audio file"} in Bahasa Indonesia.
              - If the request is to update or delete a transaction, you MUST call 'get_transaction' first to find the target transaction ID and details.
              - When updating a transaction, ensure all required fields match the schema.
              - Provide a concise final summary in Bahasa Indonesia once all function executions complete.
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
  const MAX_LOOPS = 5; // Circuit breaker untuk mencegah perulangan tak terbatas

  while (running && loopCount < MAX_LOOPS) {
    loopCount++;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        tools: [
          {
            functionDeclarations: [
              getTransactionDeclaration,
              createTransactionDeclaration,
              deleteTransactionDeclaration,
              updateTransactionDeclaration,
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
              case "get_transaction": {
                const dataFind = await findEmbedding(
                  JSON.stringify(args || {}),
                  0.3,
                  1,
                );
                resultData = dataFind?.[0] || {
                  message: "Transaction not found",
                };
                break;
              }

              case "create_transaction": {
                const transaction = transactionSchema.parse(args);
                if (transaction.amount <= 0) {
                  throw new Error("Nominal transaksi harus lebih dari 0.");
                }
                await createTransaction(transaction);
                resultData = {
                  status: "success",
                  message: "Transaction created successfully",
                };
                break;
              }

              case "delete_transaction": {
                const data = await findEmbedding(
                  JSON.stringify(args || {}),
                  0.3,
                  1,
                );
                if (!data || data.length === 0) {
                  throw new Error(
                    "Transaksi yang ingin dihapus tidak ditemukan.",
                  );
                }
                const deletedData = data[0];
                await deleteTransaction(deletedData.id);
                resultData = { status: "success", deletedId: deletedData.id };
                break;
              }

              case "update_transaction": {
                if (!args || typeof args !== "object" || !("id" in args)) {
                  throw new Error("Transaction ID is required for update");
                }
                const newData = transactionSchema.parse(args);
                if (newData.amount <= 0) {
                  throw new Error("Nominal transaksi harus lebih dari 0.");
                }
                await updateTransaction(
                  String((args as { id: string }).id),
                  newData,
                );
                resultData = {
                  status: "success",
                  updatedId: (args as { id: string }).id,
                };
                break;
              }

              default:
                throw new Error(`Unknown function call: ${name}`);
            }
          } catch (err) {
            // Operkan error message ke Gemini agar AI dapat menjelaskan masalahnya ke user
            resultData = {
              status: "error",
              error: err instanceof Error ? err.message : "Execution failed",
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
      return response.text || "Proses selesai.";
    }
  }

  return "Proses selesai.";
}
