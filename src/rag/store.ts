import { ChromaClient, CloudClient } from 'chromadb';
import { config } from '../config.js';
import type { Chunk } from '../types.js';

// Instantiates CloudClient if apiKey is present in environment, else defaults to ChromaClient
const client: any = config.chromaApiKey
  ? new CloudClient({
      apiKey: config.chromaApiKey,
      tenant: config.chromaTenant,
      database: config.chromaDatabase
    })
  : new ChromaClient({
      path: config.chromaUrl,
      auth: config.chromaToken ? {
        provider: 'token',
        credentials: config.chromaToken,
        tokenHeaderType: 'AUTHORIZATION'
      } : undefined
    });

function sanitizeCollectionName(url: string): string {
  // Lowercase, replace non-alphanumeric with dashes, limit to 63 chars, and sanitize start/end characters.
  let name = url
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 63);

  while (name.length > 0 && !/^[a-z0-9]$/.test(name[0])) {
    name = name.slice(1);
  }
  while (name.length > 0 && !/^[a-z0-9]$/.test(name[name.length - 1])) {
    name = name.slice(0, -1);
  }

  return name.length >= 3 ? name : 'site-weaver-default';
}

class ChromaStore {
  private collectionName = '';
  private cachedSize = 0;
  siteUrl = '';

  async reset(siteUrl: string) {
    this.siteUrl = siteUrl;
    this.collectionName = sanitizeCollectionName(siteUrl);
    this.cachedSize = 0;

    try {
      await client.deleteCollection({ name: this.collectionName });
    } catch (e) {
      // Ignored if collection didn't exist
    }

    await client.createCollection({
      name: this.collectionName,
      metadata: { 'hnsw:space': 'cosine' }
    });
  }

  async add(items: Chunk[]) {
    if (items.length === 0) return;
    const collection = await client.getCollection({ name: this.collectionName } as any);

    const ids = items.map((item) => item.id);
    const embeddings = items.map((item) => item.embedding);
    const documents = items.map((item) => item.text);
    const metadatas = items.map((item) => ({
      url: item.url,
      title: item.title,
    }));

    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas,
    });

    this.cachedSize += items.length;
  }

  get size() {
    return this.cachedSize;
  }

  async search(queryVec: number[], k: number): Promise<(Chunk & { score: number })[]> {
    if (!this.collectionName) return [];

    const collection = await client.getCollection({ name: this.collectionName } as any);
    const space = collection.metadata?.['hnsw:space'] ?? 'l2';
    const results = await collection.query({
      queryEmbeddings: [queryVec],
      nResults: k,
    });

    if (!results.ids || results.ids.length === 0 || !results.ids[0]) return [];

    const hits: (Chunk & { score: number })[] = [];
    const ids = results.ids[0];
    const documents = results.documents?.[0] ?? [];
    const metadatas = results.metadatas?.[0] ?? [];
    const distances = results.distances?.[0] ?? [];

    for (let i = 0; i < ids.length; i++) {
      const meta = metadatas[i] as any;
      const distance = distances[i] ?? 0;
      const score = space === 'cosine' ? (1 - distance) : (1 - distance / 2);

      hits.push({
        id: ids[i],
        text: documents[i] ?? '',
        url: meta?.url ?? '',
        title: meta?.title ?? '',
        embedding: [],
        score,
      });
    }

    return hits;
  }
}

export const store = new ChromaStore();
