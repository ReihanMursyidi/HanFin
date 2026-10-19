"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buildEmbeddingText } from "./embedding-text";
import { createAI } from "./instance";

export async function generateEmbedding(contents: string): Promise<number[]> {
  const cleanContent = contents.trim();
  if (!cleanContent) {
    throw new Error("Content cannot be empty for embedding generation.");
  }

  const ai = createAI();

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: cleanContent,
      config: {
        outputDimensionality: 768,
      },
    });
    const vector = response.embeddings?.[0]?.values;
    if (!vector || vector.length === 0) {
      throw new Error("Embedding values are empty or invalid.");
    }

    return vector;
  } catch (error) {
    console.error("[Generate Embedding Error]:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate embedding",
    );
  }
}

const BACKFILL_LIMIT = 20;

// Mengisi embedding transaksi milik user yang masih kosong (misalnya karena
// API embedding sempat gagal saat transaksi dibuat/diubah). Kegagalan di sini
// tidak boleh menghentikan pencarian, jadi semua error hanya dicatat.
async function backfillMissingEmbeddings(
  supabase: SupabaseClient,
  userId: string,
) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, amount, type, category, description, date")
      .eq("user_id", userId)
      .is("embedding", null)
      .limit(BACKFILL_LIMIT);

    if (error || !data || data.length === 0) return;

    await Promise.all(
      data.map(async (row) => {
        try {
          const embedding = await generateEmbedding(buildEmbeddingText(row));
          await supabase
            .from("transactions")
            .update({ embedding })
            .eq("id", row.id);
        } catch (err) {
          console.error("[Embedding Backfill Error]:", row.id, err);
        }
      }),
    );
  } catch (err) {
    console.error("[Embedding Backfill Error]:", err);
  }
}

export async function findEmbedding(
  query: string,
  match_threshold = 0.3,
  match_count = 15,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Harus login untuk mencari transaksi.");
  }

  await backfillMissingEmbeddings(supabase, user.id);

  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_transactions", {
    query_embedding: queryEmbedding,
    match_threshold,
    match_count,
    p_user_id: user.id,
  });

  if (error) {
    console.error("[Vector Search Error]:", error);
    throw new Error(`Failed to perform vector search: ${error.message}`);
  }

  return data;
}
