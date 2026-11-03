"use server";

import { ApiError } from "@google/genai";
import { revalidatePath } from "next/cache";
import {
  aiAnalysisRequestSchema,
  aiAnalysisResponseSchema,
} from "@/constants/market-constant";
import {
  AIAnalysisFailureReason,
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIAnalysisResult,
  Currency,
} from "./types";
import {
  getStockChartData,
  getCryptoChartData,
  getExchangeRateUSDIDR,
} from "./market-data";
import { calculateTechnicalIndicators } from "./technical-analysis";
import { convertCurrency, formatCurrency } from "@/lib/format";
import { createAI } from "../ai/instance";
import { createClient } from "@/lib/supabase/server";

const RISK_PARAMETERS = {
  scalping: { atrMultiplier: 0.75, riskRewardRatio: 1.5 },
  day_trading: { atrMultiplier: 1.2, riskRewardRatio: 2 },
  swing_trading: { atrMultiplier: 2, riskRewardRatio: 3 },
  investing: { atrMultiplier: 3, riskRewardRatio: 4 },
} as const;

function getAIAnalysisFailureReason(error: unknown): AIAnalysisFailureReason {
  if (!(error instanceof ApiError)) return "unknown";

  const message = error.message.toLowerCase();
  const dailyQuotaError =
    /(per day|daily|tokens? per day|quota.*day|day.*quota|_per_day)/i.test(
      message,
    );

  if (error.status === 429 && dailyQuotaError) {
    return "daily_quota_exceeded";
  }

  if (
    error.status === 429 ||
    error.status === 503 ||
    /(high demand|overloaded|temporarily unavailable)/i.test(message)
  ) {
    return "high_demand";
  }

  return "unknown";
}

