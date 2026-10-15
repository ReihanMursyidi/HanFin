import type { Metadata } from "next";
import { getFinancialProfile } from "@/features/profile/action";
import {
  getPortfolioAssets,
  getMarketTransactions,
} from "@/features/market/action";
import {
  getExchangeRateUSDIDR,
  getStockChartData,
  getStockMarketData,
} from "@/features/market/market-data";
import { convertCurrency } from "@/lib/format";
import type { Currency } from "@/constants/market-constant";
import { MarketPageView } from "../_components/market-page-view";

function getCurrencyFromProfile(profile: unknown): Currency {
  if (
    profile &&
    typeof profile === "object" &&
    "currency" in profile &&
    (profile.currency === "USD" || profile.currency === "IDR")
  ) {
    return profile.currency as Currency;
  }
  return "IDR";
}

export const metadata: Metadata = {
  title: "Saham Indonesia (IHSG) - Financial Market | HanFin",
  description:
    "Pantau pergerakan Saham Indonesia & IHSG real-time, kelola portofolio, dan analisis sinyal pasar dengan AI.",
};

export default async function StocksMarketPage() {
  const activeSymbol = "IHSG";

  const [profile, fxRate, marketAssetsRaw, chartData, transactions] =
    await Promise.all([
      getFinancialProfile(),
      getExchangeRateUSDIDR(),
      getStockMarketData(),
      getStockChartData(activeSymbol, "2024-01-01", "1d"),
      getMarketTransactions("stocks"),
    ]);

  const currency = getCurrencyFromProfile(profile);
  const portfolioAssets = await getPortfolioAssets("stocks", currency, fxRate);

  const marketAssets = marketAssetsRaw.map((asset) => ({
    ...asset,
    price: convertCurrency(asset.price, asset.currency, currency, fxRate),
    currency,
  }));

  return (
    <MarketPageView
      assetType="stocks"
      currency={currency}
      portfolioAssets={portfolioAssets}
      chartData={chartData}
      activeSymbol={activeSymbol}
      marketAssets={marketAssets}
      transactions={transactions}
      header={
        <section id="header" className="space-y-1 min-w-0 w-full pr-26 sm:pr-0">
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl leading-snug">
            Saham Indonesia
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm md:text-base leading-relaxed wrap-break-word">
            Pantau pergerakan IHSG & Saham Blue Chip secara real-time, analisis
            dengan AI, dan kelola portofolio.
          </p>
        </section>
      }
    />
  );
}
