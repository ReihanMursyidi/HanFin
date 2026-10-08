"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { convertToIDR } from "@/lib/format";
import type { Currency, MarketAsset } from "@/features/market/types";

interface MarketAssetsTableProps {
  assets: MarketAsset[];
  currency: Currency;
}

function getAssetLogoUrl(symbol: string, assetType: string): string {
  const cleanSymbol = symbol.toUpperCase().replace(".JK", "");

  if (assetType === "crypto") {
    return `https://assets.coincap.io/assets/icons/${cleanSymbol.toLowerCase()}@2x.png`;
  }

  const stockLogos: Record<string, string> = {
    IHSG: "https://s3-symbol-logo.tradingview.com/indices/idx--big.svg",
    BBCA: "https://s3-symbol-logo.tradingview.com/bank-central-asia--big.svg",
    BBRI: "https://s3-symbol-logo.tradingview.com/bank-rakyat-indonesia--big.svg",
    BMRI: "https://s3-symbol-logo.tradingview.com/bank-mandiri--big.svg",
    TLKM: "https://s3-symbol-logo.tradingview.com/telkom-indonesia--big.svg",
  };

  return stockLogos[cleanSymbol] || "";
}

function AssetLogo({
  symbol,
  name,
  assetType,
}: {
  symbol: string;
  name: string;
  assetType: string;
}) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getAssetLogoUrl(symbol, assetType);

  if (hasError || !logoUrl) {
    return (
      <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative size-8 rounded-full p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
      <Image
        src={logoUrl}
        alt={name}
        width={32}
        height={32}
        unoptimized
        className="size-full object-contain rounded-full"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function MarketAssetsTable({
  assets,
  currency,
}: MarketAssetsTableProps) {
  return (
    <Card className="w-full shadow-sm border-primary/10">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-semibold">
          Daftar Aset Utama
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              {/* Kolom Logo (Header Kosong) */}
              <TableHead className="w-12 pl-6" />
              {/* Kolom Nama Aset (Rata Kiri) */}
              <TableHead className="text-left">Aset</TableHead>
              {/* Kolom Harga & Change */}
              <TableHead className="text-center">Harga</TableHead>
              <TableHead className="text-center">24h Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.symbol}>
                {/* 1. Kolom Logo */}
                <TableCell className="pl-6 pr-0 w-12">
                  <AssetLogo
                    symbol={asset.symbol}
                    name={asset.name}
                    assetType={asset.asset_type}
                  />
                </TableCell>

                {/* 2. Kolom Nama Aset (Sejajar dengan Header "Aset") */}
                <TableCell className="text-left font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground leading-snug">
                      {asset.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {asset.name}
                    </span>
                  </div>
                </TableCell>

                {/* 3. Kolom Harga */}
                <TableCell className="text-center font-semibold">
                  {currency === "IDR"
                    ? convertToIDR(asset.price)
                    : `$${asset.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}`}
                </TableCell>

                {/* 4. Kolom 24h Change */}
                <TableCell
                  className={`text-center font-semibold ${
                    asset.change24h >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {asset.change24h >= 0 ? "+" : ""}
                  {asset.change24h.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
