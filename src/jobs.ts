import { crawlSite } from "./crawler/crawl.js";
import { chunkPage } from "./rag/chunk.js";
import { embed } from "./rag/embeddings.js";
import { store } from "./rag/store.js";

type Status = "idle" | "crawling" | "indexing" | "ready" | "error";

export interface JobState {
  status: Status;
  siteUrl: string;
  pagesCrawled: number;
  chunksIndexed: number;
  message: string;
  error?: string;
}

export function blank(): JobState {
  return { status: "idle", siteUrl: "", pagesCrawled: 0, chunksIndexed: 0, message: "" };
}

let job: JobState = blank();

export async function runIndexing(siteUrl: string, onProgress: (s: JobState) => void = () => {}): Promise<void> {
  job = { ...blank(), status: "crawling", siteUrl, message: "Starting crawl…" };
  store.reset(siteUrl);
  const emit = () => onProgress(job);
  emit();

  const docs = await crawlSite(siteUrl, {
    onPage: (_d, s) => { job.pagesCrawled = s.fetched; job.message = `Crawled ${s.fetched} pages…`; emit(); },
    onProgress: (m) => { job.message = m; emit(); },
  });

  job.status = "indexing"; job.message = `Embedding ${docs.length} pages…`; emit();
  const raw = docs.flatMap(chunkPage);
  const BATCH = 32; let id = 0;
  for (let i = 0; i < raw.length; i += BATCH) {
    const batch = raw.slice(i, i + BATCH);
    const vectors = await embed(batch.map((c) => c.text));
    store.add(batch.map((c, j) => ({ id: `c${id++}`, ...c, embedding: vectors[j] })));
    job.chunksIndexed = store.size; emit();
  }
  job.status = "ready"; job.message = `Indexed ${store.size} chunks from ${docs.length} pages.`; emit();
}
