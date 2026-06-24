# Chat with a Website — Backend

Express (Node 20, TypeScript) backend that implements the full RAG pipeline:
**crawl → clean → chunk → embed → retrieve → ground → generate**

## Quick Start

```bash
# Setup environment variables
cp .env.example .env

# Install dependencies
npm install

# Run backend development server (http://localhost:8787)
npm run dev
```

> **First index run is slower** because the local embedding model (`Xenova/all-MiniLM-L6-v2`) downloads and caches (~120 MB). Subsequent runs are instant.

## Prerequisites

- **Node 20+**
- **Groq API Key** — For generating grounded answers using the `llama-3.1-8b-instant` model.
- **ChromaDB Instance** — Supports either local connections (`CHROMA_URL`, `CHROMA_TOKEN`) or Chroma Cloud configurations (`CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`).

---

## Technical Stack & Architecture

- **Crawler**: BFS crawler restricted to the start URL's host. Respects `robots.txt` rules, enforces a polite `500ms` crawl delay, concurrency limit, and handles timeout/size caps. Unnecessary HTML tags (`<nav>`, `<header>`, `<footer>`, `<aside>`, `<script>`, `<style>`, forms, and cookie banners) are aggressively stripped using Cheerio.
- **Chunking**: Word-based sliding window (~80 words, ~20 overlap) per page. Pre-tokenized size was verified to ensure no chunk exceeds the embedding model's 256-token limit.
- **Title Context Enrichment**: Each chunk is prefixed with `[Title: pageTitle]` to preserve semantic context and ensure query terms (like the brand name) align with vector similarity searches.
- **Embeddings**: Locally run `all-MiniLM-L6-v2` transformer pipeline (via `@huggingface/transformers`), providing fast, free, and quote-free vector generation.
- **Vector Store**: Connected to ChromaDB. Supports dynamic metadata space configuration (`hnsw:space = cosine`).
- **Retrieval & Grounding**:
  - Automatically identifies whether the Chroma collection space is L2 or Cosine, dynamically mapping distance to Cosine Similarity.
  - Intercepts simple conversational greetings (e.g., "hi", "hello") to respond immediately with a polite welcome message without calling the LLM or query store.
  - Queries with a similarity score below `MIN_SCORE` (empirically calibrated to `0.10` / `0.40` depending on the metric) trigger an immediate grounding refusal: *"I couldn't find that on this site. Please ask questions related to the company site."*
- **Generation**: Powered by the Groq SDK, streaming answers back in Server-Sent Events (SSE).

---

## API Documentation

| Method | Path | Payload / Response |
|--------|------|--------------------|
| **POST** | `/api/index` | `{ url: string }` → Starts crawling + indexing. |
| **GET** | `/api/index/status` | Returns the current indexing metrics (`pagesCrawled`, `chunksIndexed`, `status`, `message`). |
| **POST** | `/api/chat` | `{ question: string }` → **SSE** response stream emitting `sources`, `token`, `done`, or `error` events. |

---

## Truthful Status: What Works and Limitations

### What Works
- **Dual-Mode ChromaDB Store**: Works flawlessly with both local Chroma Docker containers and authenticated Chroma Cloud database instances.
- **Calibrated Grounding Checks**: Refusal triggers perfectly block out-of-domain prompts before spending LLM tokens.
- **Greeting Interceptor**: Provides high responsiveness for standard user hellos without indexing database errors.
- **Dynamic Distance Calibration**: Automatically corrects L2 distance output to semantic similarity, preventing false-refusals on valid database chunks.

### What Doesn't Work & Limitations
- **Dynamic JS Crawling**: The crawler is completely blind to pages built with single-page application (SPA) frameworks like React, Angular, or Vue since it uses basic HTML fetches.
- **No Hierarchical Relationship**: The chunking splits pages strictly by word counts, completely ignoring visual headers (`<h2>`, `<h3>`), lists (`<li>`), or tables. This breaks cohesive descriptions.
- **Retrieval is Weak on Long Pages**: On long pages, semantic search gets overloaded. If a page covers 20 different topics, a sliding window chunk of 80 words lacks the global context of the page, leading to partial matches that miss the core topic context.

---

## How I'd Improve Retrieval on Long Pages

If I were extending this codebase for production, I would fix the long-page retrieval weakness using the following architectural upgrades:

1. **Hierarchical (Parent-Child) Chunking**:
   - Instead of standard sliding windows, I would parse pages by their HTML/Markdown structure (headings).
   - I'd store and embed small chunks (e.g., 50-word paragraphs) for highly accurate semantic retrieval matching.
   - However, when a match is found, the system would retrieve the **Parent Chunk** (the entire section under that heading, e.g., 500 words) and feed that to the LLM. This gives the model the global context of the topic without sacrificing search precision.
2. **Hybrid Search (Dense + Sparse)**:
   - Combine dense vector retrieval (MiniLM embeddings) with sparse keyword matching (BM25 / Meilisearch).
   - This ensures exact technical terms, product names, and unique model names match precisely, even if the semantic vector similarity score is low.
3. **Re-ranking (Cross-Encoder)**:
   - Use a lightweight re-ranker model (e.g., `cohere-rerank` or a local cross-encoder) on the top 20 retrieved chunks to determine the top 5 most relevant blocks before constructing the LLM prompt.
