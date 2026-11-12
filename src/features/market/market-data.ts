"use server";

import { unstable_cache } from "next/cache";
import { MarketAsset, OHLCData } from "./types";
import {
  BINANCE_ENDPOINTS,
  BYBIT_API_BASE_URL,
  CRYPTO_ASSETS,
} from "@/constants/market-constant";
import {
  getExchangeRateUSDIDR as loadExchangeRateUSDIDR,
  getStockChartData as loadStockChartData,
  getStockMarketData as loadStockMarketData,
} from "./stock-market-data";

async function fetchBinancePublic<T>(
  path: string,
  endpoints: readonly string[] = BINANCE_ENDPOINTS,
): Promise<T> {
  const failures: string[] = [];

  for (const baseUrl of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        next: { revalidate: 60 },
      });
      if (response.ok) {
        return (await response.json()) as T;
      }

      const responseBody = (await response.text()).slice(0, 200);
      failures.push(
        `${baseUrl}: HTTP ${response.status}${responseBody ? ` (${responseBody})` : ""}`,
      );
    } catch (error) {
      failures.push(
        `${baseUrl}: ${error instanceof Error ? error.message : "network error"}`,
      );
    }
  }

  throw new Error(
    `Request Binance gagal pada semua endpoint. ${failures.join(" | ")}`,
  );
}

// CRYPTO MARKET (BINANCE PUBLIC REST API)
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

type BinanceKline = [number, string, string, string, string, string];

type BybitInterval = "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

type BybitKlineResponse = {
  retCode: number;
  retMsg: string;
  result?: {
    list?: string[][];
  };
};

const BYBIT_INTERVALS: Record<BybitInterval, string> = {
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "1d": "D",
  "1w": "W",
};

async function loadCryptoSpotChartData(
  symbol: string,
  interval: string,
  limit: number,
  startTime: number | undefined,
): Promise<OHLCData[]> {
  try {
    const binanceSymbol = `${symbol}USDT`;
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
    const isIntraday = ["5m", "15m", "30m", "1h", "4h"].includes(interval);

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
    console.error("Binance Spot Chart Error:", error);
    return [];
  }
}

export const getCryptoChartData = unstable_cache(
  async (
    symbol: string,
    interval: string = "1d",
    limit: number = 100,
    startTime?: number,
  ): Promise<OHLCData[]> =>
    loadCryptoSpotChartData(symbol, interval, limit, startTime),
  ["crypto-chart-klines"],
  { revalidate: 60 },
);

async function loadBybitLinearFuturesChartData(
  symbol: string,
  interval: BybitInterval,
  startTime: number | undefined,
): Promise<OHLCData[]> {
  const bybitInterval = BYBIT_INTERVALS[interval];
  const bybitSymbol = `${symbol}USDT`;
  const requestLimit = 1000;
  const candlesByOpenTime = new Map<number, OHLCData>();
  const requestedStartTime =
    startTime ?? Date.now() - 365 * 24 * 60 * 60 * 1000;
  let pageEndTime = Date.now();

  while (pageEndTime >= requestedStartTime) {
    const params = new URLSearchParams({
      category: "linear",
      symbol: bybitSymbol,
      interval: bybitInterval,
      end: String(pageEndTime),
      limit: String(requestLimit),
    });
    if (startTime !== undefined) {
      params.set("start", String(requestedStartTime));
    }

    const response = await fetch(
      `${BYBIT_API_BASE_URL}/v5/market/kline?${params.toString()}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) {
      const responseBody = (await response.text()).slice(0, 200);
      throw new Error(
        `Bybit returned HTTP ${response.status}${responseBody ? ` (${responseBody})` : ""}`,
      );
    }

    const payload = (await response.json()) as BybitKlineResponse;
    if (payload.retCode !== 0) {
      throw new Error(
        `Bybit error ${payload.retCode}: ${payload.retMsg || "unknown error"}`,
      );
    }

    const batch = payload.result?.list ?? [];
    if (batch.length === 0) break;

    let oldestOpenTime = Number.POSITIVE_INFINITY;
    for (const kline of batch) {
      const openTime = Number(kline[0]);
      oldestOpenTime = Math.min(oldestOpenTime, openTime);
      if (
        openTime < requestedStartTime ||
        ![openTime, ...kline.slice(1, 6).map(Number)].every(Number.isFinite)
      ) {
        continue;
      }

      const dateObj = new Date(openTime);
      const time = ["5m", "15m", "30m", "1h", "4h"].includes(interval)
        ? dateObj.toISOString().replace("T", " ").substring(0, 16)
        : dateObj.toISOString().split("T")[0];
      candlesByOpenTime.set(openTime, {
        time,
        open: Number(kline[1]),
        high: Number(kline[2]),
        low: Number(kline[3]),
        close: Number(kline[4]),
        volume: Number(kline[5]),
      });
    }

    if (batch.length < requestLimit || !Number.isFinite(oldestOpenTime)) break;
    const nextEndTime = oldestOpenTime - 1;
    if (nextEndTime >= pageEndTime) {
      throw new Error(
        "Bybit mengembalikan rentang candle yang tidak bergerak.",
      );
    }
    pageEndTime = nextEndTime;
  }

  return [...candlesByOpenTime.entries()]
    .sort(([timeA], [timeB]) => timeA - timeB)
    .map(([, candle]) => candle);
}

export const getBybitLinearFuturesChartData = unstable_cache(
  async (
    symbol: string,
    interval: BybitInterval,
    startTime?: number,
  ): Promise<OHLCData[]> =>
    loadBybitLinearFuturesChartData(symbol, interval, startTime),
  ["bybit-linear-futures-chart-klines"],
  { revalidate: 60 },
);


export async function getExchangeRateUSDIDR(): Promise<number> {
  return loadExchangeRateUSDIDR();
}

export async function getStockMarketData(): Promise<MarketAsset[]> {
  return loadStockMarketData();
}

export async function getStockChartData(
  symbol: string,
  period1: string,
  interval: "1d" | "1wk" | "1mo" | "1h" | "30m" | "15m" | "5m" | "4h" = "1d",
): Promise<OHLCData[]> {
  return loadStockChartData(symbol, period1, interval);
}
