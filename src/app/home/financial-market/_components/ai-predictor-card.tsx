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
import { analyzeMarketWithAI } from "@/features/market/action";
import { cn } from "@/lib/utils";
import type {
  AIAnalysisResponse,
  AssetType,
  MomentumIndicator,
  TradingStrategy,
  TrendIndicator,
  VolumeIndicator,
} from "@/features/market/types";

// Label strategi yang user-friendly
const STRATEGY_LABELS: Record<TradingStrategy, string> = {
  scalping: "Scalping",
  day_trading: "Day Trade",
  swing_trading: "Swing Trade",
  investing: "Investing",
};

// Daftar aset pencarian dinamis
const STOCK_ASSETS = [
  { symbol: "IHSG", name: "IHSG (Composite Index)" },
  { symbol: "BBCA", name: "Bank Central Asia" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia" },
  { symbol: "BMRI", name: "Bank Mandiri" },
  { symbol: "TLKM", name: "Telkom Indonesia" },
];

const CRYPTO_ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "BNB", name: "BNB" },
];

interface AiPredictorCardProps {
  assetType: AssetType;
}

export function AiPredictorCard({ assetType }: AiPredictorCardProps) {
  const assetList = assetType === "stocks" ? STOCK_ASSETS : CRYPTO_ASSETS;

  const [symbol, setSymbol] = useState(assetList[0].symbol);
  const [strategy, setStrategy] = useState<TradingStrategy>("swing_trading");
  const [trend, setTrend] = useState<TrendIndicator>("SMA");
  const [momentum, setMomentum] = useState<MomentumIndicator>("RSI");
  const [volume, setVolume] = useState<VolumeIndicator>("OBV");

  // State Search Form Aset
  const [openSearch, setOpenSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);

  const filteredAssets = assetList.filter(
    (a) =>
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Single handler function
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
        assetType === "stocks" ? "IDR" : "USD",
      );
      setAnalysis(result);
    } catch (err) {
      console.error("Gagal menjalankan AI Predictor:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-sm border-primary/20">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          AI Market Predictor Agent
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* 1. Search Form Selection Aset */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1">
            <Search className="size-3 text-primary" /> Pilih Aset Diprediksi
          </label>
          <Popover open={openSearch} onOpenChange={setOpenSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openSearch}
                className="w-full justify-between h-9 text-xs font-semibold"
              >
                {symbol
                  ? assetList.find((a) => a.symbol === symbol)?.name || symbol
                  : "Cari Aset..."}
                <ChevronsUpDown className="ml-2 size-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-2" align="start">
              <div className="flex items-center border-b px-2 pb-2 mb-2">
                <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
                <Input
                  placeholder="Ketik nama atau simbol aset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs border-0 focus-visible:ring-0 shadow-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredAssets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Aset tidak ditemukan.
                  </p>
                ) : (
                  filteredAssets.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => {
                        setSymbol(asset.symbol);
                        setOpenSearch(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between hover:bg-muted/50 transition-colors",
                        symbol === asset.symbol &&
                          "bg-primary/10 font-semibold text-primary",
                      )}
                    >
                      <div>
                        <span>{asset.symbol}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {asset.name}
                        </span>
                      </div>
                      {symbol === asset.symbol && (
                        <Check className="size-3 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 2. Selector Metode Trading */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1">
            <Target className="size-3 text-primary" /> Metode Trading
          </label>
          <Select
            value={strategy}
            onValueChange={(v) => setStrategy(v as TradingStrategy)}
          >
            <SelectTrigger className="h-9 text-xs font-semibold">
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

        {/* 3. Selector 3 Indikator per Kategori */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t">
          {/* Trend Indicator */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">
              Trend
            </label>
            <Select
              value={trend}
              onValueChange={(v) => setTrend(v as TrendIndicator)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="EMA">EMA</SelectItem>
                <SelectItem value="ADX">ADX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Momentum Indicator */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">
              Momentum
            </label>
            <Select
              value={momentum}
              onValueChange={(v) => setMomentum(v as MomentumIndicator)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RSI">RSI</SelectItem>
                <SelectItem value="MACD">MACD</SelectItem>
                <SelectItem value="STOCHASTIC">Stochastic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Volume Indicator */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">
              Volume
            </label>
            <Select
              value={volume}
              onValueChange={(v) => setVolume(v as VolumeIndicator)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OBV">OBV</SelectItem>
                <SelectItem value="VWAP">VWAP</SelectItem>
                <SelectItem value="VOLUME_PROFILE">Volume Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 4. Action Button */}
        <Button
          className="w-full h-9 text-xs font-medium"
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

        {/* 5. Output Analisis AI */}
        {analysis && (
          <div className="space-y-3 pt-2 border-t text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
              <div className="flex items-center gap-1.5 font-semibold">
                <TrendingUp className="size-4 text-primary" />
                <span>Rekomendasi: {analysis.recommendation}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <ShieldAlert className="size-3.5" />
                <span>Risiko: {analysis.riskLevel}</span>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {analysis.summary}
            </p>

            <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg">
              <p className="font-semibold text-foreground">
                Detail Analisis: {symbol} ({STRATEGY_LABELS[strategy]})
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{analysis.trendAnalysis}</li>
                <li>{analysis.momentumAnalysis}</li>
                <li>{analysis.volumeAnalysis}</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
