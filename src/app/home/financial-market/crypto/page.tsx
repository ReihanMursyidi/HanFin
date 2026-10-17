import type { Metadata } from "next";

import { getFinancialProfile } from "@/features/profile/action";

import {
  getPortfolioAssets,
  getMarketTransactions,
} from "@/features/market/action";

import {
  getCryptoChartData,
  getCryptoMarketData,
  getExchangeRateUSDIDR,
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
  title: "Pasar Kripto (Crypto) - Financial Market | HanFin",

  description:
    "Pantau harga Bitcoin dan aset kripto utama 24/7, kelola portofolio, dan dapatkan prediksi sinyal pasar AI.",
};

export default async function CryptoMarketPage() {
  const activeSymbol = "BTC";

  const [profile, fxRate, marketAssetsRaw, chartData, transactions] =
    await Promise.all([
      getFinancialProfile(),

      getExchangeRateUSDIDR(),

      getCryptoMarketData(),

      getCryptoChartData(activeSymbol, "1d", 100),

      getMarketTransactions("crypto"),
    ]);

  const currency = getCurrencyFromProfile(profile);

  const portfolioAssets = await getPortfolioAssets("crypto", currency, fxRate);

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
      assetType="crypto"
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
            Crypto Market
          </h1>

          <p className="text-xs sm:text-sm md:text-base">
            Pantau pergerakan pasar Kripto secara real-time, analisis dengan AI,
            dan kelola portofolio.
          </p>
        </section>
      }
    />
  );
}
