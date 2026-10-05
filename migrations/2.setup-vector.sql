CREATE OR REPLACE FUNCTION match_transactions (
   query_embedding vector(768),
   match_threshold float,
   match_count int,
   p_user_id uuid
)

RETURNS TABLE (
   id uuid,
   type text,
   category text,
   amount numeric,
   description text,
   date date,
   user_id uuid,
   similarity float
)

LANGUAGE sql STABLE
AS $$
   SELECT
      transactions.id,
      transactions.type,
      transactions.category,
      transactions.amount,
      transactions.description,
      transactions.date,
      transactions.user_id,
      1 - (transactions.embedding <=> query_embedding) AS similarity
   FROM transactions
   WHERE 
      1 - (transactions.embedding <=> query_embedding) > match_threshold
      AND transactions.user_id = p_user_id  -- <-- INI ADALAH KUNCI KEAMANANNYA
   ORDER BY transactions.embedding <=> query_embedding
   LIMIT match_count;
$$;