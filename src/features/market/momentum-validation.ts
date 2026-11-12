import { MACD, RSI, Stochastic } from "technicalindicators";
import { MOMENTUM_INDICATORS } from "./types";
import type { MomentumIndicator } from "./types";

export type MomentumSignalDirection = "LONG" | "SHORT";

export interface MomentumReversalValidation {
  isValid: boolean;
  reason: string;
}

function findRecentRsiDivergence(
  direction: MomentumSignalDirection,
  highPrices: number[],
  lowPrices: number[],
  rsiValues: number[],
): "Bullish" | "Bearish" | null {
  const candleCount = highPrices.length;
  const rsiOffset = candleCount - rsiValues.length;
  const windowStart = Math.max(1, candleCount - 20, rsiOffset);
  const pivots: { index: number; price: number; rsi: number }[] = [];
  const prices = direction === "LONG" ? highPrices : lowPrices;

  for (let index = windowStart; index < candleCount - 1; index++) {
    const previous = prices[index - 1];
    const current = prices[index];
    const next = prices[index + 1];
    const isPivot =
      direction === "LONG"
        ? current > previous && current >= next
        : current < previous && current <= next;
    const rsi = rsiValues[index - rsiOffset];

    if (isPivot && Number.isFinite(rsi)) {
      pivots.push({ index, price: current, rsi });
    }
  }

  if (pivots.length < 2) return null;

  const [previous, current] = pivots.slice(-2);
  if (
    direction === "LONG" &&
    current.price > previous.price &&
    current.rsi < previous.rsi
  ) {
    return "Bearish";
  }
  if (
    direction === "SHORT" &&
    current.price < previous.price &&
    current.rsi > previous.rsi
  ) {
    return "Bullish";
  }

  return null;
}

