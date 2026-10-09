"use server";

import { unstable_cache } from "next/cache";
import { MarketAsset, OHLCData } from "./types";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["ripHistorical", "yahooSurvey"],
});

const BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision",
  "https://api1.binance.com",
  "https://api3.binance.com",
  "https://api.binance.com",
];

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

// ==== KURS MATA UANG ====
export async function getExchangeRateUSDIDR(): Promise<number> {
  try {
    const quote = (await yahooFinance.quote("IDR=X")) as {
      regularMarketPrice?: number;
    };
    return quote.regularMarketPrice || 17257;
  } catch (error) {
    console.error("FX Service Error:", error);
    return 17257;
  }
}

// ==== CRYPTO MARKET (BINANCE PUBLIC REST API) ====
const CRYPTO_SYMBOLS = [
  { symbol: "BTCUSDT", name: "Bitcoin", short: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", short: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", short: "SOL" },
  { symbol: "BNBUSDT", name: "BNB", short: "BNB" },
];

type BinanceTickerRaw = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
};

export const getCryptoMarketData = unstable_cache(
  async (): Promise<MarketAsset[]> => {
    try {
      const symbols = CRYPTO_SYMBOLS.map((c) => c.symbol);
      const symbolsParam = encodeURIComponent(JSON.stringify(symbols));

      const tickers = await fetchBinancePublic<BinanceTickerRaw[]>(
        `/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      );

      return tickers.map((ticker): MarketAsset => {
        const cryptoMeta = CRYPTO_SYMBOLS.find(
          (c) => c.symbol === ticker.symbol,
        );

        return {
          symbol:
            cryptoMeta?.short || ticker.symbol.replace("USDT", "") || "UNKNOWN",
          name: cryptoMeta?.name || "Crypto Asset",
          asset_type: "crypto",
          price: Number(ticker.lastPrice),
          change24h: Number(ticker.priceChangePercent),
          high24h: Number(ticker.highPrice),
          low24h: Number(ticker.lowPrice),
          volume24h: Number(ticker.volume),
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
  ): Promise<OHLCData[]> => {
    try {
      const binanceSymbol = `${symbol}USDT`;
      const path = `/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

      const klines =
        await fetchBinancePublic<
          Array<[number, string, string, string, string, string]>
        >(path);

      const seenTimes = new Set<string>();
      const result: OHLCData[] = [];

      for (const kline of klines) {
        const timeStr = new Date(Number(kline[0])).toISOString().split("T")[0];

        // Memastikan tidak ada timestamp/tanggal duplikat yang merusak TradingView
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
  { revalidate: 3600 },
);

// ==== STOCKS MARKET (VIA YAHOO FINANCE) ====
const STOCK_SYMBOLS = [
  { symbol: "^JKSE", name: "IHSG (Index Harga Saham Gabungan)", short: "IHSG" },
  { symbol: "BBCA.JK", name: "Bank Central Asia", short: "BBCA" },
  { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", short: "BBRI" },
  { symbol: "BMRI.JK", name: "Bank Mandiri", short: "BMRI" },
  { symbol: "TLKM.JK", name: "Telkom Indonesia", short: "TLKM" },
];

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
    const queries = STOCK_SYMBOLS.map((s) => s.symbol);
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
      const stockMeta = STOCK_SYMBOLS.find((s) => s.symbol === quote.symbol);

      return {
        symbol:
          stockMeta?.short || quote.symbol?.replace(".JK", "") || "UNKNOWN",
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
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<OHLCData[]> {
  try {
    const yahooSymbol = symbol === "IHSG" ? "^JKSE" : `${symbol}.JK`;

    const chartResult = (await yahooFinance.chart(yahooSymbol, {
      period1: new Date(period1),
      period2: new Date(),
      interval,
    })) as unknown as {
      quotes: Array<{
        date: Date;
        open: number | null;
        high: number | null;
        low: number | null;
        close: number | null;
        volume: number | null;
      }>;
    };

    const quotes = chartResult.quotes || [];

    // Filter baris data yang mengandung nilai null dari Yahoo Finance
    // Antisipasi pasar saham libur
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

    return validQuotes.map((data): OHLCData => ({
      time: new Date(data.date).toISOString().split("T")[0],
      open: Number(data.open),
      high: Number(data.high),
      low: Number(data.low),
      close: Number(data.close),
      volume: Number(data.volume || 0),
    }));
  } catch (error) {
    console.error(`Stock Chart Error for ${symbol}:`, error);
    return [];
  }
}
