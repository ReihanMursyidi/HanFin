"use server";

import { revalidatePath } from "next/cache";
import {
  aiAnalysisRequestSchema,
  aiAnalysisResponseSchema,
} from "@/constants/market-constant";
import { AIAnalysisRequest, AIAnalysisResult, Currency } from "./types";
import {
  getAIAnalysisFailureReason,
  prepareAnalysisContext,
  type MarketAnalysisContext,
} from "./ai-analysis-context";
import {
  buildAnalysisPrompt,
  buildAnalysisResult,
} from "./ai-analysis-result";
import { createAI } from "../ai/instance";
import { createClient } from "@/lib/supabase/server";

export async function analyzeMarketWithAI(
  rawRequest: AIAnalysisRequest,
  currency: Currency = "IDR",
): Promise<AIAnalysisResult> {
  const request = aiAnalysisRequestSchema.parse(rawRequest);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let context: MarketAnalysisContext;
  try {
    context = await prepareAnalysisContext(request, currency);
  } catch (error) {
    console.error("AI Market Data Error:", error);
    return { success: false, reason: "market_data_unavailable" };
  }
  const prompt = buildAnalysisPrompt(request, currency, context);

  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    const safeResponse = aiAnalysisResponseSchema.safeParse(parsedJson);

    if (!safeResponse.success) {
      console.error("AI Response Schema Invalid:", safeResponse.error.format());
      throw new Error("Respon AI tidak sesuai format skema");
    }

    const analysisResult = buildAnalysisResult(
      safeResponse.data,
      request,
      context,
    );

    if (
      analysisResult.signalStatus === "approved" &&
      analysisResult.targetPrices
    ) {
      const { error: saveError } = await supabase
        .from("ai_market_analysis_history")
        .insert({
          user_id: user.id,
          symbol: request.symbol,
          asset_type: request.asset_type,
          strategy: request.strategy,
          timeframe: context.timeframe.execution,
          currency,
          trend_indicator: request.trend_indicator,
          momentum_indicator: request.momentum_indicator,
          volume_indicator: request.volume_indicator,
          recommendation: analysisResult.recommendation,
          risk_level: analysisResult.riskLevel,
          summary: analysisResult.summary,
          analysis_result: analysisResult,
          technical_snapshot: {
            request: {
              trend_indicator: request.trend_indicator,
              momentum_indicator: request.momentum_indicator,
              volume_indicator: request.volume_indicator,
            },
            anchorTimeframe: context.timeframe.anchor,
            executionTimeframe: context.timeframe.execution,
            marketDataSource: context.marketDataSource,
            anchorIndicators: context.anchorTechData.trend,
            indicators: context.techData,
            adxFilter: {
              ...context.techData.adx,
              timeframe: context.timeframe.execution,
            },
            atrValue: context.convertedAtrValue,
            riskParameters: {
              atrMultiplier: context.atrMultiplier,
              riskRewardRatio: context.riskRewardRatio,
            },
            stopMethod: analysisResult.stopMethod,
          },
          candle_snapshot: {
            anchor: context.anchorCandles,
            execution: context.executionCandles,
          },
          candle_count:
            context.anchorCandles.length + context.executionCandles.length,
        });

      if (saveError) {
        console.error("AI Analysis History Save Error:", saveError);
        return { success: false, reason: "history_save_failed" };
      }

      revalidatePath("/home/financial-market/ai-history");
    }

    return { success: true, data: analysisResult };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { success: false, reason: getAIAnalysisFailureReason(error) };
  }
}
