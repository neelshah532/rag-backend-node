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

## Truthful Status & Known Limitations

**What Works (Post-Fixes):**
- **Safe Chunk Truncation:** Tested chunk sizes using the exact embedding tokenizer. Reduced chunks to 80 words (with 20 overlap) to comfortably fit the model's 256-token limit (max observed tokens: 210, ensuring no truncation).
- **Proper Citation Alignment:** The UI source anchors properly align with the chunks retrieved. Citations `[1]`, `[2]` perfectly correspond to the sorted UI links, handling shared URLs gracefully.
- **Calibrated Thresholds:** Integrated an `npm run eval` harness that tests retrieval. `MIN_SCORE` was empirically tuned to `0.40`, separating positive hits (0.54-0.67) from negative outliers (0.25-0.26) for strict LLM grounding.

**What Doesn't Work & Limitations:**
- **JS-Rendered (SPA) Pages:** The crawler relies completely on static `fetch` and cheerio; it is currently blind to content rendered by frameworks like React or Vue on the client side.
- **Ephemeral Store:** The index resets entirely if the Node server shuts down, forcing a re-index for each session.
- **Structural Blindness:** Word-window chunking ignores HTML semantic tags like `<p>`, `<h2>`, or `<li>`, which can unintentionally split complex sentences in half.
- **Specialized Jargon:** Dense embeddings (MiniLM) struggle with highly niche terms that weren't well represented in their training data.

**What I'd Improve:**
- Integrate `Playwright` to support JS-rendered page crawling.
- Add a Hybrid Search pipeline (combining vectors with BM25) to fix the rare-jargon retrieval flaws.
- Replace sliding windows with heading-aware Markdown chunking.
- Persist vectors in `pgvector` or `Qdrant`.
