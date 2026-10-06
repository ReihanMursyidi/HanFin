"use server";

import {
  type Content,
  type FunctionCall,
  HarmBlockThreshold,
  HarmCategory,
  type Part,
} from "@google/genai";
import type { Conversation } from "@/app/types/ai";
import { createAI } from "@/features/ai/instance";
import { findEmbedding } from "./embedding";
import { getTransactionDeclaration } from "./functionTransaction";

// === CONSTANTS & TYPES ===
const MAX_FUNCTION_CALL_ROUNDS = 5;
const CHAT_MODEL = "gemini-3.5-flash";

export interface UserProfile {
  currency?: string;
  monthly_income?: number;
  financial_goal?: string;
  risk_profile?: string;
  marital_status?: string;
  dependents?: number;
  current_emergency_fund?: number;
  profession?: string;
}

export type ChatStreamChunk = {
  type: "thought" | "answer";
  text: string;
};

// === HELPER UTILITIES ===
function withoutThoughtParts(conversation: Content[]): Content[] {
  return conversation.flatMap((content) => {
    const parts = content.parts?.filter((part) => !part.thought) ?? [];
    return parts.length > 0 ? [{ ...content, parts }] : [];
  });
}

// Format mata uang
function formatCurrency(
  amount: number | undefined,
  currency: string = "IDR",
): string {
  if (amount === undefined || amount === null) return "0";
  return `${currency} ${amount.toLocaleString("id-ID")}`;
}

function extractProfileContext(profile: UserProfile | null): string {
  if (!profile) return "Data profil belum diatur.";

  const curr = profile.currency || "IDR";
  const incomeStr = formatCurrency(profile.monthly_income, curr);
  const emergencyFundStr = formatCurrency(profile.current_emergency_fund, curr);
  const goalStr = profile.financial_goal || "Belum diatur";
  const riskStr = profile.risk_profile || "Belum diatur";
  const maritalStr = profile.marital_status || "Lajang";
  const dependentsStr =
    profile.dependents !== undefined
      ? `${profile.dependents} orang`
      : "0 orang";
  const professionStr = profile.profession || "Belum diatur";

  return `
    [Data Pribadi Pengguna]
    - Profesi: ${professionStr}
    - Pendapatan Bulanan: ${incomeStr} 
    - Status Pernikahan: ${maritalStr} dengan tanggungan ${dependentsStr}
    - Dana Darurat Saat Ini: ${emergencyFundStr}
    - Fokus Tujuan Finansial: ${goalStr}
    - Profil Risiko Investasi: ${riskStr}
  `;
}

// === PROMPT GENERATORS
function getGeneralSystemInstruction(): string {
  return `
    [Role]
    Kamu adalah Hanbot, seorang edukator dan financial advisor yang mampu memberikan analogi sehari-hari 
    agar penjelasan rumit jadi lebih mudah dipahami.
    
    [Instruction]
    - Jawab semua pertanyaan yang sesuai dengan bidang finance, investasi, dan pengelolaan kekayaan secara umum.
    
    [Constraints]
    - Berikan edukasi dan saran finansial secara umum dan objektif.
    - Jangan membuat asumsi tentang data pribadi pengguna (gaji/tujuan) jika mereka tidak menyebutkannya.
    - Tolak pertanyaan di luar konteks keuangan dengan sopan.
    
    [Response Format]
    1. Analisis singkat pertanyaan dalam 1 kalimat.
    2. Langkah/penjelasan edukasi berupa bullet points.
  `;
}

function getPersonalSystemInstruction(
  query: string,
  profileContext: string,
): string {
  return `
    <role>
      You are Hanbot, an AI Financial Analyst for HanFin app. You are helping the user analyze their personal financial data.
    </role>
    <input>
      User Question: "${query}"
    </input>
    <instruction>
      - Extract the transaction details from the input.
      - Answer the user question ONLY based on the relevant transaction data (if data is needed).
      - If there are calculations, calculate them accurately based on the data.
      - Provide the answer in a neat, professional markdown format.
      - If there is no relevant data, state that the data is not available in the history.
    </instruction>
    <context>
      Current Date : ${new Date().toISOString()}
      ${profileContext}
      
      (PENTING: Gunakan profil di atas sebagai metrik dasar saat memberikan analisis. 
      Jika user bertanya target dana darurat, hitung berdasarkan status pernikahan dan jumlah tanggungannya).
    </context>
    <constraints>
      - Answer in relaxed, polite but professional in Indonesian.
      - Don't answer in table format instead of markdown.
    </constraints>
  `;
}

// === MAIN EXECUTORS (Core Logic) ===
export async function handleChat(
  conversation: Conversation[],
  isThinking: boolean,
) {
  const ai = createAI();
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: withoutThoughtParts([...conversation]),
    config: {
      thinkingConfig: {
        includeThoughts: isThinking,
      },
    },
  });

  const result = {
    thought: "",
    answer: "",
  };

  if (isThinking) {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return;

    for (const part of parts) {
      if (part.text && part.thought) result.thought += part.text;
      else if (part.text) result.answer += part.text;
    }
  } else {
    result.answer = response.text ?? "";
  }

  if (!result.answer) throw new Error("AI response did not contain an answer");
  return result;
}

