"use server";

import { revalidatePath } from "next/cache";
import {
  getCryptoChartData,
  getCryptoMarketData,
  getExchangeRateUSDIDR,
  getStockChartData,
  getStockMarketData,
} from "./market-data";
import type {
  AssetType,
  Currency,
  MarketTransaction,
  OHLCData,
  PortfolioAsset,
} from "./types";
import { createClient } from "@/lib/supabase/server";
import { convertCurrency } from "@/lib/format";
import { createMarketTransactionSchema } from "@/constants/market-constant";

// Server Action untuk mengambil data candlestick berdasarkan timeframe
export async function getMarketChartData(
  symbol: string,
  assetType: AssetType,
  timeframe: "1D" | "1W" | "1M" = "1D",
): Promise<OHLCData[]> {
  if (assetType === "crypto") {
    const intervalMap: Record<string, string> = {
      "1D": "1d",
      "1W": "1w",
      "1M": "1M",
    };
    const interval = intervalMap[timeframe] || "1d";
    return getCryptoChartData(symbol, interval, 100);
  } else {
    const intervalMap: Record<string, "1d" | "1wk" | "1mo"> = {
      "1D": "1d",
      "1W": "1wk",
      "1M": "1mo",
    };
    const period1Map: Record<string, string> = {
      "1D": "2024-01-01",
      "1W": "2022-01-01",
      "1M": "2019-01-01",
    };
    const interval = intervalMap[timeframe] || "1d";
    const period1 = period1Map[timeframe] || "2024-01-01";
    return getStockChartData(symbol, period1, interval);
  }
}

// ==== TRANSAKSI: CREATE (BUY / SELL) ====
// Validasi kepemilikan, insert transaksi, dan sinkron portofolio dilakukan
// atomik di database (fungsi create_market_transaction, migrasi 7).
export async function createMarketTransaction(rawInput: unknown) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const input = createMarketTransactionSchema.parse(rawInput);

  const { data, error } = await supabase.rpc("create_market_transaction", {
    p_symbol: input.symbol,
    p_asset_name: input.asset_name,
    p_asset_type: input.asset_type,
    p_transaction_type: input.transaction_type,
    p_quantity: input.quantity,
    p_price_per_unit: input.price_per_unit,
    p_total_amount: input.total_amount,
    p_currency: input.currency,
    p_notes: input.notes || null,
    p_transaction_date: input.transaction_date ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");

  return data as MarketTransaction;
}

// ==== TRANSAKSI: DELETE ====
// Hapus transaksi dan hitung ulang portofolio secara atomik di database.
export async function deleteMarketTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.rpc("delete_market_transaction", {
    p_id: id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");

  return true;
}

// ==== PORTOFOLIO: READ & CALCULATE PnL ====
export async function getPortfolioAssets(
  assetType: AssetType,
  userCurrency: Currency = "IDR",
  fxRateOverride?: number,
): Promise<PortfolioAsset[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: assets, error } = await supabase
    .from("portfolio_assets")
    .select("*")
    .eq("asset_type", assetType)
    .gt("total_quantity", 0)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch portfolio: ${error.message}`);
  if (!assets || assets.length === 0) return [];

  const fxRate = fxRateOverride || (await getExchangeRateUSDIDR());
  const marketData =
    assetType === "crypto"
      ? await getCryptoMarketData()
      : await getStockMarketData();

  return assets.map((asset): PortfolioAsset => {
    const marketItem = marketData.find(
      (m) => m.symbol.toUpperCase() === asset.symbol.toUpperCase(),
    );

    const baseMarketCurrency: Currency = assetType === "crypto" ? "USD" : "IDR";
    const rawMarketPrice = marketItem?.price || Number(asset.avg_buy_price);

    const currentPriceInUserCurrency = convertCurrency(
      rawMarketPrice,
      baseMarketCurrency,
      userCurrency,
      fxRate,
    );

    const assetDBCurrency: Currency =
      (asset.currency as Currency) || baseMarketCurrency;
    const avgBuyPriceInUserCurrency = convertCurrency(
      Number(asset.avg_buy_price),
      assetDBCurrency,
      userCurrency,
      fxRate,
    );

    const quantity = Number(asset.total_quantity);
    const currentValue = quantity * currentPriceInUserCurrency;
    const totalCost = quantity * avgBuyPriceInUserCurrency;
    const unrealizedPnl = currentValue - totalCost;
    const unrealizedPnlPercent =
      totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

    return {
      ...asset,
      currency: userCurrency,
      total_quantity: quantity,
      avg_buy_price: avgBuyPriceInUserCurrency,
      current_price: currentPriceInUserCurrency,
      current_value: currentValue,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent,
    };
  });
}

// ==== TRANSAKSI: READ HISTORY ====
export async function getMarketTransactions(
  assetType: AssetType,
  limit: number = 20,
): Promise<MarketTransaction[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("market_transactions")
    .select("*")
    .eq("asset_type", assetType)
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  return (data || []).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    price_per_unit: Number(item.price_per_unit),
    total_amount: Number(item.total_amount),
  }));
}
