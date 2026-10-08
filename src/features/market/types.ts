export type AssetType = "stocks" | "crypto";
export type TransactionType = "buy" | "sell";
export type Currency = "IDR" | "USD";

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

// Data Candlestick
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

// Input Form Transaksi Manual
export interface CreateMarketTransactionInput {
  symbol: string;
  asset_name: string;
  asset_type: AssetType;
  transaction_type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  currency: Currency;
  notes?: string;
}

// Kategori Indikator AI Agent
export type TrendIndicator = "SMA" | "EMA" | "SUPERTREND" | "ADX";
export type MomentumIndicator = "RSI" | "MACD" | "STOCHASTIC";
export type VolumeIndicator = "OBV" | "VWAP" | "VOLUME_PROFILE";

export interface AIAnalysisRequest {
  symbol: string;
  asset_type: AssetType;
  trend_indicator: TrendIndicator;
  momentum_indicator: MomentumIndicator;
  volume_indicator: VolumeIndicator;
}

export interface AIAnalysisResponse {
  summary: string;
  recommendation: "Beli" | "Jual" | "Tahan" | "Wait & See";
  riskLevel: "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";
  trendAnalysis: string;
  momentumAnalysis: string;
  volumeAnalysis: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}