type StreamResponseChunk = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
        functionCall?: FunctionCall;
      }>;
    };
  }>;
};

// Generator parsing stream chunk
async function* parseStreamChunks(
  responseStream: AsyncIterable<StreamResponseChunk>,
  isThinking: boolean,
): AsyncGenerator<{
  type: "thought" | "answer";
  text: string;
  functionCalls: FunctionCall[];
  modelParts: Part[];
  hasAnswer: boolean;
}> {
  const functionCalls: FunctionCall[] = [];
  const modelParts: Part[] = [];
  let hasAnswer = false;

  for await (const chunk of responseStream) {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      modelParts.push(part);

      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      } else if (part.text && part.text.trim() !== "") {
        if (part.thought) {
          if (isThinking)
            yield {
              type: "thought",
              text: part.text,
              functionCalls,
              modelParts,
              hasAnswer,
            };
        } else {
          hasAnswer = true;
          yield {
            type: "answer",
            text: part.text,
            functionCalls,
            modelParts,
            hasAnswer,
          };
        }
      }
    }
  }

  // Berikan satu yield kosong terakhir hanya untuk mengembalikan akumulasi state functionCalls & modelParts
  yield { type: "answer", text: "", functionCalls, modelParts, hasAnswer };
}

// === FUNGSI UTAMA (ENTRY POINT STREAMING) ===
export async function* handleChatStreaming(
  conversation: Content[],
  profile: UserProfile | null,
  isThinking: boolean,
  mode: "general" | "personal",
): AsyncGenerator<ChatStreamChunk> {
  const ai = createAI();

  // Mode General
  if (mode === "general") {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: withoutThoughtParts(conversation),
      config: {
        thinkingConfig: { includeThoughts: isThinking },
        // tools: [{ googleSearch: {}, urlContext: {} }],
        systemInstruction: getGeneralSystemInstruction(),
        temperature: 0.2,
        topK: 5,
        topP: 0.1,
        maxOutputTokens: isThinking ? 4096 : 2048,
        stopSequences: ["\n\n\n", "###", "User:", "Pengguna:"],
      },
    });

    let finalHasAnswer = false;
    const stream = parseStreamChunks(responseStream, isThinking);

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { type: chunk.type, text: chunk.text };
      }
      finalHasAnswer = chunk.hasAnswer;
    }

    if (!finalHasAnswer && !isThinking)
      throw new Error("AI response did not contain an answer");
    return;
  }

  // Mode Personal
  const query = conversation[conversation.length - 1]?.parts?.[0].text || "";
  const historyChat = conversation.slice(0, -1);
  const profileContext = extractProfileContext(profile);

  const contents: Content[] = [
    ...historyChat,
    {
      role: "user",
      parts: [{ text: getPersonalSystemInstruction(query, profileContext) }],
    },
  ];

  for (let round = 0; round <= MAX_FUNCTION_CALL_ROUNDS; round++) {
    const responseStream = await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents,
      config: {
        tools: [{ functionDeclarations: [getTransactionDeclaration] }],
        thinkingConfig: { includeThoughts: isThinking },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
        ],
      },
    });

    let accumulatedFunctionCalls: FunctionCall[] = [];
    let accumulatedModelParts: Part[] = [];
    let finalHasAnswer = false;

    const stream = parseStreamChunks(responseStream, isThinking);
    for await (const chunk of stream) {
      if (chunk.text) {
        yield { type: chunk.type, text: chunk.text };
      }
      accumulatedFunctionCalls = chunk.functionCalls;
      accumulatedModelParts = chunk.modelParts;
      finalHasAnswer = chunk.hasAnswer;
    }

    if (accumulatedFunctionCalls.length === 0) {
      if (!finalHasAnswer && !isThinking) {
        throw new Error("AI response did not contain an answer");
      }
      return;
    }

    // Cek batas loop
    if (round === MAX_FUNCTION_CALL_ROUNDS) {
      throw new Error(
        "Personal chat exceeded the maximum function call rounds",
      );
    }

    contents.push({ role: "model", parts: accumulatedModelParts });

    const functionResponseParts = await Promise.all(
      accumulatedFunctionCalls.map(async (func) => {
        if (!func.args) throw new Error("No arguments provided for action");

        let resultData: Awaited<ReturnType<typeof findEmbedding>>;
        switch (func.name) {
          case "get_transaction":
            resultData = await findEmbedding(
              JSON.stringify(func.args),
              0.3,
              100,
            );
            break;
          default:
            throw new Error(`Unknown function call: ${func.name}`);
        }

        return {
          functionResponse: {
            name: func.name,
            response: { result: resultData ?? [] },
            id: func.id,
          },
        };
      }),
    );

    contents.push({ role: "user", parts: functionResponseParts });
  }
}
