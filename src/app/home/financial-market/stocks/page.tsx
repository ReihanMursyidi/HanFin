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
    volume24h: asset.volume24h
      ? convertCurrency(asset.volume24h, asset.currency, currency, fxRate)
      : undefined,
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
        <section
          key="header"
          id="header"
          className="space-y-1 min-w-0 w-full sm:pr-0"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-primary leading-snug">
            Stocks Market
          </h1>

          <p className="text-xs sm:text-sm md:text-base">
            Pantau pergerakan Saham Indonesia secara real-time, analisis dengan
            AI, dan kelola portofolio.
          </p>
        </section>
      }
    />
  );
}
