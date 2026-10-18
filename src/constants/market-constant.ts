import { z } from "zod";

// 1. DAFTAR ASET & OPTIONS UI
export interface AssetConfig {
  symbol: string;
  shortSymbol: string;
  name: string;
  isTradeable?: boolean;
}

export const STOCK_ASSETS: AssetConfig[] = [
  {
    symbol: "^JKSE",
    shortSymbol: "IHSG",
    name: "Indeks Harga Saham Gabungan",
    isTradeable: false,
  },
  {
    symbol: "BBCA.JK",
    shortSymbol: "BBCA",
    name: "Bank Central Asia",
    isTradeable: true,
  },
  {
    symbol: "DCII.JK",
    shortSymbol: "DCII",
    name: "DCI Indonesia",
    isTradeable: true,
  },
  {
    symbol: "BREN.JK",
    shortSymbol: "BREN",
    name: "Barito Renewables Energy",
    isTradeable: true,
  },
  {
    symbol: "TLKM.JK",
    shortSymbol: "TLKM",
    name: "Telkom Indonesia",
    isTradeable: true,
  },
  {
    symbol: "ASII.JK",
    shortSymbol: "ASII",
    name: "Astra International",
    isTradeable: true,
  },
  {
    symbol: "BBRI.JK",
    shortSymbol: "BBRI",
    name: "Bank Rakyat Indonesia",
    isTradeable: true,
  },
  {
    symbol: "BMRI.JK",
    shortSymbol: "BMRI",
    name: "Bank Mandiri",
    isTradeable: true,
  },
];

export const CRYPTO_ASSETS: AssetConfig[] = [
  { symbol: "BTCUSDT", shortSymbol: "BTC", name: "Bitcoin", isTradeable: true },
  {
    symbol: "ETHUSDT",
    shortSymbol: "ETH",
    name: "Ethereum",
    isTradeable: true,
  },
  { symbol: "BNBUSDT", shortSymbol: "BNB", name: "BNB", isTradeable: true },
  { symbol: "XRPUSDT", shortSymbol: "XRP", name: "Ripple", isTradeable: true },
  { symbol: "SOLUSDT", shortSymbol: "SOL", name: "Solana", isTradeable: true },
  { symbol: "TRXUSDT", shortSymbol: "TRX", name: "TRON", isTradeable: true },
  {
    symbol: "HYPEUSDT",
    shortSymbol: "HYPE",
    name: "Hyperliquid",
    isTradeable: true,
  },
];

export const UI_STOCK_OPTIONS = STOCK_ASSETS.map((s) => ({
  symbol: s.shortSymbol,
  name: s.name,
}));

export const UI_CRYPTO_OPTIONS = CRYPTO_ASSETS.map((c) => ({
  symbol: c.shortSymbol,
  name: c.name,
}));

// Mengecualikan IHSG
export const UI_TRADEABLE_STOCK_OPTIONS = STOCK_ASSETS.filter(
  (s) => s.isTradeable !== false,
).map((s) => ({
  symbol: s.shortSymbol,
  name: s.name,
}));

export function getAssetLogoUrl(symbol: string, assetType: string): string {
  const cleanSymbol = symbol
    .toUpperCase()
    .replace(".JK", "")
    .replace("USDT", "");

  if (assetType === "crypto") {
    return `https://assets.coincap.io/assets/icons/${cleanSymbol.toLowerCase()}@2x.png`;
  }

  const stockLogos: Record<string, string> = {
    IHSG: "https://s3-symbol-logo.tradingview.com/indices/jakarta-composite-index--big.svg",
    BBCA: "https://s3-symbol-logo.tradingview.com/bank-central-asia--big.svg",
    DCII: "https://s3-symbol-logo.tradingview.com/dci-indonesia-tbk--big.svg",
    BREN: "https://s3-symbol-logo.tradingview.com/barito-pacific--big.svg",
    TLKM: "https://s3-symbol-logo.tradingview.com/telekom-indonesia--big.svg",
    ASII: "https://s3-symbol-logo.tradingview.com/astra-international--big.svg",
  };

  return stockLogos[cleanSymbol] || "";
}

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
    message: "Jenis pasar harus Saham atau Kripto",
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
