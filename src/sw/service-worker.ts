/**
 * The service worker (2026-11-13: load faster on later visits). The build (scripts/service-worker-build.ts) makes it
 * `sw.js` beside index.html, with the versions of its caches and the page's entry script; src/app/service-worker.ts
 * registers it in production builds. Its scope is index.html's folder (the GitHub Pages sub-path).
 *
 * - The page and the other unhashed files of the site: the network first (a new version shows at once), the last copy
 *   when offline. Built files named after their content and served pictures and sounds: the cache first (cache-rules.ts).
 * - It caches nothing until asked for: nothing is downloaded ahead of play unless the player chooses 「オフラインで遊ぶ」
 *   (2026-11-17). Then that journey's files are kept apart (the cache `dreamscape.offline`, which the page fills and
 *   this worker only reads: src/offline/state.ts) and answered first, whole or in the asked part, and the kept build
 *   is the one that opens, online too (offline-rules.ts). A device that keeps nothing is answered as before.
 * - A page of the first visit sends what it has already loaded, which the worker copies from the browser's HTTP cache.
 * - A new version waits until a page of that version starts (it asks, with its entry script): never in the middle of
 *   play. Its start removes the caches of older versions (never what 「オフラインで遊ぶ」 keeps).
 * - Saves, settings and English notes are in localStorage: no request holds them, and nothing here touches them.
 */
import { cacheKey, cacheNames, cacheRule, staleCache, type CacheRule, type RequestFacts } from "./cache-rules";
import { keptOf, offlineRoute, parseRange, rangeHeaders, storeTarget, unsatisfiableHeaders, wholeHeaders, type Kept, type Known } from "./offline-rules";
import { PAGE_FILE, readOfflineList, type OfflineList } from "../offline/list";
import { fileType, listKey, OFFLINE_CACHE, readOfflineState, stateKey } from "../offline/state";

declare const __SW_CODE_VERSION__: string;
declare const __SW_MEDIA_VERSION__: string;
declare const __SW_ENTRY__: string;

// The worker's own events (the TypeScript DOM library has no service worker types).
type ExtendableEvent = Event & { waitUntil(promise: Promise<unknown>): void };
type FetchEvent = ExtendableEvent & { request: Request; respondWith(response: Promise<Response>): void };
type ExtendableMessageEvent = ExtendableEvent & { data: unknown; ports?: readonly { postMessage(message: unknown): void }[] };
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
    // What this worker read of the store when it was installed may be old by now (it waited while the page loaded a
    // newer build's files and switched to it): it reads anew before it answers its first request.
    await loadKept();
    // The first worker serves the page that registered it at once (a later one takes over when a page asks it to).
    await worker.clients.claim();
  })());
});

// What 「オフラインで遊ぶ」 keeps on this device. The worker never writes or removes it, and never opens its cache
// (opening would create one on a device that keeps nothing): it only asks whether it is there and matches in it.
const stored = (key: string) => caches.match(key, { cacheName: OFFLINE_CACHE, ignoreVary: true });
/** The lists of the kept builds, by build name (a build's list never changes; those no longer named are dropped). */
const lists = new Map<string, OfflineList>();
/** What is kept, as last read (decides at once how a request is answered), and the reading in flight (a starting page waits for it). */
let known: Known = "unknown";
let kept: Promise<Kept | null> = Promise.resolve(null);

async function readKept(): Promise<Kept | null> {
  if (!(await caches.has(OFFLINE_CACHE))) return null;
  // A state this version cannot read (or none): as if nothing were kept; only the page may remove it, when the player says so.
  const state = readOfflineState(await (await stored(stateKey(scope)))?.json());
  if (state === "unreadable") return null;
  const builds = [state.installed, state.target, state.previous].flatMap((build) => build ? [build.build] : []);
  for (const build of lists.keys()) if (!builds.includes(build)) lists.delete(build);
  for (const build of builds) {
    if (lists.has(build)) continue;
    const list = readOfflineList(await (await stored(listKey(scope, build)))?.json().catch(() => undefined));
    if (typeof list !== "string" && list.build === build) lists.set(build, list);
  }
  return keptOf(lists, state, scope);
}

/** Read the store anew; a store that cannot be read counts as nothing kept. */
function loadKept(): Promise<Kept | null> {
  const load = readKept().catch(() => null);
  kept = load;
  void load.then((value) => { if (kept === load) known = value; });
  return load;
}
// The worker has just started: read the store before the first answer that could come from it.
void loadKept();

worker.addEventListener("message", (event) => {
  const data = event.data as { type?: unknown; entry?: unknown; urls?: unknown } | null;
  // A page of this version has started (its entry script is this version's): take over from the older worker, and say
  // so on the port the page sent (the page then asks the browser again if the takeover stays pending:
  // src/app/worker-takeover.ts).
  if (data?.type === "activate" && data.entry === new URL(__SW_ENTRY__, scope).href) {
    event.ports?.[0]?.postMessage({ type: "activating" });
    event.waitUntil(worker.skipWaiting());
  }
  // What the first page loaded before this worker served it.
  if (data?.type === "keep" && Array.isArray(data.urls))
    event.waitUntil(Promise.all(data.urls.filter((url): url is string => typeof url === "string").map(keep)));
  // The page changed what 「オフラインで遊ぶ」 keeps (a journey complete, a new build, one removed): read it anew, and say
  // so on the port the page sent, if any (a worker of before 「オフラインで遊ぶ」 never answers: the page then knows that
  // the worker serving it does not open what is kept yet).
  if (data?.type === "offline-changed") event.waitUntil(loadKept().then(() => event.ports?.[0]?.postMessage({ type: "offline-read" })));
});

