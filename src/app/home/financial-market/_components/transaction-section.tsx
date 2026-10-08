"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { convertToIDR } from "@/lib/format";
import type {
  AssetType,
  Currency,
  MarketTransaction,
} from "@/features/market/types";

interface TransactionSectionProps {
  assetType: AssetType;
  transactions: MarketTransaction[];
  currency: Currency;
}

export function TransactionSection({
  assetType,
  transactions,
  currency,
}: TransactionSectionProps) {
  return (
    <Card className="w-full shadow-sm border-primary/10">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Histori Transaksi {assetType === "stocks" ? "Saham" : "Kripto"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Belum ada histori transaksi.
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 text-sm"
              >
                <div>
                  <span className="font-semibold uppercase">
                    {tx.transaction_type}
                  </span>{" "}
                  <span className="font-medium">{tx.symbol}</span>
                  <p className="text-xs text-muted-foreground">
                    {tx.quantity} unit @{" "}
                    {currency === "IDR"
                      ? convertToIDR(tx.price_per_unit)
                      : `$${tx.price_per_unit}`}
                  </p>
                </div>
                <div className="text-right font-semibold">
                  {currency === "IDR"
                    ? convertToIDR(tx.total_amount)
                    : `$${tx.total_amount}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
