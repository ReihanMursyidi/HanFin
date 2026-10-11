"use server";

import { revalidatePath } from "next/cache";
import {
  getCryptoChartData,
  getCryptoMarketData,
  getExchangeRateUSDIDR,
  getStockChartData,
  getStockMarketData,
} from "./market-data";
import type {
  AIAnalysisRequest,
  AIAnalysisResponse,
  AssetType,
  CreateMarketTransactionInput,
  Currency,
  MarketTransaction,
  OHLCData,
  PortfolioAsset,
} from "./types";
import { createClient } from "@/lib/supabase/server";
import { convertCurrency, formatCurrency } from "@/lib/format";
import { calculateTechnicalIndicators } from "./technical-analysis";
import { createAI } from "../ai/instance";

// Server Action untuk mengambil data candlestick berdasarkan timeframe
export async function getMarketChartData(
  symbol: string,
  assetType: AssetType,
  timeframe: "1D" | "1W" | "1M" = "1D",
): Promise<OHLCData[]> {
  if (assetType === "crypto") {
    const intervalMap: Record<string, string> = {
      "1D": "1d",
      "1W": "1w",
      "1M": "1M",
    };
    const interval = intervalMap[timeframe] || "1d";
    return getCryptoChartData(symbol, interval, 100);
  } else {
    const intervalMap: Record<string, "1d" | "1wk" | "1mo"> = {
      "1D": "1d",
      "1W": "1wk",
      "1M": "1mo",
    };
    const period1Map: Record<string, string> = {
      "1D": "2024-01-01",
      "1W": "2022-01-01",
      "1M": "2019-01-01",
    };
    const interval = intervalMap[timeframe] || "1d";
    const period1 = period1Map[timeframe] || "2024-01-01";
    return getStockChartData(symbol, period1, interval);
  }
}

