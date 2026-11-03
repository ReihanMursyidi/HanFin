import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAIAnalysisHistory } from "@/features/market/ai-history-action";
import { AIAnalysisHistory } from "../_components/ai-analysis-history";

export const metadata: Metadata = {
  title: "Histori Analisis AI - Financial Market",
  description:
    "Tinjau histori sinyal analisis AI dan berikan feedback atas hasilnya.",
};

export default async function AIAnalysisHistoryPage() {
  const history = await getAIAnalysisHistory();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/home/financial-market/stocks">
            <ArrowLeft />
            Kembali ke Market
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            <History className="size-6" />
            Histori Analisis AI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tinjau sinyal sebelumnya dan tandai hasilnya. Feedback ini dicatat
            untuk evaluasi, belum digunakan untuk melatih model secara otomatis.
          </p>
        </div>
      </header>
      <AIAnalysisHistory
        entries={history.entries}
        totalRows={history.totalRows}
        winRate={history.winRate}
        evaluatedCount={history.evaluatedCount}
        successfulCount={history.successfulCount}
      />
    </div>
  );
}
