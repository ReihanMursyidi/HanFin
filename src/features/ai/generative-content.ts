"use server";

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Type } from "@google/genai";
import { z } from "zod";
import { CATEGORIES } from "@/constants/transaction-constant";
import { createClient } from "@/lib/supabase/server";
import { createAI } from "./instance";

// KONFIGURASI
const ANALYSIS_MODEL = "gemini-3.6-flash";
const PAGE_SIZE = 1000; // batas default baris per request PostgREST
const MAX_ROWS = 5000; // batas pengaman jumlah baris yang dihitung
const MAX_GROUPS = 10; // maksimal grup pada chart non-waktu
const MAX_TIME_BUCKETS = { month: 24, day: 31 } as const;

// 1. PARSING PERMINTAAN -> PARAMETER QUERY TERSTRUKTUR
// AI hanya menerjemahkan permintaan menjadi filter. Seluruh angka dihitung
// dari database, bukan oleh AI, sehingga hasilnya akurat dan lengkap.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z.string().regex(DATE_PATTERN).or(z.literal(""));

const analysisSchema = z.object({
  chartType: z.enum(["bar", "pie"]),
  groupBy: z.enum(["category", "month", "day", "type"]),
  type: z.enum(["income", "expense", "all"]),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  categories: z.array(z.enum(CATEGORIES)),
});

type Analysis = z.infer<typeof analysisSchema>;
type Bucket = { name: string; value: number };
type TransactionRow = {
  amount: number | string;
  type: string;
  category: string;
  date: string;
};

async function parseAnalysisRequest(request: string): Promise<Analysis> {
  const ai = createAI();
  const today = new Date().toISOString().slice(0, 10);

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: `
      <role>
        You convert a user's request about their personal finances into structured query parameters.
        Do NOT answer the request and do NOT compute any numbers.
      </role>
      <input>
        User request: "${request}"
      </input>
      <rules>
        - groupBy: "category" for spending/income per category or composition; "month" for monthly trends;
          "day" for daily trends; "type" to compare income against expenses.
        - type: "expense" for spending, "income" for earnings. Use "all" ONLY together with groupBy "type".
          If unclear, use "expense".
        - dateFrom / dateTo: YYYY-MM-DD resolved from Current Date (e.g. "6 bulan terakhir" = 6 months before
          today until today). Use an empty string when the request names no period.
        - categories: only when the request names specific categories, chosen from [${CATEGORIES.join(", ")}]. Otherwise [].
        - chartType: "pie" for proportions, ratios or composition; "bar" for comparisons and time trends.
          Time-based groupBy ("month", "day") must use "bar".
      </rules>
      <context>
        Current Date: ${today}
      </context>
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartType: { type: Type.STRING, enum: ["bar", "pie"] },
          groupBy: {
            type: Type.STRING,
            enum: ["category", "month", "day", "type"],
          },
          type: { type: Type.STRING, enum: ["income", "expense", "all"] },
          dateFrom: { type: Type.STRING },
          dateTo: { type: Type.STRING },
          categories: {
            type: Type.ARRAY,
            items: { type: Type.STRING, enum: [...CATEGORIES] },
          },
        },
        required: [
          "chartType",
          "groupBy",
          "type",
          "dateFrom",
          "dateTo",
          "categories",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to understand the request");
  }

  const analysis = analysisSchema.parse(JSON.parse(response.text));

  // Normalisasi kombinasi yang tidak bermakna
  if (analysis.type === "all" && analysis.groupBy !== "type") {
    analysis.type = "expense";
  }
  if (analysis.groupBy === "month" || analysis.groupBy === "day") {
    analysis.chartType = "bar";
  }

  return analysis;
}

// 2. AMBIL DATA LANGSUNG DARI DATABASE (RLS membatasi ke milik user)
async function fetchTransactions(
  analysis: Analysis,
): Promise<TransactionRow[]> {
  const supabase = await createClient();
  const rows: TransactionRow[] = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    let query = supabase
      .from("transactions")
      .select("amount, type, category, date")
      .order("date", { ascending: false })
      .order("id", { ascending: true });

    if (analysis.type !== "all") query = query.eq("type", analysis.type);
    if (analysis.dateFrom) query = query.gte("date", analysis.dateFrom);
    if (analysis.dateTo) query = query.lte("date", analysis.dateTo);
    if (analysis.categories.length > 0) {
      query = query.in("category", analysis.categories);
    }

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }

  console.warn(
    `[Generative Content]: Data dibatasi ${MAX_ROWS} transaksi terbaru.`,
  );
  return rows;
}

// 3. AGREGASI DETERMINISTIK
function aggregate(rows: TransactionRow[], analysis: Analysis): Bucket[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    const date = String(row.date);

    let key: string;
    switch (analysis.groupBy) {
      case "category":
        key = row.category;
        break;
      case "month":
        key = date.slice(0, 7);
        break;
      case "day":
        key = date;
        break;
      default:
        key = row.type === "income" ? "Income" : "Expense";
    }

    totals.set(key, (totals.get(key) ?? 0) + amount);
  }

  const buckets: Bucket[] = [...totals].map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  // Data waktu: urut kronologis, ambil periode terbaru
  if (analysis.groupBy === "month" || analysis.groupBy === "day") {
    return buckets
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-MAX_TIME_BUCKETS[analysis.groupBy]);
  }

  // Data non-waktu: urut nilai terbesar, sisanya digabung ke "Others"
  buckets.sort((a, b) => b.value - a.value);
  if (buckets.length <= MAX_GROUPS) return buckets;

  const top = buckets.slice(0, MAX_GROUPS - 1);
  const others = buckets
    .slice(MAX_GROUPS - 1)
    .reduce((sum, bucket) => sum + bucket.value, 0);
  return [...top, { name: "Others", value: Math.round(others * 100) / 100 }];
}

async function buildAnalytics(request: string) {
  const analysis = await parseAnalysisRequest(request);
  const rows = await fetchTransactions(analysis);

  if (rows.length === 0) {
    throw new Error("Tidak ada transaksi yang cocok dengan permintaanmu.");
  }

  const buckets = aggregate(rows, analysis);
  return { analysis, transactionCount: rows.length, buckets };
}

// Ringkasan angka yang sudah dihitung untuk prompt gambar/video
function describeAnalytics({
  analysis,
  transactionCount,
  buckets,
}: Awaited<ReturnType<typeof buildAnalytics>>): string {
  return JSON.stringify(
    {
      filters: {
        type: analysis.type,
        from: analysis.dateFrom || null,
        to: analysis.dateTo || null,
        categories: analysis.categories,
      },
      groupedBy: analysis.groupBy,
      currency: "IDR",
      transactionCount,
      total: buckets.reduce((sum, bucket) => sum + bucket.value, 0),
      groups: buckets,
    },
    null,
    2,
  );
}

// 1. GENERATE CHART
export async function generateChart(request: string) {
  const { analysis, buckets } = await buildAnalytics(request);

  return {
    chartType: analysis.chartType,
    data: buckets,
  };
}

// 2. GENERATE IMAGE
export async function generateImage(request: string) {
  const ai = createAI();
  const analytics = await buildAnalytics(request);

  const contents = {
    role: "user",
    parts: [
      {
        text: `
          <role>
            You are an AI Financial Analyst and Data illustrator. Your task is to turn the aggregated data in <context>
            into an image for an infographic and conceptual dashboard in bento grid style that directly responds to the user's request.
          </role>
          <input>
            User request: "${request}"
          </input>
          <instruction>
            1. The data in <context> is ALREADY filtered and aggregated. Use these exact numbers and do NOT recalculate or invent values.
            2. Visualize the groups so the key insight of the user's request is clear.
            3. Create a visually outstanding bento-style design.
          </instruction>
          <context>
            Current Date : ${new Date().toISOString()}
            Aggregated data : ${describeAnalytics(analytics)}
          </context>
        `,
      },
    ],
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image",
    contents,
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Failed to generate image candidates");
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error("Failed to extract image parts");
  }

  let base64Image = "";

  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      base64Image = `data:${mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!base64Image) {
    throw new Error("No inline image data found in response");
  }

  return base64Image;
}

