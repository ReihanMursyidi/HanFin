import {
  ATR,
  BollingerBands,
  MACD,
  RSI,
  Stochastic,
} from "technicalindicators";
import { MOMENTUM_INDICATORS } from "./types";
import type { MomentumIndicator, OHLCData } from "./types";

export interface SidewaysSignalResult {
  hasSignal: boolean;
  mode: "SIDEWAYS_BOUNCE";
  direction: "LONG" | "SHORT" | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  reason: string;
}

function noSignal(reason: string): SidewaysSignalResult {
  return {
    hasSignal: false,
    mode: "SIDEWAYS_BOUNCE",
    direction: null,
    entry: null,
    stopLoss: null,
    takeProfit: null,
    reason,
  };
}

export function evaluateSidewaysSignal(
  ohlcvData: OHLCData[],
  momentumIndicator: MomentumIndicator,
): SidewaysSignalResult {
  if (!MOMENTUM_INDICATORS.includes(momentumIndicator)) {
    return noSignal("Pilihan indikator momentum tidak valid.");
  }

  const minimumCandles = momentumIndicator === "MACD" ? 36 : 25;
  if (
    ohlcvData.length < minimumCandles ||
    ohlcvData.some(
      ({ open, high, low, close }) =>
        ![open, high, low, close].every(Number.isFinite) ||
        open <= 0 ||
        high <= 0 ||
        low <= 0 ||
        close <= 0 ||
        high < Math.max(open, close, low) ||
        low > Math.min(open, close, high),
    )
  ) {
    return noSignal(
      `Data OHLC tidak valid atau belum cukup; indikator ${momentumIndicator} membutuhkan minimal ${minimumCandles} candle.`,
    );
  }

  const closes = ohlcvData.map(({ close }) => close);
  const highs = ohlcvData.map(({ high }) => high);
  const lows = ohlcvData.map(({ low }) => low);
  const latestClose = closes[closes.length - 1];
  const rangeCandles = ohlcvData.slice(-25);
  const resistance = Math.max(...rangeCandles.map(({ high }) => high));
  const support = Math.min(...rangeCandles.map(({ low }) => low));
  const rangeWidth = resistance - support;
  if (rangeWidth <= 0) {
    return noSignal(
      "Range sideways tidak valid karena support dan resistance sama.",
    );
  }

  const bands = BollingerBands.calculate({
    period: 20,
    stdDev: 2,
    values: closes,
  });
  const latestBands = bands[bands.length - 1];
  const atrValues = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  const atr = atrValues[atrValues.length - 1];
  if (
    !latestBands ||
    !Number.isFinite(latestBands.lower) ||
    !Number.isFinite(latestBands.upper) ||
    !Number.isFinite(atr) ||
    atr <= 0
  ) {
    return noSignal(
      "Bollinger Bands atau ATR belum tersedia untuk data candle ini.",
    );
  }

  const nearLowerBoundary =
    latestClose <= latestBands.lower ||
    latestClose <= support + rangeWidth * 0.15;
  const nearUpperBoundary =
    latestClose >= latestBands.upper ||
    latestClose >= resistance - rangeWidth * 0.15;

  let longMomentumConfirmed = false;
  let shortMomentumConfirmed = false;
  if (momentumIndicator === "RSI") {
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const latestRsi = rsiValues[rsiValues.length - 1];
    const previousRsi = rsiValues[rsiValues.length - 2];
    if (!Number.isFinite(latestRsi) || !Number.isFinite(previousRsi)) {
      return noSignal("Data RSI belum cukup untuk mengonfirmasi pantulan.");
    }

    longMomentumConfirmed = latestRsi <= 35 && latestRsi > previousRsi;
    shortMomentumConfirmed = latestRsi >= 65 && latestRsi < previousRsi;
  } else if (momentumIndicator === "STOCHASTIC") {
    const stochasticValues = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    }).filter(({ k, d }) => Number.isFinite(k) && Number.isFinite(d));
    if (stochasticValues.length < 2) {
      return noSignal(
        "Data Stochastic belum cukup untuk mengonfirmasi crossover.",
      );
    }

    const previous = stochasticValues[stochasticValues.length - 2];
    const latest = stochasticValues[stochasticValues.length - 1];
    longMomentumConfirmed =
      previous.k <= previous.d && latest.k > latest.d && latest.k < 20;
    shortMomentumConfirmed =
      previous.k >= previous.d && latest.k < latest.d && latest.k > 80;
  } else {
    const histogramValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
      .map(({ histogram }) => histogram)
      .filter((histogram): histogram is number => Number.isFinite(histogram));
    if (histogramValues.length < 2) {
      return noSignal(
        "Data histogram MACD belum cukup untuk mengonfirmasi pantulan.",
      );
    }

    const previous = histogramValues[histogramValues.length - 2];
    const latest = histogramValues[histogramValues.length - 1];
    longMomentumConfirmed = previous < 0 && latest < 0 && latest > previous;
    shortMomentumConfirmed = previous > 0 && latest > 0 && latest < previous;
  }

  const longSignal = nearLowerBoundary && longMomentumConfirmed;
  const shortSignal = nearUpperBoundary && shortMomentumConfirmed;
  if (longSignal && shortSignal) {
    return noSignal(
      "Harga berada dekat kedua batas range; arah pantulan sideways belum jelas.",
    );
  }
  if (!longSignal && !shortSignal) {
    if (!nearLowerBoundary && !nearUpperBoundary) {
      return noSignal(
        "Harga belum berada dekat batas bawah atau batas atas range sideways.",
      );
    }
    return noSignal(
      `Harga sudah dekat batas range, tetapi indikator ${momentumIndicator} belum mengonfirmasi pantulan.`,
    );
  }

  const direction = longSignal ? "LONG" : "SHORT";
  const entry = latestClose;
  const stopLoss =
    direction === "LONG" ? support - 0.75 * atr : resistance + 0.75 * atr;
  const riskDistance = Math.abs(entry - stopLoss);
  const takeProfit =
    direction === "LONG" ? entry + 2 * riskDistance : entry - 2 * riskDistance;
  if (
    ![entry, stopLoss, takeProfit, riskDistance].every(Number.isFinite) ||
    entry <= 0 ||
    stopLoss <= 0 ||
    takeProfit <= 0 ||
    riskDistance <= 0 ||
    (direction === "LONG"
      ? stopLoss >= entry || takeProfit <= entry
      : stopLoss <= entry || takeProfit >= entry)
  ) {
    return noSignal(
      "Level entry, stop loss, atau take profit sideways tidak valid.",
    );
  }

  return {
    hasSignal: true,
    mode: "SIDEWAYS_BOUNCE",
    direction,
    entry,
    stopLoss,
    takeProfit,
    reason:
      `${direction} terkonfirmasi dekat ${direction === "LONG" ? "support" : "resistance"} dengan pantulan ${momentumIndicator}; ` +
      "level menggunakan SL 0,75 ATR dan rasio risiko-imbalan 1:2.",
  };
}
