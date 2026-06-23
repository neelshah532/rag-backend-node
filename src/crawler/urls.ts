const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$|ref_)/i;

export function normalizeUrl(raw: string, base?: string): string | undefined {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    const keep = [...u.searchParams].filter(([k]) => !TRACKING.test(k));
    keep.sort(([a], [b]) => a.localeCompare(b));
    u.search = keep.length ? '?' + keep.map(([k, v]) => `${k}=${v}`).join('&') : '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return undefined;
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
