"use client";

import { useState } from "react";
import { PieChart, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { convertToIDR } from "@/lib/format";
import { AssetAllocationModal } from "./asset-allocation-modal";
import type { PortfolioAsset } from "@/features/market/types";

interface PortfolioCardProps {
  assets: PortfolioAsset[];
  currency: "IDR" | "USD";
  assetType: "stocks" | "crypto";
}

export function PortfolioCard({
  assets,
  currency,
  assetType,
}: PortfolioCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Total Nilai Portofolio Saat Ini
  const totalValue = assets.reduce(
    (acc, item) => acc + (item.current_value || 0),
    0,
  );

  // Total Nominal Floating PnL
  const totalUnrealizedPnl = assets.reduce(
    (acc, item) => acc + (item.unrealized_pnl || 0),
    0,
  );

  // Kalkulasi Total Modal & Persentase Floating PnL
  const totalCost = totalValue - totalUnrealizedPnl;
  const totalUnrealizedPnlPercent =
    totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0;

  const isProfit = totalUnrealizedPnl >= 0;

  return (
    <>
      <Card className="w-full min-w-0 overflow-hidden shadow-sm border-primary/20 bg-linear-to-br from-background to-muted/20">
        <CardContent className="flex flex-col justify-between h-full gap-4 p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-2 min-w-0 w-full">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium tracking-wider block truncate">
                Total Aset {assetType === "stocks" ? "Saham" : "Kripto"}
              </p>
              <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-foreground truncate min-w-0">
                {currency === "IDR"
                  ? convertToIDR(totalValue)
                  : `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              </h2>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full size-9 border-primary/20 hover:bg-primary/10 shrink-0"
              onClick={() => setIsModalOpen(true)}
              title="Lihat Alokasi Aset"
            >
              <PieChart className="size-4 text-primary shrink-0" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 text-xs border-t min-w-0 w-full">
            <span className="text-muted-foreground shrink-0">Floating PnL</span>
            <div
              className={`flex items-center gap-1 font-semibold min-w-0 truncate justify-end ${
                isProfit ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {isProfit ? (
                <TrendingUp className="size-3.5 shrink-0" />
              ) : (
                <TrendingDown className="size-3.5 shrink-0" />
              )}
              <span className="truncate min-w-0">
                {isProfit ? "+" : ""}
                {currency === "IDR"
                  ? convertToIDR(totalUnrealizedPnl)
                  : `$${totalUnrealizedPnl.toFixed(2)}`}{" "}
                ({isProfit ? "+" : ""}
                {totalUnrealizedPnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AssetAllocationModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        assets={assets}
        currency={currency}
      />
    </>
  );
}
