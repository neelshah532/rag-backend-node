import type { Chunk } from "../types.js";

export function buildPrompt(question: string, hits: (Chunk & { score: number })[]): string {
  const context = hits
    .map((h, i) => `[${i + 1}] (source: ${h.url})\n${h.text}`)
    .join("\n\n---\n\n");

  return `You answer questions ONLY using the provided context from a single website.

Rules:
- Use ONLY the context below. Never use outside knowledge.
- If the answer is not in the context, reply exactly: "I couldn't find that on this site."
- Cite sources with bracket markers like [1], [2] that match the numbered context blocks.
- Be concise and factual.

Context:
${context}

Question: ${question}

Answer:`;
}
