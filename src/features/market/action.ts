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
  AIAnalysisRequest,
  AIAnalysisResponse,
  AssetType,
  Currency,
  MarketTransaction,
  OHLCData,
  PortfolioAsset,
} from "./types";
import { createClient } from "@/lib/supabase/server";
import { convertCurrency, formatCurrency } from "@/lib/format";
import { calculateTechnicalIndicators } from "./technical-analysis";
import { createAI } from "../ai/instance";
import {
  aiAnalysisRequestSchema,
  aiAnalysisResponseSchema,
  createMarketTransactionSchema,
  CRYPTO_ASSETS,
  STOCK_ASSETS,
} from "@/constants/market-constant";

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
    throw new Error(`Gagal menyelaraskan portfolio: ${error.message}`);
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
        totalQuantity -= qty;
        totalCost -= qty * currentAvgPrice;
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

  const { error: upsertError } = await supabase.from("portfolio_assets").upsert(
    {
      user_id: userId,
      symbol: symbol.toUpperCase(),
      asset_name: transactions[0].asset_name,
      asset_type: assetType,
      total_quantity: totalQuantity,
      avg_buy_price: avgBuyPrice,
      currency: transactions[0].currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id, symbol" },
  );

  if (upsertError) {
    throw new Error(`Gagal menyimpan portfolio: ${upsertError.message}`);
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

  // Validasi Runtime Zod
  const input = createMarketTransactionSchema.parse(rawInput);

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

  const { data, error } = await supabase
    .from("market_transactions")
    .insert(payload)
    .select()
    .single();

  if (error)
    throw new Error(`Failed to create market transaction: ${error.message}`);

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
    .select("symbol, asset_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !tx) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const { error } = await supabase
    .from("market_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);

  // Hitung ulang portofolio untuk simbol yang bersangkutan
  await syncPortfolioAsset(user.id, tx.symbol, tx.asset_type as AssetType);

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

// ==== ANALISIS AI
export async function analyzeMarketWithAI(
  rawRequest: AIAnalysisRequest,
  currency: Currency = "IDR",
): Promise<AIAnalysisResponse> {
  const request = aiAnalysisRequestSchema.parse(rawRequest);

  let cryptoInterval: string = "1d";
  let stockInterval: "1d" | "1wk" | "1mo" | "1h" | "15m" = "1d";
  let period1 = "2024-01-01";

  if (request.strategy === "scalping") {
    cryptoInterval = "15m";
    stockInterval = "15m";
    period1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  } else if (request.strategy === "day_trading") {
    cryptoInterval = "1h";
    stockInterval = "1h";
    period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  } else if (request.strategy === "investing") {
    cryptoInterval = "1w";
    stockInterval = "1wk";
    period1 = "2020-01-01";
  }

  // Fetch Candlesticks Sesuai Tipe Pasar
  let candles =
    request.asset_type === "crypto"
      ? await getCryptoChartData(request.symbol, cryptoInterval, 150)
      : await getStockChartData(request.symbol, period1, stockInterval);

  let activeInterval: string =
    request.asset_type === "crypto" ? cryptoInterval : stockInterval;

  if (!candles || candles.length < 20) {
    activeInterval = "1d";
    candles =
      request.asset_type === "crypto"
        ? await getCryptoChartData(request.symbol, "1d", 100)
        : await getStockChartData(request.symbol, "2024-01-01", "1d");
  }

  // Ambil Kurs FX & Tentukan Base Currency Asli Aset
  const fxRate = await getExchangeRateUSDIDR();
  const baseCurrency: Currency =
    request.asset_type === "crypto" ? "USD" : "IDR";

  // Kalkulasi Indikator & Format Harga
  const techData = calculateTechnicalIndicators(
    candles,
    request,
    activeInterval,
  );

  const convertedLastClose = convertCurrency(
    techData.lastClose,
    baseCurrency,
    currency,
    fxRate,
  );

  const formattedLastClose = formatCurrency(convertedLastClose, currency);

  const convertedFastValue = techData.trend.fastValue
    ? convertCurrency(techData.trend.fastValue, baseCurrency, currency, fxRate)
    : null;
  const convertedSlowValue = techData.trend.slowValue
    ? convertCurrency(techData.trend.slowValue, baseCurrency, currency, fxRate)
    : null;

  const convertedSupport = techData.keyLevels.support.map((val) =>
    Math.round(convertCurrency(val, baseCurrency, currency, fxRate)),
  );
  const convertedResistance = techData.keyLevels.resistance.map((val) =>
    Math.round(convertCurrency(val, baseCurrency, currency, fxRate)),
  );

  const prompt = `
    Kamu adalah Analis Pasar Keuangan Profesional (Financial Market Predictor Agent).
    Analisis aset ${request.symbol} (${request.asset_type}) untuk metode **${request.strategy.toUpperCase()}** (Timeframe ${techData.timeframeUsed}).

    MATA UANG TARGET ANALISIS: **${currency}**
    Seluruh harga, batas support/resistance, dan rekomendasi targetPrices HARUS ditulis dalam mata uang **${currency}**.

    KONDISI SINYAL TEKNIKAL:
    - Skor Konfluensi: ${techData.bullishCount > techData.bearishCount ? `${techData.bullishCount} dari 3 Sinyal Bullish` : `${techData.bearishCount} dari 3 Sinyal Bearish`}
    - Konsensus Algoritma: **${techData.consensusSignal}**

    DETAIL INDIKATOR (DALAM ${currency}):
    - Harga Terakhir: ${formattedLastClose} (Angka murni: ${convertedLastClose})
    - Trend (${techData.trend.name} ${techData.trend.fastPeriod}/${techData.trend.slowPeriod}): Fast ${convertedFastValue ? formatCurrency(convertedFastValue, currency) : "-"}, Slow ${convertedSlowValue ? formatCurrency(convertedSlowValue, currency) : "-"}, Status (${techData.trend.crossoverStatus})
    - Momentum (${techData.momentum.name}): RSI ${techData.momentum.rsiValue?.toFixed(2)}, Sinyal ${techData.momentum.signal}
    - Volume (${techData.volume.name}): Sinyal ${techData.volume.signal}
    - Level Support Terdekat (${currency}): [${convertedSupport.join(", ")}]
    - Level Resistance Terdekat (${currency}): [${convertedResistance.join(", ")}]

    ATURAN LIMIT ORDER (HARGA BELI & JUAL DALAM ${currency}):
    1. Tentukan "entryPrice" (Harga Beli) rasional mendekati area Support terdekat atau harga penutupan terakhir (${currency}).
    2. Tentukan "takeProfit" (Harga Jual) mendekati area Resistance terdekat (${currency}).
    3. Tentukan "stopLoss" sedikit di bawah level Support terdekat untuk mengontrol risiko (${currency}).
    4. Seluruh angka pada "targetPrices" harus berupa NOMOR MURNI (number) dalam mata uang ${currency} tanpa simbol/teks agar dapat diproses oleh sistem.

    ATURAN FORMAT PENULISAN TEKS:
    1. Selalu sebutkan nominal harga/level teknikal dalam teks analisis menggunakan format mata uang ${currency} (${currency === "IDR" ? "Rupiah seperti Rp 1.600.000.000" : "Dollar seperti $95,000"}).
    2. Jelaskan makna konfluensi indikator secara alami tanpa istilah teknis kaku.

    Berikan jawaban JSON murni sesuai skema:
    {
      "summary": "Ringkasan kesimpulan sinyal dalam 1-2 kalimat.",
      "recommendation": "Beli" | "Jual" | "Tahan" | "Wait & See",
      "riskLevel": "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi",
      "targetPrices": {
        "entryPrice": number,
        "takeProfit": number,
        "stopLoss": number
      },
      "trendAnalysis": "Penjelasan rinci tren.",
      "momentumAnalysis": "Penjelasan rinci momentum.",
      "volumeAnalysis": "Penjelasan rinci akumulasi/distribusi volume.",
      "keyLevels": {
        "support": [number, number],
        "resistance": [number, number]
      }
    }
  `;

  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    const safeResponse = aiAnalysisResponseSchema.safeParse(parsedJson);

    if (!safeResponse.success) {
      console.error("AI Response Schema Invalid:", safeResponse.error.format());
      throw new Error("Respon AI tidak sesuai format skema");
    }

    return safeResponse.data;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: "Gagal memproses analisis AI untuk saat ini.",
      recommendation: "Wait & See",
      riskLevel: "Sedang",
      trendAnalysis: "Analisis tren tidak tersedia.",
      momentumAnalysis: "Analisis momentum tidak tersedia.",
      volumeAnalysis: "Analisis volume tidak tersedia.",
      keyLevels: { support: [], resistance: [] },
    };
  }
}

export async function MarketWizardTransaction(
  promptText: string,
  assetType: AssetType,
  userCurrency: Currency = "IDR",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (!promptText || promptText.trim().length === 0) {
    throw new Error("Perintah transaksi tidak boleh kosong.");
  }

  const assetOptions = assetType === "stocks" ? STOCK_ASSETS : CRYPTO_ASSETS;
  const assetListText = assetOptions
    .map((a) => `${a.shortSymbol} (${a.name})`)
    .join(", ");

  const prompt = `
    <role>
      Financial Market Transaction Parser Agent.
    </role>
    <instruction>
      Extract structured financial market transaction data (${assetType.toUpperCase()}) from the user's natural language input.
      Return ONLY a valid JSON object without any additional text or markdown formatting.
    </instruction>
    <context>
      - Target Asset Class: ${assetType.toUpperCase()}
      - Valid Assets: [${assetListText}]
      - Default Currency: ${userCurrency}
    </context>
    <input>
      ${promptText}
    </input>
    <rules>
      1. "transaction_type": Must be "buy" (keywords: buy, beli, dca, entry, serok, etc.) or "sell" (keywords: sell, jual, tp, take profit, cut loss, etc.).
      2. "symbol": Match the short symbol from the valid asset list (e.g., "BBCA", "BTC").
      3. "quantity":
        - For "stocks" (Indonesian Stocks): Users often specify "lot". 1 LOT = 100 SHARES. 
          Always convert "quantity" to total pure SHARES (e.g., 10 lots -> 1000, 1 lot -> 100).
        - For "crypto": Use exact unit quantity (e.g., 0.5, 1.2, 0.05).
      4. "price_per_unit": Numerical price per single share/unit.
        If the user does NOT specify a price in the text, return a null value.
      5. Success Output Schema:
        {
          "success": true,
          "symbol": "STRING",
          "transaction_type": "buy" | "sell",
          "quantity": NUMBER,
          "price_per_unit": NUMBER | null,
          "notes": "STRING"
        }
      6. Failure Output Schema (if input is ambiguous, missing price/quantity, or asset is unrecognized):
        {
          "success": false,
          "errorMessage": "STRING (brief explanation in Indonesian)"
        }
    </rules>
  `;

  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    if (!parsed.success) {
      throw new Error(
        parsed.errorMessage ||
          "Format instruksi transaksi tidak dapat dipahami.",
      );
    }

    const matchedAsset = assetOptions.find(
      (a) => a.shortSymbol.toUpperCase() === parsed.symbol?.toUpperCase(),
    );

    const symbol = matchedAsset?.shortSymbol || parsed.symbol.toUpperCase();
    const assetName = matchedAsset?.name || symbol;
    const quantity = Number(parsed.quantity);

    let pricePerUnit = Number(parsed.price_per_unit) || 0;

    if (pricePerUnit <= 0) {
      const fxRate = await getExchangeRateUSDIDR();
      const marketData =
        assetType === "crypto"
          ? await getCryptoMarketData()
          : await getStockMarketData();

      const matchedMarketItem = marketData.find(
        (m) => m.symbol.toUpperCase() === symbol.toUpperCase(),
      );

      if (!matchedMarketItem || !matchedMarketItem.price) {
        throw new Error(
          `Harga real-time untuk ${symbol} tidak ditemukan. Harap masukkan harga secara manual.`,
        );
      }

      const baseMarketCurrency: Currency =
        assetType === "crypto" ? "USD" : "IDR";
      pricePerUnit = convertCurrency(
        matchedMarketItem.price,
        baseMarketCurrency,
        userCurrency,
        fxRate,
      );
    }

    const totalAmount = quantity * pricePerUnit;

    // Eksekusi pencatatan transaksi & sync portfolio
    const createdTx = await createMarketTransaction({
      symbol,
      asset_name: assetName,
      asset_type: assetType,
      transaction_type: parsed.transaction_type,
      quantity,
      price_per_unit: pricePerUnit,
      total_amount: totalAmount,
      currency: userCurrency,
      notes: parsed.notes || `Input via AI Wizard: "${promptText}"`,
    });

    return {
      success: true,
      symbol,
      transactionType: parsed.transaction_type as "buy" | "sell",
      quantity,
      pricePerUnit,
      totalAmount,
      createdTx,
    };
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Gagal memproses instruksi transaksi via AI.",
    );
  }
}
