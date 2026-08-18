import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-004';

function getModel() {
  const apiKey = config.googleApiKey || process.env.GOOGLE_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
}

const MAX_RETRIES = 5;

/** Sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry wrapper that handles 429 rate-limit errors with exponential backoff. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message ?? '';
      const is429 = msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');

      if (!is429 || attempt === MAX_RETRIES - 1) throw err;

      // Try to parse the retry delay from the error, otherwise use exponential backoff
      const retryMatch = msg.match(/retry in ([\d.]+)s/i);
      const waitSec = retryMatch ? parseFloat(retryMatch[1]) + 1 : Math.pow(2, attempt + 1) * 5;
      console.log(`[embed] Rate limited. Retrying in ${waitSec.toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})…`);
      await sleep(waitSec * 1000);
    }
  }
  throw new Error('Unreachable');
}

/** Embed a batch of texts → array of normalized vectors. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  return withRetry(async () => {
    const batchResult = await getModel().batchEmbedContents({
      requests: texts.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
      })),
    });
    return batchResult.embeddings.map((e) => e.values);
  });
}

export async function embedOne(text: string): Promise<number[]> {
  return withRetry(async () => {
    const result = await getModel().embedContent(text);
    return result.embedding.values;
  });
}
