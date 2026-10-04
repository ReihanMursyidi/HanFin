'use server';

import { createAI } from '@/features/ai/instance';
import type { Conversation } from '@/app/types/ai';
import { findEmbedding } from './embedding';
import { getTransactionDeclaration } from './functionTransaction';
import {
   HarmBlockThreshold,
   HarmCategory,
   type Content,
   type FunctionCall,
   type Part,
} from '@google/genai';

const MAX_FUNCTION_CALL_ROUNDS = 5;
const CHAT_MODEL = 'gemini-2.5-flash';

export type ChatStreamChunk = {
   type: 'thought' | 'answer';
   text: string;
};

function withoutThoughtParts(conversation: Content[]): Content[] {
   return conversation.flatMap((content) => {
      const parts = content.parts?.filter((part) => !part.thought) ?? [];
      return parts.length > 0 ? [{ ...content, parts }] : [];
   });
}

const SYSTEM_INSTRUCTION = `
   [Role]
   Kamu adalah HanFin, seorang financial advisor yang mampu memberikan analogi sehari-hari 
   agar penjelasan rumit jadi lebih mudah dipahami.

   [Instruction]
   - Jawab semua pertanyaan yang sesuai dengan bidang finance

   [Context]
   Kamu bekerja untuk Reihan, platform financial tracker yang target utamanya adalah pengusaha di Indonesia (usia 18 - 30 tahun),
   dengan penghasilan (Rp 30.000.000 - Rp 60.000.000). Kebanyakan dari mereka mulai memikirkan investasi.

   [Input]
   Pengguna akan menanyakan seputar menabung, investasi, pengelolaan utang, dana darurat, atau pertanyaan lain seputar keuangan.

   [Constraints]
   - Jangan membuat asumsi tentang data pengguna jika mereka tidak menyebutkannya.
   - Jika ada pertanyaan di luar konteks keuangan, jawab bahwa kamu hanya bisa menjawab pertanyaan terkait keuangan.

   [Workflow Steps]
   1. Identifikasi pengguna, tanyakan usia, penghasilan/ budget, tujuan keuangannya.
   2. Analisis masalah utama pengguna dan  data apa yang kurang.
   3. Tentukan rencana yang harus dijalankan.
   4. Periksa kembali hasil dari action.
   5. Keluarkan jawaban akhir ke pengguna

   [Response Format]
   Struktur jawaban kamu harus seperti ini:
   1. Analisis singkat masalah pengguna dalam 1 kalimat.
   2. Langkah solusi.

   [Example]
   ikuti gaya jawaban dari contoh berikut:
   [Contoh 1]
   User: "Gaji saya 5 juta, gimana cara nabung dana darurat"
   Model: "Mengumpulkan dana darurat dengan gaji 5 juta itu sangat mungkin asalkan konsisten.
   Berikut langkah awalnya:
   - Sisihkan minimal 10% di awal bulan.
   - Simpan di instrumen rendah resiko seperti RDPU"

   [Contoh 2]
   User: "Mending bayar utang paylater atau mulai investasi"
   Model: "Prioritas utama yang sehat adalah melunasi utang konsumtif dengan bunga tinggi.
   Ini saran untukmu:
   - Stop penggunaan paylater untuk sementara waktu.
   - Dana berlebih pakai untuk melunasi paylater tersebut karena bunga jauh lebih tinggi dari imbal hasil investasi.
   - Setelah lunas baru mulai rutin investasi.
`;

export async function handleChat(
   conversation: Conversation[],
   isThinking: boolean,
) {
   const ai = createAI();
   const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: [...conversation],
      config: {
         thinkingConfig: {
            includeThoughts: isThinking,
         },
      },
   });

   const result = {
      thought: '',
      answer: '',
   };

   if (isThinking) {
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
         throw new Error('AI response did not contain any content');
      }

      for (const part of parts) {
         if (!part.text) {
            continue;
         } else if (part.thought) {
            result.thought += part.text;
         } else {
            result.answer += part.text;
         }
      } 
   } else {
      result.answer = `${response.text}`;
   }
   return result;
}

async function generalChat(conversation: Content[], isThinking: boolean) {
   const ai = createAI();
   const response = await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents: withoutThoughtParts(conversation),
      config: {
         thinkingConfig: {
            includeThoughts: isThinking,
         },
         tools: [
            {
               googleSearch: {},
               urlContext: {},
            },
         ],
         systemInstruction: SYSTEM_INSTRUCTION,
         temperature: 0.2,
         topK: 5,
         topP: 0.1,
         maxOutputTokens: 2048,
         stopSequences: ['\n\n\n', '###', 'User:', 'Pengguna:'],
      },
   });
   return response;
}

