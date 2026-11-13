/**
 * The service worker (2026-11-13: load faster on later visits). The build (scripts/service-worker-build.ts) makes it
 * `sw.js` beside index.html, with the versions of its caches and the page's entry script; src/app/service-worker.ts
 * registers it in production builds. Its scope is index.html's folder (the GitHub Pages sub-path).
 *
 * - The page and the other unhashed files of the site: the network first (a new version shows at once), the last copy
 *   when offline. Built files named after their content and served pictures and sounds: the cache first (cache-rules.ts).
 * - It caches nothing until asked for: no download ahead of play. A page of the first visit sends what it has already
 *   loaded, which the worker copies from the browser's HTTP cache.
 * - A new version waits until a page of that version starts (it asks, with its entry script): never in the middle of
 *   play. Its start removes the caches of older versions.
 * - Saves, settings and English notes are in localStorage: no request holds them, and nothing here touches them.
 */
import { cacheKey, cacheNames, cacheRule, staleCache, type CacheRule } from "./cache-rules";

declare const __SW_CODE_VERSION__: string;
declare const __SW_MEDIA_VERSION__: string;
declare const __SW_ENTRY__: string;

// The worker's own events (the TypeScript DOM library has no service worker types).
type ExtendableEvent = Event & { waitUntil(promise: Promise<unknown>): void };
type FetchEvent = ExtendableEvent & { request: Request; respondWith(response: Promise<Response>): void };
type ExtendableMessageEvent = ExtendableEvent & { data: unknown };
type WorkerScope = {
  registration: { scope: string };
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: "activate", listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
  addEventListener(type: "message", listener: (event: ExtendableMessageEvent) => void): void;
};

const worker = self as unknown as WorkerScope;
const scope = worker.registration.scope;
const names = cacheNames({ code: __SW_CODE_VERSION__, media: __SW_MEDIA_VERSION__ });

worker.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const current = Object.values(names);
    for (const name of await caches.keys()) if (staleCache(name, current)) await caches.delete(name);
    // The first worker serves the page that registered it at once (a later one takes over when a page asks it to).
    await worker.clients.claim();
  })());
});

worker.addEventListener("message", (event) => {
  const data = event.data as { type?: unknown; entry?: unknown; urls?: unknown } | null;
  // A page of this version has started (its entry script is this version's): take over from the older worker.
  if (data?.type === "activate" && data.entry === new URL(__SW_ENTRY__, scope).href) event.waitUntil(worker.skipWaiting());
  // What the first page loaded before this worker served it.
  if (data?.type === "keep" && Array.isArray(data.urls))
    event.waitUntil(Promise.all(data.urls.filter((url): url is string => typeof url === "string").map(keep)));
});

worker.addEventListener("fetch", (event) => {
  const request = event.request;
  const rule = cacheRule({ url: request.url, method: request.method, mode: request.mode, range: request.headers.has("range") }, scope);
  if (rule === "pass") return;
  const key = cacheKey({ url: request.url, method: request.method, mode: request.mode }, scope);
  event.respondWith(rule === "network-first" ? networkFirst(event, request, key) : cacheFirst(event, request, key, rule));
});

/** Only a whole, successful answer of this site is kept (not an error, a redirect or a part of a file). */
const keepable = (response: Response) => response.status === 200 && response.type === "basic";

async function networkFirst(event: FetchEvent, request: Request, key: string): Promise<Response> {
  try {
    const response = await fetch(request);
    if (keepable(response)) {
      const copy = response.clone();
      event.waitUntil(caches.open(names["network-first"]).then((cache) => cache.put(key, copy)).catch(() => undefined));
    }
    return response;
  } catch (error) {
    const kept = await caches.match(key, { cacheName: names["network-first"], ignoreVary: true });
    if (kept) return kept;
    throw error;
  }
}

async function cacheFirst(event: FetchEvent, request: Request, key: string, rule: Exclude<CacheRule, "pass" | "network-first">): Promise<Response> {
  const cache = await caches.open(names[rule]);
  const kept = await cache.match(key, { ignoreVary: true });
  if (kept) return kept;
  const response = await fetch(request);
  if (keepable(response)) {
    const copy = response.clone();
    event.waitUntil(cache.put(key, copy).catch(() => undefined));
  }
  return response;
}

/** Keep a file the first page loaded (from the browser's HTTP cache, which has it), if its rule keeps it and it is not kept yet. */
async function keep(url: string): Promise<void> {
  const rule = cacheRule({ url, method: "GET" }, scope);
  if (rule !== "code" && rule !== "media") return;
  const key = cacheKey({ url, method: "GET" }, scope);
  const cache = await caches.open(names[rule]);
  if (await cache.match(key, { ignoreVary: true })) return;
  try {
    const response = await fetch(url);
    if (keepable(response)) await cache.put(key, response);
  } catch {
    // Offline or gone: the next visit fetches it.
  }
}
