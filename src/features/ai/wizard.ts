"use server";

import type { Content } from "@google/genai";
import z from "zod";
import {
  CATEGORIES,
  transactionSchema,
} from "@/constants/transaction-constant";
import type { PendingDeletion, WizardResult } from "@/app/types/transaction";
import { createClient } from "@/lib/supabase/server";
import { createTransaction, updateTransaction } from "../transaction/action";
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
              - When updating a transaction, pass the id from 'get_transaction' and ONLY the fields that change; unchanged fields are kept automatically.
              - To delete a transaction, call 'delete_transaction' (pass the id from 'get_transaction' when available). It does NOT delete immediately: the user must confirm on screen. In your final summary say that confirmation is pending and NEVER state that a transaction has been deleted.
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

// 3a. Helper: Cari kandidat transaksi yang akan dihapus (TIDAK menghapus apa pun)
const MAX_DELETE_CANDIDATES = 3;

function toPendingDeletion(row: Record<string, unknown>): PendingDeletion {
  return {
    id: String(row.id),
    type: row.type === "income" ? "income" : "expense",
    category: String(row.category ?? "") as PendingDeletion["category"],
    amount: Number(row.amount) || 0,
    description: String(row.description ?? ""),
    date: String(row.date ?? ""),
  };
}

// Ambil satu transaksi persis berdasarkan ID.
// RLS memastikan hanya transaksi milik user yang bisa ditemukan.
async function getTransactionById(id: string): Promise<PendingDeletion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, category, amount, description, date")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mencari transaksi: ${error.message}`);
  }
  return data ? toPendingDeletion(data) : null;
}

async function findDeletionCandidates(
  args: Record<string, unknown>,
): Promise<PendingDeletion[]> {
  const { id, ...details } = args;

  // Jika ID tersedia (hasil get_transaction), cari persis berdasarkan ID.
  if (typeof id === "string" && id) {
    const found = await getTransactionById(id);
    if (found) return [found];
  }

  // Tanpa ID valid: pencarian semantik, tapi hanya sebagai kandidat
  if (Object.keys(details).length === 0) return [];

  const rows = await findEmbedding(
    JSON.stringify(details),
    0.3,
    MAX_DELETE_CANDIDATES,
  );
  return (rows ?? []).map(toPendingDeletion);
}

// 3. Helper: Eksekusi Tool Call Berdasarkan Nama Fungsi
async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  pendingDeletions: PendingDeletion[],
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
      // Penghapusan TIDAK dilakukan di sini. Kandidat dikembalikan ke UI
      // dan baru dihapus setelah user menekan tombol konfirmasi.
      const candidates = await findDeletionCandidates(args);
      if (candidates.length === 0) {
        throw new Error("Transaksi yang ingin dihapus tidak ditemukan.");
      }

      for (const candidate of candidates) {
        if (!pendingDeletions.some((p) => p.id === candidate.id)) {
          pendingDeletions.push(candidate);
        }
      }

      return {
        status: "awaiting_user_confirmation",
        message:
          "Belum ada transaksi yang dihapus. User akan diminta konfirmasi di layar. Jangan menyatakan transaksi sudah dihapus.",
        candidates,
      };
    }

    case "update_transaction": {
      const { id, ...changes } = args;
      if (typeof id !== "string" || !id) {
        throw new Error("Transaction ID is required for update");
      }

      // Hanya field yang benar-benar diisi AI yang dianggap sebagai perubahan
      const definedChanges = Object.fromEntries(
        Object.entries(changes).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        ),
      );
      if (Object.keys(definedChanges).length === 0) {
        throw new Error("Tidak ada perubahan yang diminta untuk transaksi ini.");
      }

      const existing = await getTransactionById(id);
      if (!existing) {
        throw new Error("Transaksi yang ingin diubah tidak ditemukan.");
      }

      // Gabungkan data lama dengan perubahan agar update parsial tetap valid
      const newData = transactionSchema.parse({
        amount: existing.amount,
        type: existing.type,
        category: existing.category,
        description: existing.description,
        date: existing.date,
        ...definedChanges,
      });
      if (newData.amount <= 0) {
        throw new Error("Nominal transaksi harus lebih dari 0.");
      }

      await updateTransaction(id, newData);
      return {
        status: "success",
        updatedId: id,
        updatedTransaction: newData,
      };
    }

    default:
      throw new Error(`Unknown function call: ${name}`);
  }
}

// 2. HANDLE WIZARD TOOLS (Multi-turn Function Calling)
export async function handleWizardTools(
  formData: FormData,
): Promise<WizardResult> {
  const { type, request, mimeType, base64Data } =
    await parseWizardInput(formData);
  const contents = buildInitialContents(type, request, mimeType, base64Data);
  const pendingDeletions: PendingDeletion[] = [];

  const buildResult = (text?: string): WizardResult => ({
    message:
      text ||
      (pendingDeletions.length > 0
        ? "Konfirmasi diperlukan sebelum transaksi dihapus."
        : "Proses selesai."),
    pendingDeletions,
  });

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
      return buildResult(response.text);
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
            pendingDeletions,
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

  return buildResult();
}
