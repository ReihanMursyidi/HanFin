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

export function validateSingleMomentum(
  direction: MomentumSignalDirection,
  openPrices: number[],
  highPrices: number[],
  lowPrices: number[],
  closePrices: number[],
  volumes: number[],
  momentumIndicator: MomentumIndicator,
): MomentumReversalValidation {
  const candleCount = closePrices.length;
  const minimumCandleCount =
    momentumIndicator === "MACD"
      ? 36
      : momentumIndicator === "RSI"
        ? 34
        : 20;
  if (
    !["LONG", "SHORT"].includes(direction) ||
    !MOMENTUM_INDICATORS.includes(momentumIndicator) ||
    candleCount < minimumCandleCount ||
    openPrices.length !== candleCount ||
    highPrices.length !== candleCount ||
    lowPrices.length !== candleCount ||
    volumes.length !== candleCount ||
    [openPrices, highPrices, lowPrices, closePrices, volumes].some((prices) =>
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
        lowPrices[index] > close ||
        volumes[index] < 0,
    )
  ) {
    return {
      isValid: false,
      reason: `Data OHLCV tidak valid atau belum cukup; indikator ${momentumIndicator} membutuhkan minimal ${minimumCandleCount} candle dengan harga dan volume lengkap.`,
    };
  }

  const recentVolumes = volumes.slice(-20);
  const averageVolume =
    recentVolumes.reduce((sum, volume) => sum + volume, 0) /
    recentVolumes.length;
  const latestVolume = volumes[volumes.length - 1];
  if (latestVolume <= averageVolume) {
    return {
      isValid: false,
      reason: `Sinyal ${direction} ditolak: volume candle terakhir (${latestVolume}) tidak lebih besar dari SMA volume 20 (${averageVolume.toFixed(2)}).`,
    };
  }

  const latestOpen = openPrices[candleCount - 1];
  const latestHigh = highPrices[candleCount - 1];
  const latestLow = lowPrices[candleCount - 1];
  const latestClose = closePrices[candleCount - 1];
  const candleBody = Math.abs(latestClose - latestOpen);
  const upperWick = latestHigh - Math.max(latestOpen, latestClose);
  const lowerWick = Math.min(latestOpen, latestClose) - latestLow;

  if (direction === "LONG" && upperWick > 2 * candleBody) {
    return {
      isValid: false,
      reason:
        "LONG ditolak: ekor atas candle terakhir lebih dari dua kali badan candle.",
    };
  }
  if (direction === "SHORT" && lowerWick > 2 * candleBody) {
    return {
      isValid: false,
      reason:
        "SHORT ditolak: ekor bawah candle terakhir lebih dari dua kali badan candle.",
    };
  }

  if (momentumIndicator === "MACD") {
    const macdValues = MACD.calculate({
      values: closePrices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    }).flatMap((value) => {
      const macd = value.MACD;
      const signal = value.signal;
      const histogram = value.histogram;
      if (
        typeof macd === "number" &&
        Number.isFinite(macd) &&
        typeof signal === "number" &&
        Number.isFinite(signal) &&
        typeof histogram === "number" &&
        Number.isFinite(histogram)
      ) {
        return [{ macd, signal, histogram }];
      }
      return [];
    });
    if (macdValues.length < 3) {
      return {
        isValid: false,
        reason: "Data MACD belum cukup untuk menilai arah momentum.",
      };
    }

    const recentMacdValues = macdValues.slice(-3);
    const twoCandlesAgo = recentMacdValues[0];
    const previous = recentMacdValues[1];
    const latest = recentMacdValues[2];
    if (!twoCandlesAgo || !previous || !latest) {
      return {
        isValid: false,
        reason: "Data MACD belum cukup untuk menilai arah momentum.",
      };
    }
    if (
      direction === "LONG" &&
      latest.histogram < previous.histogram &&
      previous.histogram < twoCandlesAgo.histogram
    ) {
      return {
        isValid: false,
        reason:
          "LONG ditolak: histogram MACD menyusut dua candle berturut-turut.",
      };
    }
    if (
      direction === "SHORT" &&
      latest.histogram < 0 &&
      previous.histogram < 0 &&
      twoCandlesAgo.histogram < 0 &&
      latest.histogram > previous.histogram &&
      previous.histogram > twoCandlesAgo.histogram
    ) {
      return {
        isValid: false,
        reason:
          "SHORT ditolak: histogram MACD negatif mengecil dua candle berturut-turut.",
      };
    }

    if (
      direction === "LONG" &&
      latest.macd <= latest.signal
    ) {
      return {
        isValid: false,
        reason: "LONG ditolak: garis MACD belum berada di atas garis Signal.",
      };
    }
    if (
      direction === "SHORT" &&
      latest.macd >= latest.signal
    ) {
      return {
        isValid: false,
        reason: "SHORT ditolak: garis MACD belum berada di bawah garis Signal.",
      };
    }
    if (
      direction === "LONG" &&
      latest.histogram <= previous.histogram
    ) {
      return {
        isValid: false,
        reason: "LONG ditolak: histogram MACD tidak menguat pada candle terakhir.",
      };
    }
    if (
      direction === "SHORT" &&
      latest.histogram >= previous.histogram
    ) {
      return {
        isValid: false,
        reason: "SHORT ditolak: histogram MACD tidak menguat ke bawah pada candle terakhir.",
      };
    }
  } else if (momentumIndicator === "RSI") {
    const rsiValues = RSI.calculate({ values: closePrices, period: 14 });
    const latestRsi = rsiValues[rsiValues.length - 1];
    const previousRsi = rsiValues[rsiValues.length - 2];
    if (!Number.isFinite(latestRsi) || !Number.isFinite(previousRsi)) {
      return {
        isValid: false,
        reason: "Nilai RSI belum tersedia untuk validasi momentum.",
      };
    }

    const isRsiRising = latestRsi > previousRsi;
    const isRsiFalling = latestRsi < previousRsi;
    if (
      direction === "LONG" &&
      (!(latestRsi < 75) || !isRsiRising)
    ) {
      return {
        isValid: false,
        reason: `LONG ditolak: RSI ${latestRsi.toFixed(2)} tidak memenuhi syarat (< 75 dan berbalik naik).`,
      };
    }
    if (
      direction === "SHORT" &&
      (!(latestRsi > 25) || !isRsiFalling)
    ) {
      return {
        isValid: false,
        reason: `SHORT ditolak: RSI ${latestRsi.toFixed(2)} tidak memenuhi syarat (> 25 dan berbalik turun).`,
      };
    }

    const divergence = findRecentRsiDivergence(
      direction,
      highPrices,
      lowPrices,
      rsiValues,
    );
    if (direction === "LONG" && divergence === "Bearish") {
      return {
        isValid: false,
        reason:
          "LONG ditolak: terdeteksi bearish divergence pada 20 candle terakhir.",
      };
    }
    if (direction === "SHORT" && divergence === "Bullish") {
      return {
        isValid: false,
        reason:
          "SHORT ditolak: terdeteksi bullish divergence pada 20 candle terakhir.",
      };
    }
  } else {
    const stochasticValues = Stochastic.calculate({
      high: highPrices,
      low: lowPrices,
      close: closePrices,
      period: 14,
      signalPeriod: 3,
    }).filter(
      (value) => Number.isFinite(value.k) && Number.isFinite(value.d),
    );
    if (stochasticValues.length < 1) {
      return {
        isValid: false,
        reason: "Data Stochastic belum cukup untuk menilai arah momentum.",
      };
    }

    const latestStochastic = stochasticValues[stochasticValues.length - 1];
    if (direction === "LONG" && latestStochastic.k >= 80) {
      return {
        isValid: false,
        reason: `LONG ditolak: Stochastic %K ${latestStochastic.k.toFixed(2)} berada di zona overbought (>= 80).`,
      };
    }
    if (
      direction === "LONG" &&
      latestStochastic.k <= latestStochastic.d
    ) {
      return {
        isValid: false,
        reason: "LONG ditolak: Stochastic belum mengonfirmasi arah bullish.",
      };
    }
    if (direction === "SHORT" && latestStochastic.k <= 20) {
      return {
        isValid: false,
        reason: `SHORT ditolak: Stochastic %K ${latestStochastic.k.toFixed(2)} berada di zona oversold (<= 20).`,
      };
    }
    if (
      direction === "SHORT" &&
      latestStochastic.k >= latestStochastic.d
    ) {
      return {
        isValid: false,
        reason: "SHORT ditolak: Stochastic belum mengonfirmasi arah bearish.",
      };
    }
  }

  return {
    isValid: true,
    reason: "Validasi momentum dan reversal lolos.",
  };
}

