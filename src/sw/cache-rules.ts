/**
 * How the service worker (service-worker.ts) answers a request for the game's own files, so that later visits read
 * them from the browser instead of the network (2026-11-13). Pure: the unit test checks it, and the build
 * (scripts/service-worker-build.ts) sorts the built files with the same rule to version the caches.
 */
export type CacheRule =
  /** Left to the browser as if there were no worker: another site, not a GET, a range (video, streamed audio), a movie. */
  | "pass"
  /** The page (index.html, any query), the manifest, the licence list, the icons: the network first, so a new version shows; the last copy when offline. */
  | "network-first"
  /** A built file named after its content (`assets/<name>-<hash>.<ext>`, Vite's output): it never changes, so the cache first. */
  | "code"
  /** A served picture, sound or font (`assets/…`): the cache first, until a build changes any of them (the media cache's version). */
  | "media";

/** Vite's output: `assets/<name>-<hash>.<ext>` directly in assets/ (the served files of public/ are in its subfolders). */
const BUILT_FILE = /^assets\/[^/]+-[\w-]{8,}\.[a-z0-9]+$/u;
const MEDIA_FILE = /^assets\/.+\.(?:webp|png|jpe?g|gif|svg|avif|mp3|m4a|ogg|wav|woff2?)$/iu;
const MOVIE_FILE = /\.(?:mp4|webm|mov)$/iu;

/** The rule of a file of the site, by its path under the worker's scope (`assets/x.webp`, `index.html`, `""` for the page). */
export function fileRule(path: string): CacheRule {
  if (path === "" || path === "index.html") return "network-first";
  if (MOVIE_FILE.test(path)) return "pass";
  if (BUILT_FILE.test(path)) return "code";
  if (MEDIA_FILE.test(path)) return "media";
  return "network-first";
}

/** What the worker needs to know of a request. */
export type RequestFacts = { url: string; method: string; mode?: string; range?: boolean };

/**
 * The rule of a request under `scope` (the worker's scope: the folder of index.html, e.g. `https://host/dreamscape/`).
 * Saves never come here: the game keeps them in localStorage.
 */
export function cacheRule(request: RequestFacts, scope: string): CacheRule {
  if (request.method !== "GET" || request.range) return "pass";
  const url = new URL(request.url);
  const base = new URL(scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return "pass";
  if (request.mode === "navigate") return "network-first";
  return fileRule(decodeURIComponent(url.pathname.slice(base.pathname.length)));
}

/**
 * The cache key of a request kept by its rule: a page is kept once under the scope (every query opens the same
 * index.html), any other file under its own address without its query.
 */
export function cacheKey(request: RequestFacts, scope: string): string {
  if (request.mode === "navigate") return new URL(scope).href;
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
}

/** The caches of a version of the game's files: the pages', the built files' and the media's (each version a hash). */
export function cacheNames(versions: { code: string; media: string }): Record<Exclude<CacheRule, "pass">, string> {
  return { "network-first": "dreamscape-pages", code: `dreamscape-code-${versions.code}`, media: `dreamscape-media-${versions.media}` };
}

/** Whether a cache is the worker's own but not one of `current` (an older version's, removed when a new worker starts). */
export function staleCache(name: string, current: readonly string[]): boolean {
  return name.startsWith("dreamscape-") && !current.includes(name);
}
