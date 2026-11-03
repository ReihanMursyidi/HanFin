CREATE TABLE IF NOT EXISTS public.ai_market_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stocks', 'crypto')),
  strategy TEXT NOT NULL CHECK (
    strategy IN ('scalping', 'day_trading', 'swing_trading', 'investing')
  ),
  timeframe TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('IDR', 'USD')),
  trend_indicator TEXT NOT NULL CHECK (trend_indicator IN ('SMA', 'EMA', 'ADX')),
  momentum_indicator TEXT NOT NULL CHECK (
    momentum_indicator IN ('RSI', 'MACD', 'STOCHASTIC')
  ),
  volume_indicator TEXT NOT NULL CHECK (
    volume_indicator IN ('OBV', 'VWAP', 'VOLUME_PROFILE')
  ),
  recommendation TEXT NOT NULL CHECK (
    recommendation IN ('Beli', 'Jual', 'Tahan', 'Wait & See')
  ),
  risk_level TEXT NOT NULL CHECK (
    risk_level IN ('Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi')
  ),
  summary TEXT NOT NULL,
  analysis_result JSONB NOT NULL,
  technical_snapshot JSONB NOT NULL,
  candle_snapshot JSONB NOT NULL,
  candle_count INTEGER NOT NULL CHECK (candle_count >= 0),
  feedback TEXT CHECK (feedback IN ('success', 'failure', 'inconclusive')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_market_analysis_history_user_created
  ON public.ai_market_analysis_history (user_id, created_at DESC);

ALTER TABLE public.ai_market_analysis_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI market analysis history"
  ON public.ai_market_analysis_history;
CREATE POLICY "Users can view own AI market analysis history"
  ON public.ai_market_analysis_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI market analysis history"
  ON public.ai_market_analysis_history;
CREATE POLICY "Users can insert own AI market analysis history"
  ON public.ai_market_analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI market analysis feedback"
  ON public.ai_market_analysis_history;
CREATE POLICY "Users can update own AI market analysis feedback"
  ON public.ai_market_analysis_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE, DELETE ON public.ai_market_analysis_history FROM anon, authenticated;
GRANT UPDATE (feedback, reviewed_at)
  ON public.ai_market_analysis_history TO authenticated;
