"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { AssetType } from "@/features/market/types";

interface AiPredictorCardProps {
  assetType: AssetType;
}

export function AiPredictorCard({ assetType }: AiPredictorCardProps) {
  return (
    <Card className="w-full shadow-sm border-primary/20">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          AI Market Predictor ({assetType === "stocks" ? "Saham" : "Kripto"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Pilih indikator teknikal untuk mendapatkan analisis pergerakan harga
          berbasis AI.
        </p>
        <Button className="w-full" size="sm">
          Generate AI Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
