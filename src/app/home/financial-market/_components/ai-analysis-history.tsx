"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Loader2,
  Percent,
  Rows3,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  AIAnalysisFeedback,
  AIAnalysisHistoryEntry,
} from "@/features/market/types";
import {
  deleteAIAnalysisHistoryEntry,
  updateAIAnalysisFeedback,
} from "@/features/market/ai-history-action";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const FEEDBACK_OPTIONS: {
  value: AIAnalysisFeedback;
  label: string;
  icon: typeof Check;
}[] = [
  { value: "success", label: "Berhasil", icon: Check },
  { value: "failure", label: "Gagal", icon: X },
  { value: "inconclusive", label: "Belum pasti", icon: CircleHelp },
];

const STRATEGY_LABELS: Record<AIAnalysisHistoryEntry["strategy"], string> = {
  scalping: "Scalping",
  day_trading: "Day Trading",
  swing_trading: "Swing Trading",
  investing: "Investing",
};

function FeedbackControl({ entry }: { entry: AIAnalysisHistoryEntry }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(entry.feedback);
  const [isSaving, setIsSaving] = useState(false);

  const handleFeedback = async (value: AIAnalysisFeedback | null) => {
    setIsSaving(true);
    try {
      await updateAIAnalysisFeedback(entry.id, value);
      setFeedback(value);
      router.refresh();
      toast.success("Feedback histori analisis berhasil disimpan.");
    } catch (error) {
      console.error("Gagal menyimpan feedback analisis AI:", error);
      toast.error("Feedback gagal disimpan. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-medium">Apakah sinyal ini berhasil?</p>
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_OPTIONS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={feedback === value ? "default" : "outline"}
            disabled={isSaving}
            onClick={() => handleFeedback(value)}
            className={cn(
              "text-xs",
              feedback === value &&
                value === "success" &&
                "bg-emerald-600 text-white hover:bg-emerald-700",
              feedback === value &&
                value === "failure" &&
                "bg-destructive text-destructive-foreground",
            )}
          >
            <Icon />
            {label}
          </Button>
        ))}
        {feedback && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isSaving}
            onClick={() => handleFeedback(null)}
            className="text-xs text-muted-foreground"
          >
            Hapus feedback
          </Button>
        )}
      </div>
    </div>
  );
}

function AnalysisHistoryCard({ entry }: { entry: AIAnalysisHistoryEntry }) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { analysis_result: analysis } = entry;
  const targetPrices = analysis.targetPrices;
  const hasValidTargetPrices =
    targetPrices &&
    [
      targetPrices.entryPrice,
      targetPrices.takeProfit,
      targetPrices.stopLoss,
      targetPrices.takeProfitPercent,
      targetPrices.stopLossPercent,
    ].every((price) => Number.isFinite(price) && price > 0);

  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        await deleteAIAnalysisHistoryEntry(entry.id);
        toast.success(`Histori analisis ${entry.symbol} berhasil dihapus.`);
        setIsDeleteDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Gagal menghapus histori analisis AI:", error);
        toast.error("Histori gagal dihapus. Silakan coba lagi.");
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-2 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {entry.symbol}{" "}
                <span className="font-normal text-muted-foreground">
                  ({entry.asset_type === "crypto" ? "Kripto" : "Saham"})
                </span>
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(entry.created_at)} ·{" "}
                {STRATEGY_LABELS[entry.strategy]} · Timeframe {entry.timeframe}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md bg-primary/10 px-2 py-1 font-semibold">
                {entry.recommendation}
              </span>
              <span className="text-muted-foreground">
                Risiko {entry.risk_level}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus histori analisis ${entry.symbol}`}
                title="Hapus histori"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{entry.summary}</p>

          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/30 p-3 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">ATR (14 RMA)</p>
              <p className="mt-1 font-semibold">
                {formatCurrency(analysis.atrValue, entry.currency)}
              </p>
            </div>
            {hasValidTargetPrices ? (
              <>
                <div>
                  <p className="text-muted-foreground">Entry</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(targetPrices.entryPrice, entry.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Take Profit</p>
                  <p className="mt-1 font-semibold text-emerald-600">
                    {formatCurrency(targetPrices.takeProfit, entry.currency)} (
                    {targetPrices.takeProfitPercent.toFixed(2)}%)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stop Loss</p>
                  <p className="mt-1 font-semibold text-destructive">
                    {formatCurrency(targetPrices.stopLoss, entry.currency)} (
                    {targetPrices.stopLossPercent.toFixed(2)}%)
                  </p>
                </div>
              </>
            ) : (
              <div className="col-span-1 sm:col-span-3">
                <p className="text-muted-foreground">Target harga</p>
                <p className="mt-1 font-semibold">
                  {targetPrices
                    ? "Target tidak valid—setup transaksi dibatalkan"
                    : "Tidak ada setup transaksi"}
                </p>
              </div>
            )}
          </div>

          <details className="rounded-md border px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium">
              Detail analisis dan snapshot ({entry.candle_count} candle)
            </summary>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <p>{analysis.trendAnalysis}</p>
              <p>{analysis.momentumAnalysis}</p>
              <p>{analysis.volumeAnalysis}</p>
              <div className="grid gap-1 border-t pt-2 sm:grid-cols-2">
                <p>
                  Support:{" "}
                  {analysis.keyLevels.support
                    .map((value) => formatCurrency(value, entry.currency))
                    .join(" · ")}
                </p>
                <p>
                  Resistance:{" "}
                  {analysis.keyLevels.resistance
                    .map((value) => formatCurrency(value, entry.currency))
                    .join(" · ")}
                </p>
                <p className="sm:col-span-2">
                  Indikator: {entry.trend_indicator} ·{" "}
                  {entry.momentum_indicator} · {entry.volume_indicator}
                </p>
              </div>
              <p className="border-t pt-2">
                Data OHLCV candle yang dipakai saat analisis disimpan bersama
                rekaman ini untuk dokumentasi dan evaluasi.
              </p>
            </div>
          </details>

          <FeedbackControl entry={entry} />
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Hapus histori analisis?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Histori analisis {entry.symbol} dan snapshot candle-nya akan
              dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 />
                  Hapus
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AIAnalysisHistory({
  entries,
  totalRows,
  winRate,
  evaluatedCount,
  successfulCount,
}: {
  entries: AIAnalysisHistoryEntry[];
  totalRows: number;
  winRate: number | null;
  evaluatedCount: number;
  successfulCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Rows3 className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total histori</p>
              <p className="text-xl font-bold">{totalRows}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Percent className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Winrate</p>
              <p className="text-xl font-bold">
                {winRate === null ? "—" : `${winRate.toFixed(2)}%`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {successfulCount} berhasil dari {evaluatedCount} evaluasi
                (maksimal 150 hasil Berhasil/Gagal)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada histori analisis AI. Jalankan analisis dari halaman Stocks
            atau Crypto untuk mulai mencatat sinyal.
          </CardContent>
        </Card>
      ) : (
        <>
          {entries.map((entry) => (
            <AnalysisHistoryCard key={entry.id} entry={entry} />
          ))}
          <p className="text-center text-xs text-muted-foreground">
            Menampilkan {entries.length} dari {totalRows} analisis terbaru
            (maksimal 100).
          </p>
        </>
      )}
    </div>
  );
}
