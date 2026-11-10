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
  OHLCData,
} from "./types";
import {
  getStockChartData,
  getCryptoChartData,
  getExchangeRateUSDIDR,
} from "./market-data";
import {
  calculateTechnicalIndicators,
  getStrategyTrendPeriods,
} from "./technical-analysis";
import { convertCurrency, formatCurrency } from "@/lib/format";
import { createAI } from "../ai/instance";
import { createClient } from "@/lib/supabase/server";

const RISK_PARAMETERS = {
  scalping: { atrMultiplier: 0.75, riskRewardRatio: 1.5 },
  day_trading: { atrMultiplier: 1.2, riskRewardRatio: 2 },
  swing_trading: { atrMultiplier: 2, riskRewardRatio: 3 },
  investing: { atrMultiplier: 3, riskRewardRatio: 4 },
} as const;

const TIMEFRAMES = {
  scalping: { anchor: "15m", execution: "5m", lookbackDays: 7 },
  day_trading: { anchor: "1h", execution: "30m", lookbackDays: 30 },
  swing_trading: { anchor: "1d", execution: "4h", lookbackDays: 365 * 3 },
  investing: { anchor: "1wk", execution: "1d", startDate: "2020-01-01" },
} as const;

const STATIC_STOP_LOSS_PERCENTAGES = {
  scalping: 1,
  day_trading: 1.5,
  swing_trading: 3,
  investing: 10,
} as const;

const YAHOO_INTRADAY_LOOKBACK_DAYS = 700;

type AnalysisInterval = "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1wk";
type StrategyTimeframe = (typeof TIMEFRAMES)[keyof typeof TIMEFRAMES];
type SignalStatus = NonNullable<AIAnalysisResponse["signalStatus"]>;
type MarketAnalysisContext = {
  timeframe: StrategyTimeframe;
  anchorCandles: OHLCData[];
  executionCandles: OHLCData[];
  anchorTechData: ReturnType<typeof calculateTechnicalIndicators>;
  techData: ReturnType<typeof calculateTechnicalIndicators>;
  signalStatus: SignalStatus;
  systemRecommendation: AIAnalysisResponse["recommendation"];
  convertedLastClose: number;
  formattedLastClose: string;
  convertedAtrValue: number | null;
  convertedFastValue: number | null;
  convertedSlowValue: number | null;
  convertedSupport: number[];
  convertedResistance: number[];
  anchorTrendMethod: string;
  atrMultiplier: number;
  riskRewardRatio: number;
};

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

