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
import { getMarketChartData } from "@/features/market/action";
import type { AssetType, OHLCData } from "@/features/market/types";

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

  // State Management tanpa Effect Sync
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M">("1D");
  const [fetchedData, setFetchedData] = useState<OHLCData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevSymbol, setPrevSymbol] = useState(symbol);

  // Adjusting state during render ketika prop symbol berubah
  if (symbol !== prevSymbol) {
    setPrevSymbol(symbol);
    setTimeframe("1D");
    setFetchedData(null);
  }

  // Menentukan data yang dirender (Gunakan prop data jika 1D, atau fetchedData jika 1W/1M)
  const chartData = timeframe === "1D" ? data : (fetchedData ?? data);

  const handleTimeframeChange = async (tf: "1D" | "1W" | "1M") => {
    if (tf === timeframe || isLoading) return;

    if (tf === "1D") {
      setTimeframe("1D");
      setFetchedData(null);
      return;
    }

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

    const getResolvedCssVar = (varName: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      const val = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
      return val || fallback;
    };

    const getThemeColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const textColor = getResolvedCssVar(
        "--chart-4",
        isDark ? "#99c2ff" : "#0f2855",
      );
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
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
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

    const observer = new MutationObserver(() => {
      if (!chartRef.current) return;
      const updatedColors = getThemeColors();
      chartRef.current.applyOptions({
        layout: {
          textColor: updatedColors.textColor,
        },
        grid: {
          vertLines: { color: updatedColors.gridColor },
          horzLines: { color: updatedColors.gridColor },
        },
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData]);

  return (
    <Card className="w-full shadow-sm border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span>Chart {symbol}</span>
          <span className="text-xs text-muted-foreground font-normal">
            ({currencySymbol})
          </span>
        </CardTitle>

        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
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

      <CardContent className="pt-4 px-2 relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-[1px] transition-all">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && chartData.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-xs text-muted-foreground">
            Data chart tidak tersedia atau gagal dimuat.
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-95" />
      </CardContent>
    </Card>
  );
}
