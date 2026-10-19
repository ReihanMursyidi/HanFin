-- OPSIONAL: mempercepat pencarian transaksi yang belum punya embedding
-- (dipakai oleh backfill otomatis saat AI mencari transaksi).
CREATE INDEX IF NOT EXISTS idx_transactions_missing_embedding
  ON public.transactions (user_id)
  WHERE embedding IS NULL;
