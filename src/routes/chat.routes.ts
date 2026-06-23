import { Router } from "express";
import { retrieve } from "../rag/retrieve.js";
import { buildPrompt } from "../rag/prompt.js";
import { generateAnswerStream } from "../rag/generate.js";
import type { Source } from "../types.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Provide a 'question' string." });
  }

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const { hits, grounded } = await retrieve(question);

    // GROUNDING: refuse before spending an LLM call if nothing is relevant.
    if (!grounded) {
      send("token", { text: "I couldn't find that on this site." });
      send("done", { sources: [] });
      return res.end();
    }

    const sources = dedupeSources(hits);
    send("sources", { sources }); // send citations up front so the UI can show them immediately

    const prompt = buildPrompt(question, hits);
    for await (const token of generateAnswerStream(prompt)) {
      send("token", { text: token });
    }

    send("done", { sources });
    res.end();
  } catch (err) {
    let errorMessage = (err as Error).message;
    
    // The Gemini SDK sometimes throws a stringified JSON containing the raw 503 error.
    // If we detect this, format it nicely so it doesn't break the frontend UI.
    if (errorMessage.includes("503") || errorMessage.includes("high demand")) {
      errorMessage = "The AI model is currently experiencing high demand (Service Unavailable). Please wait a moment and try again.";
    }

    send("error", { message: errorMessage });
    res.end();
  }
});

function dedupeSources(hits: { url: string; title: string; score: number }[]): Source[] {
  const best = new Map<string, Source>();
  for (const h of hits) {
    const cur = best.get(h.url);
    if (!cur || h.score > cur.score) best.set(h.url, { url: h.url, title: h.title, score: h.score });
  }
  return [...best.values()];
}
