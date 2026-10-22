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
  targetPrices?: {
    entryPrice: number;
    takeProfit: number;
    stopLoss: number;
  };
  trendAnalysis: string;
  momentumAnalysis: string;
  volumeAnalysis: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}
