import { crawlSite } from "./crawler/crawl.js";
import { chunkPage } from "./rag/chunk.js";
import { embed } from "./rag/embeddings.js";
import { store } from "./rag/store.js";
import type { Chunk } from "./types.js";

type Status = "idle" | "crawling" | "indexing" | "ready" | "error";

interface JobState {
  status: Status;
  siteUrl: string;
  pagesCrawled: number;
  chunksIndexed: number;
  message: string;
  error?: string;
}

function blank(): JobState {
  return { status: "idle", siteUrl: "", pagesCrawled: 0, chunksIndexed: 0, message: "" };
}

let job: JobState = blank();
export function getJob(): JobState {
  return job;
}

export async function startIndexing(siteUrl: string): Promise<void> {
  job = { ...blank(), status: "crawling", siteUrl, message: "Starting crawl…" };
  store.reset(siteUrl);

  try {
    const docs = await crawlSite(siteUrl, {
      onPage: (_doc, stats) => {
        job.pagesCrawled = stats.fetched;
        job.message = `Crawled ${stats.fetched} pages…`;
      },
      onProgress: (msg) => {
        job.message = msg;
      },
    });

    job.status = "indexing";
    job.message = `Chunking & embedding ${docs.length} pages…`;

    const raw = docs.flatMap(chunkPage);

    // Embed in batches to keep memory + latency reasonable.
    const BATCH = 32;
    let id = 0;
    for (let i = 0; i < raw.length; i += BATCH) {
      const batch = raw.slice(i, i + BATCH);
      const vectors = await embed(batch.map((c) => c.text));
      const chunks: Chunk[] = batch.map((c, j) => ({
        id: `c${id++}`,
        url: c.url,
        title: c.title,
        text: c.text,
        embedding: vectors[j],
      }));
      store.add(chunks);
      job.chunksIndexed = store.size;
    }

    job.status = "ready";
    job.message = `Indexed ${store.size} chunks from ${docs.length} pages.`;
  } catch (err) {
    job.status = "error";
    job.error = (err as Error).message;
    job.message = "Indexing failed.";
  }
}
