import { notFound } from "next/navigation";
import { getFinancialProfile } from "@/features/profile/action";
import {
  getCryptoChartData,
  getCryptoMarketData,
  getExchangeRateUSDIDR,
  getStockChartData,
  getStockMarketData,
} from "@/features/market/market-data";
import { convertCurrency } from "@/lib/format";
import type { Currency } from "@/features/market/types";
import { PortfolioCard } from "../_components/portfolio-card";
import { TradingViewChart } from "../_components/trading-view-chart";
import { MarketAssetsTable } from "../_components/market-assets-table";
import { MarketWizardInput } from "../_components/market-wizard-input";
import { TransactionSection } from "../_components/transaction-section";
import { AiPredictorCard } from "../_components/ai-predictor-card";
import {
  getMarketTransactions,
  getPortfolioAssets,
} from "@/features/market/action";

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function FinancialMarketTypePage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawType = resolvedParams.type.toLowerCase();

  if (rawType !== "stocks" && rawType !== "crypto") {
    notFound();
  }

  const assetType = rawType as "stocks" | "crypto";

  // 1. Fetch profil pengguna untuk preferensi mata uang
  const profile = await getFinancialProfile();
  const currency: Currency =
    profile &&
    "currency" in profile &&
    (profile.currency === "USD" || profile.currency === "IDR")
      ? (profile.currency as Currency)
      : "IDR";

  const activeSymbol = assetType === "stocks" ? "IHSG" : "BTC";

  // 2. Fetch data pasar, nilai kurs FX, dan portofolio secara paralel
  const [fxRate, marketAssetsRaw, chartData, transactions] = await Promise.all([
    getExchangeRateUSDIDR(),
    assetType === "stocks" ? getStockMarketData() : getCryptoMarketData(),
    assetType === "stocks"
      ? getStockChartData(activeSymbol, "2024-01-01", "1d")
      : getCryptoChartData(activeSymbol, "1d", 100),
    getMarketTransactions(assetType),
  ]);

  // Fetch portofolio dengan konversi kurs terintegrasi
  const portfolioAssets = await getPortfolioAssets(assetType, currency, fxRate);

  // 3. Konversi seluruh Daftar Aset Pasar sesuai mata uang pilihan user
  const marketAssets = marketAssetsRaw.map((asset) => ({
    ...asset,
    price: convertCurrency(asset.price, asset.currency, currency, fxRate),
    currency,
  }));

  return (
    <div className="container py-4 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight capitalize text-primary">
          {assetType} Market
        </h1>
        <p className="text-sm mt-1">
          Pantau pergerakan pasar{" "}
          {assetType === "stocks" ? "Saham Indonesia" : "Crypto"} real-time,
          analisis dengan AI, dan kelola portofolio.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 h-full">
          <PortfolioCard
            assets={portfolioAssets}
            currency={currency}
            assetType={assetType}
          />
        </div>
        <div className="lg:col-span-9">
          <TradingViewChart
            data={chartData}
            symbol={activeSymbol}
            assetType={assetType}
            currencySymbol={currency === "IDR" ? "Rp" : "$"}
          />
        </div>
      </div>

      <MarketAssetsTable assets={marketAssets} currency={currency} />

      <MarketWizardInput assetType={assetType} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <TransactionSection
            assetType={assetType}
            transactions={transactions}
            currency={currency}
          />
        </div>
        <div className="lg:col-span-5">
          <AiPredictorCard assetType={assetType} currency={currency} />
        </div>
      </div>
    </div>
  );
}
