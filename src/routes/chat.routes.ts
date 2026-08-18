import { Router } from 'express';
import { retrieve } from '../rag/retrieve.js';
import { buildPrompt } from '../rag/prompt.js';
import { generateAnswerStream } from '../rag/generate.js';
import type { Source } from '../types.js';

export const chatRouter = Router();

chatRouter.post('/chat', async (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Provide a \'question\' string.' });
  }

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const greetings = ['hi', 'hello', 'hey', 'hola', 'greetings', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup', 'howdy'];
    if (greetings.includes(question.trim().toLowerCase())) {
      send('token', { text: 'Hello! How can I help you learn about the website today? Feel free to ask any questions.' });
      send('done', { sources: [] });
      return res.end();
    }

    const { hits, grounded } = await retrieve(question);

    // GROUNDING: refuse before spending an LLM call if nothing is relevant.
    if (!grounded) {
      send('token', { text: 'I couldn\'t find that on this site. Please ask questions related to the company site.' });
      send('done', { sources: [] });
      return res.end();
    }

    const sources = dedupeSources(hits);
    send('sources', { sources });

    const prompt = buildPrompt(question, hits, sources);
    for await (const token of generateAnswerStream(prompt)) {
      send('token', { text: token });
    }

    send('done', { sources });
    res.end();
  } catch (err) {
    console.error('[Chat Route Error]:', err);
    let errorMessage = (err as Error).message ?? 'Unknown error';

    if (
      errorMessage.includes('401') ||
      errorMessage.includes('expired_api_key') ||
      errorMessage.includes('Invalid API Key') ||
      errorMessage.includes('unregistered callers') ||
      errorMessage.includes('403')
    ) {
      errorMessage = 'The AI model API key (GROQ_API_KEY or GOOGLE_API_KEY) is invalid or expired. Please update the API key in your production environment variables.';
    } else if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
      errorMessage = 'The AI model\'s usage quota has been exceeded for this API key. Please try again later or update the API key.';
    } else if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
      errorMessage = 'The AI model is currently experiencing high demand (Service Unavailable). Please wait a moment and try again.';
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorMessage = 'The specified AI model or resource was not found. Please check your model configuration.';
    } else if (errorMessage.startsWith('{') || errorMessage.includes('"error"')) {
      errorMessage = 'An unexpected API error occurred while contacting the AI model. Please check server logs for details.';
    }

    send('error', { message: errorMessage });
    res.end();
  }
});

const dedupeSources = (hits: { url: string; title: string; score: number }[]): Source[] => {
  const best = new Map<string, Source>();
  for (const h of hits) {
    const cur = best.get(h.url);
    if (!cur || h.score > cur.score) best.set(h.url, { url: h.url, title: h.title, score: h.score });
  }
  return [...best.values()];
};
