'use server';

import { createClient } from '@/lib/supabase/server';
import { createAI } from './instance';

export async function generateEmbedding(contents: string) {
   const ai = createAI();

   const response = await ai.models.embedContent({
      model: 'gemini-embedding-2', contents,
      config: {
         outputDimensionality: 768
      },
   });

   if (
      !response.embeddings || response.embeddings.length === 0 ||
      !response.embeddings[0].values
   ) {
      throw new Error('Failed to generate embedding');
   }

   return response.embeddings[0].values;
}

export async function findEmbedding(
   query: string, 
   match_threshold?: number,
   match_count?: number,
) {
   const supabase = await createClient();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('Unauthorized: Harus login untuk mencari transaksi.');

   const queryEmbedding = await generateEmbedding(query);
   
   const {data, error} = await supabase.rpc('match_transactions', {
      query_embedding: queryEmbedding,
      match_threshold: match_threshold || 0.3,
      match_count: match_count || 15,
      p_user_id: user.id,
   });

   if (error) {
      throw new Error('Failed to perform vector search.');
   }

   return data;
}
