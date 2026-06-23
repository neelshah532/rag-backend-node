import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function generateAnswer(prompt: string): Promise<string> {
  const res = await ai.models.generateContent({
    model: config.genModel,
    contents: prompt,
  });
  return res.text ?? "";
}

/** Streaming version — yields text tokens as they arrive (Stretch Goal). */
export async function* generateAnswerStream(prompt: string): AsyncGenerator<string> {
  const stream = await ai.models.generateContentStream({
    model: config.genModel,
    contents: prompt,
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
