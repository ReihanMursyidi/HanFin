"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import type { AssetType } from "@/features/market/types";
import { Currency } from "@/constants/market-constant";
import { useState, useTransition } from "react";
import { MarketWizardTransaction } from "@/features/market/action";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface MarketWizardInputProps {
  assetType: AssetType;
  currency?: Currency;
}

export function MarketWizardInput({
  assetType,
  currency = "IDR",
}: MarketWizardInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isPending) return;

    startTransition(async () => {
      try {
        const res = await MarketWizardTransaction(prompt, assetType, currency);

        const typeText = res.transactionType === "buy" ? "BELI" : "JUAL";
        const unitLabel = assetType === "stocks" ? "lembar" : "unit";
        const formattedTotal = formatCurrency(res.totalAmount, currency);

        toast.success(
          `Berhasil mencatat transaksi ${typeText} ${res.symbol} sebanyak ${res.quantity.toLocaleString("id-ID")} ${unitLabel} (${formattedTotal}).`,
        );

        setPrompt("");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Gagal memproses input transaksi.";
        toast.error(msg);
      }
    });
  };

  return (
    <Card className="w-full shadow-sm border-primary/20">
      <CardContent className="p-4 space-y-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Sparkles className="size-5 text-primary shrink-0 animate-pulse" />
          <Input
            placeholder={
              assetType === "stocks"
                ? 'Catat transaksi via AI (contoh: "Beli 10 lot BBCA di harga 10200")'
                : 'Catat transaksi via AI (contoh: "Beli 0.05 BTC di harga 95000")'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isPending}
            className="bg-background text-xs md:text-sm h-9"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !prompt.trim()}
            className="h-9 px-4 text-xs font-semibold shrink-0"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Memproses...
              </>
            ) : (
              "Kirim"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
