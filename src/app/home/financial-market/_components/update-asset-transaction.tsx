"use client";

import { useState, useTransition } from "react";
import { Edit2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMarketTransaction } from "@/features/market/action";
import { formatCurrency } from "@/lib/format";
import {
  UI_CRYPTO_OPTIONS,
  UI_STOCK_OPTIONS,
} from "@/constants/market-constant";
import type {
  AssetType,
  Currency,
  TransactionType,
} from "@/constants/market-constant";
import { MarketTransaction } from "@/features/market/types";

interface UpdateAssetTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: MarketTransaction;
  assetType: AssetType;
  currency?: Currency;
}

export function UpdateAssetTransaction({
  open,
  onOpenChange,
  transaction,
  assetType,
  currency = "IDR",
}: UpdateAssetTransactionProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetAssets =
    assetType === "stocks" ? UI_STOCK_OPTIONS : UI_CRYPTO_OPTIONS;

  // Initial State langsung diinisialisasi dari props transaction
  const [symbol, setSymbol] = useState(transaction.symbol);
  const [assetName, setAssetName] = useState(transaction.asset_name);
  const [transactionType, setTransactionType] = useState<TransactionType>(
    transaction.transaction_type,
  );
  const [quantity, setQuantity] = useState<string>(
    assetType === "stocks"
      ? (transaction.quantity / 100).toString()
      : transaction.quantity.toString(),
  );
  const [pricePerUnit, setPricePerUnit] = useState<string>(
    transaction.price_per_unit.toString(),
  );
  const [notes, setNotes] = useState<string>(transaction.notes || "");

  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    const found = presetAssets.find((a) => a.symbol === val);
    if (found) {
      setAssetName(found.name);
    }
  };

  const numQuantity = Number(quantity) || 0;
  const numPrice = Number(pricePerUnit) || 0;
  const totalUnits = assetType === "stocks" ? numQuantity * 100 : numQuantity;
  const computedTotal = totalUnits * numPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numQuantity <= 0 || numPrice <= 0) {
      setErrorMsg(
        "Jumlah unit/lot dan harga per unit harus lebih besar dari 0.",
      );
      return;
    }

    startTransition(async () => {
      try {
        await updateMarketTransaction({
          id: transaction.id,
          symbol: symbol.toUpperCase(),
          asset_name: assetName,
          asset_type: assetType,
          transaction_type: transactionType,
          quantity: totalUnits,
          price_per_unit: numPrice,
          total_amount: computedTotal,
          currency,
          notes: notes || null,
        });

        onOpenChange(false);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Gagal memperbarui transaksi.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Edit2 className="size-4 text-primary" />
            Edit Transaksi {transaction.symbol}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Tipe Transaksi */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={transactionType === "buy" ? "default" : "outline"}
              className={`h-9 text-xs font-semibold ${
                transactionType === "buy"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }`}
              onClick={() => setTransactionType("buy")}
            >
              BELI
            </Button>
            <Button
              type="button"
              variant={transactionType === "sell" ? "default" : "outline"}
              className={`h-9 text-xs font-semibold ${
                transactionType === "sell"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : ""
              }`}
              onClick={() => setTransactionType("sell")}
            >
              JUAL
            </Button>
          </div>

          {/* Aset */}
          <div className="space-y-1.5">
            <Label className="text-xs">Aset</Label>
            <Select value={symbol} onValueChange={handleSymbolChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih Aset" />
              </SelectTrigger>
              <SelectContent>
                {presetAssets.map((asset) => (
                  <SelectItem
                    key={asset.symbol}
                    value={asset.symbol}
                    className="text-xs"
                  >
                    {asset.symbol} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Kuantitas & Harga */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {assetType === "stocks" ? "Jumlah (Lot)" : "Jumlah Unit"}
              </Label>
              <Input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-9 text-xs"
                required
              />
              {assetType === "stocks" && numQuantity > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  = {(numQuantity * 100).toLocaleString("id-ID")} lembar
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Harga per {assetType === "stocks" ? "Lembar" : "Unit"}
              </Label>
              <Input
                type="number"
                step="any"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Total Kalkulasi */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Estimasi:
            </span>
            <span className="text-sm font-bold text-primary">
              {formatCurrency(computedTotal, currency)}
            </span>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label className="text-xs">Catatan (Opsional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-9 text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-2" />
                  Perbarui Transaksi...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
