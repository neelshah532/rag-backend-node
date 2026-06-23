import type { Chunk } from "../types.js";

class VectorStore {
  private chunks: Chunk[] = [];
  siteUrl = "";

  reset(siteUrl: string) {
    this.chunks = [];
    this.siteUrl = siteUrl;
  }

  add(items: Chunk[]) {
    this.chunks.push(...items);
  }

  get size() {
    return this.chunks.length;
  }

  /** Cosine similarity == dot product because vectors are pre-normalized. */
  search(queryVec: number[], k: number): (Chunk & { score: number })[] {
    return this.chunks
      .map((c) => ({ ...c, score: dot(queryVec, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Module singleton — one store for the running process.
export const store = new VectorStore();
