"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AssetType, OHLCData } from "@/features/market/types";
import { getMarketChartData } from "@/features/market/action";

// Warna teks chart bila CSS variable tema (--chart-4) belum terdefinisi.
const DEFAULT_CHART_TEXT_COLOR = { dark: "#99c2ff", light: "#0f2855" } as const;

interface TradingViewChartProps {
  data: OHLCData[];
  symbol: string;
  assetType?: AssetType;
  currencySymbol?: string;
}

export function TradingViewChart({
  data,
  symbol,
  assetType = "stocks",
  currencySymbol = "Rp",
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M">("1D");
  const [fetchedData, setFetchedData] = useState<OHLCData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevSymbol, setPrevSymbol] = useState(symbol);

  if (symbol !== prevSymbol) {
    setPrevSymbol(symbol);
    setTimeframe("1D");
    setFetchedData(null);
  }

  // Ambil data baru saat prop symbol berubah dari tabel
  useEffect(() => {
    let isMounted = true;

    const loadNewSymbolData = async () => {
      setIsLoading(true);
      try {
        const newData = await getMarketChartData(symbol, assetType, "1D");
        if (isMounted) {
          setFetchedData(newData && newData.length > 0 ? newData : null);
        }
      } catch (error) {
        console.error("Gagal memuat chart symbol baru:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNewSymbolData();

    return () => {
      isMounted = false;
    };
  }, [symbol, assetType]);

  const chartData = fetchedData ?? data;

  const handleTimeframeChange = async (tf: "1D" | "1W" | "1M") => {
    if (tf === timeframe || isLoading) return;

    setTimeframe(tf);
    setIsLoading(true);

    try {
      const newData = await getMarketChartData(symbol, assetType, tf);
      if (newData && newData.length > 0) {
        setFetchedData(newData);
      }
    } catch (error) {
      console.error("Gagal mengambil data timeframe chart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const readCssVar = (varName: string): string | null => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
      return value === "" ? null : value;
    };

    const getThemeColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const textColor =
        readCssVar("--chart-4") ??
        (isDark ? DEFAULT_CHART_TEXT_COLOR.dark : DEFAULT_CHART_TEXT_COLOR.light);
      const gridColor = isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(15, 40, 85, 0.08)";

      return { textColor, gridColor };
    };

    const initialColors = getThemeColors();

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: initialColors.textColor,
      },
      grid: {
        vertLines: { color: initialColors.gridColor },
        horzLines: { color: initialColors.gridColor },
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    if (chartData && chartData.length > 0) {
      const formattedData = chartData.map((d) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candlestickSeries.setData(formattedData);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;

    const themeObserver = new MutationObserver(() => {
      if (!chartRef.current) return;
      const updatedColors = getThemeColors();
      chartRef.current.applyOptions({
        layout: { textColor: updatedColors.textColor },
        grid: {
          vertLines: { color: updatedColors.gridColor },
          horzLines: { color: updatedColors.gridColor },
        },
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!chartRef.current || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chartRef.current.applyOptions({ width });
        chartRef.current.timeScale().fitContent();
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartData]);

  return (
    <Card className="w-full shadow-sm border-primary/10 min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2 min-w-0">
          <span className="truncate">Chart {symbol}</span>
          <span className="text-xs text-muted-foreground font-normal shrink-0">
            ({currencySymbol})
          </span>
        </CardTitle>

        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg shrink-0">
          {(["1D", "1W", "1M"] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "secondary" : "ghost"}
              size="sm"
              disabled={isLoading}
              className="h-7 text-xs px-2.5"
              onClick={() => handleTimeframeChange(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4 px-2 relative min-w-0">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && chartData.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-xs text-muted-foreground">
            Data chart tidak tersedia atau gagal dimuat.
          </div>
        )}

        {/* Mekanis pengunci lebar canvas */}
        <div
          ref={chartContainerRef}
          className="w-full h-95 min-w-0 overflow-hidden"
        />
      </CardContent>
    </Card>
  );
}
