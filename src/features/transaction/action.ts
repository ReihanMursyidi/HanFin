"use server";

import { revalidatePath } from "next/cache";
import type { Transaction } from "@/app/types/transaction";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/constants/transaction-constant";
import { generateEmbedding } from "../ai/embedding";
import { buildEmbeddingText } from "../ai/embedding-text";

// TRANSACTIONS: READ
export async function getBalanceSummary() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type");

  if (error) throw new Error(`Failed to fetch balance: ${error.message}`);

  const summary = (data || []).reduce(
    (acc, tx) => {
      if (tx.type === "income") acc.totalIncome += tx.amount;
      else if (tx.type === "expense") acc.totalExpense += tx.amount;

      acc.savings = acc.totalIncome - acc.totalExpense;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, savings: 0 },
  );

  return summary;
}

export async function getTransactions(params?: {
  limit?: number;
  page?: number;
  search?: string;
}) {
  const { limit = 10, page = 1, search } = params || {};
  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("id, amount, type, description, date, category", { count: "exact" })
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("description", `%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  const totalData = count || 0;

  return {
    data,
    totalData,
    totalPages: Math.ceil(totalData / limit),
  };
}

// EMBEDDING UTILITY
const EMBEDDING_RETRIES = 1;
const EMBEDDING_RETRY_DELAY_MS = 500;

// Mengembalikan null jika tetap gagal setelah retry. Transaksi tetap
// disimpan; embedding yang hilang akan diisi ulang otomatis (backfill)
// saat AI mencari transaksi.
async function handleEmbedding(
  transaction: Omit<Transaction, "id" | "user_id" | "embedding">,
): Promise<number[] | null> {
  const embeddingText = buildEmbeddingText(transaction);

  for (let attempt = 0; attempt <= EMBEDDING_RETRIES; attempt++) {
    try {
      return await generateEmbedding(embeddingText);
    } catch (error) {
      console.error(
        `[Embedding Warning]: Attempt ${attempt + 1} failed:`,
        error,
      );
      if (attempt < EMBEDDING_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, EMBEDDING_RETRY_DELAY_MS),
        );
      }
    }
  }

  return null;
}

// TRANSACTIONS: WRITE (CUD)
export async function createTransaction(
  rawInput: Omit<Transaction, "id" | "user_id" | "embedding">,
) {
  // 1. Validasi Zod di server untuk memastikan amount, type, dan category valid
  const transaction = transactionSchema.parse(rawInput);
  const supabase = await createClient();
  const payload: Record<string, unknown> = { ...transaction };

  // Jika gagal, kolom embedding dibiarkan kosong untuk di-backfill nanti
  const embeddingVector = await handleEmbedding(transaction);
  if (embeddingVector) {
    payload.embedding = embeddingVector;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Failed to create transaction: ${error.message}`);

  revalidatePath("/home/dashboard");
  revalidatePath("/home/transaction");

  return data;
}

export async function updateTransaction(
  id: string,
  rawInput: Omit<Transaction, "id" | "user_id" | "embedding">,
) {
  // 1. Validasi Zod di server
  const transaction = transactionSchema.parse(rawInput);
  const supabase = await createClient();
  const payload: Record<string, unknown> = { ...transaction };

  // Jika gagal, embedding lama DIKOSONGKAN (bukan dibiarkan), karena embedding
  // lama menggambarkan data lama dan akan menghasilkan pencarian yang salah.
  // Kolom yang kosong akan di-backfill otomatis saat AI mencari transaksi.
  payload.embedding = await handleEmbedding(transaction);

  const { data, error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update transaction: ${error.message}`);

  revalidatePath("/home/dashboard");
  revalidatePath("/home/transaction");

  return data;
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);

  revalidatePath("/home/dashboard");
  revalidatePath("/home/transaction");

  return true;
}
