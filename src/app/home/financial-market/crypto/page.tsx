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
import { MarketPageView } from "../_components/market-page-view";
import { Currency } from "@/features/market/types";

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
  title: "Pasar Kripto - Financial Market",

  description:
    "Lacak pergerakan aset kripto utama secara real-time, manfaatkan analisis AI untuk proyeksi pasar, dan optimalkan portofolio Anda.",
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
      fxRate={fxRate}
      header={
        <section
          key="header"
          id="header"
          className="space-y-1 min-w-0 w-full sm:pr-0"
        >
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Crypto Market
          </h1>

          <p className="text-xs sm:text-sm md:text-base">
            Lacak pergerakan aset kripto secara real-time, dapatkan proyeksi
            pasar dengan AI, dan optimalkan portofolio Anda.
          </p>
        </section>
      }
    />
  );
}