// ==== PORTOFOLIO: READ & CALCULATE PnL ====
export async function getPortfolioAssets(
  assetType: AssetType,
  userCurrency: Currency = "IDR",
  fxRateOverride?: number,
): Promise<PortfolioAsset[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: assets, error } = await supabase
    .from("portfolio_assets")
    .select("*")
    .eq("asset_type", assetType)
    .gt("total_quantity", 0)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch portfolio: ${error.message}`);
  if (!assets || assets.length === 0) return [];

  const fxRate = fxRateOverride || (await getExchangeRateUSDIDR());
  const marketData =
    assetType === "crypto"
      ? await getCryptoMarketData()
      : await getStockMarketData();

  return assets.map((asset): PortfolioAsset => {
    const marketItem = marketData.find(
      (m) => m.symbol.toUpperCase() === asset.symbol.toUpperCase(),
    );

    const baseMarketCurrency: Currency = assetType === "crypto" ? "USD" : "IDR";
    const rawMarketPrice = marketItem?.price || Number(asset.avg_buy_price);

    const currentPriceInUserCurrency = convertCurrency(
      rawMarketPrice,
      baseMarketCurrency,
      userCurrency,
      fxRate,
    );

    const assetDBCurrency: Currency =
      (asset.currency as Currency) || baseMarketCurrency;
    const avgBuyPriceInUserCurrency = convertCurrency(
      Number(asset.avg_buy_price),
      assetDBCurrency,
      userCurrency,
      fxRate,
    );

    const quantity = Number(asset.total_quantity);
    const currentValue = quantity * currentPriceInUserCurrency;
    const totalCost = quantity * avgBuyPriceInUserCurrency;
    const unrealizedPnl = currentValue - totalCost;
    const unrealizedPnlPercent =
      totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

    return {
      ...asset,
      currency: userCurrency,
      total_quantity: quantity,
      avg_buy_price: avgBuyPriceInUserCurrency,
      current_price: currentPriceInUserCurrency,
      current_value: currentValue,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent,
    };
  });
}

// ==== TRANSAKSI: READ HISTORY ====
export async function getMarketTransactions(
  assetType: AssetType,
  limit: number = 20,
): Promise<MarketTransaction[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("market_transactions")
    .select("*")
    .eq("asset_type", assetType)
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  return (data || []).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    price_per_unit: Number(item.price_per_unit),
    total_amount: Number(item.total_amount),
  }));
}

// ==== TRANSAKSI: CREATE (BUY / SELL) ====
export async function createMarketTransaction(
  input: CreateMarketTransactionInput,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (input.quantity <= 0 || input.price_per_unit <= 0) {
    throw new Error("Jumlah unit dan harga per unit harus lebih besar dari 0");
  }

  const payload = {
    user_id: user.id,
    symbol: input.symbol.toUpperCase(),
    asset_name: input.asset_name,
    asset_type: input.asset_type,
    transaction_type: input.transaction_type,
    quantity: input.quantity,
    price_per_unit: input.price_per_unit,
    total_amount: input.total_amount || input.quantity * input.price_per_unit,
    currency: input.currency,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from("market_transactions")
    .insert(payload)
    .select()
    .single();

  if (error)
    throw new Error(`Failed to create market transaction: ${error.message}`);

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");

  return data;
}

// ==== TRANSAKSI: DELETE ====
export async function deleteMarketTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("market_transactions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");

  return true;
}

export async function analyzeMarketWithAI(
  request: AIAnalysisRequest,
  currency: Currency = "IDR",
): Promise<AIAnalysisResponse> {
  let cryptoInterval: string = "1d";
  let stockInterval: "1d" | "1wk" | "1mo" | "1h" | "15m" = "1d";
  let period1 = "2024-01-01";

  if (request.strategy === "scalping") {
    cryptoInterval = "15m";
    stockInterval = "15m";
    period1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  } else if (request.strategy === "day_trading") {
    cryptoInterval = "1h";
    stockInterval = "1h";
    period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  } else if (request.strategy === "investing") {
    cryptoInterval = "1w";
    stockInterval = "1wk";
    period1 = "2020-01-01";
  }

  // Fetch Candlesticks Sesuai Tipe Pasar
  let candles =
    request.asset_type === "crypto"
      ? await getCryptoChartData(request.symbol, cryptoInterval, 150)
      : await getStockChartData(request.symbol, period1, stockInterval);

  let activeInterval: string =
    request.asset_type === "crypto" ? cryptoInterval : stockInterval;

  if (!candles || candles.length < 20) {
    activeInterval = "1d";
    candles =
      request.asset_type === "crypto"
        ? await getCryptoChartData(request.symbol, "1d", 100)
        : await getStockChartData(request.symbol, "2024-01-01", "1d");
  }

  // Ambil Kurs FX & Tentukan Base Currency Asli Aset
  const fxRate = await getExchangeRateUSDIDR();
  const baseCurrency: Currency =
    request.asset_type === "crypto" ? "USD" : "IDR";

  // Kalkulasi Indikator & Format Harga
  const techData = calculateTechnicalIndicators(
    candles,
    request,
    activeInterval,
  );

  const convertedLastClose = convertCurrency(
    techData.lastClose,
    baseCurrency,
    currency,
    fxRate,
  );

  const formattedLastClose = formatCurrency(convertedLastClose, currency);

  const convertedFastValue = techData.trend.fastValue
    ? convertCurrency(techData.trend.fastValue, baseCurrency, currency, fxRate)
    : null;
  const convertedSlowValue = techData.trend.slowValue
    ? convertCurrency(techData.trend.slowValue, baseCurrency, currency, fxRate)
    : null;

  const convertedSupport = techData.keyLevels.support.map((val) =>
    Math.round(convertCurrency(val, baseCurrency, currency, fxRate)),
  );
  const convertedResistance = techData.keyLevels.resistance.map((val) =>
    Math.round(convertCurrency(val, baseCurrency, currency, fxRate)),
  );

  const prompt = `
    Kamu adalah Analis Pasar Keuangan Profesional (Financial Market Predictor Agent).
    Analisis aset ${request.symbol} (${request.asset_type}) untuk metode **${request.strategy.toUpperCase()}** (Timeframe ${techData.timeframeUsed}).

    MATA UANG TARGET ANALISIS: **${currency}**
    Seluruh harga, batas support/resistance, dan rekomendasi targetPrices HARUS ditulis dalam mata uang **${currency}**.

    KONDISI SINYAL TEKNIKAL:
    - Skor Konfluensi: ${techData.bullishCount > techData.bearishCount ? `${techData.bullishCount} dari 3 Sinyal Bullish` : `${techData.bearishCount} dari 3 Sinyal Bearish`}
    - Konsensus Algoritma: **${techData.consensusSignal}**

    DETAIL INDIKATOR (DALAM ${currency}):
    - Harga Terakhir: ${formattedLastClose} (Angka murni: ${convertedLastClose})
    - Trend (${techData.trend.name} ${techData.trend.fastPeriod}/${techData.trend.slowPeriod}): Fast ${convertedFastValue ? formatCurrency(convertedFastValue, currency) : "-"}, Slow ${convertedSlowValue ? formatCurrency(convertedSlowValue, currency) : "-"}, Status (${techData.trend.crossoverStatus})
    - Momentum (${techData.momentum.name}): RSI ${techData.momentum.rsiValue?.toFixed(2)}, Sinyal ${techData.momentum.signal}
    - Volume (${techData.volume.name}): Sinyal ${techData.volume.signal}
    - Level Support Terdekat (${currency}): [${convertedSupport.join(", ")}]
    - Level Resistance Terdekat (${currency}): [${convertedResistance.join(", ")}]

    ATURAN LIMIT ORDER (HARGA BELI & JUAL DALAM ${currency}):
    1. Tentukan "entryPrice" (Harga Beli) rasional mendekati area Support terdekat atau harga penutupan terakhir (${currency}).
    2. Tentukan "takeProfit" (Harga Jual) mendekati area Resistance terdekat (${currency}).
    3. Tentukan "stopLoss" sedikit di bawah level Support terdekat untuk mengontrol risiko (${currency}).
    4. Seluruh angka pada "targetPrices" harus berupa NOMOR MURNI (number) dalam mata uang ${currency} tanpa simbol/teks agar dapat diproses oleh sistem.

    ATURAN FORMAT PENULISAN TEKS:
    1. Selalu sebutkan nominal harga/level teknikal dalam teks analisis menggunakan format mata uang ${currency} (${currency === "IDR" ? "Rupiah seperti Rp 1.600.000.000" : "Dollar seperti $95,000"}).
    2. Jelaskan makna konfluensi indikator secara alami tanpa istilah teknis kaku.

    Berikan jawaban JSON murni sesuai skema:
    {
      "summary": "Ringkasan kesimpulan sinyal dalam 1-2 kalimat.",
      "recommendation": "Beli" | "Jual" | "Tahan" | "Wait & See",
      "riskLevel": "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi",
      "targetPrices": {
        "entryPrice": number,
        "takeProfit": number,
        "stopLoss": number
      },
      "trendAnalysis": "Penjelasan rinci tren.",
      "momentumAnalysis": "Penjelasan rinci momentum.",
      "volumeAnalysis": "Penjelasan rinci akumulasi/distribusi volume.",
      "keyLevels": {
        "support": [number, number],
        "resistance": [number, number]
      }
    }
  `;

  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AIAnalysisResponse;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: "Gagal memproses analisis AI untuk saat ini.",
      recommendation: "Wait & See",
      riskLevel: "Sedang",
      trendAnalysis: "Analisis tren tidak tersedia.",
      momentumAnalysis: "Analisis momentum tidak tersedia.",
      volumeAnalysis: "Analisis volume tidak tersedia.",
      keyLevels: { support: [], resistance: [] },
    };
  }
}
