import {
  ADX,
  EMA,
  MACD,
  MFI,
  OBV,
  RSI,
  SMA,
  Stochastic,
  VWAP,
} from "technicalindicators";
import type { AIAnalysisRequest, OHLCData, TradingStrategy } from "./types";

export interface TechnicalAnalysisResult {
  symbol: string;
  strategy: TradingStrategy;
  lastClose: number;
  timeframeUsed: string;
  bullishCount: number;
  bearishCount: number;
  consensusSignal:
    | "Potensi Rebound (Bullish)"
    | "Potensi Koreksi (Bearish)"
    | "Netral / Konsolidasi";
  trend: {
    name: string;
    fastPeriod: number;
    slowPeriod: number;
    fastValue: number | null;
    slowValue: number | null;
    signal: "Bullish" | "Bearish" | "Neutral";
    crossoverStatus: string;
  };
  momentum: {
    name: string;
    rsiValue: number | null;
    macdHistogram: number | null;
    stochK: number | null;
    signal: "Overbought" | "Oversold" | "Bullish" | "Bearish" | "Neutral";
  };
  volume: {
    name: string;
    obvTrend?: "Accumulation" | "Distribution" | "Neutral";
    vwapValue?: number | null;
    mfiValue?: number | null;
    signal: "Accumulation" | "Distribution" | "Neutral";
  };
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

export function calculateTechnicalIndicators(
  candles: OHLCData[],
  request: AIAnalysisRequest,
  timeframeUsed: string = "1d",
): TechnicalAnalysisResult {
  if (!candles || candles.length < 20) {
    throw new Error(
      "Data candlestick tidak mencukupi untuk analisis teknikal.",
    );
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume || 0);
  const lastClose = closes[closes.length - 1];

  // A. PENENTUAN DUAL PERIOD TERSTRUKTUR BERDASARKAN STRATEGI
  let fastPeriod = 20;
  let slowPeriod = 50;

  if (request.strategy === "scalping") {
    fastPeriod = 5;
    slowPeriod = 8;
  } else if (request.strategy === "day_trading") {
    fastPeriod = 13;
    slowPeriod = 21;
  } else if (request.strategy === "swing_trading") {
    fastPeriod = 20;
    slowPeriod = 50;
  } else if (request.strategy === "investing") {
    fastPeriod = 50;
    slowPeriod = 200;
  }

  // B. KALKULASI DUAL TREND INDICATOR (SMA / EMA / ADX)
  let fastValue: number | null = null;
  let slowValue: number | null = null;
  let trendSignal: "Bullish" | "Bearish" | "Neutral" = "Neutral";
  let crossoverStatus = "Konfirmasi Tren Netral";

  if (request.trend_indicator === "ADX") {
    const adxResult = ADX.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    });
    const lastAdx = adxResult[adxResult.length - 1];
    fastValue = lastAdx?.adx || null;
    if (lastAdx) {
      if (lastAdx.pdi > lastAdx.mdi) {
        trendSignal = "Bullish";
        crossoverStatus = "ADX +DI diatas -DI (Bullish Trend)";
      } else if (lastAdx.mdi > lastAdx.pdi) {
        trendSignal = "Bearish";
        crossoverStatus = "ADX -DI diatas +DI (Bearish Trend)";
      }
    }
  } else if (request.trend_indicator === "EMA") {
    const fastEma = EMA.calculate({ period: fastPeriod, values: closes });
    const slowEma = EMA.calculate({ period: slowPeriod, values: closes });

    fastValue = fastEma[fastEma.length - 1] || null;
    slowValue = slowEma[slowEma.length - 1] || null;

    if (fastValue && slowValue) {
      if (fastValue > slowValue && lastClose > fastValue) {
        trendSignal = "Bullish";
        crossoverStatus = `Bullish Crossover (EMA ${fastPeriod} diatas EMA ${slowPeriod})`;
      } else if (fastValue < slowValue && lastClose < fastValue) {
        trendSignal = "Bearish";
        crossoverStatus = `Bearish Crossover (EMA ${fastPeriod} dibawah EMA ${slowPeriod})`;
      }
    }
  } else {
    // Default SMA Dual Period
    const fastSma = SMA.calculate({ period: fastPeriod, values: closes });
    const slowSma = SMA.calculate({ period: slowPeriod, values: closes });

    fastValue = fastSma[fastSma.length - 1] || null;
    slowValue = slowSma[slowSma.length - 1] || null;

    if (fastValue && slowValue) {
      if (fastValue > slowValue && lastClose > fastValue) {
        trendSignal = "Bullish";
        crossoverStatus =
          request.strategy === "investing"
            ? "Golden Cross (SMA 50 diatas SMA 200)"
            : `Bullish Alignment (SMA ${fastPeriod} diatas SMA ${slowPeriod})`;
      } else if (fastValue < slowValue && lastClose < fastValue) {
        trendSignal = "Bearish";
        crossoverStatus =
          request.strategy === "investing"
            ? "Death Cross (SMA 50 dibawah SMA 200)"
            : `Bearish Alignment (SMA ${fastPeriod} dibawah SMA ${slowPeriod})`;
      }
    }
  }

  // C. KALKULASI MOMENTUM (RSI, MACD, STOCHASTIC)
  let lastRsi: number | null = null;
  let macdHistogram: number | null = null;
  let stochK: number | null = null;
  let momentumSignal:
    "Overbought" | "Oversold" | "Bullish" | "Bearish" | "Neutral" = "Neutral";

  if (request.momentum_indicator === "STOCHASTIC") {
    const stochResult = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    });
    const lastStoch = stochResult[stochResult.length - 1];
    stochK = lastStoch?.k || null;

    if (stochK !== null) {
      if (stochK <= 20) momentumSignal = "Oversold";
      else if (stochK >= 80) momentumSignal = "Overbought";
      else momentumSignal = stochK > 50 ? "Bullish" : "Bearish";
    }
  } else if (request.momentum_indicator === "MACD") {
    const macdResult = MACD.calculate({
      values: closes,
      fastPeriod: request.strategy === "scalping" ? 6 : 12,
      slowPeriod: request.strategy === "scalping" ? 13 : 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const lastMacd = macdResult[macdResult.length - 1];
    macdHistogram = lastMacd?.histogram || null;
    if (macdHistogram !== null) {
      momentumSignal = macdHistogram > 0 ? "Bullish" : "Bearish";
    }
  } else {
    // Default RSI
    const rsiPeriod = request.strategy === "scalping" ? 7 : 14;
    const rsiResult = RSI.calculate({ period: rsiPeriod, values: closes });
    lastRsi = rsiResult[rsiResult.length - 1] || null;

    if (lastRsi !== null) {
      const overboughtBound = request.strategy === "scalping" ? 75 : 70;
      const oversoldBound = request.strategy === "scalping" ? 25 : 30;

      if (lastRsi >= overboughtBound) momentumSignal = "Overbought";
      else if (lastRsi <= oversoldBound) momentumSignal = "Oversold";
      else momentumSignal = lastRsi > 50 ? "Bullish" : "Bearish";
    }
  }

  // D. KALKULASI VOLUME (OBV, VWAP, MFI)
  let obvTrend: "Accumulation" | "Distribution" | "Neutral" = "Neutral";
  let vwapValue: number | null = null;
  let mfiValue: number | null = null;
  let volumeSignal: "Accumulation" | "Distribution" | "Neutral" = "Neutral";

  if (request.volume_indicator === "VWAP") {
    const vwapResult = VWAP.calculate({
      high: highs,
      low: lows,
      close: closes,
      volume: volumes,
    });
    vwapValue = vwapResult[vwapResult.length - 1] || null;
    if (vwapValue) {
      volumeSignal = lastClose > vwapValue ? "Accumulation" : "Distribution";
    }
  } else if (request.volume_indicator === "VOLUME_PROFILE") {
    const mfiResult = MFI.calculate({
      high: highs,
      low: lows,
      close: closes,
      volume: volumes,
      period: 14,
    });
    mfiValue = mfiResult[mfiResult.length - 1] || null;
    if (mfiValue !== null) {
      if (mfiValue <= 20) volumeSignal = "Accumulation";
      else if (mfiValue >= 80) volumeSignal = "Distribution";
      else volumeSignal = mfiValue > 50 ? "Accumulation" : "Distribution";
    }
  } else {
    // Default OBV
    const obvResult = OBV.calculate({ close: closes, volume: volumes });
    const recentObv = obvResult.slice(-5);
    if (recentObv.length >= 2) {
      const first = recentObv[0];
      const last = recentObv[recentObv.length - 1];
      if (last > first) obvTrend = "Accumulation";
      else if (last < first) obvTrend = "Distribution";
    }
    volumeSignal = obvTrend;
  }

  // E. CONFLUENCE SCORE (Sinyal Rebound vs Koreksi)
  let bullishCount = 0;
  let bearishCount = 0;

  if (trendSignal === "Bullish") bullishCount++;
  if (trendSignal === "Bearish") bearishCount++;

  if (momentumSignal === "Bullish" || momentumSignal === "Oversold") {
    bullishCount++;
  }
  if (momentumSignal === "Bearish" || momentumSignal === "Overbought") {
    bearishCount++;
  }

  if (volumeSignal === "Accumulation") bullishCount++;
  if (volumeSignal === "Distribution") bearishCount++;

  let consensusSignal:
    | "Potensi Rebound (Bullish)"
    | "Potensi Koreksi (Bearish)"
    | "Netral / Konsolidasi" = "Netral / Konsolidasi";

  if (bullishCount >= 2) {
    consensusSignal = "Potensi Rebound (Bullish)";
  } else if (bearishCount >= 2) {
    consensusSignal = "Potensi Koreksi (Bearish)";
  }

  // F. KEY LEVELS
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const sortedLows = [...lows].sort((a, b) => a - b);

  return {
    symbol: request.symbol,
    strategy: request.strategy,
    lastClose,
    timeframeUsed,
    bullishCount,
    bearishCount,
    consensusSignal,
    trend: {
      name: request.trend_indicator,
      fastPeriod,
      slowPeriod,
      fastValue,
      slowValue,
      signal: trendSignal,
      crossoverStatus,
    },
    momentum: {
      name: request.momentum_indicator,
      rsiValue: lastRsi,
      macdHistogram,
      stochK,
      signal: momentumSignal,
    },
    volume: {
      name: request.volume_indicator,
      obvTrend,
      vwapValue,
      mfiValue,
      signal: volumeSignal,
    },
    keyLevels: {
      support: [sortedLows[0], sortedLows[Math.floor(sortedLows.length / 4)]],
      resistance: [
        sortedHighs[0],
        sortedHighs[Math.floor(sortedHighs.length / 4)],
      ],
    },
  };
}
