import { ApiError } from "@google/genai";
import {
  AIAnalysisFailureReason,
  AIAnalysisRequest,
  AIAnalysisResponse,
  Currency,
  OHLCData,
} from "./types";
import {
  getCryptoChartData,
  getBybitLinearFuturesChartData,
  getExchangeRateUSDIDR,
} from "./market-data";
import { getStockChartData } from "./stock-market-data";
import {
  checkMomentumAndReversal,
  calculateTechnicalIndicators,
  getStrategyTrendPeriods,
} from "./technical-analysis";
import { convertCurrency, formatCurrency } from "@/lib/format";

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

const YAHOO_INTRADAY_LOOKBACK_DAYS = 700;

type StrategyTimeframe = (typeof TIMEFRAMES)[keyof typeof TIMEFRAMES];
type SignalStatus = NonNullable<AIAnalysisResponse["signalStatus"]>;
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
  atrMultiplier: number;
  riskRewardRatio: number;
};

export function getAIAnalysisFailureReason(error: unknown): AIAnalysisFailureReason {
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
        getBybitLinearFuturesChartData(
          request.symbol,
          timeframe.anchor === "1wk" ? "1w" : timeframe.anchor,
          Date.parse(startDate),
        ),
        getBybitLinearFuturesChartData(
          request.symbol,
          timeframe.execution,
          Date.parse(startDate),
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
        getCryptoChartData(
          request.symbol,
          timeframe.anchor === "1wk" ? "1w" : timeframe.anchor,
          100,
          Date.parse(startDate),
        ),
        getCryptoChartData(
          request.symbol,
          timeframe.execution,
          100,
          Date.parse(startDate),
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
      getStockChartData(request.symbol, startDate, timeframe.anchor),
      getStockChartData(
        request.symbol,
        stockExecutionStartDate,
        timeframe.execution,
      ),
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
  const momentumValidation =
    localDirection === null
      ? null
      : checkMomentumAndReversal(
          localDirection === "Bullish" ? "LONG" : "SHORT",
          executionCandles.map((candle) => candle.open),
          executionCandles.map((candle) => candle.high),
          executionCandles.map((candle) => candle.low),
          executionCandles.map((candle) => candle.close),
          request.momentum_indicator,
        );
  let signalStatus: SignalStatus;
  if (!techData.adx.isStrong) {
    signalStatus = "wait_for_weak_adx";
  } else if (anchorTechData.trend.signal === "Neutral") {
    signalStatus = "wait_for_major_trend";
  } else if (localDirection === null) {
    signalStatus = "wait_for_execution_signal";
  } else if (anchorTechData.trend.signal !== localDirection) {
    signalStatus = "rejected_against_major_trend";
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
    atrMultiplier,
    riskRewardRatio,
  };
}
