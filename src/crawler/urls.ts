export function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = ""; // "/page#section" and "/page" are the same document
    return u.toString();
  } catch {
    return null;
  }
}

export function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}

// Don't try to crawl binary / asset URLs
const ASSET = /\.(pdf|jpe?g|png|gif|svg|webp|css|js|json|xml|zip|mp4|mp3|woff2?|ico)(\?|$)/i;
export function looksLikeAsset(url: string): boolean {
  return ASSET.test(url);
}
