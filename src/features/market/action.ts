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

// SYNC / RECALCULATE PORTFOLIO ASSET
export async function syncPortfolioAsset(
  userId: string,
  symbol: string,
  assetType: AssetType,
) {
  const supabase = await createClient();

  const { data: transactions, error } = await supabase
    .from("market_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", symbol.toUpperCase())
    .order("transaction_date", { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil data riwayat transaksi: ${error.message}`);
  }

  if (!transactions || transactions.length === 0) {
    await supabase
      .from("portfolio_assets")
      .delete()
      .eq("user_id", userId)
      .eq("symbol", symbol.toUpperCase());
    return;
  }

  let totalQuantity = 0;
  let totalCost = 0;

  for (const tx of transactions) {
    const qty = Number(tx.quantity);
    const price = Number(tx.price_per_unit);

    if (tx.transaction_type === "buy") {
      totalQuantity += qty;
      totalCost += qty * price;
    } else if (tx.transaction_type === "sell") {
      if (totalQuantity > 0) {
        const currentAvgPrice = totalCost / totalQuantity;

        // 👈 CEGAH KUANTITAS MINUS: Batasi pengurangan maksimal sebesar totalQuantity yang ada
        const actualSellQty = Math.min(qty, totalQuantity);

        totalQuantity -= actualSellQty;
        totalCost -= actualSellQty * currentAvgPrice;

        // Reset modal jika sisa aset habis
        if (totalQuantity <= 0) {
          totalQuantity = 0;
          totalCost = 0;
        }
      }
    }
  }

  if (totalQuantity <= 0) {
    await supabase
      .from("portfolio_assets")
      .delete()
      .eq("user_id", userId)
      .eq("symbol", symbol.toUpperCase());
    return;
  }

  const avgBuyPrice = totalCost / totalQuantity;

  // UPSERT DATA
  const { error: upsertError } = await supabase.from("portfolio_assets").upsert(
    {
      user_id: userId,
      symbol: symbol.toUpperCase(),
      name: transactions[0].asset_name,
      asset_type: assetType,
      total_quantity: totalQuantity,
      avg_buy_price: avgBuyPrice,
      currency: transactions[0].currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,symbol" },
  );

  if (upsertError) {
    throw new Error(`Gagal menyimpan portofolio: ${upsertError.message}`);
  }
}

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
export async function createMarketTransaction(rawInput: unknown) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const input = createMarketTransactionSchema.parse(rawInput);

  // VALIDASI TRANSAKSI JUAL
  if (input.transaction_type === "sell") {
    const { data: existingAsset } = await supabase
      .from("portfolio_assets")
      .select("total_quantity")
      .eq("user_id", user.id)
      .eq("symbol", input.symbol.toUpperCase())
      .single();

    const currentOwnedQuantity = existingAsset
      ? Number(existingAsset.total_quantity)
      : 0;

    if (currentOwnedQuantity <= 0) {
      throw new Error(
        `Anda belum memiliki aset ${input.symbol}. Tambahkan transaksi Beli terlebih dahulu sebelum menjual.`,
      );
    }

    if (input.quantity > currentOwnedQuantity) {
      throw new Error(
        `Jumlah penjualan (${input.quantity}) melebihi total aset ${input.symbol} yang Anda miliki (${currentOwnedQuantity}).`,
      );
    }
  }

  const payload = {
    user_id: user.id,
    symbol: input.symbol.toUpperCase(),
    asset_name: input.asset_name,
    asset_type: input.asset_type,
    transaction_type: input.transaction_type,
    quantity: input.quantity,
    price_per_unit: input.price_per_unit,
    total_amount: input.total_amount,
    currency: input.currency,
    notes: input.notes || null,
  };

  // 1. Simpan ke database
  const { data, error } = await supabase
    .from("market_transactions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal mencatat transaksi: ${error.message}`);
  }

  // 2. Sinkronkan ke portfolio_assets
  try {
    await syncPortfolioAsset(user.id, input.symbol, input.asset_type);
  } catch (syncError) {
    await supabase.from("market_transactions").delete().eq("id", data.id);
    throw syncError;
  }

  revalidatePath("/home/financial-market/stocks");
  revalidatePath("/home/financial-market/crypto");

  return data;
}

// ==== TRANSAKSI: DELETE ====
export async function deleteMarketTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Ambil data transaksi sebelum dihapus untuk mengetahui simbol & asset_type
  const { data: tx, error: fetchError } = await supabase
    .from("market_transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !tx) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const { error: deleteError } = await supabase
    .from("market_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(`Failed to delete transaction: ${deleteError.message}`);
  }

  // Hitung ulang portofolio untuk simbol yang bersangkutan
  try {
    await syncPortfolioAsset(user.id, tx.symbol, tx.asset_type as AssetType);
  } catch (syncError) {
    await supabase.from("market_transactions").insert(tx);
    throw syncError;
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
