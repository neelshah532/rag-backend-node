import { config } from '../config.js';
import { loadRobots } from './robots.js';
import { extractPage } from './extract.js';
import { normalizeUrl, sameHost, looksLikeAsset } from './urls.js';
import type { PageDoc } from '../types.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CrawlEvents {
  onPage?: (doc: PageDoc, stats: { fetched: number; queued: number }) => void;
  onProgress?: (msg: string) => void;
}

export async function crawlSite(startUrl: string, events: CrawlEvents = {}): Promise<PageDoc[]> {
  const rawStart = normalizeUrl(startUrl);
  if (!rawStart) throw new Error('Invalid start URL');
  const start: string = rawStart;

  const robots = await loadRobots(start);
  const visited = new Set<string>([start]);
  const docs: PageDoc[] = [];
  const queue: { url: string; depth: number }[] = [{ url: start, depth: 0 }];
  let active = 0;

  let nextSlot = 0;
  async function politeGate() {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + config.politenessDelayMs;
    if (wait) await sleep(wait);
  }

  async function processOne(item: { url: string; depth: number }) {
    if (!robots.isAllowed(item.url, config.userAgent)) {
      events.onProgress?.(`robots.txt disallows ${item.url}`);
      return;
    }
    await politeGate();

    const res = await fetch(item.url, {
      headers: { 'user-agent': config.userAgent, accept: 'text/html' },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
    const ctype = res.headers.get('content-type') ?? '';
    if (!res.ok || !ctype.includes('text/html')) return;

    const html = await res.text();
    const { doc, links } = extractPage(item.url, html);
    if (doc.text.length > 200 && docs.length < config.maxPages) {
      docs.push(doc);
      events.onPage?.(doc, { fetched: docs.length, queued: queue.length });
    }

    if (item.depth < config.maxDepth && docs.length < config.maxPages) {
      let added = 0;
      for (const raw of links) {
        if (added >= config.maxLinksPerPage) break;
        const nextUrl = normalizeUrl(raw, item.url);
        if (!nextUrl) continue;
        const next = nextUrl as string;
        if (visited.has(next)) continue;
        if (!sameHost(next, start)) continue;
        if (looksLikeAsset(next)) continue;
        visited.add(next);
        queue.push({ url: next, depth: item.depth + 1 });
        added++;
      }
    }
  }

  async function worker() {
    for (;;) {
      if (docs.length >= config.maxPages) return;
      const item = queue.shift();
      if (!item) {
        if (active === 0) return;
        await sleep(25);
        continue;
      }
      active++;
      try { await processOne(item); }
      catch (err) { events.onProgress?.(`failed ${item.url}: ${(err as Error).message}`); }
      finally { active--; }
    }
  }

  await Promise.all(Array.from({ length: config.crawlConcurrency }, () => worker()));
  return docs.slice(0, config.maxPages);
}
