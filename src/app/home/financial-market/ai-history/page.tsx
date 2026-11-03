import type { Metadata } from "next";
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
    <div className="w-full max-w-full min-w-0 space-y-6">
      <header className="space-y-1 min-w-0 w-full sm:pr-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
          Histori Analisis AI
        </h1>
        <p className="text-xs sm:text-sm md:text-base">
          Tinjau sinyal dan metrik performa tiap strategi. Feedback dicatat
          untuk evaluasi dan belum digunakan untuk melatih model secara
          otomatis.
        </p>
      </header>
      <AIAnalysisHistory
        entries={history.entries}
        totalRows={history.totalRows}
        strategyMetrics={history.strategyMetrics}
      />
    </div>
  );
}
