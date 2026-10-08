-- 1. TABEL: portfolio_assets
-- Menyimpan akumulasi aset per user, simbol, dan tipe aset (stocks/crypto)
CREATE TABLE IF NOT EXISTS public.portfolio_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,              -- Contoh: 'BBCA', 'BTC', 'ETH'
  name VARCHAR(100) NOT NULL,               -- Contoh: 'Bank Central Asia', 'Bitcoin'
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stocks', 'crypto')),
  total_quantity NUMERIC(24, 8) NOT NULL DEFAULT 0 CHECK (total_quantity >= 0), -- Mengakomodasi desimal crypto
  avg_buy_price NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (avg_buy_price >= 0),  -- Harga rata-rata beli
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR' CHECK (currency IN ('IDR', 'USD')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_user_asset UNIQUE (user_id, symbol, asset_type)
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
CREATE POLICY "User can view own portfolio assets"
  ON public.portfolio_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User can insert own portfolio assets"
  ON public.portfolio_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own portfolio assets"
  ON public.portfolio_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "User can delete own portfolio assets"
  ON public.portfolio_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Policies untuk market_transactions
CREATE POLICY "User can view own market transactions"
  ON public.market_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User can insert own market transactions"
  ON public.market_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own market transactions"
  ON public.market_transactions FOR UPDATE
  USING (auth.uid() = user_id);

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

CREATE TRIGGER trg_update_portfolio_assets_timestamp
  BEFORE UPDATE ON public.portfolio_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_assets_timestamp();

-- 5. FUNCTION: KALKULASI PORTOFOLIO OTOMATIS
CREATE OR REPLACE FUNCTION process_market_transaction_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_qty NUMERIC(24, 8) := 0;
  v_existing_avg NUMERIC(24, 4) := 0;
  v_new_qty NUMERIC(24, 8) := 0;
  v_new_avg NUMERIC(24, 4) := 0;
BEGIN
  SELECT total_quantity, avg_buy_price 
  INTO v_existing_qty, v_existing_avg
  FROM public.portfolio_assets
  WHERE user_id = NEW.user_id 
    AND symbol = NEW.symbol 
    AND asset_type = NEW.asset_type;

  IF NEW.transaction_type = 'buy' THEN
    v_new_qty := COALESCE(v_existing_qty, 0) + NEW.quantity;
    
    IF v_new_qty > 0 THEN
      v_new_avg := ((COALESCE(v_existing_qty, 0) * COALESCE(v_existing_avg, 0)) + (NEW.quantity * NEW.price_per_unit)) / v_new_qty;
    ELSE
      v_new_avg := 0;
    END IF;

    INSERT INTO public.portfolio_assets (
      user_id, symbol, name, asset_type, total_quantity, avg_buy_price, currency
    ) VALUES (
      NEW.user_id, NEW.symbol, NEW.asset_name, NEW.asset_type, v_new_qty, v_new_avg, NEW.currency
    )
    ON CONFLICT (user_id, symbol, asset_type) DO UPDATE SET
      total_quantity = v_new_qty,
      avg_buy_price = v_new_avg,
      name = EXCLUDED.name,
      currency = EXCLUDED.currency,
      updated_at = now();

  ELSIF NEW.transaction_type = 'sell' THEN
    v_new_qty := GREATEST(0, COALESCE(v_existing_qty, 0) - NEW.quantity);
    
    IF v_new_qty = 0 THEN
      v_new_avg := 0;
    ELSE
      v_new_avg := COALESCE(v_existing_avg, 0);
    END IF;

    UPDATE public.portfolio_assets
    SET 
      total_quantity = v_new_qty,
      avg_buy_price = v_new_avg,
      updated_at = now()
    WHERE user_id = NEW.user_id 
      AND symbol = NEW.symbol 
      AND asset_type = NEW.asset_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_market_transaction
  AFTER INSERT ON public.market_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_market_transaction_sync();