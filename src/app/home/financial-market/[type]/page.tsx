import { notFound } from "next/navigation";
import { getFinancialProfile } from "@/features/profile/action";
import { Currency } from "@/features/market/types";
import {
  getMarketTransactions,
  getPortfolioAssets,
} from "@/features/market/action";
import {
  getCryptoChartData,
  getCryptoMarketData,
  getStockChartData,
  getStockMarketData,
} from "@/features/market/market-data";
import { PortfolioCard } from "../_components/portfolio-card";
import { TradingViewChart } from "../_components/trading-view-chart";
import { MarketAssetsTable } from "../_components/market-assets-table";
import { MarketWizardInput } from "../_components/market-wizard-input";
import { TransactionSection } from "../_components/transaction-section";
import { AiPredictorCard } from "../_components/ai-predictor-card";

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function FinancialMarketTypePage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawType = resolvedParams.type.toLowerCase();

  // Validasi URL route: hanya izinkan 'stocks' atau 'crypto'
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

  // 2. Fetch data pasar & portofolio secara paralel
  const [portfolioAssets, chartData, marketAssets, transactions] =
    await Promise.all([
      getPortfolioAssets(assetType),
      assetType === "stocks"
        ? getStockChartData(activeSymbol, "2024-01-01", "1d")
        : getCryptoChartData(activeSymbol, "1d", 100),
      assetType === "stocks" ? getStockMarketData() : getCryptoMarketData(),
      getMarketTransactions(assetType),
    ]);

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      {/* Header Halaman Dinamis tanpa Tabs */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight capitalize">
          {assetType} Market
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pantau pergerakan pasar{" "}
          {assetType === "stocks"
            ? "Saham Indonesia (IHSG)"
            : "Kripto (Crypto)"}{" "}
          real-time, analisis dengan AI, dan kelola portofolio.
        </p>
      </div>

      {/* Top Section: Ringkasan Portofolio & Native Chart */}
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
            currencySymbol={currency === "IDR" ? "Rp" : "$"}
          />
        </div>
      </div>

      {/* Tabel Harga Aset Real-time */}
      <MarketAssetsTable assets={marketAssets} currency={currency} />

      {/* Input Cepat via AI/Suara */}
      <MarketWizardInput assetType={assetType} />

      {/* Bottom Section: Histori Transaksi & AI Predictor Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <TransactionSection
            assetType={assetType}
            transactions={transactions}
            currency={currency}
          />
        </div>
        <div className="lg:col-span-5">
          <AiPredictorCard assetType={assetType} />
        </div>
      </div>
    </div>
  );
}
