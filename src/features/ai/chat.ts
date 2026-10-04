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

const MAX_FUNCTION_CALL_ROUNDS = 5;
const CHAT_MODEL = "gemini-3.1-flash-lite";

interface UserProfile {
	currency?: string;
	monthly_income?: number;
	financial_goal?: string | null;
	risk_profile?: string | null;
}

export type ChatStreamChunk = {
	type: "thought" | "answer";
	text: string;
};

function withoutThoughtParts(conversation: Content[]): Content[] {
	return conversation.flatMap((content) => {
		const parts = content.parts?.filter((part) => !part.thought) ?? [];
		return parts.length > 0 ? [{ ...content, parts }] : [];
	});
}

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
		if (!parts) {
			return;
		}

		for (const part of parts) {
			if (part.text && part.thought) {
				result.thought += part.text;
			} else if (part.text) {
				result.answer += part.text;
			}
		}
	} else {
		result.answer = response.text ?? "";
	}

	if (!result.answer) {
		throw new Error("AI response did not contain an answer");
	}
	return result;
}

async function generalChat(
	conversation: Content[],
	profile: UserProfile | null,
	isThinking: boolean,
) {
	const incomeStr = profile?.monthly_income
		? `${profile.currency || "IDR"} ${profile.monthly_income.toLocaleString("id-ID")}`
		: "belum diatur";
	const goalStr = profile?.financial_goal || "belum diatur";
	const riskStr = profile?.risk_profile || "belum diatur";
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
			systemInstruction: `
            [Role]
            Kamu adalah Hanbot, seorang edukator dan financial advisor yang mampu memberikan analogi sehari-hari 
            agar penjelasan rumit jadi lebih mudah dipahami.

				[Profil Keuangan Pengguna]
				- Pendapatan bulanan: ${incomeStr}
				- Tujuan keuangan: ${goalStr}
				- Profil risiko: ${riskStr}
				Gunakan profil ini saat relevan dan jangan mengarang data yang belum diatur.
         
            [Instruction]
            - Jawab semua pertanyaan yang sesuai dengan bidang finance, investasi, dan pengelolaan kekayaan secara umum.
         
            [Input]
            Pengguna akan menanyakan edukasi seputar menabung, investasi, pengelolaan utang, dana darurat, analisis pasar uang, dll.
         
            [Constraints]
            - Berikan edukasi dan saran finansial secara umum dan objektif.
            - Jangan membuat asumsi tentang data pribadi pengguna (gaji/tujuan) jika mereka tidak menyebutkannya.
            - Jika ada pertanyaan di luar konteks keuangan, tolak dengan sopan dan jawab bahwa kamu hanya melayani pertanyaan keuangan.
         
            [Workflow Steps]
            1. Analisis pertanyaan pengguna secara objektif.
            2. Berikan edukasi atau pedoman praktik terbaik (best practice) dalam perencanaan keuangan.
            3. Keluarkan jawaban akhir ke pengguna.
         
            [Response Format]
            Struktur jawaban kamu harus seperti ini:
            1. Analisis singkat pertanyaan dalam 1 kalimat.
            2. Langkah/penjelasan edukasi berupa bullet points.
         `,
			temperature: 0.2,
			topK: 5,
			topP: 0.1,
			maxOutputTokens: isThinking ? 4096 : 2048,
			stopSequences: ["\n\n\n", "###", "User:", "Pengguna:"],
		},
	});
	return response;
}

export async function* handleChatStreaming(
	conversation: Content[],
	profile: UserProfile | null,
	isThinking: boolean,
	mode: "general" | "personal",
): AsyncGenerator<ChatStreamChunk> {
	if (mode === "general") {
		const response = await generalChat(conversation, profile, isThinking);
		let hasAnswer = false;

		for await (const chunk of response) {
			const parts = chunk.candidates?.[0]?.content?.parts ?? [];
			if (parts.length === 0 && chunk.text) {
				hasAnswer = true;
				yield { type: "answer", text: chunk.text };
			}

			for (const part of parts) {
				if (!part.text) continue;
				if (part.thought) {
					if (isThinking) yield { type: "thought", text: part.text };
				} else {
					hasAnswer = true;
					yield { type: "answer", text: part.text };
				}
			}
		}

		if (!hasAnswer) {
			throw new Error("AI response did not contain an answer");
		}
	} else {
		const incomeStr = profile?.monthly_income
			? `${profile.currency || "IDR"} ${profile.monthly_income.toLocaleString("id-ID")}`
			: "belum diatur";
		const goalStr = profile?.financial_goal || "belum diatur";
		const riskStr = profile?.risk_profile || "belum diatur";
		const query = conversation.at(-1)?.parts?.[0]?.text;
		if (!query) {
			throw new Error("A user message is required for personal chat");
		}

		const historyChat = withoutThoughtParts(conversation.slice(0, -1));
		const ai = createAI();

		const contents: Content[] = [
			...historyChat,
			{
				role: "user",
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
                     User Monthly Income: ${incomeStr} 
                     User Financial Goal: ${goalStr}
                     User Risk Profile: ${riskStr}
                     (Gunakan profil di atas sebagai batasan saat memberikan analisis atau saran kepada pengguna).
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
				const parts = chunk.candidates?.[0]?.content?.parts ?? [];

				for (const part of parts) {
					modelParts.push(part);
					if (part.functionCall) {
						functionCalls.push(part.functionCall);
					} else if (part.text) {
						if (part.thought) {
							if (isThinking) {
								yield { type: "thought", text: part.text };
							}
						} else {
							hasAnswer = true;
							yield { type: "answer", text: part.text };
						}
					}
				}
			}

			if (functionCalls.length === 0) {
				if (!hasAnswer) {
					throw new Error("AI response did not contain an answer");
				}
				return;
			}

			if (functionCallRound === MAX_FUNCTION_CALL_ROUNDS) {
				throw new Error(
					"Personal chat exceeded the maximum function call rounds",
				);
			}

			contents.push({ role: "model", parts: modelParts });
			const functionResponseParts = await Promise.all(
				functionCalls.map(async (functionCall) => {
					const { name, args, id } = functionCall;
					if (!args) {
						throw new Error("No arguments provided for action");
					}

					let resultData: Awaited<ReturnType<typeof findEmbedding>>;
					switch (name) {
						case "get_transaction":
							resultData = await findEmbedding(JSON.stringify(args), 0.3, 100);
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
				role: "user",
				parts: functionResponseParts,
			});
		}
	}
}
