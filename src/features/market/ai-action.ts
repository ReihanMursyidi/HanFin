"use server";

import {
  aiAnalysisRequestSchema,
  aiAnalysisResponseSchema,
} from "@/constants/market-constant";
import { AIAnalysisRequest, AIAnalysisResponse, Currency } from "./types";
import {
  getStockChartData,
  getCryptoChartData,
  getExchangeRateUSDIDR,
} from "./market-data";
import { calculateTechnicalIndicators } from "./technical-analysis";
import { convertCurrency, formatCurrency } from "@/lib/format";
import { createAI } from "../ai/instance";

// ==== ANALISIS AI
export async function analyzeMarketWithAI(
  rawRequest: AIAnalysisRequest,
  currency: Currency = "IDR",
): Promise<AIAnalysisResponse> {
  const request = aiAnalysisRequestSchema.parse(rawRequest);

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

    return safeResponse.data;
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
