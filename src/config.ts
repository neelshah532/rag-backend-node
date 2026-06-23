import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  genModel: process.env.GEN_MODEL ?? "llama-3.1-8b-instant",

  // crawl scope + politeness
  maxPages: Number(process.env.MAX_PAGES ?? 40),
  maxDepth: Number(process.env.MAX_DEPTH ?? 3),
  maxLinksPerPage: Number(process.env.MAX_LINKS_PER_PAGE ?? 25),
  crawlConcurrency: Number(process.env.CRAWL_CONCURRENCY ?? 2),
  politenessDelayMs: Number(process.env.POLITENESS_DELAY_MS ?? 500),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 15000),
  userAgent: process.env.USER_AGENT ?? "ChatWithSiteBot/1.0",

  // chunking
  chunkWords: Number(process.env.CHUNK_WORDS ?? 80),
  chunkOverlapWords: Number(process.env.CHUNK_OVERLAP_WORDS ?? 20),

  // retrieval / grounding
  topK: Number(process.env.TOP_K ?? 5),
  minScore: Number(process.env.MIN_SCORE ?? 0.10),
};