export async function analyzeMarketWithAI(
  rawRequest: AIAnalysisRequest,
  currency: Currency = "IDR",
): Promise<AIAnalysisResult> {
  const request = aiAnalysisRequestSchema.parse(rawRequest);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let cryptoInterval: string = "1d";
  let stockInterval: "1d" | "1wk" | "1mo" | "1h" | "15m" = "1d";
  let period1 = "2024-01-01";
  let cryptoStartTime: number | undefined;

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
  } else if (request.strategy === "swing_trading") {
    const threeYearsAgo = new Date();
    threeYearsAgo.setUTCFullYear(threeYearsAgo.getUTCFullYear() - 3);
    period1 = threeYearsAgo.toISOString().split("T")[0];
    cryptoStartTime = Date.parse(period1);
  }

  let candles =
    request.asset_type === "crypto"
      ? await getCryptoChartData(
          request.symbol,
          cryptoInterval,
          150,
          cryptoStartTime,
        )
      : await getStockChartData(request.symbol, period1, stockInterval);

  let activeInterval: string =
    request.asset_type === "crypto" ? cryptoInterval : stockInterval;

  if (!candles || candles.length < 20) {
    activeInterval = "1d";
    candles =
      request.asset_type === "crypto"
        ? await getCryptoChartData(request.symbol, "1d", 100, cryptoStartTime)
        : await getStockChartData(request.symbol, period1, "1d");
  }

  const fxRate = await getExchangeRateUSDIDR();
  const baseCurrency: Currency =
    request.asset_type === "crypto" ? "USD" : "IDR";

  const techData = calculateTechnicalIndicators(
    candles,
    request,
    activeInterval,
  );
  if (techData.atrValue === null) {
    throw new Error(
      "Data candlestick tidak mencukupi untuk menghitung ATR 14.",
    );
  }

  const convertedLastClose = convertCurrency(
    techData.lastClose,
    baseCurrency,
    currency,
    fxRate,
  );
  const formattedLastClose = formatCurrency(convertedLastClose, currency);
  const convertedAtrValue = convertCurrency(
    techData.atrValue,
    baseCurrency,
    currency,
    fxRate,
  );
  const { atrMultiplier, riskRewardRatio } = RISK_PARAMETERS[request.strategy];

  const convertedFastValue = techData.trend.fastValue
    ? convertCurrency(techData.trend.fastValue, baseCurrency, currency, fxRate)
    : null;
  const convertedSlowValue = techData.trend.slowValue
    ? convertCurrency(techData.trend.slowValue, baseCurrency, currency, fxRate)
    : null;

  const convertedSupport = techData.keyLevels.support.map((val) =>
    convertCurrency(val, baseCurrency, currency, fxRate),
  );
  const convertedResistance = techData.keyLevels.resistance.map((val) =>
    convertCurrency(val, baseCurrency, currency, fxRate),
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
    - ATR (14 RMA): ${formatCurrency(convertedAtrValue, currency)}
    - Parameter risiko strategi: Multiplier ATR ${atrMultiplier}x, Rasio R:R 1:${riskRewardRatio}
    - Trend (${techData.trend.name} ${techData.trend.fastPeriod}/${techData.trend.slowPeriod}): Fast ${convertedFastValue ? formatCurrency(convertedFastValue, currency) : "-"}, Slow ${convertedSlowValue ? formatCurrency(convertedSlowValue, currency) : "-"}, Status (${techData.trend.crossoverStatus})
    - Momentum (${techData.momentum.name}): RSI ${techData.momentum.rsiValue?.toFixed(2)}, Sinyal ${techData.momentum.signal}
    - Volume (${techData.volume.name}): Sinyal ${techData.volume.signal}
    - Level Support Terdekat (${currency}): [${convertedSupport.join(", ")}]
    - Level Resistance Terdekat (${currency}): [${convertedResistance.join(", ")}]

    ATURAN KETAT TARGET PRICES & MANAJEMEN RISIKO (DALAM ${currency}):
    1. JIKA REKOMENDASI ADALAH "Beli" ATAU "Jual":
      - Gunakan "entryPrice" sama dengan harga terakhir (${convertedLastClose}).
      - Stop loss dan take profit akhir akan dihitung oleh sistem menggunakan ATR 14 RMA, level support/resistance terdekat, multiplier ATR ${atrMultiplier}x, dan rasio R:R 1:${riskRewardRatio}. Jangan mengubah parameter ini.
    2. JIKA REKOMENDASI ADALAH "Wait & See" ATAU "Tahan" (misalnya rasio R:R 1:${riskRewardRatio} tidak sesuai kondisi pasar atau pasar konsolidasi):
      - DILARANG MENERBITKAN FIELD "targetPrices"! Jangan masukkan objek "targetPrices" pada JSON response karena tidak ada setup transaksi yang aktif.

    Berikan jawaban JSON murni sesuai skema. Jangan menghitung targetPrices; sistem akan menghitungnya untuk rekomendasi Beli/Jual:
    {
      "summary": "Ringkasan kesimpulan sinyal dalam 1-2 kalimat.",
      "recommendation": "Beli" | "Jual" | "Tahan" | "Wait & See",
      "riskLevel": "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi",
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
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    const safeResponse = aiAnalysisResponseSchema.safeParse(parsedJson);

    if (!safeResponse.success) {
      console.error("AI Response Schema Invalid:", safeResponse.error.format());
      throw new Error("Respon AI tidak sesuai format skema");
    }

    let recommendation = safeResponse.data.recommendation;
    const isLong = recommendation === "Beli";
    const isShort = recommendation === "Jual";
    let targetPrices: AIAnalysisResponse["targetPrices"];
    let summary = safeResponse.data.summary;

    if (isLong || isShort) {
      const entryPrice = convertedLastClose;
      const keyLevel = isLong ? convertedSupport[0] : convertedResistance[0];
      const atrBuffer = atrMultiplier * convertedAtrValue;
      const stopLoss = isLong ? keyLevel - atrBuffer : keyLevel + atrBuffer;
      const riskDistance = Math.abs(entryPrice - stopLoss);
      const profitDistance = riskDistance * riskRewardRatio;
      const takeProfit = isLong
        ? entryPrice + profitDistance
        : entryPrice - profitDistance;

      if (
        [entryPrice, stopLoss, takeProfit, riskDistance, profitDistance].every(
          Number.isFinite,
        ) &&
        entryPrice > 0 &&
        stopLoss > 0 &&
        takeProfit > 0 &&
        riskDistance > 0
      ) {
        targetPrices = {
          entryPrice,
          stopLoss,
          takeProfit,
          stopLossPercent: (riskDistance / entryPrice) * 100,
          takeProfitPercent: (profitDistance / entryPrice) * 100,
        };
      } else {
        recommendation = "Wait & See";
        summary +=
          " Setup transaksi dibatalkan karena perhitungan ATR menghasilkan level harga yang tidak valid.";
      }
    }

    const analysisResult: AIAnalysisResponse = {
      ...safeResponse.data,
      recommendation,
      summary,
      atrValue: convertedAtrValue,
      targetPrices,
      keyLevels: {
        support: convertedSupport,
        resistance: convertedResistance,
      },
    };

    if (analysisResult.recommendation !== "Wait & See") {
      const { error: saveError } = await supabase
        .from("ai_market_analysis_history")
        .insert({
          user_id: user.id,
          symbol: request.symbol,
          asset_type: request.asset_type,
          strategy: request.strategy,
          timeframe: activeInterval,
          currency,
          trend_indicator: request.trend_indicator,
          momentum_indicator: request.momentum_indicator,
          volume_indicator: request.volume_indicator,
          recommendation: analysisResult.recommendation,
          risk_level: analysisResult.riskLevel,
          summary: analysisResult.summary,
          analysis_result: analysisResult,
          technical_snapshot: {
            request: {
              trend_indicator: request.trend_indicator,
              momentum_indicator: request.momentum_indicator,
              volume_indicator: request.volume_indicator,
            },
            indicators: techData,
            atrValue: convertedAtrValue,
            riskParameters: { atrMultiplier, riskRewardRatio },
          },
          candle_snapshot: candles,
          candle_count: candles.length,
        });

      if (saveError) {
        console.error("AI Analysis History Save Error:", saveError);
        return { success: false, reason: "history_save_failed" };
      }

      revalidatePath("/home/financial-market/ai-history");
    }

    return { success: true, data: analysisResult };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { success: false, reason: getAIAnalysisFailureReason(error) };
  }
}