export function checkMomentumAndReversal(
  arahSinyal: MomentumSignalDirection,
  openPrices: number[],
  highPrices: number[],
  lowPrices: number[],
  closePrices: number[],
  momentumIndicator: MomentumIndicator,
): MomentumReversalValidation {
  const candleCount = closePrices.length;
  const minimumCandleCount =
    momentumIndicator === "MACD"
      ? 36
      : momentumIndicator === "STOCHASTIC"
        ? 17
        : 15;
  if (
    !["LONG", "SHORT"].includes(arahSinyal) ||
    !MOMENTUM_INDICATORS.includes(momentumIndicator) ||
    candleCount < minimumCandleCount ||
    openPrices.length !== candleCount ||
    highPrices.length !== candleCount ||
    lowPrices.length !== candleCount ||
    [openPrices, highPrices, lowPrices, closePrices].some((prices) =>
      prices.some((price) => !Number.isFinite(price)),
    ) ||
    closePrices.some(
      (close, index) =>
        openPrices[index] <= 0 ||
        close <= 0 ||
        lowPrices[index] <= 0 ||
        highPrices[index] < lowPrices[index] ||
        highPrices[index] < openPrices[index] ||
        highPrices[index] < close ||
        lowPrices[index] > openPrices[index] ||
        lowPrices[index] > close,
    )
  ) {
    return {
      isValid: false,
      reason: `Data OHLC tidak valid atau belum cukup; indikator ${momentumIndicator} membutuhkan minimal ${minimumCandleCount} candle dengan nilai harga yang lengkap.`,
    };
  }

  if (momentumIndicator === "MACD") {
    const histogramValues = MACD.calculate({
      values: closePrices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
      .map((value) => value.histogram)
      .filter((value): value is number => Number.isFinite(value));
    const recentHistogram = histogramValues.slice(-3);
    if (recentHistogram.length < 3) {
      return {
        isValid: false,
        reason: "Data histogram MACD belum cukup untuk menilai arah momentum.",
      };
    }

    const [histogramTwoCandlesAgo, previousHistogram, latestHistogram] =
      recentHistogram;
    if (
      arahSinyal === "LONG" &&
      latestHistogram < previousHistogram &&
      previousHistogram < histogramTwoCandlesAgo
    ) {
      return {
        isValid: false,
        reason:
          "LONG ditolak: histogram MACD menyusut dua candle berturut-turut.",
      };
    }
    if (
      arahSinyal === "SHORT" &&
      latestHistogram > previousHistogram &&
      previousHistogram > histogramTwoCandlesAgo
    ) {
      return {
        isValid: false,
        reason:
          "SHORT ditolak: histogram MACD menguat dua candle berturut-turut.",
      };
    }
  } else if (momentumIndicator === "RSI") {
    const rsiValues = RSI.calculate({ values: closePrices, period: 14 });
    const latestRsi = rsiValues[rsiValues.length - 1];
    if (!Number.isFinite(latestRsi)) {
      return {
        isValid: false,
        reason: "Nilai RSI belum tersedia untuk validasi momentum.",
      };
    }

    const divergence = findRecentRsiDivergence(
      arahSinyal,
      highPrices,
      lowPrices,
      rsiValues,
    );
    if (arahSinyal === "LONG" && divergence === "Bearish") {
      return {
        isValid: false,
        reason:
          "LONG ditolak: terdeteksi bearish divergence pada 20 candle terakhir.",
      };
    }
    if (arahSinyal === "LONG" && latestRsi >= 75) {
      return {
        isValid: false,
        reason: `LONG ditolak: RSI ${latestRsi.toFixed(2)} berada di zona overbought (>= 75).`,
      };
    }
    if (arahSinyal === "SHORT" && divergence === "Bullish") {
      return {
        isValid: false,
        reason:
          "SHORT ditolak: terdeteksi bullish divergence pada 20 candle terakhir.",
      };
    }
    if (arahSinyal === "SHORT" && latestRsi <= 25) {
      return {
        isValid: false,
        reason: `SHORT ditolak: RSI ${latestRsi.toFixed(2)} berada di zona oversold (<= 25).`,
      };
    }
  } else {
    const stochasticValues = Stochastic.calculate({
      high: highPrices,
      low: lowPrices,
      close: closePrices,
      period: 14,
      signalPeriod: 3,
    }).filter((value) => Number.isFinite(value.k) && Number.isFinite(value.d));
    if (stochasticValues.length < 2) {
      return {
        isValid: false,
        reason: "Data Stochastic belum cukup untuk memeriksa crossover.",
      };
    }

    const previousStochastic = stochasticValues[stochasticValues.length - 2];
    const latestStochastic = stochasticValues[stochasticValues.length - 1];
    const crossedDown =
      previousStochastic.k >= previousStochastic.d &&
      latestStochastic.k < latestStochastic.d;
    const crossedUp =
      previousStochastic.k <= previousStochastic.d &&
      latestStochastic.k > latestStochastic.d;

    if (
      arahSinyal === "LONG" &&
      crossedDown &&
      (previousStochastic.k > 80 || latestStochastic.k > 80)
    ) {
      return {
        isValid: false,
        reason:
          "LONG ditolak: Stochastic memotong ke bawah di zona overbought (> 80).",
      };
    }
    if (arahSinyal === "LONG" && latestStochastic.k >= 80) {
      return {
        isValid: false,
        reason: `LONG ditolak: Stochastic %K ${latestStochastic.k.toFixed(2)} berada di zona overbought (>= 80).`,
      };
    }
    if (arahSinyal === "LONG" && latestStochastic.k <= latestStochastic.d) {
      return {
        isValid: false,
        reason: "LONG ditolak: Stochastic belum mengonfirmasi arah bullish.",
      };
    }
    if (
      arahSinyal === "SHORT" &&
      crossedUp &&
      (previousStochastic.k < 20 || latestStochastic.k < 20)
    ) {
      return {
        isValid: false,
        reason:
          "SHORT ditolak: Stochastic memotong ke atas di zona oversold (< 20).",
      };
    }
    if (arahSinyal === "SHORT" && latestStochastic.k <= 20) {
      return {
        isValid: false,
        reason: `SHORT ditolak: Stochastic %K ${latestStochastic.k.toFixed(2)} berada di zona oversold (<= 20).`,
      };
    }
    if (arahSinyal === "SHORT" && latestStochastic.k >= latestStochastic.d) {
      return {
        isValid: false,
        reason: "SHORT ditolak: Stochastic belum mengonfirmasi arah bearish.",
      };
    }
  }

  const latestOpen = openPrices[candleCount - 1];
  const latestHigh = highPrices[candleCount - 1];
  const latestLow = lowPrices[candleCount - 1];
  const latestClose = closePrices[candleCount - 1];
  const candleBody = Math.abs(latestClose - latestOpen);
  const upperWick = latestHigh - Math.max(latestOpen, latestClose);
  const lowerWick = Math.min(latestOpen, latestClose) - latestLow;

  if (arahSinyal === "LONG" && upperWick > 2 * candleBody) {
    return {
      isValid: false,
      reason:
        "LONG ditolak: ekor atas candle terakhir lebih dari dua kali badan candle.",
    };
  }
  if (arahSinyal === "SHORT" && lowerWick > 2 * candleBody) {
    return {
      isValid: false,
      reason:
        "SHORT ditolak: ekor bawah candle terakhir lebih dari dua kali badan candle.",
    };
  }

  return {
    isValid: true,
    reason: "Validasi momentum dan reversal lolos.",
  };
}

