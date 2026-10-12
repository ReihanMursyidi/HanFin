import { z } from "zod";

// 1. DAFTAR ASET & OPTIONS UI
export interface StockAssetConfig {
  symbol: string;
  shortSymbol: string;
  name: string;
}

export interface CryptoAssetConfig {
  symbol: string;
  shortSymbol: string;
  name: string;
}

export const STOCK_ASSETS: StockAssetConfig[] = [
  { symbol: "^JKSE", shortSymbol: "IHSG", name: "Indeks Harga Saham Gabungan" },
  { symbol: "BBCA.JK", shortSymbol: "BBCA", name: "Bank Central Asia" },
  { symbol: "BBRI.JK", shortSymbol: "BBRI", name: "Bank Rakyat Indonesia" },
  { symbol: "BMRI.JK", shortSymbol: "BMRI", name: "Bank Mandiri" },
  { symbol: "TLKM.JK", shortSymbol: "TLKM", name: "Telkom Indonesia" },
  { symbol: "ASII.JK", shortSymbol: "ASII", name: "Astra International" },
];

export const CRYPTO_ASSETS: CryptoAssetConfig[] = [
  { symbol: "BTCUSDT", shortSymbol: "BTC", name: "Bitcoin" },
  { symbol: "ETHUSDT", shortSymbol: "ETH", name: "Ethereum" },
  { symbol: "BNBUSDT", shortSymbol: "BNB", name: "BNB" },
  { symbol: "XRPUSDT", shortSymbol: "XRP", name: "Ripple" },
  { symbol: "SOLUSDT", shortSymbol: "SOL", name: "Solana" },
  { symbol: "HYPEUSDT", shortSymbol: "HYPE", name: "Hyperliquid" },
];

export const UI_STOCK_OPTIONS = STOCK_ASSETS.map((s) => ({
  symbol: s.shortSymbol,
  name: s.name,
}));

export const UI_CRYPTO_OPTIONS = CRYPTO_ASSETS.map((c) => ({
  symbol: c.shortSymbol,
  name: c.name,
}));

// 2. CONSTANTS & ENUMS (TUPLE AS CONST)
export const ASSET_TYPES = ["stocks", "crypto"] as const;
export const TRANSACTION_TYPES = ["buy", "sell"] as const;
export const CURRENCIES = ["IDR", "USD"] as const;
export const TRADING_STRATEGIES = [
  "scalping",
  "day_trading",
  "swing_trading",
  "investing",
] as const;

export const TREND_INDICATORS = ["SMA", "EMA", "ADX"] as const;
export const MOMENTUM_INDICATORS = ["RSI", "MACD", "STOCHASTIC"] as const;
export const VOLUME_INDICATORS = ["OBV", "VWAP", "VOLUME_PROFILE"] as const;

// 3. ZOD SCHEMAS

// Schema Tambah Transaksi Pasar
export const createMarketTransactionSchema = z.object({
  symbol: z.string().min(1, "Simbol aset wajib diisi"),
  asset_name: z.string().min(1, "Nama aset wajib diisi"),
  asset_type: z.enum(ASSET_TYPES, {
    message: "Jenis pasar harus Saham atau Crypto",
  }),
  transaction_type: z.enum(TRANSACTION_TYPES, {
    message: "Tipe transaksi harus Beli atau Jual",
  }),
  quantity: z.number().positive("Jumlah unit/lot harus lebih besar dari 0"),
  price_per_unit: z
    .number()
    .positive("Harga per unit/lembar harus lebih besar dari 0"),
  total_amount: z
    .number()
    .positive("Total nominal transaksi harus lebih besar dari 0"),
  currency: z.enum(CURRENCIES).default("IDR"),
  notes: z.string().nullable().optional(),
});

// Schema Request AI Analysis
export const aiAnalysisRequestSchema = z.object({
  symbol: z.string().min(1, "Simbol aset wajib diisi"),
  asset_type: z.enum(ASSET_TYPES),
  strategy: z.enum(TRADING_STRATEGIES),
  trend_indicator: z.enum(TREND_INDICATORS),
  momentum_indicator: z.enum(MOMENTUM_INDICATORS),
  volume_indicator: z.enum(VOLUME_INDICATORS),
});

// Schema Response AI Analysis (Parsing Aman dari Gemini)
export const aiAnalysisResponseSchema = z.object({
  summary: z.string(),
  recommendation: z.enum(["Beli", "Jual", "Tahan", "Wait & See"]),
  riskLevel: z.enum([
    "Sangat Rendah",
    "Rendah",
    "Sedang",
    "Tinggi",
    "Sangat Tinggi",
  ]),
  targetPrices: z
    .object({
      entryPrice: z.number(),
      takeProfit: z.number(),
      stopLoss: z.number(),
    })
    .optional(),
  trendAnalysis: z.string(),
  momentumAnalysis: z.string(),
  volumeAnalysis: z.string(),
  keyLevels: z.object({
    support: z.array(z.number()),
    resistance: z.array(z.number()),
  }),
});

// 4. INFERRED TYPESCRIPT TYPES
export type AssetType = (typeof ASSET_TYPES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type TradingStrategy = (typeof TRADING_STRATEGIES)[number];
export type TrendIndicator = (typeof TREND_INDICATORS)[number];
export type MomentumIndicator = (typeof MOMENTUM_INDICATORS)[number];
export type VolumeIndicator = (typeof VOLUME_INDICATORS)[number];

export type CreateMarketTransactionInput = z.infer<
  typeof createMarketTransactionSchema
>;

export type AIAnalysisRequest = z.infer<typeof aiAnalysisRequestSchema>;
export type AIAnalysisResponse = z.infer<typeof aiAnalysisResponseSchema>;
