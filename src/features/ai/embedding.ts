"use server";

import { createClient } from "@/lib/supabase/server";
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
