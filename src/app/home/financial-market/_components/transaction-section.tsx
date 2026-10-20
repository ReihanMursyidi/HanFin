"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { convertCurrency, formatCurrency, formatDate } from "@/lib/format";
import { CreateAssetTransaction } from "./create-asset-transaction";
import { DeleteAssetTransaction } from "./delete-asset-transaction";
import type { AssetType, Currency } from "@/constants/market-constant";
import { MarketTransaction } from "@/features/market/types";

interface TransactionSectionProps {
  assetType: AssetType;
  transactions: MarketTransaction[];
  currency: Currency;
  fxRate: number;
}

export function TransactionSection({
  assetType,
  transactions,
  currency,
  fxRate,
}: TransactionSectionProps) {
  const [deletingTx, setDeletingTx] = useState<{
    id: string;
    symbol: string;
  } | null>(null);

  return (
    <div className="w-full overflow-x-auto min-w-0">
      <Card className="w-full shadow-sm border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-base font-semibold">
            Histori Transaksi {assetType === "stocks" ? "Saham" : "Kripto"}
          </CardTitle>

          <CreateAssetTransaction assetType={assetType} currency={currency} />
        </CardHeader>

        <CardContent className="pt-4">
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Belum ada histori transaksi{" "}
              {assetType === "stocks" ? "saham" : "kripto"}. Klik tombol di atas
              untuk mencatat transaksi pertama Anda.
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const baseTxCurrency =
                  tx.currency || (assetType === "stocks" ? "IDR" : "USD");

                const displayPrice = convertCurrency(
                  tx.price_per_unit,
                  baseTxCurrency,
                  currency,
                  fxRate,
                );

                const displayTotal = convertCurrency(
                  tx.total_amount,
                  baseTxCurrency,
                  currency,
                  fxRate,
                );
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 text-xs transition-colors hover:bg-muted/40"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                            tx.transaction_type === "buy"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          }`}
                        >
                          {tx.transaction_type === "buy" ? "BELI" : "JUAL"}
                        </span>
                        <span className="font-semibold text-foreground text-sm">
                          {tx.symbol}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        {tx.quantity.toLocaleString("id-ID")}{" "}
                        {assetType === "stocks" ? "lembar" : "unit"} @{" "}
                        {formatCurrency(displayPrice, currency)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-0.5">
                        <p className="font-bold text-foreground text-sm">
                          {formatCurrency(displayTotal, currency)}
                        </p>
                        {tx.transaction_date && (
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(tx.transaction_date)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 border-l border-border/60 pl-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setDeletingTx({ id: tx.id, symbol: tx.symbol })
                          }
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Hapus Transaksi</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {deletingTx && (
          <DeleteAssetTransaction
            open={!!deletingTx}
            onOpenChange={(open) => !open && setDeletingTx(null)}
            id={deletingTx.id}
            symbol={deletingTx.symbol}
          />
        )}
      </Card>
    </div>
  );
}
