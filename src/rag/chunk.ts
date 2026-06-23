import { config } from "../config.js";
import type { PageDoc } from "../types.js";

export interface RawChunk {
  url: string;
  title: string;
  text: string;
}

export function chunkPage(doc: PageDoc): RawChunk[] {
  const words = doc.text.split(/\s+/).filter(Boolean);
  const size = config.chunkWords;
  const step = Math.max(1, size - config.chunkOverlapWords);
  const chunks: RawChunk[] = [];

  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + size);
    if (slice.length < 20 && chunks.length > 0) break; // drop tiny trailing scrap
    chunks.push({ url: doc.url, title: doc.title, text: slice.join(" ") });
    if (i + size >= words.length) break;
  }
  return chunks;
}
