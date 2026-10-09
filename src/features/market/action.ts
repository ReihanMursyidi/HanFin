"use server";

import { revalidatePath } from "next/cache";
import {
  getCryptoChartData,
  getCryptoMarketData,
  getExchangeRateUSDIDR,
  getStockChartData,
  getStockMarketData,
} from "./market-data";
import {
  AssetType,
  CreateMarketTransactionInput,
  Currency,
  MarketTransaction,
  OHLCData,
  PortfolioAsset,
} from "./types";
import { createClient } from "@/lib/supabase/server";
import { convertCurrency } from "@/lib/format";

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

  // Ambil data aset portofolio
  const { data: assets, error } = await supabase
    .from("portfolio_assets")
    .select("*")
    .eq("asset_type", assetType)
    .gt("total_quantity", 0)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch portfolio: ${error.message}`);
  if (!assets || assets.length === 0) return [];

  // Ambil harga pasar real-time
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

// ==== TRANSAKSI: CREATE (BUY / SELL) ====
export async function createMarketTransaction(
  input: CreateMarketTransactionInput,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Validasi sederhana
  if (input.quantity <= 0 || input.price_per_unit <= 0) {
    throw new Error("Jumlah unit dan harga per unit harus lebih besar dari 0");
  }

  const payload = {
    user_id: user.id,
    symbol: input.symbol.toUpperCase(),
    asset_name: input.asset_name,
    asset_type: input.asset_type,
    transaction_type: input.transaction_type,
    quantity: input.quantity,
    price_per_unit: input.price_per_unit,
    total_amount: input.total_amount || input.quantity * input.price_per_unit,
    currency: input.currency,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from("market_transactions")
    .insert(payload)
    .select()
    .single();

  if (error)
    throw new Error(`Failed to create market transaction: ${error.message}`);

  revalidatePath("home/financial-market/stocks");
  revalidatePath("home/financial-market/crypto");

  return data;
}

// ==== TRANSAKSI: DELETE ====
export async function deleteMarketTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("market_transactions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);

  revalidatePath("home/financial-market/stocks");
  revalidatePath("home/financial-market/crypto");

  return true;
}
