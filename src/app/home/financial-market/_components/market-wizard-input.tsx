"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { AssetType } from "@/features/market/types";

interface MarketWizardInputProps {
  assetType: AssetType;
}

export function MarketWizardInput({ assetType }: MarketWizardInputProps) {
  return (
    <Card className="w-full shadow-sm border-primary/20 bg-primary/5">
      <CardContent className="p-4 flex items-center gap-3">
        <Sparkles className="size-5 text-primary" />
        <Input
          placeholder={`Catat transaksi ${assetType === "stocks" ? "saham" : "kripto"} via AI (contoh: "Beli 10 lot BBCA di harga 10200")`}
          className="bg-background"
        />
        <Button size="sm">Kirim</Button>
      </CardContent>
    </Card>
  );
}
