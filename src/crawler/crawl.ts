import pLimit from "p-limit";
import { config } from "../config.js";
import { loadRobots } from "./robots.js";
import { extractContent, extractLinks } from "./extract.js";
import { normalizeUrl, sameHost, looksLikeAsset } from "./urls.js";
import type { PageDoc } from "../types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CrawlEvents {
  onPage?: (doc: PageDoc, stats: { fetched: number; queued: number }) => void;
  onProgress?: (msg: string) => void;
}

export async function crawlSite(startUrl: string, events: CrawlEvents = {}): Promise<PageDoc[]> {
  const start = normalizeUrl(startUrl);
  if (!start) throw new Error("Invalid start URL");

  const robots = await loadRobots(start);
  const limit = pLimit(config.crawlConcurrency);

  const visited = new Set<string>([start]);
  const docs: PageDoc[] = [];
  let frontier: { url: string; depth: number }[] = [{ url: start, depth: 0 }];

  while (frontier.length > 0 && docs.length < config.maxPages) {
    const level = frontier;
    frontier = [];

    await Promise.all(
      level.map((item) =>
        limit(async () => {
          if (docs.length >= config.maxPages) return;

          // POLITE: obey robots.txt
          if (!robots.isAllowed(item.url, config.userAgent)) {
            events.onProgress?.(`robots.txt disallows ${item.url}`);
            return;
          }

          // POLITE: rate-limit (per request, combined with low concurrency)
          await sleep(config.politenessDelayMs);

          try {
            const res = await fetch(item.url, {
              headers: { "user-agent": config.userAgent, accept: "text/html" },
              signal: AbortSignal.timeout(config.requestTimeoutMs),
            });
            const ctype = res.headers.get("content-type") ?? "";
            if (!res.ok || !ctype.includes("text/html")) return;

            const html = await res.text();
            const doc = extractContent(item.url, html);
            if (doc.text.length > 200) {
              docs.push(doc);
              events.onPage?.(doc, { fetched: docs.length, queued: frontier.length });
            }

            // Enqueue same-host children, respecting depth
            if (item.depth < config.maxDepth) {
              for (const raw of extractLinks(html)) {
                const next = normalizeUrl(raw, item.url);
                if (!next || visited.has(next)) continue;
                if (!sameHost(next, start)) continue;   // SCOPE
                if (looksLikeAsset(next)) continue;
                visited.add(next);
                frontier.push({ url: next, depth: item.depth + 1 });
              }
            }
          } catch (err) {
            events.onProgress?.(`failed ${item.url}: ${(err as Error).message}`);
          }
        })
      )
    );
  }

  return docs.slice(0, config.maxPages);
}
