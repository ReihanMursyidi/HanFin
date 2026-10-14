-- 1. TABEL: portfolio_assets
-- Menyimpan akumulasi aset per user, simbol, dan tipe aset (stocks/crypto)
CREATE TABLE IF NOT EXISTS public.portfolio_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,     -- Contoh: 'BBCA', 'BTC', 'ETH'
  name VARCHAR(100),               -- Contoh: 'Bank Central Asia', 'Bitcoin'
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stocks', 'crypto')),
  total_quantity NUMERIC(24, 8) NOT NULL DEFAULT 0 CHECK (total_quantity >= 0), -- Mengakomodasi desimal crypto
  avg_buy_price NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (avg_buy_price >= 0),  -- Harga rata-rata beli
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR' CHECK (currency IN ('IDR', 'USD')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT portfolio_assets_user_symbol_key UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user 
  ON public.portfolio_assets (user_id, asset_type);

-- 2. TABEL: market_transactions (Sederhana Tanpa Kolom Fee)
-- Menyimpan histori riwayat transaksi Jual/Beli
CREATE TABLE IF NOT EXISTS public.market_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  asset_name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stocks', 'crypto')),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  quantity NUMERIC(24, 8) NOT NULL CHECK (quantity > 0),
  price_per_unit NUMERIC(24, 4) NOT NULL CHECK (price_per_unit >= 0),
  total_amount NUMERIC(24, 4) NOT NULL CHECK (total_amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR' CHECK (currency IN ('IDR', 'USD')),
  transaction_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_transactions_user 
  ON public.market_transactions (user_id, asset_type, transaction_date DESC);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_transactions ENABLE ROW LEVEL SECURITY;

-- Policies untuk portfolio_assets
DROP POLICY IF EXISTS "User can view own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "User can view own portfolio assets"
  ON public.portfolio_assets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can insert own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "User can insert own portfolio assets"
  ON public.portfolio_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can update own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "User can update own portfolio assets"
  ON public.portfolio_assets FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can delete own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "User can delete own portfolio assets"
  ON public.portfolio_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Policies untuk market_transactions
DROP POLICY IF EXISTS "User can view own market transactions" ON public.market_transactions;
CREATE POLICY "User can view own market transactions"
  ON public.market_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can insert own market transactions" ON public.market_transactions;
CREATE POLICY "User can insert own market transactions"
  ON public.market_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can update own market transactions" ON public.market_transactions;
CREATE POLICY "User can update own market transactions"
  ON public.market_transactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can delete own market transactions" ON public.market_transactions;
CREATE POLICY "User can delete own market transactions"
  ON public.market_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. TRIGGER: AUTO UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_portfolio_assets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_portfolio_assets_timestamp ON public.portfolio_assets;
CREATE TRIGGER trg_update_portfolio_assets_timestamp
  BEFORE UPDATE ON public.portfolio_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_assets_timestamp();

-- 5. PEMBERSIHAN TRIGGER LAMA (JIKA ADA)
DROP TRIGGER IF EXISTS trg_sync_market_transaction ON public.market_transactions;
DROP FUNCTION IF EXISTS process_market_transaction_sync();