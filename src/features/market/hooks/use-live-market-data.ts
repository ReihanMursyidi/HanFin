"use client";

import { useQuery } from "@tanstack/react-query";
import { getCryptoMarketData, getStockMarketData } from "../market-data";
import type { AssetType, Currency, MarketAsset } from "../types";
import { convertCurrency } from "@/lib/format";
import { useSyncExternalStore } from "react";

interface UseLiveMarketDataProps {
  assetType: AssetType;
  initialData: MarketAsset[];
  currency?: Currency;
  fxRate?: number;
  intervalMs?: number;
}

const emptySubscribe = () => {
  return () => {
    // No-op: tidak ada cleanup listener yang perlu dilepas
  };
};

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function useLiveMarketData({
  assetType,
  initialData,
  currency = "IDR",
  fxRate = 1,
  intervalMs = assetType === "crypto" ? 15000 : 3000,
}: UseLiveMarketDataProps) {
  const isMounted = useIsMounted();

  const query = useQuery<MarketAsset[]>({
    queryKey: ["liveMarketData", assetType, currency, fxRate],
    queryFn: async () => {
      const rawData =
        assetType === "crypto"
          ? await getCryptoMarketData()
          : await getStockMarketData();

      return rawData.map((asset) => ({
        ...asset,
        price: convertCurrency(asset.price, asset.currency, currency, fxRate),
        volume24h: asset.volume24h
          ? convertCurrency(asset.volume24h, asset.currency, currency, fxRate)
          : undefined,
        currency,
      }));
    },
    initialData,
    enabled: isMounted,
    staleTime: intervalMs,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchInterval: isMounted ? intervalMs : false,
    refetchIntervalInBackground: false,
  });

  if (!isMounted) {
    return { ...query, data: initialData };
  }

  return query;
}
