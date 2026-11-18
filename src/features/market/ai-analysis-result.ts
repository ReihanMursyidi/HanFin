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

function formatSummaryParagraphs(
  aiSummary: string,
  systemNotes: string[],
): string {
  const normalizedBase = aiSummary
    .replace(/Sistem memilih Wait & See[.!]?/gi, "")
    .replace(/sistem memilih Wait & See[.!]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = normalizedBase
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 1) {
    const sentences = paragraphs[0].match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
    if (sentences && sentences.length >= 3) {
      const cleanedSentences = sentences
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const midpoint = Math.ceil(cleanedSentences.length / 2);
      paragraphs.splice(
        0,
        1,
        cleanedSentences.slice(0, midpoint).join(" "),
        cleanedSentences.slice(midpoint).join(" "),
      );
    }
  }

  if (paragraphs.length === 0 && aiSummary.trim()) {
    paragraphs.push(aiSummary.trim());
  }

  const uniqueNotes = [
    ...new Set(systemNotes.map((note) => note.trim()).filter(Boolean)),
  ];
  if (uniqueNotes.length > 0) {
    paragraphs.push(uniqueNotes.join(" "));
  }

  return paragraphs
    .map((paragraph) => paragraph.replace(/\s+\./g, ".").trim())
    .join("\n\n");
}

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
    sidewaysSignal,
    anchorRsiBlockReason,
    atrMultiplier,
    riskRewardRatio,
  } = context;
  const anchorMomentumGuidance =
    request.momentum_indicator === "RSI"
      ? `RSI(${anchorTechData.rsi.period}) Anchor Timeframe ${timeframe.anchor}: ${anchorTechData.rsi.value?.toFixed(2) ?? "tidak tersedia"}. Filter RSI Anchor: ${anchorRsiBlockReason ?? "tidak menahan sinyal berdasarkan batas ekstrem."}`
      : `${request.momentum_indicator} hanya dianalisis pada Execution Timeframe ${timeframe.execution}; momentum Anchor Timeframe tidak digunakan.`;

  return `
    Kamu adalah Analis Pasar Keuangan Profesional (Financial Market Predictor Agent).
    Analisis aset ${request.symbol} (${request.asset_type}) untuk metode **${request.strategy.toUpperCase()}**.
    MATA UANG TARGET ANALISIS: **${currency}**
    Seluruh harga dan level ditulis dalam mata uang **${currency}**.
    Sumber candle: **${marketDataSource}**.
    Waktu pengambilan data untuk request ini: **${new Date().toISOString()}**.

    GAYA PENJELASAN:
    - Gunakan gaya penyampaian yang kasual dan tidak bertele-tele.
    - Jelaskan argumenmu dengan data angka yang tersedia.
    - Jelaskan arti sinyal berdasarkan data yang diberikan, bukan definisi umum yang panjang.
    - Jangan mengarang berita, alasan, angka, atau kondisi pasar yang tidak ada di data.
    - Hindari menyampaikan hasil sebagai kepastian; harga dapat bergerak berbeda dari perkiraan.
    - Gunakan hanya data candle yang diambil secara fresh pada request ini.

    KONDISI SINYAL TEKNIKAL:
    - Anchor Timeframe ${timeframe.anchor}: tren ${anchorTechData.trend.signal} memakai ${anchorTrendMethod}.
    - ${anchorMomentumGuidance}
    - Execution Timeframe ${timeframe.execution}: sinyal lokal ${techData.consensusSignal}.
    - Skor konfluensi Execution: ${techData.bullishCount} bullish dan ${techData.bearishCount} bearish dari 3 indikator.
    - Filter kekuatan tren ADX di Execution Timeframe: ADX(${techData.adx.period}) = ${techData.adx.value === null ? "tidak tersedia" : techData.adx.value.toFixed(2)}, ambang > ${techData.adx.threshold}. Filter ${techData.adx.isStrong ? "lolos" : "tidak lolos"}.
    - Indikator momentum yang dipilih: ${request.momentum_indicator}. Validasi momentum dan potensi reversal: ${momentumValidation ? `${momentumValidation.isValid ? "lolos" : "gagal"} — ${momentumValidation.reason}` : "tidak dijalankan karena sinyal lokal netral"}.
    - Evaluasi sideways: ${sidewaysSignal?.hasSignal ? `${sidewaysSignal.mode} ${sidewaysSignal.direction}; ${sidewaysSignal.reason}. Entry ${sidewaysSignal.entry}, SL ${sidewaysSignal.stopLoss}, TP ${sidewaysSignal.takeProfit}.` : (sidewaysSignal?.reason ?? "tidak dijalankan karena ADX tidak rendah")}.
    - Status validasi multi-timeframe: **${signalStatus}**
    - Rekomendasi sistem yang wajib digunakan: **${systemRecommendation}**
    Jangan mengubah status atau rekomendasi sistem.
    Jika indikator momentum yang dipilih adalah RSI, RSI Anchor Timeframe di atas 75 saat sinyal lokal Bullish atau di bawah 25 saat sinyal lokal Bearish wajib menahan sinyal dengan rekomendasi "Wait & See", kecuali sistem sudah menyetujui SIDEWAYS_BOUNCE.
    Jika ADX tidak tersedia, rekomendasi wajib "Wait & See". Jika ADX rendah dan status sistem approved_sideways, gunakan arah rekomendasi dan level sideways yang diberikan; jika tidak ada sinyal sideways terkonfirmasi, rekomendasi wajib "Wait & See".
    Jika validasi momentum dan reversal gagal pada sinyal trending, rekomendasi wajib "Wait & See" dan jangan memberikan target transaksi.

    DETAIL INDIKATOR (DALAM ${currency}):
    - Harga terakhir Execution TF: ${formattedLastClose} (angka: ${convertedLastClose})
    - ATR (14 RMA) Execution TF: ${convertedAtrValue === null ? "Tidak tersedia; gunakan stop loss statis darurat" : formatCurrency(convertedAtrValue, currency)}
    - Stop loss statis darurat jika ATR tidak tersedia: ${STATIC_STOP_LOSS_PERCENTAGES[request.strategy]}% dari harga entry.
    - Parameter risiko: Multiplier ATR ${atrMultiplier}x, Rasio R:R 1:${riskRewardRatio}
    - Trend Execution (${techData.trend.name}): ${techData.trend.signal}, Fast ${convertedFastValue === null ? "-" : formatCurrency(convertedFastValue, currency)}, Slow ${convertedSlowValue === null ? "-" : formatCurrency(convertedSlowValue, currency)}.
    - Nilai momentum Execution ${timeframe.execution} hanya dipakai untuk sinyal lokal dan konfirmasi reversal; jangan gunakan untuk menyimpulkan zona jenuh Anchor.
    - Nilai momentum Anchor ${timeframe.anchor} yang wajib dipakai untuk penilaian jenuh/pembalikan: ${request.momentum_indicator === "RSI" ? `RSI ${anchorTechData.rsi.value?.toFixed(2) ?? "tidak tersedia"}` : request.momentum_indicator === "MACD" ? `Histogram MACD ${anchorTechData.momentum.macdHistogram?.toFixed(4) ?? "tidak tersedia"}` : `Stochastic %K ${anchorTechData.momentum.stochK?.toFixed(2) ?? "tidak tersedia"}`}.
    - Volume (${techData.volume.name}): Sinyal ${techData.volume.signal}
    - Support Execution terdekat: [${convertedSupport.join(", ")}]
    - Resistance Execution terdekat: [${convertedResistance.join(", ")}]

    Jika status approved, sistem menghitung level transaksi dengan metode trending. Jika status approved_sideways, gunakan persis entry, SL, dan TP dari evaluasi SIDEWAYS_BOUNCE (R:R 1:2). Jika status bukan approved atau approved_sideways, jangan berikan target transaksi.
    Saat menjelaskan istilah: tren utama adalah arah pergerakan yang lebih besar; timeframe eksekusi adalah rentang yang dipakai untuk mencari titik transaksi; support adalah area harga yang berpotensi menahan penurunan; resistance adalah area yang berpotensi menahan kenaikan; ATR menggambarkan besar-kecilnya gerakan harga. Gunakan penjelasan ini secara singkat hanya jika istilah tersebut disebut.

    Berikan JSON murni sesuai skema:
    {
      "summary": "Bentuk ringkasan dalam 2-3 paragraf singkat. Jangan menyebut angka harga, persentase, ATR, ADX, RSI, atau level support/resistance; angka akan ditampilkan di Detail Analisis. Jelaskan kondisi pasar dan alasan keputusan secara naratif. Jangan mengulang frasa 'Sistem memilih Wait & See'. Pisahkan tiap paragraf dengan dua baris baru.",
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
  const systemSummaryNotes: string[] = [];
  const isLong = recommendation === "Beli";
  const isShort = recommendation === "Jual";
  const sidewaysSetup =
    context.signalStatus === "approved_sideways"
      ? context.sidewaysSignal
      : null;

  if (isLong || isShort) {
    const entryPrice = sidewaysSetup?.entry ?? context.convertedLastClose;
    const keyLevel = isLong
      ? context.convertedSupport[0]
      : context.convertedResistance[0];
    const atrBuffer =
      context.convertedAtrValue === null
        ? null
        : context.atrMultiplier * context.convertedAtrValue;
    const staticRiskDistance =
      entryPrice * (STATIC_STOP_LOSS_PERCENTAGES[request.strategy] / 100);
    const stopLoss = sidewaysSetup
      ? (sidewaysSetup.stopLoss ?? Number.NaN)
      : atrBuffer !== null
        ? isLong
          ? keyLevel - atrBuffer
          : keyLevel + atrBuffer
        : isLong
          ? entryPrice - staticRiskDistance
          : entryPrice + staticRiskDistance;
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const profitDistance = sidewaysSetup?.takeProfit
      ? Math.abs(sidewaysSetup.takeProfit - entryPrice)
      : riskDistance * context.riskRewardRatio;
    const takeProfit = sidewaysSetup
      ? (sidewaysSetup.takeProfit ?? Number.NaN)
      : isLong
        ? entryPrice + profitDistance
        : entryPrice - profitDistance;

    if (
      [entryPrice, stopLoss, takeProfit, riskDistance, profitDistance].every(
        Number.isFinite,
      ) &&
      (!sidewaysSetup ||
        (sidewaysSetup.hasSignal &&
          sidewaysSetup.direction === (isLong ? "LONG" : "SHORT"))) &&
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
      stopMethod = sidewaysSetup
        ? "atr"
        : atrBuffer === null
          ? "static_percentage"
          : "atr";
      if (!sidewaysSetup && atrBuffer === null) {
        systemSummaryNotes.push(
          "ATR belum tersedia, sehingga penggunaan level risiko darurat perlu diperhatikan.",
        );
      }
      if (sidewaysSetup) {
        systemSummaryNotes.push(sidewaysSetup.reason);
      }
    } else {
      recommendation = "Wait & See";
      signalStatus = "rejected_invalid_risk_setup";
      systemSummaryNotes.push(
        "Setup transaksi dibatalkan karena level risiko yang dihitung tidak valid.",
      );
    }
  }

  if (
    !context.techData.adx.isStrong &&
    context.signalStatus !== "approved_sideways"
  ) {
    systemSummaryNotes.push(
      context.techData.adx.value === null
        ? "ADX belum tersedia untuk mengonfirmasi kekuatan tren."
        : context.sidewaysSignal?.hasSignal === false
          ? context.sidewaysSignal.reason
          : "ADX belum cukup kuat untuk mengonfirmasi arah tren.",
    );
  }
  if (
    context.signalStatus !== "approved_sideways" &&
    context.momentumValidation &&
    !context.momentumValidation.isValid
  ) {
    systemSummaryNotes.push(
      `Indikator ${request.momentum_indicator} belum mengonfirmasi momentum yang konsisten.`,
    );
  }
  if (
    context.signalStatus !== "approved_sideways" &&
    context.anchorRsiBlockReason !== null
  ) {
    systemSummaryNotes.push(
      "RSI pada timeframe utama berada di zona ekstrem yang menahan sinyal transaksi.",
    );
  }
  summary = formatSummaryParagraphs(summary, systemSummaryNotes);

  return {
    ...aiResponse,
    recommendation,
    summary,
    atrValue: context.convertedAtrValue,
    lastClose: context.convertedLastClose,
    adxValue: context.techData.adx.value,
    adxThreshold: context.techData.adx.threshold,
    rsiValue:
      request.momentum_indicator === "RSI"
        ? context.anchorTechData.rsi.value
        : null,
    macdHistogram:
      request.momentum_indicator === "MACD"
        ? context.anchorTechData.momentum.macdHistogram
        : null,
    stochK:
      request.momentum_indicator === "STOCHASTIC"
        ? context.anchorTechData.momentum.stochK
        : null,
    fastValue: context.convertedFastValue,
    slowValue: context.convertedSlowValue,
    signalStatus,
    signalMode:
      signalStatus === "approved_sideways" ? sidewaysSetup?.mode : undefined,
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