// 3. GENERATE VIDEO
export async function generateVideo(request: string) {
  const ai = createAI();
  const analytics = await buildAnalytics(request);

  const contents = `
      <role>
        You are an AI Financial Analyst and motion designer. Your task is to turn the aggregated data in <context>
        into a video for an infographic and conceptual dashboard in bento grid style that directly responds to the user's request.
      </role>
      <input>
        User request: "${request}"
      </input>
      <instruction>
        1. The data in <context> is ALREADY filtered and aggregated. Use these exact numbers and do NOT recalculate or invent values.
        2. Animate the groups so the key insight of the user's request is clear.
        3. Create an outstanding video with a bento-style design.
        4. Maximum video duration is 10 seconds.
      </instruction>
      <context>
        Current Date : ${new Date().toISOString()}
        Aggregated data : ${describeAnalytics(analytics)}
      </context>
  `;

  let operation = await ai.models.generateVideos({
    model: "veo-3.1-lite-generate-preview",
    prompt: contents,
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({
      operation,
    });
  }

  const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
  if (!generatedVideo) {
    throw new Error("Failed to generate video");
  }

  const tempPath = path.join(os.tmpdir(), `temp-video-${Date.now()}.mp4`);

  try {
    await ai.files.download({
      file: generatedVideo,
      downloadPath: tempPath,
    });

    const videoBuffer = await fs.readFile(tempPath);
    const mimeType = generatedVideo.mimeType || "video/mp4";

    return `data:${mimeType};base64,${videoBuffer.toString("base64")}`;
  } finally {
    await fs
      .unlink(tempPath)
      .catch((err) => console.error("[Temp File Cleanup Error]:", err));
  }
}
