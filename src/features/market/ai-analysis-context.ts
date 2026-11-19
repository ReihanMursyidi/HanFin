import { ApiError } from "@google/genai";
import {
  AIAnalysisFailureReason,
  AIAnalysisRequest,
  AIAnalysisResponse,
  Currency,
  OHLCData,
} from "./types";
import {
  getCryptoChartDataFresh,
  getBybitLinearFuturesChartDataFresh,
  getFreshExchangeRateUSDIDR,
} from "./market-data";
import { getStockChartData } from "./stock-market-data";
import {
  validateSingleMomentum,
  calculateTechnicalIndicators,
  getStrategyTrendPeriods,
} from "./technical-analysis";
import { convertCurrency, formatCurrency } from "@/lib/format";

const RISK_PARAMETERS = {
  scalping: { atrMultiplier: 0.75, riskRewardRatio: 1.5 },
  day_trading: { atrMultiplier: 1.5, riskRewardRatio: 2 },
  swing_trading: { atrMultiplier: 2, riskRewardRatio: 3 },
  investing: { atrMultiplier: 3, riskRewardRatio: 4 },
} as const;

const TIMEFRAMES = {
  scalping: { anchor: "15m", execution: "5m", candleLimit: 150 },
  day_trading: { anchor: "1h", execution: "15m", candleLimit: 200 },
  swing_trading: { anchor: "1d", execution: "4h", candleLimit: 250 },
  investing: { anchor: "1wk", execution: "1d", candleLimit: 250 },
} as const;

const STOCK_CANDLES_PER_TRADING_DAY: Record<StockInterval, number> = {
  "5m": 78,
  "15m": 26,
  "30m": 13,
  "1h": 7,
  "4h": 2,
  "1d": 1,
  "1wk": 1 / 5,
};

type StrategyTimeframe = (typeof TIMEFRAMES)[keyof typeof TIMEFRAMES];
type StockInterval = "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1wk";
type SignalStatus = Exclude<
  NonNullable<AIAnalysisResponse["signalStatus"]>,
  "approved_sideways"
>;
export type MarketAnalysisContext = {
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
  marketDataSource: string;
  momentumValidation: {
    isValid: boolean;
    reason: string;
  } | null;
  anchorRsiBlockReason: string | null;
  atrMultiplier: number;
  riskRewardRatio: number;
};

export function getAIAnalysisFailureReason(
  error: unknown,
): AIAnalysisFailureReason {
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

export async function prepareAnalysisContext(
  request: AIAnalysisRequest,
  currency: Currency,
): Promise<MarketAnalysisContext> {
  const timeframe = TIMEFRAMES[request.strategy];
  const getStockPeriodStart = (interval: StockInterval) => {
    const tradingDays =
      timeframe.candleLimit / STOCK_CANDLES_PER_TRADING_DAY[interval];
    const calendarDays = Math.ceil(tradingDays * (7 / 5) * 1.25);
    return new Date(Date.now() - calendarDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  };
  let marketDataSource =
    request.asset_type === "crypto"
      ? "Bybit Linear Futures (USDT)"
      : "Yahoo Finance";
  let anchorCandles: OHLCData[];
  let executionCandles: OHLCData[];

  if (request.asset_type === "crypto") {
    let futuresCandles: [OHLCData[], OHLCData[]] | null = null;
    try {
      futuresCandles = await Promise.all([
        getBybitLinearFuturesChartDataFresh(
          request.symbol,
          timeframe.anchor === "1wk" ? "1w" : timeframe.anchor,
          timeframe.candleLimit,
        ),
        getBybitLinearFuturesChartDataFresh(
          request.symbol,
          timeframe.execution,
          timeframe.candleLimit,
        ),
      ]);
    } catch (error) {
      console.error(
        `Bybit Futures candle fetch failed for ${request.symbol}; trying Binance Spot fallback:`,
        error,
      );
    }

    if (
      !futuresCandles ||
      futuresCandles[0].length < 10 ||
      futuresCandles[1].length < 10
    ) {
      const [spotAnchorCandles, spotExecutionCandles] = await Promise.all([
        getCryptoChartDataFresh(
          request.symbol,
          timeframe.anchor === "1wk" ? "1w" : timeframe.anchor,
          timeframe.candleLimit,
        ),
        getCryptoChartDataFresh(
          request.symbol,
          timeframe.execution,
          timeframe.candleLimit,
        ),
      ]);

      anchorCandles = spotAnchorCandles;
      executionCandles = spotExecutionCandles;
      marketDataSource =
        "Binance Spot (USDT; fallback karena data atau akses Bybit Linear Futures tidak tersedia)";
    } else {
      [anchorCandles, executionCandles] = futuresCandles;
    }
  } else {
    [anchorCandles, executionCandles] = await Promise.all([
      getStockChartData(
        request.symbol,
        getStockPeriodStart(timeframe.anchor),
        timeframe.anchor,
      ).then((candles) => candles.slice(-timeframe.candleLimit)),
      getStockChartData(
        request.symbol,
        getStockPeriodStart(timeframe.execution),
        timeframe.execution,
      ).then((candles) => candles.slice(-timeframe.candleLimit)),
    ]);
  }
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
  const anchorRsi =
    request.momentum_indicator === "RSI" ? anchorTechData.rsi.value : null;
  const anchorRsiBlockReason =
    localDirection === "Bullish" && anchorRsi !== null && anchorRsi > 75
      ? `RSI Anchor Timeframe ${timeframe.anchor} sebesar ${anchorRsi.toFixed(2)} di atas 75; sinyal Beli ditahan.`
      : localDirection === "Bearish" && anchorRsi !== null && anchorRsi < 25
        ? `RSI Anchor Timeframe ${timeframe.anchor} sebesar ${anchorRsi.toFixed(2)} di bawah 25; sinyal Jual ditahan.`
        : null;
  const momentumValidation =
    localDirection === null
      ? null
      : validateSingleMomentum(
          localDirection === "Bullish" ? "LONG" : "SHORT",
          executionCandles.map((candle) => candle.open),
          executionCandles.map((candle) => candle.high),
          executionCandles.map((candle) => candle.low),
          executionCandles.map((candle) => candle.close),
          executionCandles.map((candle) => candle.volume ?? Number.NaN),
          request.momentum_indicator,
        );
  let signalStatus: SignalStatus;
  if (techData.adx.value === null || !techData.adx.isStrong) {
    signalStatus = "wait_for_weak_adx";
  } else if (anchorTechData.trend.signal === "Neutral") {
    signalStatus = "wait_for_major_trend";
  } else if (localDirection === null) {
    signalStatus = "wait_for_execution_signal";
  } else if (anchorTechData.trend.signal !== localDirection) {
    signalStatus = "rejected_against_major_trend";
  } else if (anchorRsiBlockReason !== null) {
    signalStatus = "wait_for_anchor_rsi_extreme";
  } else if (!momentumValidation?.isValid) {
    signalStatus = "wait_for_momentum_reversal";
  } else {
    signalStatus = "approved";
  }
  const systemRecommendation: AIAnalysisResponse["recommendation"] =
    signalStatus === "approved"
      ? localDirection === "Bullish"
        ? "Beli"
        : "Jual"
      : "Wait & See";
  const fxRate = await getFreshExchangeRateUSDIDR();
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
      ? `ADX ${anchorTechData.adx.period}`
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
    marketDataSource,
    momentumValidation,
    anchorRsiBlockReason,
    atrMultiplier,
    riskRewardRatio,
  };
}
