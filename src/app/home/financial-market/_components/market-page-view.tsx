"use client";

import { useState, type ReactNode } from "react";
import type {
  AssetType,
  Currency,
  MarketAsset,
  MarketTransaction,
  OHLCData,
  PortfolioAsset,
} from "@/features/market/types";
import { useLiveMarketData } from "@/features/market/hooks/use-live-market-data";
import { PortfolioCard } from "./portfolio-card";
import { TradingViewChart } from "./trading-view-chart";
import { MarketAssetsTable } from "./market-assets-table";
import { MarketWizardInput } from "./market-wizard-input";
import { TransactionSection } from "./transaction-section";
import { AiPredictorCard } from "./ai-predictor-card";

interface MarketPageViewProps {
  assetType: AssetType;
  currency: Currency;
  header: ReactNode;
  portfolioAssets: PortfolioAsset[];
  chartData: OHLCData[];
  activeSymbol: string;
  marketAssets: MarketAsset[];
  transactions: MarketTransaction[];
  fxRate: number;
}

export function MarketPageView({
  assetType,
  currency,
  header,
  portfolioAssets,
  chartData,
  activeSymbol: initialSymbol,
  marketAssets: initialMarketAssets,
  transactions,
  fxRate,
}: MarketPageViewProps) {
  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);

  // Menggunakan hook live data yang aman dari Hydration Mismatch
  const { data: marketAssets } = useLiveMarketData({
    assetType,
    initialData: initialMarketAssets,
    currency,
    fxRate,
  });

  const handleSelectAsset = (symbol: string) => {
    setActiveSymbol(symbol);
    const chartElement = document.getElementById("trading-view-chart");
    if (chartElement) {
      chartElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {header}
      <section
        id="trading-view-chart"
        className="grid items-start min-w-0 grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="min-w-0 lg:col-span-4">
          <PortfolioCard
            assets={portfolioAssets}
            currency={currency}
            assetType={assetType}
          />
        </div>
        <div className="min-w-0 lg:col-span-8">
          <TradingViewChart
            data={chartData}
            symbol={activeSymbol}
            assetType={assetType}
            currencySymbol={currency === "IDR" ? "Rp" : "$"}
          />
        </div>
      </section>
      <section className="min-w-0">
        <MarketAssetsTable
          assets={marketAssets}
          currency={currency}
          activeSymbol={activeSymbol}
          onSelectSymbol={handleSelectAsset}
        />
      </section>
      <section className="min-w-0">
        <MarketWizardInput assetType={assetType} currency={currency} />
      </section>
      <section className="grid items-start min-w-0 grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <TransactionSection
            assetType={assetType}
            transactions={transactions}
            currency={currency}
            fxRate={fxRate}
          />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <AiPredictorCard assetType={assetType} currency={currency} />
        </div>
      </section>
    </div>
  );
}