export async function* handleChatStreaming(
  conversation: Content[],
  isThinking: boolean,
  mode: 'general' | 'personal',
): AsyncGenerator<ChatStreamChunk> {
   if (mode === 'general') {
      const response = await generalChat(conversation, isThinking);
      let hasAnswer = false;

      for await (const chunk of response) {
         const parts = chunk.candidates?.[0]?.content?.parts ?? [];
         if (parts.length === 0 && chunk.text) {
            hasAnswer = true;
            yield { type: 'answer', text: chunk.text };
         }

         for (const part of parts) {
            if (!part.text) continue;
            if (part.thought) {
               if (isThinking) yield { type: 'thought', text: part.text };
            } else {
               hasAnswer = true;
               yield { type: 'answer', text: part.text };
            }
         }
      }

      if (!hasAnswer) {
         throw new Error('AI response did not contain an answer');
      }
   } else {
      const query = conversation.at(-1)?.parts?.[0]?.text;
      if (!query) {
         throw new Error('A user message is required for personal chat');
      }

      const historyChat = withoutThoughtParts(conversation.slice(0, -1));
      const ai = createAI();

      const contents: Content[] = [
         ...historyChat,
         {
            role: 'user',
            parts: [
               {
                  text: `
                  <role>
                     You are an AI Financial Analyst. You are helping the user analyze their financial data.
                  </role>
                  <input>
                     User Question: "${query}"
                  </input>
                  <instruction>
                     - Extract the transaction details from the input.
                     - Answer the user question ONLY based on the relevant transaction data (if there's need data).
                     - If there are calculations (total spending, average, etc), calculate them accurately based on the data.
                     - Provide the answer in a neat, professional, yet easy-to-understand markdown format.
                     - If there is no relevant data at all, state that the data is not availble in the history.
                     - If user question is general and not need a data, response generally.
                     - The final response if there are no more functions being called is as simple as possible.
                  </instruction>
                  <context>
                     Current Date : ${new Date().toISOString()}
                  </context>
                  <constraints>
                     - Answer in relaxed, polite but professional in Indonesian.
                     - Don't make assumptions about data from users if they don't mention it.
                     - If there are questions outside the context related to finance, you must only answer questions related to finance.
                     - Don't answer in table format instead of markdown.
                  </contraints>
                  `,
               },
            ],
         },
      ];

      for (
         let functionCallRound = 0;
         functionCallRound <= MAX_FUNCTION_CALL_ROUNDS;
         functionCallRound++
      ) {
         const response = await ai.models.generateContentStream({
            model: CHAT_MODEL,
            contents,
            config: {
               tools: [{ functionDeclarations: [getTransactionDeclaration] }],
               thinkingConfig: {
                  includeThoughts: isThinking,
               },
               safetySettings: [
                  {
                     category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                     threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                  },
               ],
            },
         });

         const modelParts: Part[] = [];
         const functionCalls: FunctionCall[] = [];
         let hasAnswer = false;

         for await (const chunk of response) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];

            for (const part of parts) {
               modelParts.push(part);
               if (part.functionCall) {
                  functionCalls.push(part.functionCall);
               } else if (part.text) {
                  if (part.thought) {
                     if (isThinking) yield { type: 'thought', text: part.text };
                  } else {
                     hasAnswer = true;
                     yield { type: 'answer', text: part.text };
                  }
               }
            }
         }

         if (functionCalls.length === 0) {
            if (!hasAnswer) {
               throw new Error('AI response did not contain an answer');
            }
            return;
         }

         if (functionCallRound === MAX_FUNCTION_CALL_ROUNDS) {
            throw new Error('Personal chat exceeded the maximum function call rounds');
         }

         contents.push({ role: 'model', parts: modelParts });
         const functionResponseParts = await Promise.all(
            functionCalls.map(async (functionCall) => {
               const { name, args, id } = functionCall;
               if (!args) {
                  throw new Error('No arguments provided for action');
               }

               let resultData: Awaited<ReturnType<typeof findEmbedding>>;

               switch (name) {
                  case 'get_transaction':
                     resultData = await findEmbedding(
                        JSON.stringify(args),
                        0.3,
                        100,
                     );
                     break;
                  default:
                     throw new Error(`Unknown function call: ${name}`);
               }

               return {
                  functionResponse: {
                     name,
                     response: { result: resultData ?? [] },
                     id,
                  },
               };
            }),
         );
         contents.push({
            role: 'user',
            parts: functionResponseParts,
         });
      }

   }
}