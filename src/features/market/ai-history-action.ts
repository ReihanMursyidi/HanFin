"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  AI_ANALYSIS_FEEDBACK,
  AIAnalysisFeedback,
  AIAnalysisHistoryEntry,
  AIAnalysisHistorySummary,
} from "./types";

const historyLimit = 100;
const evaluationLimit = 150;

export async function getAIAnalysisHistory(): Promise<AIAnalysisHistorySummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [historyResult, countResult, evaluationResult] = await Promise.all([
    supabase
      .from("ai_market_analysis_history")
      .select(
        "id, symbol, asset_type, strategy, timeframe, currency, trend_indicator, momentum_indicator, volume_indicator, recommendation, risk_level, summary, analysis_result, technical_snapshot, candle_count, feedback, reviewed_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(historyLimit),
    supabase
      .from("ai_market_analysis_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("ai_market_analysis_history")
      .select("feedback")
      .eq("user_id", user.id)
      .in("feedback", ["success", "failure"])
      .order("reviewed_at", { ascending: false })
      .limit(evaluationLimit),
  ]);

  if (historyResult.error) {
    throw new Error(
      `Failed to fetch AI analysis history: ${historyResult.error.message}`,
    );
  }
  if (countResult.error) {
    throw new Error(
      `Failed to count AI analysis history: ${countResult.error.message}`,
    );
  }
  if (evaluationResult.error) {
    throw new Error(
      `Failed to calculate AI analysis win rate: ${evaluationResult.error.message}`,
    );
  }

  const evaluationRows = evaluationResult.data || [];
  const successfulCount = evaluationRows.filter(
    (row) => row.feedback === "success",
  ).length;
  const evaluatedCount = evaluationRows.length;
  const entries = (historyResult.data || []).map((row) => ({
    ...row,
    analysis_result:
      row.analysis_result as unknown as AIAnalysisHistoryEntry["analysis_result"],
    technical_snapshot: row.technical_snapshot as Record<string, unknown>,
    candle_count: Number(row.candle_count),
    feedback: row.feedback as AIAnalysisFeedback | null,
  }));

  return {
    entries,
    totalRows: countResult.count || 0,
    winRate:
      evaluatedCount > 0 ? (successfulCount / evaluatedCount) * 100 : null,
    evaluatedCount,
    successfulCount,
  };
}

export async function updateAIAnalysisFeedback(
  rawId: unknown,
  rawFeedback: unknown,
): Promise<void> {
  const id = z.uuid().parse(rawId);
  const feedback = z.enum(AI_ANALYSIS_FEEDBACK).nullable().parse(rawFeedback);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("ai_market_analysis_history")
    .update({
      feedback,
      reviewed_at: feedback === null ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to update AI analysis feedback: ${error.message}`);
  }
  if (!data) throw new Error("AI analysis history entry was not found");

  revalidatePath("/home/financial-market/ai-history");
}

export async function deleteAIAnalysisHistoryEntry(
  rawId: unknown,
): Promise<void> {
  const id = z.uuid().parse(rawId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("ai_market_analysis_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to delete AI analysis history: ${error.message}`);
  }
  if (!data) throw new Error("AI analysis history entry was not found");

  revalidatePath("/home/financial-market/ai-history");
}
