-- ATOMIC MARKET TRANSACTIONS
-- Mencatat transaksi pasar dan menghitung ulang portfolio_assets dalam SATU
-- transaksi database, diserialisasi per (user, simbol) dengan advisory lock.
-- Menggantikan alur lama di aplikasi: insert -> sync -> (rollback manual).
-- Semua fungsi SECURITY INVOKER, jadi RLS tetap berlaku dan hanya data
-- milik auth.uid() yang tersentuh.

-- 1. Hitung ulang portofolio satu simbol milik user yang sedang login
--    (metode harga rata-rata; penjualan dibatasi sebesar kuantitas yang dimiliki)
CREATE OR REPLACE FUNCTION public.sync_portfolio_asset(
  p_symbol text,
  p_asset_type text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_symbol text := upper(p_symbol);
  v_tx record;
  v_qty numeric := 0;
  v_cost numeric := 0;
  v_avg numeric;
  v_sell numeric;
  v_name text;
  v_currency text;
  v_first boolean := true;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_tx IN
    SELECT *
    FROM public.market_transactions
    WHERE user_id = v_user AND symbol = v_symbol
    ORDER BY transaction_date ASC, created_at ASC, id ASC
  LOOP
    IF v_first THEN
      v_name := v_tx.asset_name;
      v_currency := v_tx.currency;
      v_first := false;
    END IF;

    IF v_tx.transaction_type = 'buy' THEN
      v_qty := v_qty + v_tx.quantity;
      v_cost := v_cost + v_tx.quantity * v_tx.price_per_unit;
    ELSIF v_qty > 0 THEN
      v_avg := v_cost / v_qty;
      v_sell := LEAST(v_tx.quantity, v_qty);
      v_qty := v_qty - v_sell;
      v_cost := v_cost - v_sell * v_avg;

      IF v_qty <= 0 THEN
        v_qty := 0;
        v_cost := 0;
      END IF;
    END IF;
  END LOOP;

  IF v_qty <= 0 THEN
    DELETE FROM public.portfolio_assets
    WHERE user_id = v_user AND symbol = v_symbol;
    RETURN;
  END IF;

  INSERT INTO public.portfolio_assets (
    user_id, symbol, name, asset_type,
    total_quantity, avg_buy_price, currency, updated_at
  )
  VALUES (
    v_user, v_symbol, v_name, p_asset_type,
    v_qty, v_cost / v_qty, v_currency, now()
  )
  ON CONFLICT (user_id, symbol) DO UPDATE SET
    name = EXCLUDED.name,
    asset_type = EXCLUDED.asset_type,
    total_quantity = EXCLUDED.total_quantity,
    avg_buy_price = EXCLUDED.avg_buy_price,
    currency = EXCLUDED.currency,
    updated_at = now();
END;
$$;

-- 2. Catat transaksi beli/jual + sinkron portofolio secara atomik
CREATE OR REPLACE FUNCTION public.create_market_transaction(
  p_symbol text,
  p_asset_name text,
  p_asset_type text,
  p_transaction_type text,
  p_quantity numeric,
  p_price_per_unit numeric,
  p_total_amount numeric,
  p_currency text DEFAULT 'IDR',
  p_notes text DEFAULT NULL,
  p_transaction_date timestamptz DEFAULT NULL
) RETURNS public.market_transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_symbol text := upper(p_symbol);
  v_owned numeric;
  v_row public.market_transactions;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Serialisasi request bersamaan untuk simbol yang sama milik user ini
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_symbol, 0));

  IF p_transaction_type = 'sell' THEN
    SELECT total_quantity INTO v_owned
    FROM public.portfolio_assets
    WHERE user_id = v_user AND symbol = v_symbol;

    v_owned := COALESCE(v_owned, 0);

    IF v_owned <= 0 THEN
      RAISE EXCEPTION 'Anda belum memiliki aset %. Tambahkan transaksi Beli terlebih dahulu sebelum menjual.', v_symbol;
    END IF;

    IF p_quantity > v_owned THEN
      RAISE EXCEPTION 'Jumlah penjualan (%) melebihi total aset % yang Anda miliki (%).',
        trim_scale(p_quantity), v_symbol, trim_scale(v_owned);
    END IF;
  END IF;

  INSERT INTO public.market_transactions (
    user_id, symbol, asset_name, asset_type, transaction_type,
    quantity, price_per_unit, total_amount, currency, notes, transaction_date
  )
  VALUES (
    v_user, v_symbol, p_asset_name, p_asset_type, p_transaction_type,
    p_quantity, p_price_per_unit, p_total_amount, p_currency, p_notes,
    COALESCE(p_transaction_date, now())
  )
  RETURNING * INTO v_row;

  PERFORM public.sync_portfolio_asset(v_symbol, p_asset_type);

  RETURN v_row;
END;
$$;

-- 3. Hapus transaksi + sinkron portofolio secara atomik
CREATE OR REPLACE FUNCTION public.delete_market_transaction(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tx public.market_transactions;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_tx
  FROM public.market_transactions
  WHERE id = p_id AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_tx.symbol, 0));

  DELETE FROM public.market_transactions
  WHERE id = p_id AND user_id = v_user;

  PERFORM public.sync_portfolio_asset(v_tx.symbol, v_tx.asset_type);

  RETURN true;
END;
$$;

-- 4. Hanya user yang login yang boleh memanggil
REVOKE ALL ON FUNCTION public.sync_portfolio_asset(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_market_transaction(text, text, text, text, numeric, numeric, numeric, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_market_transaction(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sync_portfolio_asset(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_market_transaction(text, text, text, text, numeric, numeric, numeric, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_market_transaction(uuid) TO authenticated;