async function prepareAnalysisContext(
  request: AIAnalysisRequest,
  currency: Currency,
): Promise<MarketAnalysisContext> {
  const timeframe = TIMEFRAMES[request.strategy];
  const endDate = new Date();
  const startDate =
    "startDate" in timeframe
      ? timeframe.startDate
      : new Date(
          endDate.getTime() - timeframe.lookbackDays * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .slice(0, 10);
  const stockExecutionStartDate =
    request.strategy === "swing_trading"
      ? new Date(
          endDate.getTime() -
            YAHOO_INTRADAY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .slice(0, 10)
      : startDate;
  const fetchCandles = (interval: AnalysisInterval, periodStart: string) =>
    request.asset_type === "crypto"
      ? getCryptoChartData(
          request.symbol,
          interval === "1wk" ? "1w" : interval,
          1000,
          Date.parse(periodStart),
        )
      : getStockChartData(request.symbol, periodStart, interval);
  const [anchorCandles, executionCandles] = await Promise.all([
    fetchCandles(timeframe.anchor, startDate),
    fetchCandles(timeframe.execution, stockExecutionStartDate),
  ]);
  if (anchorCandles.length < 10) {
    throw new Error(
      `Data ${timeframe.anchor} tidak cukup untuk menentukan tren utama.`,
    );
  }
  if (executionCandles.length < 10) {
    throw new Error(
      `Data ${timeframe.execution} tidak cukup untuk analisis eksekusi.`,
    );
  }

  const strategyTrendPeriods = getStrategyTrendPeriods(request.strategy);
  const anchorTrendOptions =
    request.trend_indicator !== "ADX" &&
    anchorCandles.length < strategyTrendPeriods.slowPeriod
      ? anchorCandles.length >= 20
        ? { indicator: "EMA" as const, fastPeriod: 20, slowPeriod: 20 }
        : { indicator: "SMA" as const, fastPeriod: 10, slowPeriod: 10 }
      : undefined;
  const anchorTechData = calculateTechnicalIndicators(
    anchorCandles,
    request,
    timeframe.anchor,
    anchorTrendOptions,
  );
  const techData = calculateTechnicalIndicators(
    executionCandles,
    request,
    timeframe.execution,
  );
  const localDirection =
    techData.consensusSignal === "Potensi Rebound (Bullish)"
      ? "Bullish"
      : techData.consensusSignal === "Potensi Koreksi (Bearish)"
        ? "Bearish"
        : null;
  let signalStatus: SignalStatus;
  if (anchorTechData.trend.signal === "Neutral") {
    signalStatus = "wait_for_major_trend";
  } else if (localDirection === null) {
    signalStatus = "wait_for_execution_signal";
  } else if (anchorTechData.trend.signal !== localDirection) {
    signalStatus = "rejected_against_major_trend";
  } else {
    signalStatus = "approved";
  }
  const systemRecommendation: AIAnalysisResponse["recommendation"] =
    signalStatus === "approved"
      ? localDirection === "Bullish"
        ? "Beli"
        : "Jual"
      : "Wait & See";
  const fxRate = await getExchangeRateUSDIDR();
  const baseCurrency: Currency =
    request.asset_type === "crypto" ? "USD" : "IDR";
  const convertedLastClose = convertCurrency(
    techData.lastClose,
    baseCurrency,
    currency,
    fxRate,
  );
  const convertedAtrValue =
    techData.atrValue === null
      ? null
      : convertCurrency(techData.atrValue, baseCurrency, currency, fxRate);
  const convertedFastValue = techData.trend.fastValue
    ? convertCurrency(techData.trend.fastValue, baseCurrency, currency, fxRate)
    : null;
  const convertedSlowValue = techData.trend.slowValue
    ? convertCurrency(techData.trend.slowValue, baseCurrency, currency, fxRate)
    : null;
  const convertedSupport = techData.keyLevels.support.map((value) =>
    convertCurrency(value, baseCurrency, currency, fxRate),
  );
  const convertedResistance = techData.keyLevels.resistance.map((value) =>
    convertCurrency(value, baseCurrency, currency, fxRate),
  );
  const anchorTrendMethod =
    anchorTechData.trend.name === "ADX"
      ? "ADX 14"
      : `${anchorTechData.trend.name} ${anchorTechData.trend.fastPeriod}/${anchorTechData.trend.slowPeriod}`;
  const { atrMultiplier, riskRewardRatio } = RISK_PARAMETERS[request.strategy];

  return {
    timeframe,
    anchorCandles,
    executionCandles,
    anchorTechData,
    techData,
    signalStatus,
    systemRecommendation,
    convertedLastClose,
    formattedLastClose: formatCurrency(convertedLastClose, currency),
    convertedAtrValue,
    convertedFastValue,
    convertedSlowValue,
    convertedSupport,
    convertedResistance,
    anchorTrendMethod,
    atrMultiplier,
    riskRewardRatio,
  };
}

function buildAnalysisPrompt(
  request: AIAnalysisRequest,
  currency: Currency,
  context: MarketAnalysisContext,
) {
  const {
    timeframe,
    anchorTechData,
    techData,
    signalStatus,
    systemRecommendation,
    formattedLastClose,
    convertedLastClose,
    convertedAtrValue,
    convertedFastValue,
    convertedSlowValue,
    convertedSupport,
    convertedResistance,
    anchorTrendMethod,
    atrMultiplier,
    riskRewardRatio,
  } = context;

  return `
    Kamu adalah Analis Pasar Keuangan Profesional (Financial Market Predictor Agent).
    Analisis aset ${request.symbol} (${request.asset_type}) untuk metode **${request.strategy.toUpperCase()}**.
    MATA UANG TARGET ANALISIS: **${currency}**
    Seluruh harga dan level ditulis dalam mata uang **${currency}**.

    GAYA PENJELASAN:
    - Penjelasan mudah dipahami oleh pemula dalam investasi atau trading.
    - Gunakan kalimat pendek dan kata-kata sehari-hari. Hindari jargon; jika istilah teknis perlu dipakai, jelaskan artinya dengan singkat.
    - Jelaskan arti sinyal berdasarkan data yang diberikan, bukan definisi umum yang panjang.
    - Jangan mengarang berita, alasan, angka, atau kondisi pasar yang tidak ada di data.
    - Hindari menyampaikan hasil sebagai kepastian; harga dapat bergerak berbeda dari perkiraan.

    KONDISI SINYAL TEKNIKAL:
    - Anchor Timeframe ${timeframe.anchor}: tren ${anchorTechData.trend.signal} memakai ${anchorTrendMethod}.
    - Execution Timeframe ${timeframe.execution}: sinyal lokal ${techData.consensusSignal}.
    - Skor konfluensi Execution: ${techData.bullishCount} bullish dan ${techData.bearishCount} bearish dari 3 indikator.
    - Status validasi multi-timeframe: **${signalStatus}**
    - Rekomendasi sistem yang wajib digunakan: **${systemRecommendation}**
    Jangan mengubah status atau rekomendasi sistem.

    DETAIL INDIKATOR (DALAM ${currency}):
    - Harga terakhir Execution TF: ${formattedLastClose} (angka: ${convertedLastClose})
    - ATR (14 RMA) Execution TF: ${convertedAtrValue === null ? "Tidak tersedia; gunakan stop loss statis darurat" : formatCurrency(convertedAtrValue, currency)}
    - Stop loss statis darurat jika ATR tidak tersedia: ${STATIC_STOP_LOSS_PERCENTAGES[request.strategy]}% dari harga entry.
    - Parameter risiko: Multiplier ATR ${atrMultiplier}x, Rasio R:R 1:${riskRewardRatio}
    - Trend Execution (${techData.trend.name}): ${techData.trend.signal}, Fast ${convertedFastValue === null ? "-" : formatCurrency(convertedFastValue, currency)}, Slow ${convertedSlowValue === null ? "-" : formatCurrency(convertedSlowValue, currency)}.
    - Momentum (${techData.momentum.name}): RSI ${techData.momentum.rsiValue?.toFixed(2)}, Sinyal ${techData.momentum.signal}
    - Volume (${techData.volume.name}): Sinyal ${techData.volume.signal}
    - Support Execution terdekat: [${convertedSupport.join(", ")}]
    - Resistance Execution terdekat: [${convertedResistance.join(", ")}]

    Jika status APPROVED, sistem menghitung entry dari harga terakhir Execution TF, SL dari ATR dan support/resistance (atau stop statis darurat), dan TP dari rasio R:R. Jika tidak APPROVED, jangan berikan target transaksi.
    Saat menjelaskan istilah: tren utama adalah arah pergerakan yang lebih besar; timeframe eksekusi adalah rentang yang dipakai untuk mencari titik transaksi; support adalah area harga yang berpotensi menahan penurunan; resistance adalah area yang berpotensi menahan kenaikan; ATR menggambarkan besar-kecilnya gerakan harga. Gunakan penjelasan ini secara singkat hanya jika istilah tersebut disebut.

    Berikan JSON murni sesuai skema:
    {
      "summary": "Maksimal 2-3 kalimat sederhana: apa yang terlihat, mengapa sistem memberi rekomendasi tersebut, dan risiko atau ketidakpastian utamanya.",
      "recommendation": "Beli" | "Jual" | "Tahan" | "Wait & See",
      "riskLevel": "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi",
      "trendAnalysis": "Maksimal 2 kalimat sederhana tentang arah tren utama dan arah harga pada timeframe eksekusi. Jelaskan istilah yang digunakan.",
      "momentumAnalysis": "Maksimal 2 kalimat sederhana tentang apakah gerakan harga terlihat menguat atau melemah. Jelaskan RSI dengan bahasa sehari-hari jika menyebutnya.",
      "volumeAnalysis": "Maksimal 2 kalimat sederhana tentang ramai atau tidaknya aktivitas transaksi dan apakah sinyal volume mendukung pergerakan. Jangan menyimpulkan akumulasi atau distribusi tanpa bukti di data.",
      "keyLevels": {
        "support": [number, number],
        "resistance": [number, number]
      }
    }
  `;
}

function buildAnalysisResult(
  aiResponse: ReturnType<typeof aiAnalysisResponseSchema.parse>,
  request: AIAnalysisRequest,
  context: MarketAnalysisContext,
): AIAnalysisResponse {
  let recommendation = context.systemRecommendation;
  let signalStatus = context.signalStatus;
  let targetPrices: AIAnalysisResponse["targetPrices"];
  let stopMethod: AIAnalysisResponse["stopMethod"];
  let summary = aiResponse.summary;
  const isLong = recommendation === "Beli";
  const isShort = recommendation === "Jual";

  if (isLong || isShort) {
    const entryPrice = context.convertedLastClose;
    const keyLevel = isLong
      ? context.convertedSupport[0]
      : context.convertedResistance[0];
    const atrBuffer =
      context.convertedAtrValue === null
        ? null
        : context.atrMultiplier * context.convertedAtrValue;
    const staticRiskDistance =
      entryPrice * (STATIC_STOP_LOSS_PERCENTAGES[request.strategy] / 100);
    const stopLoss =
      atrBuffer !== null
        ? isLong
          ? keyLevel - atrBuffer
          : keyLevel + atrBuffer
        : isLong
          ? entryPrice - staticRiskDistance
          : entryPrice + staticRiskDistance;
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const profitDistance = riskDistance * context.riskRewardRatio;
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
      riskDistance > 0 &&
      (isLong
        ? stopLoss < entryPrice && takeProfit > entryPrice
        : takeProfit < entryPrice && stopLoss > entryPrice)
    ) {
      targetPrices = {
        entryPrice,
        stopLoss,
        takeProfit,
        stopLossPercent: (riskDistance / entryPrice) * 100,
        takeProfitPercent: (profitDistance / entryPrice) * 100,
      };
      stopMethod = atrBuffer === null ? "static_percentage" : "atr";
      if (atrBuffer === null) {
        summary += ` ATR 14 pada Execution Timeframe tidak tersedia; stop loss darurat ${STATIC_STOP_LOSS_PERCENTAGES[request.strategy]}% digunakan.`;
      }
    } else {
      recommendation = "Wait & See";
      signalStatus = "rejected_invalid_risk_setup";
      summary +=
        " Setup transaksi dibatalkan karena perhitungan level risiko menghasilkan harga yang tidak valid.";
    }
  }

  return {
    ...aiResponse,
    recommendation,
    summary,
    atrValue: context.convertedAtrValue,
    signalStatus,
    anchorTrend: context.anchorTechData.trend.signal,
    anchorTrendMethod: context.anchorTrendMethod,
    anchorTimeframe: context.timeframe.anchor,
    executionTimeframe: context.timeframe.execution,
    stopMethod,
    targetPrices,
    keyLevels: {
      support: context.convertedSupport,
      resistance: context.convertedResistance,
    },
  };
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

  const context = await prepareAnalysisContext(request, currency);
  const prompt = buildAnalysisPrompt(request, currency, context);

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

    const analysisResult = buildAnalysisResult(
      safeResponse.data,
      request,
      context,
    );

    if (
      analysisResult.signalStatus === "approved" &&
      analysisResult.targetPrices
    ) {
      const { error: saveError } = await supabase
        .from("ai_market_analysis_history")
        .insert({
          user_id: user.id,
          symbol: request.symbol,
          asset_type: request.asset_type,
          strategy: request.strategy,
          timeframe: context.timeframe.execution,
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
            anchorTimeframe: context.timeframe.anchor,
            executionTimeframe: context.timeframe.execution,
            anchorIndicators: context.anchorTechData.trend,
            indicators: context.techData,
            atrValue: context.convertedAtrValue,
            riskParameters: {
              atrMultiplier: context.atrMultiplier,
              riskRewardRatio: context.riskRewardRatio,
            },
            stopMethod: analysisResult.stopMethod,
          },
          candle_snapshot: {
            anchor: context.anchorCandles,
            execution: context.executionCandles,
          },
          candle_count:
            context.anchorCandles.length + context.executionCandles.length,
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
