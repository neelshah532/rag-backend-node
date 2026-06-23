# Chat with a Website — Backend

Express (Node 20, TypeScript) backend that implements the full RAG pipeline:
**crawl → clean → chunk → embed → retrieve → ground → generate**

## Quick Start

```bash
cp .env.example .env          # paste your free Gemini key into GEMINI_API_KEY
npm install
npm run dev                   # http://localhost:8787
```

> First index is slower because the embedding model downloads + caches (~25 MB). Subsequent runs are fast.

## Required

- **Node 20+**
- **Gemini API Key** — free key from [Google AI Studio](https://aistudio.google.com/) (no credit card)

## Architecture

- **Crawler:** BFS within the start URL's host only. Respects `robots.txt`, caps at `MAX_PAGES` / `MAX_DEPTH`, fetches at most `CRAWL_CONCURRENCY` at a time with a `POLITENESS_DELAY_MS` pause before each request, and a descriptive `User-Agent`. Boilerplate (nav/header/footer/aside/cookie banners) is stripped with cheerio before indexing.
- **Chunking:** Word-based sliding window (~220 words, ~40 overlap) per page.
- **Embeddings:** MiniLM via `@huggingface/transformers`, run locally (free, no quota).
- **Store:** In-memory cosine search — the dataset is one small site (≤ a few thousand chunks), so a flat scan is sub-millisecond. Swappable: pgvector/Qdrant would implement the same `add()`/`search()` interface.
- **Generation:** Gemini 2.5 Flash (free tier), isolated in one swappable module.

## How Answers Stay Grounded

1. **Retrieval threshold:** if the best chunk scores below `MIN_SCORE`, we answer "I couldn't find that on this site" without calling the LLM.
2. **Prompt instruction:** the model is told to use ONLY the provided context and to return the refusal string when the answer isn't present.
3. **Source citations:** every answer ships the source URLs it drew from.

## API Contract

| Method | Path | Body / Response |
|--------|------|-----------------|
| POST | `/api/index` | `{ url }` → `{ ok: true }` |
| GET | `/api/index/status` | → `{ status, siteUrl, pagesCrawled, chunksIndexed, message, error? }` |
| POST | `/api/chat` | `{ question }` → **SSE** events: `sources`, `token`, `done`, `error` |

## Environment Variables

See `.env.example` for the full list with defaults.

## Known Limitations

- JavaScript-rendered (SPA) pages return little text (fetch sees initial HTML only).
- In-memory store doesn't persist across restarts and is single-process.
- Retrieval is weaker on very long pages — the relevant passage gets diluted across many similar chunks.
- Boilerplate stripping is heuristic; some templated text still leaks in.

## What I'd Improve

- Playwright for JS pages, behind the same crawl interface.
- Hybrid retrieval (BM25 + vectors) and a small reranker for long pages.
- Per-section (heading-aware) chunking instead of a flat word window.
- Persist the index (pgvector) so multiple sites/users are supported.
