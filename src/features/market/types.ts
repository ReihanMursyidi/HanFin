export const ASSET_TYPES = ["stocks", "crypto"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const TRANSACTION_TYPES = ["buy", "sell"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CURRENCIES = ["IDR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

// Data Aset Pasar Real-Time
export interface MarketAsset {
  symbol: string;
  name: string;
  asset_type: AssetType;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  currency: Currency;
  sparkline?: number[];
}

// Data Candlestick (OHLC + Volume)
export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Model Database: Portofolio Aset User
export interface PortfolioAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  total_quantity: number;
  avg_buy_price: number;
  currency: Currency;
  created_at: string;
  updated_at: string;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
}

// Model Database: Riwayat Transaksi Pasar
export interface MarketTransaction {
  id: string;
  user_id: string;
  symbol: string;
  asset_name: string;
  asset_type: AssetType;
  transaction_type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  currency: Currency;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

export interface CreateMarketTransactionInput {
  symbol: string;
  asset_name: string;
  asset_type: AssetType;
  transaction_type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  currency: Currency;
  notes?: string | null;
  transaction_date?: string;
}

// Pilihan Metode Trading
export const TRADING_STRATEGIES = [
  "scalping",
  "day_trading",
  "swing_trading",
  "investing",
] as const;
export type TradingStrategy = (typeof TRADING_STRATEGIES)[number];

// Kategori Indikator AI Agent
export const TREND_INDICATORS = ["SMA", "EMA", "ADX"] as const;
export type TrendIndicator = (typeof TREND_INDICATORS)[number];

export const MOMENTUM_INDICATORS = ["RSI", "MACD", "STOCHASTIC"] as const;
export type MomentumIndicator = (typeof MOMENTUM_INDICATORS)[number];

export const VOLUME_INDICATORS = ["OBV", "VWAP", "VOLUME_PROFILE"] as const;
export type VolumeIndicator = (typeof VOLUME_INDICATORS)[number];

export interface AIAnalysisRequest {
  symbol: string;
  asset_type: AssetType;
  strategy: TradingStrategy;
  trend_indicator: TrendIndicator;
  momentum_indicator: MomentumIndicator;
  volume_indicator: VolumeIndicator;
}

export interface AIAnalysisResponse {
  summary: string;
  recommendation: "Beli" | "Jual" | "Tahan" | "Wait & See";
  riskLevel: "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";
  atrValue: number | null;
  signalStatus?:
    | "approved"
    | "rejected_against_major_trend"
    | "wait_for_major_trend"
    | "wait_for_execution_signal"
    | "rejected_invalid_risk_setup";
  anchorTrend?: "Bullish" | "Bearish" | "Neutral";
  anchorTrendMethod?: string;
  anchorTimeframe?: string;
  executionTimeframe?: string;
  stopMethod?: "atr" | "static_percentage";
  targetPrices?: {
    entryPrice: number;
    takeProfit: number;
    stopLoss: number;
    takeProfitPercent: number;
    stopLossPercent: number;
  };
  trendAnalysis: string;
  momentumAnalysis: string;
  volumeAnalysis: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

export type AIAnalysisFailureReason =
  "high_demand" | "daily_quota_exceeded" | "unknown";

export type AIAnalysisResult =
  | { success: true; data: AIAnalysisResponse }
  | { success: false; reason: AIAnalysisFailureReason | "history_save_failed" };

export const AI_ANALYSIS_FEEDBACK = [
  "success",
  "failure",
  "inconclusive",
] as const;
export const AI_ANALYSIS_EVALUATION_LIMIT = 150;
export type AIAnalysisFeedback = (typeof AI_ANALYSIS_FEEDBACK)[number];

export interface AIAnalysisHistoryEntry {
  id: string;
  symbol: string;
  asset_type: AssetType;
  strategy: TradingStrategy;
  timeframe: string;
  currency: Currency;
  trend_indicator: TrendIndicator;
  momentum_indicator: MomentumIndicator;
  volume_indicator: VolumeIndicator;
  recommendation: AIAnalysisResponse["recommendation"];
  risk_level: AIAnalysisResponse["riskLevel"];
  summary: string;
  analysis_result: AIAnalysisResponse;
  technical_snapshot: Record<string, unknown>;
  candle_count: number;
  feedback: AIAnalysisFeedback | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AIAnalysisHistorySummary {
  entries: AIAnalysisHistoryEntry[];
  totalRows: number;
  strategyMetrics: Record<TradingStrategy, AIAnalysisStrategyMetric>;
}

export interface AIAnalysisStrategyMetric {
  winRate: number | null;
  evaluatedCount: number;
  successfulCount: number;
  failureCount: number;
}
