"use server";

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Type } from "@google/genai";
import type { Transaction } from "@/app/types/transaction";
import { findEmbedding } from "./embedding";
import { createAI } from "./instance";

// HELPER: Ekstraksi Context Data
async function getTransactionContext(request: string): Promise<string> {
  const data = await findEmbedding(request, 0.5, 50);

  if (!data || data.length === 0) {
    return "No transactions found that are similar or relevant to the request";
  }

  return data
    .map((transaction: Transaction) => JSON.stringify(transaction))
    .join("\n");
}

// 1. GENERATE CHART
export async function generateChart(request: string) {
  const ai = createAI();
  const contextData = await getTransactionContext(request);

  const contents = {
    role: "user",
    parts: [
      {
        text: `
          <role>
            You are an AI Financial Analyst and data engineering specialist. Your task is to analyze transactions 
            in <context> and generate a structured JSON configuration to render charts that directly respond to the user's request.
          </role>
          <input>
            User request: "${request}"
          </input>
          <instruction>
            1. Analyze and filter: read the user's request and extract only the relevant transactions from the provided <context>.
            2. Grouping and Summarization:
               - If the query is about expense type, group by category name.
               - If it's about time trend, group by date, day, or month.
               - If it's comparing income and expenses, group by type.
               - Limit the data to the top 10 most significant groups to ensure the chart is clean on the dashboard, group smaller items into "Other" if necessary.
            3. Values & Calculations: Ensure all currency values are aggregated correctly. Use positive numbers for visual chart representation.
            4. Chart Type Selection:
               - Use 'chartType: "pie"' if the user asks for proportions, ratios, percentages, or category composition.
               - Use 'chartType: "bar"' if the user asks for comparison, over-time trends, chronological analysis, or comparing individual entities.
          </instruction>
          <context>
            Current Date : ${new Date().toISOString()}
            Data transaction: ${contextData}
          </context>
          <constraints>
            - Respond strictly with a raw and valid JSON object matching the requested schema.
            - DO NOT include markdown code blocks, backticks, or any conversational text.
          </constraints>
        `,
      },
    ],
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartType: {
            type: Type.STRING,
            enum: ["bar", "pie"],
            description: "Chart type to render",
          },
          data: {
            type: Type.ARRAY,
            description: "Array of objects for data chart",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.NUMBER },
              },
              required: ["name", "value"],
            },
          },
        },
        required: ["chartType", "data"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate chart configuration");
  }

  return JSON.parse(response.text);
}

// 2. GENERATE IMAGE
export async function generateImage(request: string) {
  const ai = createAI();
  const contextData = await getTransactionContext(request);

  const contents = {
    role: "user",
    parts: [
      {
        text: `
          <role>
            You are an AI Financial Analyst and Data illustrator. Your task is to analyze transactions in <context> 
            and generate an image for an infographic and conceptual dashboard in bento grid style that directly responds to the user's request.
          </role>
          <input>
            User request: "${request}"
          </input>
          <instruction>
            1. Analyze and filter: read the user's request and extract only the relevant transactions from the provided <context>.
            2. Grouping & Summarization: 
               - If the query is about expense type, group by category name.
               - If it's about time trend, group by date, day, or month.
               - If it's comparing income and expenses, group by type.
               - Limit the data to the top 10 most significant groups to ensure the chart is clean on the dashboard, group smaller items into "Others" if necessary.
            3. Values & Calculations: Ensure all currency values are aggregated correctly. Use positive numbers for visual chart representation.
            4. Create a visually outstanding bento-style design.
          </instruction>
          <context>
            Current Date : ${new Date().toISOString()}
            Data transaction : ${contextData}
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
  const contextData = await getTransactionContext(request);

  const contents = `
      <role>
         You are an AI Financial Analyst and motion designer. Your task is to analyze transactions in <context> 
         and generate a video for an infographic and conceptual dashboard in bento grid style that directly responds to the user's request.
      </role>
      <input>
         User request: "${request}"
      </input>
      <instruction>
         1. Analyze and filter: read the user's request and extract only the relevant transactions from the provided <context>.
         2. Grouping & Summarization: 
            - If the query is about expense type, group by category name.
            - If it's about time trend, group by date, day, or month.
            - If it's comparing income and expenses, group by type.
            - Limit the data to the top 10 most significant groups to ensure the chart is clean on the dashboard, group smaller items into "Others" if necessary.
         3. Values & Calculations: Ensure all currency values are aggregated correctly. Use positive numbers for visual chart representation.
         4. Create an outstanding video with a bento-style design.
         5. Maximum video duration is 10 seconds.
      </instruction>
      <context>
         Current Date : ${new Date().toISOString()}
         Data transaction : ${contextData}
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
