import { GoogleGenAI } from "@google/genai";
import { ENVIRONMENT } from "@/config/environment";

export function createAI() {
  if (!ENVIRONMENT.googleApiKey) {
    throw new Error("AI API Key is missing");
  }

  // console.log(
  //   "Kunci API yang terbaca:",
  //   ENVIRONMENT.googleApiKey.slice(0, 10) + "...",
  // );

  const ai = new GoogleGenAI({
    apiKey: ENVIRONMENT.googleApiKey,
  });

  return ai;
}
