"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OHLCData } from "@/features/market/types";

interface TradingViewChartProps {
  data: OHLCData[];
  symbol: string;
  currencySymbol?: string;
}

export function TradingViewChart({
  data,
  symbol,
  currencySymbol = "Rp",
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M">("1D");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--muted-foreground))",
      },
      grid: {
        vertLines: { color: "hsl(var(--border) / 0.3)" },
        horzLines: { color: "hsl(var(--border) / 0.3)" },
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

    if (data && data.length > 0) {
      const formattedData = data.map((d) => ({
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

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

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
              className="h-7 text-xs px-2.5"
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-2 relative">
        {data.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-xs text-muted-foreground">
            Data chart tidak tersedia atau gagal dimuat.
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-95" />
      </CardContent>
    </Card>
  );
}
