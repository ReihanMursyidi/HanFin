"use server";

import { unstable_cache } from "next/cache";
import { MarketAsset, OHLCData } from "./types";
import YahooFinance from "yahoo-finance2";
import {
  BINANCE_ENDPOINTS,
  CRYPTO_ASSETS,
  FALLBACK_USD_IDR_RATE,
  STOCK_ASSETS,
} from "@/constants/market-constant";

const yahooFinance = new YahooFinance({
  suppressNotices: ["ripHistorical", "yahooSurvey"],
});

async function fetchBinancePublic<T>(path: string): Promise<T> {
  for (const baseUrl of BINANCE_ENDPOINTS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        next: { revalidate: 60 },
      });
      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      continue;
    }
  }
  throw new Error("Seluruh endpoint Binance API tidak dapat dijangkau");
}

export const getExchangeRateUSDIDR = unstable_cache(
  async (): Promise<number> => {
    try {
      const quote = (await yahooFinance.quote("IDR=X")) as {
        regularMarketPrice?: number;
      };
      if (quote.regularMarketPrice && quote.regularMarketPrice > 0) {
        return quote.regularMarketPrice;
      }
      console.error(
        "FX Service Error: Yahoo Finance returned no valid rate, using FALLBACK_USD_IDR_RATE",
      );
      return FALLBACK_USD_IDR_RATE;
    } catch (error) {
      console.error("FX Service Error (Yahoo Finance):", error);
      return FALLBACK_USD_IDR_RATE;
    }
  },
  ["usd-idr-exchange-rate"],
  { revalidate: 300 },
);

// ==== CRYPTO MARKET (BINANCE PUBLIC REST API) ====
type BinanceTickerRaw = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
  quoteVolume: string;
};

