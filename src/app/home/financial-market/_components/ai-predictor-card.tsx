"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  ShieldAlert,
  Target,
  Search,
  Check,
  ChevronsUpDown,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldX,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AIAnalysisResponse,
  AssetType,
  Currency,
  MomentumIndicator,
  TradingStrategy,
  TrendIndicator,
  VolumeIndicator,
} from "@/features/market/types";
import {
  UI_CRYPTO_OPTIONS,
  UI_STOCK_OPTIONS,
} from "@/constants/market-constant";
import { analyzeMarketWithAI } from "@/features/market/ai-action";

const STRATEGY_LABELS: Record<TradingStrategy, string> = {
  scalping: "Scalping",
  day_trading: "Day Trade",
  swing_trading: "Swing Trade",
  investing: "Investing",
};

interface AiPredictorCardProps {
  assetType: AssetType;
  currency?: Currency;
  className?: string;
}

export function AiPredictorCard({
  assetType,
  currency = "IDR",
  className,
}: AiPredictorCardProps) {
  // Menggunakan opsi aset terpusat
  const assetList =
    assetType === "stocks" ? UI_STOCK_OPTIONS : UI_CRYPTO_OPTIONS;

  const [prevAssetType, setPrevAssetType] = useState(assetType);
  const [symbol, setSymbol] = useState(assetList[0].symbol);

  if (assetType !== prevAssetType) {
    setPrevAssetType(assetType);
    setSymbol(assetList[0].symbol);
  }

  const selectedAsset =
    assetList.find((a) => a.symbol === symbol) || assetList[0];

  const [strategy, setStrategy] = useState<TradingStrategy>("swing_trading");
  const [trend, setTrend] = useState<TrendIndicator>("SMA");
  const [momentum, setMomentum] = useState<MomentumIndicator>("RSI");
  const [volume, setVolume] = useState<VolumeIndicator>("OBV");

  const [openSearch, setOpenSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);

  const [analyzedParams, setAnalyzedParams] = useState<{
    symbol: string;
    strategy: TradingStrategy;
  } | null>(null);

  const filteredAssets = assetList.filter(
    (a) =>
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await analyzeMarketWithAI(
        {
          symbol,
          asset_type: assetType,
          strategy,
          trend_indicator: trend,
          momentum_indicator: momentum,
          volume_indicator: volume,
        },
        currency,
      );
      setAnalysis(result);
      setAnalyzedParams({ symbol, strategy });
    } catch (err) {
      console.error("Gagal menjalankan AI Predictor:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "w-full max-w-full sm:max-w-md md:max-w-2xl lg:max-w-2xl shadow-sm border-primary/20",
        className,
      )}
    >
      <CardHeader className="px-4 pt-4 pb-3 border-b shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
          <Sparkles className="size-4 text-primary shrink-0" />
          <span>AI Market Predictor Agent</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Pilih Aset */}
        <div>
          <label
            htmlFor="select-asset-predict"
            className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"
          >
            <Search className="size-3 text-primary" /> Pilih Aset Diprediksi
          </label>

          <Popover open={openSearch} onOpenChange={setOpenSearch}>
            <PopoverTrigger asChild>
              <Button
                id="select-asset-predict"
                variant="outline"
                aria-expanded={openSearch}
                aria-controls="asset-predict-popover-list"
                className="justify-between w-full px-3 text-xs font-semibold h-9"
              >
                <span className="truncate">
                  {selectedAsset
                    ? `${selectedAsset.symbol} (${selectedAsset.name})`
                    : "Cari Aset..."}
                </span>
                <ChevronsUpDown className="ml-2 opacity-50 size-3 shrink-0" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              id="asset-predict-popover-list"
              className="w-(--radix-popover-trigger-width) min-w-70 p-2 overflow-hidden"
              align="start"
            >
              <div className="flex items-center px-2 pb-2 mb-2 border-b">
                <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
                <Input
                  placeholder="Ketik nama atau simbol aset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1 overflow-y-auto max-h-48">
                {filteredAssets.length === 0 ? (
                  <p className="py-3 text-xs text-center text-muted-foreground">
                    Aset tidak ditemukan.
                  </p>
                ) : (
                  filteredAssets.map((asset) => (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => {
                        setSymbol(asset.symbol);
                        setOpenSearch(false);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between hover:bg-muted/50 transition-colors",
                        symbol === asset.symbol &&
                          "bg-primary/10 font-semibold text-primary",
                      )}
                    >
                      <div className="pr-2 truncate">
                        <span>{asset.symbol}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5 truncate">
                          {asset.name}
                        </span>
                      </div>
                      {symbol === asset.symbol && (
                        <Check className="size-3 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Metode Trading */}
        <div>
          <label
            htmlFor="select-trading-strategy"
            className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"
          >
            <Target className="size-3 text-primary" /> Metode Trading
          </label>
          <Select
            value={strategy}
            onValueChange={(v) => setStrategy(v as TradingStrategy)}
          >
            <SelectTrigger
              id="select-trading-strategy"
              className="text-xs font-semibold h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scalping">
                ⚡ Scalping (Sangat Pendek / 15m)
              </SelectItem>
              <SelectItem value="day_trading">
                ☀️ Day Trading (Harian / 1h)
              </SelectItem>
              <SelectItem value="swing_trading">
                🌊 Swing Trade (Mingguan / 1D)
              </SelectItem>
              <SelectItem value="investing">
                🚀 Invest / Position (Jangka Panjang / 1W)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Indikator Teknikal Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t">
          <div>
            <label
              htmlFor="select-trend-indicator"
              className="text-[10px] font-medium text-muted-foreground uppercase block truncate"
            >
              Trend
            </label>
            <Select
              value={trend}
              onValueChange={(v) => setTrend(v as TrendIndicator)}
            >
              <SelectTrigger
                id="select-trend-indicator"
                className="h-8 px-2 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="EMA">EMA</SelectItem>
                <SelectItem value="ADX">ADX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="select-momentum-indicator"
              className="text-[10px] font-medium text-muted-foreground uppercase block truncate"
            >
              Momentum
            </label>
            <Select
              value={momentum}
              onValueChange={(v) => setMomentum(v as MomentumIndicator)}
            >
              <SelectTrigger
                id="select-momentum-indicator"
                className="h-8 px-2 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RSI">RSI</SelectItem>
                <SelectItem value="MACD">MACD</SelectItem>
                <SelectItem value="STOCHASTIC">Stochastic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="select-volume-indicator"
              className="text-[10px] font-medium text-muted-foreground uppercase block truncate"
            >
              Volume
            </label>
            <Select
              value={volume}
              onValueChange={(v) => setVolume(v as VolumeIndicator)}
            >
              <SelectTrigger
                id="select-volume-indicator"
                className="h-8 px-2 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OBV">OBV</SelectItem>
                <SelectItem value="VWAP">VWAP</SelectItem>
                <SelectItem value="VOLUME_PROFILE">Vol Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Button */}
        <Button
          className="w-full text-xs font-medium h-9"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-3.5 animate-spin mr-2" />
              Menganalisis {symbol}...
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 mr-2 text-primary-foreground" />
              Jalankan Analisis AI ({symbol})
            </>
          )}
        </Button>

        {/* Hasil Analisis AI */}
        {analysis && (
          <div className="pt-2 space-y-3 text-xs border-t">
            {/* Rekomendasi & Risiko */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-primary/10">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <TrendingUp className="size-4 text-primary shrink-0" />
                <span>Rekomendasi: {analysis.recommendation}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>Risiko: {analysis.riskLevel}</span>
              </div>
            </div>

            {/* Target Prices Grid */}
            {analysis.targetPrices && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50 text-center">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center gap-1 truncate">
                    <ArrowDownCircle className="size-3 text-emerald-500 shrink-0" />
                    <span>Beli</span>
                  </span>
                  <p className="font-bold text-[11px] sm:text-xs text-foreground truncate">
                    {formatCurrency(analysis.targetPrices.entryPrice, currency)}
                  </p>
                </div>

                <div className="space-y-0.5 border-x border-border/50 px-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center gap-1 truncate">
                    <ArrowUpCircle className="size-3 text-primary shrink-0" />
                    <span>Target</span>
                  </span>
                  <p className="font-bold text-[11px] sm:text-xs text-foreground truncate">
                    {formatCurrency(analysis.targetPrices.takeProfit, currency)}
                  </p>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center gap-1 truncate">
                    <ShieldX className="size-3 text-rose-500 shrink-0" />
                    <span>Stop Loss</span>
                  </span>
                  <p className="font-bold text-[11px] sm:text-xs text-rose-500 truncate">
                    {formatCurrency(analysis.targetPrices.stopLoss, currency)}
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {analysis.summary}
            </p>

            {/* Detail Analisis */}
            <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-lg">
              <p className="text-xs font-semibold text-foreground">
                Detail Analisis: {analyzedParams?.symbol} (
                {analyzedParams ? STRATEGY_LABELS[analyzedParams.strategy] : ""}
                )
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                <li>{analysis.trendAnalysis}</li>
                <li>{analysis.momentumAnalysis}</li>
                <li>{analysis.volumeAnalysis}</li>
              </ul>
            </div>

            {/* Key Levels */}
            {analysis.keyLevels && (
              <div className="pt-2 border-t space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Layers className="size-3 text-primary shrink-0" /> Key Levels
                  Terdekat
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] bg-muted/30 p-2.5 rounded-md">
                  <div className="truncate">
                    <span className="text-muted-foreground">Support: </span>
                    <span className="font-semibold text-emerald-500">
                      {analysis.keyLevels.support
                        .map((val) => formatCurrency(val, currency))
                        .join(" | ")}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-muted-foreground">Resistance: </span>
                    <span className="font-semibold text-rose-500">
                      {analysis.keyLevels.resistance
                        .map((val) => formatCurrency(val, currency))
                        .join(" | ")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
