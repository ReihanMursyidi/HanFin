import { aiAnalysisResponseSchema } from "@/constants/market-constant";
import { AIAnalysisRequest, AIAnalysisResponse, Currency } from "./types";
import type { MarketAnalysisContext } from "./ai-analysis-context";
import { formatCurrency } from "@/lib/format";

const STATIC_STOP_LOSS_PERCENTAGES = {
  scalping: 1,
  day_trading: 1.5,
  swing_trading: 3,
  investing: 10,
} as const;


export function buildAnalysisPrompt(
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
    marketDataSource,
    momentumValidation,
    atrMultiplier,
    riskRewardRatio,
  } = context;

  return `
    Kamu adalah Analis Pasar Keuangan Profesional (Financial Market Predictor Agent).
    Analisis aset ${request.symbol} (${request.asset_type}) untuk metode **${request.strategy.toUpperCase()}**.
    MATA UANG TARGET ANALISIS: **${currency}**
    Seluruh harga dan level ditulis dalam mata uang **${currency}**.
    Sumber candle: **${marketDataSource}**.

    GAYA PENJELASAN:
    - Gunakan gaya penyampaian yang kasual dan tidak bertele-tele.
    - Jelaskan argumenmu dengan data angka yang tersedia.
    - Jelaskan arti sinyal berdasarkan data yang diberikan, bukan definisi umum yang panjang.
    - Jangan mengarang berita, alasan, angka, atau kondisi pasar yang tidak ada di data.
    - Hindari menyampaikan hasil sebagai kepastian; harga dapat bergerak berbeda dari perkiraan.

    KONDISI SINYAL TEKNIKAL:
    - Anchor Timeframe ${timeframe.anchor}: tren ${anchorTechData.trend.signal} memakai ${anchorTrendMethod}.
    - Execution Timeframe ${timeframe.execution}: sinyal lokal ${techData.consensusSignal}.
    - Skor konfluensi Execution: ${techData.bullishCount} bullish dan ${techData.bearishCount} bearish dari 3 indikator.
    - Filter kekuatan tren ADX di Execution Timeframe: ADX(${techData.adx.period}) = ${techData.adx.value === null ? "tidak tersedia" : techData.adx.value.toFixed(2)}, ambang > ${techData.adx.threshold}. Filter ${techData.adx.isStrong ? "lolos" : "tidak lolos"}.
    - Indikator momentum yang dipilih: ${request.momentum_indicator}. Validasi momentum dan potensi reversal: ${momentumValidation ? `${momentumValidation.isValid ? "lolos" : "gagal"} — ${momentumValidation.reason}` : "tidak dijalankan karena sinyal lokal netral"}.
    - Status validasi multi-timeframe: **${signalStatus}**
    - Rekomendasi sistem yang wajib digunakan: **${systemRecommendation}**
    Jangan mengubah status atau rekomendasi sistem.
    Jika ADX tidak tersedia atau nilainya tidak lebih besar dari ambang, rekomendasi wajib "Wait & See" dan jelaskan alasannya dengan bahasa sederhana.
    Jika validasi momentum dan reversal gagal, rekomendasi wajib "Wait & See" dan jangan memberikan target transaksi.

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
      "summary": "Maksimal 2-3 kalimat sederhana: apa yang terlihat, mengapa sistem memberi rekomendasi tersebut (termasuk filter ADX atau momentum/reversal jika gagal), dan risiko atau ketidakpastian utamanya.",
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

export function buildAnalysisResult(
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

  if (!context.techData.adx.isStrong) {
    const adxValue = context.techData.adx.value;
    summary +=
      adxValue === null
        ? ` Nilai ADX(${context.techData.adx.period}) belum tersedia dari data candle, sehingga sistem memilih Wait & See.`
        : ` ADX(${context.techData.adx.period}) pada timeframe eksekusi bernilai ${adxValue.toFixed(2)} dan belum melewati ambang > ${context.techData.adx.threshold}; sistem memilih Wait & See.`;
  }
  if (context.momentumValidation && !context.momentumValidation.isValid) {
    summary += ` ${context.momentumValidation.reason} Sistem memilih Wait & See.`;
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