worker.addEventListener("fetch", (event) => {
  const request = event.request;
  const facts: RequestFacts = { url: request.url, method: request.method, mode: request.mode, range: request.headers.has("range") };
  // A starting page reads the store anew and waits for it: it opens what is kept now, whatever was read before.
  const page = storeTarget(facts, scope)?.kind === "page";
  if (page) void loadKept();
  const route = offlineRoute(facts, scope, page ? "unknown" : known);
  if (route === "pass") return;
  if (route === "today") {
    // Nothing kept answers this request: exactly as before 「オフラインで遊ぶ」.
    const rule = cacheRule(facts, scope);
    if (rule !== "pass") event.respondWith(today(event, request, rule));
    return;
  }
  const now = route === "store" ? Promise.resolve(known as Kept) : kept;
  event.respondWith(now.then((value) => answer(event, request, facts, value)));
});

/** Answer from what is kept when it holds the request's file, else as before 「オフラインで遊ぶ」 (what that rule leaves to the browser: the network). */
async function answer(event: FetchEvent, request: Request, facts: RequestFacts, now: Kept | null): Promise<Response> {
  const copy = now && offlineRoute(facts, scope, now) === "store" ? await keptAnswer(event, request, facts, now) : undefined;
  if (copy) return copy;
  const rule = cacheRule(facts, scope);
  return rule === "pass" ? fetch(request) : today(event, request, rule);
}

/** The kept copy that answers a request, if the store holds it. */
async function keptAnswer(event: FetchEvent, request: Request, facts: RequestFacts, now: Kept): Promise<Response | undefined> {
  const target = storeTarget(facts, scope);
  // The fonts are kept under their own addresses, as the browser asked for them.
  if (target?.kind === "font") return stored(request.url);
  if (target?.kind === "file") {
    for (const key of now.files.get(target.path) ?? []) {
      const copy = await stored(key);
      if (copy) return fileAnswer(copy, target.path, request.headers.get("range"));
    }
    return undefined;
  }
  const page = now.page;
  if (target?.kind !== "page" || !page) return undefined;
  // The installed page, only with its entry script: a store the browser emptied in part opens nothing.
  const installed = async () => {
    const copy = await stored(page.key);
    return copy && (await stored(page.entry)) ? fileAnswer(copy, PAGE_FILE, null) : undefined;
  };
  // Every start opens the installed build (no network on the way). Not pinned (the site has no list any more): the
  // network first, then the installed page, then the last copy of before.
  return page.pinned ? installed() : networkFirst(event, request, cacheKey(facts, scope), installed);
}

/**
 * A kept file as the answer to a request for its own address (not the stored one, which carries the hash): whole, or
 * the part a Range header asks for (a movie, streamed audio).
 */
async function fileAnswer(copy: Response, path: string, range: string | null): Promise<Response> {
  const type = copy.headers.get("Content-Type") ?? fileType(path);
  if (range === null) {
    const length = copy.headers.get("Content-Length");
    return new Response(copy.body, { status: 200, headers: wholeHeaders(type, length === null ? null : Number(length)) });
  }
  const blob = await copy.blob();
  const part = parseRange(range, blob.size);
  if (part === null) return new Response(blob, { status: 200, headers: wholeHeaders(type, blob.size) });
  if (part === "unsatisfiable") return new Response(null, { status: 416, headers: unsatisfiableHeaders(blob.size) });
  return new Response(blob.slice(part.start, part.end + 1), { status: 206, headers: rangeHeaders(part.start, part.end, blob.size, type) });
}

/** The answer of before 「オフラインで遊ぶ」, by the request's rule. */
function today(event: FetchEvent, request: Request, rule: Exclude<CacheRule, "pass">): Promise<Response> {
  const key = cacheKey({ url: request.url, method: request.method, mode: request.mode }, scope);
  return rule === "network-first" ? networkFirst(event, request, key) : cacheFirst(event, request, key, rule);
}

/** Only a whole, successful answer of this site is kept (not an error, a redirect or a part of a file). */
const keepable = (response: Response) => response.status === 200 && response.type === "basic";

/** The network first, then (offline) `fallback`'s answer if it has one, then the last copy. */
async function networkFirst(event: FetchEvent, request: Request, key: string, fallback?: () => Promise<Response | undefined>): Promise<Response> {
  try {
    const response = await fetch(request);
    if (keepable(response)) {
      const copy = response.clone();
      event.waitUntil(caches.open(names["network-first"]).then((cache) => cache.put(key, copy)).catch(() => undefined));
    }
    return response;
  } catch (error) {
    const last = (await fallback?.()) ?? await caches.match(key, { cacheName: names["network-first"], ignoreVary: true });
    if (last) return last;
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

/**
 * Keep a file the first page loaded (from the browser's HTTP cache, which has it), if its rule keeps it and it is not
 * kept yet (here, or by 「オフラインで遊ぶ」).
 */
async function keep(url: string): Promise<void> {
  const rule = cacheRule({ url, method: "GET" }, scope);
  if (rule !== "code" && rule !== "media") return;
  const target = storeTarget({ url, method: "GET" }, scope);
  if (target?.kind === "file" && (await kept)?.files.has(target.path)) return;
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
