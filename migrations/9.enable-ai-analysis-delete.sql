DROP POLICY IF EXISTS "Users can delete own AI market analysis history"
  ON public.ai_market_analysis_history;
CREATE POLICY "Users can delete own AI market analysis history"
  ON public.ai_market_analysis_history FOR DELETE
  USING (auth.uid() = user_id);

GRANT DELETE ON public.ai_market_analysis_history TO authenticated;
