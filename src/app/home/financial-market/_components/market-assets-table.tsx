"use client";

import { useState } from "react";
import Image from "next/image";
import { LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { convertToIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Currency, MarketAsset } from "@/features/market/types";

interface MarketAssetsTableProps {
  assets: MarketAsset[];
  currency: Currency;
  activeSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

function formatVolume(val: number, currency: Currency): string {
  if (currency === "IDR") {
    if (val >= 1e12) return `Rp ${(val / 1e12).toFixed(2)} T`;
    if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(2)} M`;
    if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(2)} Jt`;
    return convertToIDR(val);
  }

  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)} T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)} B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)} M`;
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function getAssetLogoUrl(symbol: string, assetType: string): string {
  const cleanSymbol = symbol.toUpperCase().replace(".JK", "");

  if (assetType === "crypto") {
    return `https://assets.coincap.io/assets/icons/${cleanSymbol.toLowerCase()}@2x.png`;
  }

  const stockLogos: Record<string, string> = {
    IHSG: "https://s3-symbol-logo.tradingview.com/indices/jakarta-composite-index--big.svg",
    BBCA: "https://s3-symbol-logo.tradingview.com/bank-central-asia--big.svg",
    BBRI: "https://s3-symbol-logo.tradingview.com/bank-rakyat-indonesia--big.svg",
    BMRI: "https://s3-symbol-logo.tradingview.com/bank-mandiri--big.svg",
    TLKM: "https://s3-symbol-logo.tradingview.com/telekom-indonesia--big.svg",
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
  activeSymbol,
  onSelectSymbol,
}: MarketAssetsTableProps) {
  return (
    <Card className="w-full shadow-sm border-primary/10 min-w-0 overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-semibold">
          Daftar Aset Utama
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 min-w-0">
        <div className="w-full overflow-x-auto min-w-0 custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="sm:pl-6" />
                <TableHead className="text-left">Aset</TableHead>
                <TableHead className="text-center lg:text-right">
                  Harga
                </TableHead>
                <TableHead className="text-right sm:pr-6">24h Change</TableHead>
                <TableHead className="text-right">Volume (24h)</TableHead>
                <TableHead className="text-center pr-4 sm:pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => {
                const isActive = activeSymbol === asset.symbol;

                return (
                  <TableRow
                    key={asset.symbol}
                    className={cn(isActive && "bg-primary/5")}
                  >
                    <TableCell className="pl-4 sm:pl-6 pr-0 w-12">
                      <AssetLogo
                        symbol={asset.symbol}
                        name={asset.name}
                        assetType={asset.asset_type}
                      />
                    </TableCell>

                    <TableCell className="text-left font-medium">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground leading-snug truncate">
                          {asset.symbol}
                        </span>
                        <span className="text-xs text-muted-foreground leading-snug truncate">
                          {asset.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {currency === "IDR"
                        ? convertToIDR(asset.price)
                        : `$${asset.price.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}`}
                    </TableCell>

                    <TableCell
                      className={cn(
                        "text-right font-semibold whitespace-nowrap pr-4 sm:pr-6",
                        asset.change24h >= 0
                          ? "text-emerald-500"
                          : "text-rose-500",
                      )}
                    >
                      {asset.change24h >= 0 ? "+" : ""}
                      {asset.change24h.toFixed(2)}%
                    </TableCell>

                    <TableCell className="text-right text-muted-foreground whitespace-nowrap font-medium">
                      {asset.volume24h
                        ? formatVolume(asset.volume24h, currency)
                        : "-"}
                    </TableCell>

                    <TableCell className="text-center pr-4 sm:pr-6 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className="h-7 px-2.5 text-xs gap-1.5"
                        onClick={() => onSelectSymbol?.(asset.symbol)}
                      >
                        <LineChart className="size-3.5" />
                        <span>{isActive ? "Aktif" : "Chart"}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
