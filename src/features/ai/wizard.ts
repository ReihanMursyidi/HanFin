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

const AI_MODEL = "gemini-3-flash-preview";

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
      model: AI_MODEL,
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

// 1. Helper: Parsing & Validasi Form Data Input
async function parseWizardInput(formData: FormData) {
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

  return { type, request, mimeType, base64Data };
}

// 2. Helper: Konstruksi Konten Awal Prompt AI
function buildInitialContents(
  type: "audio" | "text",
  request: string,
  mimeType: string,
  base64Data: string,
): Content[] {
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
}

// 3. Helper: Eksekusi Tool Call Berdasarkan Nama Fungsi
async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (name) {
    case "get_transaction": {
      const dataFind = await findEmbedding(JSON.stringify(args || {}), 0.3, 1);
      return dataFind?.[0] || { message: "Transaction not found" };
    }

    case "create_transaction": {
      const transaction = transactionSchema.parse(args);
      if (transaction.amount <= 0) {
        throw new Error("Nominal transaksi harus lebih dari 0.");
      }
      await createTransaction(transaction);
      return {
        status: "success",
        message: "Transaction created successfully",
      };
    }

    case "delete_transaction": {
      const data = await findEmbedding(JSON.stringify(args || {}), 0.3, 1);
      if (!data || data.length === 0 || !data[0].id) {
        throw new Error("Transaksi yang ingin dihapus tidak ditemukan.");
      }
      const targetId = String(data[0].id);
      await deleteTransaction(targetId);
      return { status: "success", deletedId: targetId };
    }

    case "update_transaction": {
      if (!args || typeof args !== "object" || !("id" in args) || !args.id) {
        throw new Error("Transaction ID is required for update");
      }
      const newData = transactionSchema.parse(args);
      if (newData.amount <= 0) {
        throw new Error("Nominal transaksi harus lebih dari 0.");
      }
      const targetId = String((args as { id: unknown }).id);
      await updateTransaction(targetId, newData);
      return {
        status: "success",
        updatedId: targetId,
      };
    }

    default:
      throw new Error(`Unknown function call: ${name}`);
  }
}

// 2. HANDLE WIZARD TOOLS (Multi-turn Function Calling)
export async function handleWizardTools(formData: FormData) {
  const { type, request, mimeType, base64Data } =
    await parseWizardInput(formData);
  const contents = buildInitialContents(type, request, mimeType, base64Data);

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

    if (!functionCalls || functionCalls.length === 0) {
      return response.text || "Proses selesai.";
    }

    if (response.candidates?.[0]?.content) {
      contents.push(response.candidates[0].content);
    }

    const functionResponseParts = await Promise.all(
      functionCalls.map(async ({ name, args, id }) => {
        let resultData: Record<string, unknown>;
        const callName = name ?? "";
        try {
          resultData = await executeToolCall(
            callName,
            (args as Record<string, unknown>) || {},
          );
        } catch (err) {
          resultData = {
            status: "error",
            error: err instanceof Error ? err.message : "Execution failed",
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

  return "Proses selesai.";
}