export const getCryptoMarketData = unstable_cache(
  async (): Promise<MarketAsset[]> => {
    try {
      const symbols = CRYPTO_ASSETS.map((c) => c.symbol);
      const symbolsParam = encodeURIComponent(JSON.stringify(symbols));

      const tickers = await fetchBinancePublic<BinanceTickerRaw[]>(
        `/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      );

      return tickers.map((ticker): MarketAsset => {
        const cryptoMeta = CRYPTO_ASSETS.find(
          (c) => c.symbol === ticker.symbol,
        );

        return {
          symbol:
            cryptoMeta?.shortSymbol ||
            ticker.symbol.replace("USDT", "") ||
            "UNKNOWN",
          name: cryptoMeta?.name || "Crypto Asset",
          asset_type: "crypto",
          price: Number(ticker.lastPrice),
          change24h: Number(ticker.priceChangePercent),
          high24h: Number(ticker.highPrice),
          low24h: Number(ticker.lowPrice),
          volume24h: Number(ticker.quoteVolume),
          currency: "USD",
        };
      });
    } catch (error) {
      console.error("Crypto Market Error:", error);
      return [];
    }
  },
  ["crypto-market-ticker"],
  { revalidate: 60 },
);

export const getCryptoChartData = unstable_cache(
  async (
    symbol: string,
    interval: string = "1d",
    limit: number = 100,
    startTime?: number,
  ): Promise<OHLCData[]> => {
    try {
      const binanceSymbol = `${symbol}USDT`;
      type BinanceKline = [number, string, string, string, string, string];
      let klines: BinanceKline[];

      if (startTime === undefined) {
        const path = `/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        klines = await fetchBinancePublic<BinanceKline[]>(path);
      } else {
        const endTime = Date.now();
        let nextStartTime = startTime;
        klines = [];

        while (nextStartTime <= endTime) {
          const path =
            `/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}` +
            `&startTime=${nextStartTime}&endTime=${endTime}&limit=1000`;
          const batch = await fetchBinancePublic<BinanceKline[]>(path);

          if (batch.length === 0) break;

          klines.push(...batch);
          const lastOpenTime = Number(batch[batch.length - 1][0]);
          const followingStartTime = lastOpenTime + 1;
          if (followingStartTime <= nextStartTime) {
            throw new Error(
              "Binance mengembalikan rentang candle yang tidak valid",
            );
          }
          nextStartTime = followingStartTime;

          if (batch.length < 1000) break;
        }
      }

      const seenTimes = new Set<string>();
      const result: OHLCData[] = [];
      const isIntraday = ["5m", "15m", "1h", "4h"].includes(interval);

      for (const kline of klines) {
        const dateObj = new Date(Number(kline[0]));
        const timeStr = isIntraday
          ? dateObj.toISOString().replace("T", " ").substring(0, 16)
          : dateObj.toISOString().split("T")[0];

        if (!seenTimes.has(timeStr)) {
          seenTimes.add(timeStr);
          result.push({
            time: timeStr,
            open: Number(kline[1]),
            high: Number(kline[2]),
            low: Number(kline[3]),
            close: Number(kline[4]),
            volume: Number(kline[5]),
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Crypto Chart Error:", error);
      return [];
    }
  },
  ["crypto-chart-klines"],
  { revalidate: 60 },
);

// ==== STOCKS MARKET (VIA YAHOO FINANCE) ====
type YahooStockQuote = {
  symbol?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
};

export async function getStockMarketData(): Promise<MarketAsset[]> {
  try {
    const queries = STOCK_ASSETS.map((s) => s.symbol);
    const quotes = await Promise.all(
      queries.map(async (symbol) => {
        try {
          return (await yahooFinance.quote(symbol)) as YahooStockQuote | null;
        } catch (err) {
          console.error(`Failed to fetch ${symbol}:`, err);
          return null;
        }
      }),
    );

    const validQuotes = quotes.filter(
      (q): q is YahooStockQuote => q !== null && q !== undefined,
    );

    return validQuotes.map((quote): MarketAsset => {
      const stockMeta = STOCK_ASSETS.find((s) => s.symbol === quote.symbol);

      return {
        symbol:
          stockMeta?.shortSymbol ||
          quote.symbol?.replace(".JK", "") ||
          "UNKNOWN",
        name: stockMeta?.name || quote.longName || quote.shortName || "Stock",
        asset_type: "stocks",
        price: quote.regularMarketPrice || 0,
        change24h: quote.regularMarketChangePercent || 0,
        high24h: quote.regularMarketDayHigh,
        low24h: quote.regularMarketDayLow,
        volume24h: quote.regularMarketVolume,
        currency: "IDR",
      };
    });
  } catch (error) {
    console.error("Stock Market Error:", error);
    return [];
  }
}

export async function getStockChartData(
  symbol: string,
  period1: string,
  interval:
    | "1d"
    | "1wk"
    | "1mo"
    | "1h"
    | "30m"
    | "15m"
    | "5m"
    | "4h" = "1d",
): Promise<OHLCData[]> {
  try {
    const yahooSymbol = symbol === "IHSG" ? "^JKSE" : `${symbol}.JK`;
    const sourceInterval = interval === "4h" ? "1h" : interval;

    const chartResult = await yahooFinance.chart(yahooSymbol, {
      period1: new Date(period1),
      period2: new Date(),
      interval: sourceInterval,
      return: "array",
    });

    const quotes = chartResult.quotes || [];

    const validQuotes = quotes.filter(
      (q) =>
        q &&
        typeof q.open === "number" &&
        typeof q.high === "number" &&
        typeof q.low === "number" &&
        typeof q.close === "number" &&
        q.open !== null &&
        q.high !== null &&
        q.low !== null &&
        q.close !== null,
    );

    const isIntraday = ["5m", "15m", "30m", "1h", "4h"].includes(interval);

    const candles = validQuotes.map((data): OHLCData => {
      const dateObj = new Date(data.date);
      const timeStr = isIntraday
        ? dateObj.toISOString().replace("T", " ").substring(0, 16)
        : dateObj.toISOString().split("T")[0];

      return {
        time: timeStr,
        open: Number(data.open),
        high: Number(data.high),
        low: Number(data.low),
        close: Number(data.close),
        volume: Number(data.volume || 0),
      };
    });

    if (interval !== "4h") return candles;

    const candlesByDay = new Map<string, OHLCData[]>();
    for (const candle of candles) {
      const day = candle.time.slice(0, 10);
      const dailyCandles = candlesByDay.get(day) ?? [];
      dailyCandles.push(candle);
      candlesByDay.set(day, dailyCandles);
    }

    return [...candlesByDay.values()].flatMap((dailyCandles) => {
      const aggregated: OHLCData[] = [];
      for (let index = 0; index < dailyCandles.length; index += 4) {
        const group = dailyCandles.slice(index, index + 4);
        const first = group[0];
        const last = group[group.length - 1];
        aggregated.push({
          time: first.time,
          open: first.open,
          high: Math.max(...group.map((candle) => candle.high)),
          low: Math.min(...group.map((candle) => candle.low)),
          close: last.close,
          volume: group.reduce(
            (total, candle) => total + (candle.volume ?? 0),
            0,
          ),
        });
      }
      return aggregated;
    });
  } catch (error) {
    console.error(`Stock Chart Error for ${symbol}:`, error);
    return [];
  }
}
