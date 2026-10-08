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

  const totalValue = assets.reduce(
    (acc, item) => acc + (item.current_value || 0),
    0,
  );

  const totalUnrealizedPnl = assets.reduce(
    (acc, item) => acc + (item.unrealized_pnl || 0),
    0,
  );

  const isProfit = totalUnrealizedPnl >= 0;

  return (
    <>
      <Card className="w-full shadow-sm border-primary/20 bg-linear-to-br from-background to-muted/20">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Aset {assetType === "stocks" ? "Saham" : "Kripto"}
              </p>
              <h2 className="text-2xl font-bold tracking-tight mt-1">
                {currency === "IDR"
                  ? convertToIDR(totalValue)
                  : `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              </h2>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-primary/20 hover:bg-primary/10"
              onClick={() => setIsModalOpen(true)}
              title="Lihat Alokasi Aset"
            >
              <PieChart className="size-4 text-primary" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t">
            <span className="text-muted-foreground">Floating PnL</span>
            <div
              className={`flex items-center gap-1 font-semibold ${
                isProfit ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {isProfit ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              <span>
                {isProfit ? "+" : ""}
                {currency === "IDR"
                  ? convertToIDR(totalUnrealizedPnl)
                  : `$${totalUnrealizedPnl.toFixed(2)}`}
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
