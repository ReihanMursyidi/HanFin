"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Loader2,
  DollarSign,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createMarketTransaction } from "@/features/market/action";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  UI_CRYPTO_OPTIONS,
  UI_TRADEABLE_STOCK_OPTIONS,
} from "@/constants/market-constant";
import type {
  AssetType,
  Currency,
  TransactionType,
} from "@/constants/market-constant";
import { toast } from "sonner";

interface CreateAssetTransactionProps {
  assetType: AssetType;
  currency?: Currency;
}

export function CreateAssetTransaction({
  assetType,
  currency = "IDR",
}: CreateAssetTransactionProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetAssets =
    assetType === "stocks" ? UI_TRADEABLE_STOCK_OPTIONS : UI_CRYPTO_OPTIONS;

  // Form State
  const [symbol, setSymbol] = useState(presetAssets[0].symbol);
  const [assetName, setAssetName] = useState(presetAssets[0].name);
  const [transactionType, setTransactionType] =
    useState<TransactionType>("buy");
  const [quantity, setQuantity] = useState<string>("");
  const [pricePerUnit, setPricePerUnit] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Search Combobox State
  const [openSearch, setOpenSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedAsset = presetAssets.find((a) => a.symbol === symbol);

  const filteredAssets = presetAssets.filter(
    (a) =>
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectAsset = (asset: { symbol: string; name: string }) => {
    setSymbol(asset.symbol);
    setAssetName(asset.name);
    setOpenSearch(false);
    setSearchQuery("");
  };

  const numQuantity = Number(quantity) || 0;
  const numPrice = Number(pricePerUnit) || 0;

  // Untuk saham Indonesia, 1 Lot = 100 lembar
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
        await createMarketTransaction({
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

        toast.success(
          `Transaksi ${transactionType === "buy" ? "BELI" : "JUAL"} ${symbol} berhasil dicatat.`,
        );

        // Reset Form & Close Modal
        setQuantity("");
        setPricePerUnit("");
        setNotes("");
        setOpen(false);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Gagal menyimpan transaksi.";
        setErrorMsg(msg);
        // toast.error(msg);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs font-semibold">
          <Plus className="size-4" />
          Tambah Transaksi
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <DollarSign className="size-4 text-primary" />
            Catat Transaksi {assetType === "stocks" ? "Saham" : "Kripto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium">
              {errorMsg}
            </div>
          )}

          {/* 1. Tipe Transaksi (Beli / Jual) */}
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

          {/* 2. Cari / Pilih Simbol Aset */}
          <div className="space-y-1.5">
            <Label className="text-xs">Aset</Label>
            <Popover open={openSearch} onOpenChange={setOpenSearch}>
              <PopoverTrigger asChild>
                <Button
                  id="select-transaction-asset"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSearch}
                  aria-controls="transaction-asset-popover-list"
                  className="w-full justify-between h-9 text-xs font-semibold"
                >
                  {selectedAsset
                    ? `${selectedAsset.symbol} (${selectedAsset.name})`
                    : "Cari Aset..."}
                  <ChevronsUpDown className="ml-2 size-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                id="transaction-asset-popover-list"
                className="w-93.75 p-2"
                align="start"
              >
                <div className="flex items-center border-b px-2 pb-2 mb-2">
                  <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
                  <Input
                    placeholder="Ketik nama atau simbol aset..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs border-0 focus-visible:ring-0 shadow-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredAssets.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Aset tidak ditemukan.
                    </p>
                  ) : (
                    filteredAssets.map((asset) => (
                      <button
                        key={asset.symbol}
                        type="button"
                        onClick={() => handleSelectAsset(asset)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between hover:bg-muted/50 transition-colors",
                          symbol === asset.symbol &&
                            "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        <div>
                          <span>{asset.symbol}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">
                            {asset.name}
                          </span>
                        </div>
                        {symbol === asset.symbol && (
                          <Check className="size-3 text-primary" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 3. Input Jumlah (Lot untuk Saham, Unit/Token untuk Kripto) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {assetType === "stocks" ? "Jumlah (Lot)" : "Jumlah Unit"}
              </Label>
              <Input
                type="number"
                step="any"
                placeholder={assetType === "stocks" ? "Contoh: 10" : "0.05"}
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
                placeholder="0"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* 4. Total Transaksi (Kalkulasi Otomatis) */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Estimasi:
            </span>
            <span className="text-sm font-bold text-primary">
              {formatCurrency(computedTotal, currency)}
            </span>
          </div>

          {/* 5. Catatan Tambahan */}
          <div className="space-y-1.5">
            <Label className="text-xs">Catatan (Opsional)</Label>
            <Input
              placeholder="Contoh: Pembelian via Bibit / Indodax"
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
                  Menyimpan Transaksi...
                </>
              ) : (
                "Simpan Transaksi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
