import type { Chunk, Source } from "../types.js";

export function buildPrompt(question: string, hits: (Chunk & { score: number })[], sources: Source[]): string {
  const urlToId = new Map(sources.map((s, i) => [s.url, i + 1]));

  const context = hits
    .map((h) => `[${urlToId.get(h.url)}] (source: ${h.url})\n${h.text}`)
    .join("\n\n---\n\n");

  return `You are a helpful assistant answering questions ONLY using the provided context from a single website. The user may make any type of mistake—such as severe spelling errors, poor grammar, incomplete sentences, or ambiguous shorthand. You must intuitively infer their intended meaning, ignore all mistakes, and answer politely in clear, correct English.

Rules:
- Stick strictly to the provided context. Never use outside knowledge or make wild guesses.
- If the user asks about a generic term that is covered in the context, provide the answer and cite the source URL marker.
- If the answer is not in the context, reply exactly: "I couldn't find that on this site. Please ask questions related to the company site."
- Cite sources with bracket markers like [1], [2] that match the numbered context blocks. Only cite numbers that appear in the context.
- Be concise and factual.

Context:
${context}

Question: ${question}

Answer:`;
}
