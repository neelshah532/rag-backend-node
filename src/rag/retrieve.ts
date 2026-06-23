import { config } from '../config.js';
import { embedOne } from './embeddings.js';
import { store } from './store.js';

export async function retrieve(query: string) {
  if (store.size === 0) return { hits: [], grounded: false };

  const qv = await embedOne(query);
  const hits = await store.search(qv, config.topK);
  const grounded = hits.length > 0 && hits[0].score >= config.minScore;
  return { hits, grounded };
}
