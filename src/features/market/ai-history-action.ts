"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiAnalysisResponseSchema } from "@/constants/market-constant";
import { createClient } from "@/lib/supabase/server";
import {
  AI_ANALYSIS_FEEDBACK,
  AI_ANALYSIS_EVALUATION_LIMIT,
  AIAnalysisFeedback,
  AIAnalysisHistorySummary,
  AIAnalysisStrategyMetric,
  TRADING_STRATEGIES,
} from "./types";

const historyLimit = 100;
const storedAnalysisResultSchema = aiAnalysisResponseSchema.extend({
  atrValue: z.number().nullable(),
  signalStatus: z
    .enum([
      "approved",
      "rejected_against_major_trend",
      "wait_for_major_trend",
      "wait_for_execution_signal",
      "wait_for_weak_adx",
      "wait_for_momentum_reversal",
      "rejected_invalid_risk_setup",
    ])
    .optional(),
  anchorTrend: z.enum(["Bullish", "Bearish", "Neutral"]).optional(),
  anchorTrendMethod: z.string().optional(),
  anchorTimeframe: z.string().optional(),
  executionTimeframe: z.string().optional(),
  stopMethod: z.enum(["atr", "static_percentage"]).optional(),
  targetPrices: z
    .object({
      entryPrice: z.number(),
      takeProfit: z.number(),
      stopLoss: z.number(),
      takeProfitPercent: z.number(),
      stopLossPercent: z.number(),
    })
    .optional(),
});

async function getStrategyMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<
  Record<(typeof TRADING_STRATEGIES)[number], AIAnalysisStrategyMetric>
> {
  const evaluationResults = await Promise.all(
    TRADING_STRATEGIES.map((strategy) =>
      supabase
        .from("ai_market_analysis_history")
        .select("feedback")
        .eq("user_id", userId)
        .eq("strategy", strategy)
        .in("feedback", ["success", "failure"])
        .order("reviewed_at", { ascending: false })
        .limit(AI_ANALYSIS_EVALUATION_LIMIT),
    ),
  );

  return Object.fromEntries(
    TRADING_STRATEGIES.map((strategy, index) => {
      const result = evaluationResults[index];
      if (result.error) {
        throw new Error(
          `Failed to calculate ${strategy} win rate: ${result.error.message}`,
        );
      }
      if (result.data === null) {
        throw new Error(`${strategy} evaluation data was not returned`);
      }

      const successfulCount = result.data.filter(
        (row) => row.feedback === "success",
      ).length;
      const evaluatedCount = result.data.length;

      const metric: AIAnalysisStrategyMetric = {
        winRate:
          evaluatedCount > 0 ? (successfulCount / evaluatedCount) * 100 : null,
        evaluatedCount,
        successfulCount,
        failureCount: evaluatedCount - successfulCount,
      };

      return [strategy, metric];
    }),
  ) as Record<(typeof TRADING_STRATEGIES)[number], AIAnalysisStrategyMetric>;
}

export async function getAIAnalysisHistory(): Promise<AIAnalysisHistorySummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [historyResult, countResult, strategyMetrics] = await Promise.all([
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
    getStrategyMetrics(supabase, user.id),
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
  if (countResult.count === null) {
    throw new Error("AI analysis history count was not returned");
  }
  if (historyResult.data === null) {
    throw new Error("AI analysis history data was not returned");
  }

  const entries = historyResult.data.map((row) => ({
    ...row,
    analysis_result: storedAnalysisResultSchema.parse(row.analysis_result),
    technical_snapshot: row.technical_snapshot as Record<string, unknown>,
    candle_count: Number(row.candle_count),
    feedback: row.feedback as AIAnalysisFeedback | null,
  }));

  return {
    entries,
    totalRows: countResult.count,
    strategyMetrics,
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
