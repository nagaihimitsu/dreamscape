/**
 * How the page fills, changes and empties the store of 「オフラインで遊ぶ」 (src/offline/state.ts; user request and
 * decisions 2026-11-17). Nothing here runs unless the player asked for a journey (or keeps one already): the page's
 * controller (offline-controller.ts) calls these under the Web Lock of the one tab that writes the store.
 *
 * - Every file is checked before it is kept: its size and the hash of its bytes are the list's.
 * - The installed build changes only at the switch: one write of the state, once every file of the target is there.
 *   A run that stops, fails or is cut off leaves the installed build as it was, and what it loaded stays for the next run.
 * - A state this version cannot read is never written over.
 *
 * No DOM and no browser global: every effect comes in through DownloadEnv, so the unit test runs it against fakes.
 */
import { fontFileUrls, isFontKey } from "./fonts";
import { listSha, OFFLINE_LIST_FILE, readOfflineList, type OfflineFile, type OfflineList } from "./list";
import { bytesOf, classifyList, garbageKeys, keptFiles, missingFiles, partialJourneys, referencedKeys, runFiles, type RunKind } from "./plan";
import {
  completeTarget, DOWNLOAD_PARAM, fileType, fileUrl, listKey, OFFLINE_CACHE, OFFLINE_LOCK, offlineKey, readOfflineState, removeJourney, repin, startTarget,
  stateKey, unpin, type OfflineState,
} from "./state";

/** The part of a Cache the store uses. */
export type StoreCache = {
  match(key: string, options?: { ignoreVary?: boolean }): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  delete(key: string): Promise<boolean>;
  keys(): Promise<readonly { url: string }[]>;
};
/** The part of Cache Storage the store uses. */
export type CacheStore = {
  has(name: string): Promise<boolean>;
  open(name: string): Promise<StoreCache>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
};
/** The effects of this module: the browser's in the page, fakes in the unit test. */
export type DownloadEnv = {
  caches: CacheStore;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  /** The SHA-256 of bytes, in hex. */
  digest(bytes: Uint8Array<ArrayBuffer>): Promise<string>;
  /** Whether the browser says it has a network. */
  online(): boolean;
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(timer: unknown): void;
};

/** A file is given up when no byte of it arrives for this long (then tried again). */
export const STALL_MS = 20_000;
/** The waits before a file that could not be fetched is tried again; after them the run stops as "offline". */
export const RETRY_WAITS_MS: readonly number[] = [2_000, 10_000];
/** How long the list may take to arrive. */
export const LIST_TIMEOUT_MS = 15_000;
/** How often a held run (the opening movie plays) looks whether it may go on. */
export const HELD_POLL_MS = 500;
/** The room the device must have beyond the files to load, before a run starts. */
export const SPACE_MARGIN_BYTES = 20_000_000;
/** How many times a run moves to a newer list the site put in place meanwhile. */
const MAX_ROUNDS = 3;

/**
 * Why a file could not be kept:
 * - "offline": no network, or the file could not be fetched after the retries;
 * - "replaced": the site no longer has these bytes under this name (404, or another size or hash): a newer build is there, or an old copy;
 * - "quota": the device has no room for it; "storage": it could not be written for another reason;
 * - "stopped": the run was stopped.
 */
export type FailureReason = "offline" | "replaced" | "quota" | "storage" | "stopped";

export class DownloadFailure extends Error {
  constructor(readonly reason: FailureReason, readonly path: string | null = null) {
    super(`offline: ${reason}${path === null ? "" : ` (${path})`}`);
  }
}

/** The reason of a failure, by where it happened: while fetching a file, or while writing it into the store. */
export function classifyFailure(error: unknown, at: "fetch" | "put"): FailureReason {
  if (error instanceof DownloadFailure) return error.reason;
  const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
  if (name === "AbortError") return "stopped";
  if (at === "put") return name === "QuotaExceededError" ? "quota" : "storage";
  return "offline";
}

const stopped = () => new DownloadFailure("stopped");

/** Wait `ms`; rejects as "stopped" when `signal` aborts first. */
function pause(env: DownloadEnv, ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(stopped());
    const onAbort = () => { env.clearTimeout(timer); reject(stopped()); };
    const timer = env.setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** An answer of the site itself: not a redirect, not another site's. */
const own = (response: Response) => !response.redirected && (response.type === "basic" || response.type === "default");

async function putFile(store: StoreCache, key: string, path: string, bytes: Uint8Array<ArrayBuffer>, type: string | null): Promise<void> {
  try {
    await store.put(key, new Response(bytes, { headers: { "Content-Type": type ?? fileType(path), "Content-Length": String(bytes.byteLength) } }));
  } catch (error) {
    throw new DownloadFailure(classifyFailure(error, "put"), path);
  }
}

/** Whether bytes are a listed file's: its size and the hash of its bytes. */
async function verified(env: DownloadEnv, bytes: Uint8Array<ArrayBuffer>, size: number, sha: string): Promise<boolean> {
  return bytes.byteLength === size && listSha(await env.digest(bytes)) === sha;
}

/** The service worker's own caches (`dreamscape-…`): what the device already holds of the game's files, under their plain addresses. */
export type WorkerCaches = readonly { name: string; cache: StoreCache }[];

export async function workerCaches(env: DownloadEnv): Promise<WorkerCaches> {
  const names = (await env.caches.keys()).filter((name) => name.startsWith("dreamscape-"));
  return Promise.all(names.map(async (name) => ({ name, cache: await env.caches.open(name) })));
}

/** The worker's caches of files that never change under their name or version: a copy moved into the store leaves them, so nothing is held twice. */
const VERSIONED_CACHE = /^dreamscape-(?:code|media)-/u;

/** Move a file the device already holds (the worker's caches) into the store, if its bytes are the listed ones. */
async function copyFromCaches(env: DownloadEnv, store: StoreCache, sources: WorkerCaches, scope: string, [path, size, sha]: OfflineFile): Promise<boolean> {
  const url = fileUrl(scope, path);
  for (const { name, cache } of sources) {
    const copy = await cache.match(url, { ignoreVary: true }).catch(() => undefined);
    if (!copy || copy.status !== 200) continue;
    const bytes = new Uint8Array(await copy.arrayBuffer());
    if (!(await verified(env, bytes, size, sha))) continue;
    await putFile(store, offlineKey(scope, path, sha), path, bytes, copy.headers.get("Content-Type"));
    if (VERSIONED_CACHE.test(name)) await cache.delete(url).catch(() => false);
    return true;
  }
  return false;
}

/** The body of an answer as `size` bytes; null when it is shorter or longer. `alive` is called as bytes arrive. */
async function readBody(response: Response, size: number, alive: () => void): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength === size ? bytes : null;
  }
  const bytes = new Uint8Array(size);
  const reader = response.body.getReader();
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return length === size ? bytes : null;
    alive();
    if (length + value.byteLength > size) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    bytes.set(value, length);
    length += value.byteLength;
  }
}

/** One try at a file over the network; null for an answer that is not the listed file. Throws what the network throws (a stall included). */
async function fetchOnce(env: DownloadEnv, url: string, size: number, signal: AbortSignal): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string | null } | null | "retry"> {
  const attempt = new AbortController();
  const onAbort = () => attempt.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  let timer = env.setTimeout(() => attempt.abort(), STALL_MS);
  const alive = () => { env.clearTimeout(timer); timer = env.setTimeout(() => attempt.abort(), STALL_MS); };
  try {
    // Always the network, and never a second copy in the browser's own cache; the worker leaves these requests alone.
    const response = await env.fetch(url, { cache: "no-store", priority: "low", signal: attempt.signal } as RequestInit);
    alive();
    if (response.status === 404 || (response.status === 200 && !own(response))) return null;
    // A server in trouble (5xx, too many requests): as a network that failed.
    if (response.status !== 200) return "retry";
    const bytes = await readBody(response, size, alive);
    return bytes && { bytes, type: response.headers.get("Content-Type") };
  } finally {
    env.clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

/**
 * Keep one listed file: from the worker's caches when the device already holds these bytes, else from the network
 * (under the address with its hash, which is also its key in the store). Its size and hash are checked before it is
 * written. Throws a DownloadFailure. `context.retrying` is called each time the file is tried again.
 */
export async function fetchVerified(env: DownloadEnv, context: { scope: string; store: StoreCache; sources: WorkerCaches; retrying?: () => void }, file: OfflineFile,
  signal: AbortSignal): Promise<"copied" | "fetched"> {
  const [path, size, sha] = file;
  const { scope, store } = context;
  if (signal.aborted) throw stopped();
  if (await copyFromCaches(env, store, context.sources, scope, file)) return "copied";
  const key = offlineKey(scope, path, sha);
  for (let tries = 0; ; tries += 1) {
    let answer: Awaited<ReturnType<typeof fetchOnce>>;
    try {
      answer = await fetchOnce(env, key, size, signal);
    } catch {
      if (signal.aborted) throw stopped();
      answer = "retry";
    }
    if (signal.aborted) throw stopped();
    if (answer === "retry") {
      // Offline for certain: no use trying again now (the page continues when the network is back).
      if (!env.online() || tries >= RETRY_WAITS_MS.length) throw new DownloadFailure("offline", path);
      // No answer, or none for too long: the screens say that the run waits for the network (it may still come).
      context.retrying?.();
      await pause(env, RETRY_WAITS_MS[tries], signal);
      continue;
    }
    if (!answer || !(await verified(env, answer.bytes, size, sha))) throw new DownloadFailure("replaced", path);
    await putFile(store, key, path, answer.bytes, answer.type);
    return "fetched";
  }
}

/**
 * Run `work` over `items`, at most `concurrency` at once, in order. No new item starts while `held()` (the opening
 * movie plays) or after `controller` aborts. The first failure aborts the controller (the items in flight stop) and is
 * thrown once they have ended; an abort from outside throws "stopped".
 */
export async function runPool<T>(items: readonly T[], concurrency: number, work: (item: T, signal: AbortSignal) => Promise<unknown>,
  options: { controller: AbortController; held(): boolean; wait(ms: number, signal: AbortSignal): Promise<void> }): Promise<void> {
  const { controller, held, wait } = options;
  let next = 0;
  let failure: { error: unknown } | null = null;
  const worker = async () => {
    while (!failure && !controller.signal.aborted && next < items.length) {
      try {
        if (held()) {
          await wait(HELD_POLL_MS, controller.signal);
          continue;
        }
        await work(items[next++], controller.signal);
      } catch (error) {
        if (!failure && !controller.signal.aborted) failure = { error };
        controller.abort();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
  if (failure) throw (failure as { error: unknown }).error;
  if (controller.signal.aborted) throw stopped();
}

/**
 * What the site answers when asked for its list:
 * - "list": a list this version reads;
 * - "gone": the site has none any more (404), or one of a later form: this version's way of keeping files has ended there;
 * - "unknown": something else answered (a sign-in page of a network, an error page): nothing can be said;
 * - "offline": no answer.
 */
export type ListAnswer = { kind: "list"; list: OfflineList } | { kind: "gone" } | { kind: "unknown" } | { kind: "offline" };

/** Ask the site for its list (the network decides: an unchanged list costs a few bytes). The worker leaves the request alone. */
export async function fetchList(env: DownloadEnv, scope: string, signal?: AbortSignal): Promise<ListAnswer> {
  const attempt = new AbortController();
  const onAbort = () => attempt.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = env.setTimeout(() => attempt.abort(), LIST_TIMEOUT_MS);
  try {
    const response = await env.fetch(`${fileUrl(scope, OFFLINE_LIST_FILE)}?${DOWNLOAD_PARAM}=list`, { cache: "no-cache", signal: attempt.signal });
    if (response.status === 404 && own(response)) return { kind: "gone" };
    if (response.status !== 200 || !own(response)) return { kind: "unknown" };
    const list = readOfflineList(await response.json().catch(() => undefined));
    return list === "newer" ? { kind: "gone" } : list === "malformed" ? { kind: "unknown" } : { kind: "list", list };
  } catch {
    return { kind: "offline" };
  } finally {
    env.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** What the store holds, as the page reads it. */
export type StoreRead = {
  /** The cache, or null when the device has none (reading never creates it). */
  cache: StoreCache | null;
  /** The state: null when nothing is kept (lists alone count as nothing), "unreadable" for one this version cannot read (or files without a state). */
  state: OfflineState | null | "unreadable";
  /** Every key of the store. */
  keys: Set<string>;
  /** The stored lists of the builds the state names, by build name. */
  lists: Map<string, OfflineList>;
};

export async function readStore(env: DownloadEnv, scope: string): Promise<StoreRead> {
  const nothing: StoreRead = { cache: null, state: null, keys: new Set(), lists: new Map() };
  if (!(await env.caches.has(OFFLINE_CACHE))) return nothing;
  const cache = await env.caches.open(OFFLINE_CACHE);
  const keys = new Set((await cache.keys()).map((request) => request.url));
  // A cache with nothing in it (a run that ended before its first write): nothing is kept.
  if (!keys.size) return { ...nothing, cache };
  const stored = await cache.match(stateKey(scope));
  // Lists alone (a first run cut off between its list and its state): nothing is kept, and the next run writes both anew.
  if (!stored && [...keys].every((key) => key.startsWith(`${fileUrl(scope, OFFLINE_LIST_FILE)}?`))) return { ...nothing, cache, keys };
  const state = stored ? readOfflineState(await stored.json().catch(() => undefined)) : "unreadable";
  const lists = new Map<string, OfflineList>();
  if (state !== "unreadable") {
    for (const build of [state.installed, state.target, state.previous]) {
      if (!build || lists.has(build.build)) continue;
      const list = readOfflineList(await (await cache.match(listKey(scope, build.build)))?.json().catch(() => undefined));
      if (typeof list !== "string" && list.build === build.build) lists.set(build.build, list);
    }
  }
  return { cache, state, keys, lists };
}

const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const storeKeys = async (cache: StoreCache) => new Set((await cache.keys()).map((request) => request.url));
const fontKeys = (keys: Iterable<string>) => [...keys].filter(isFontKey);

/**
 * The state with every journey whose loading was stopped named in its target (but `except`), so that what was loaded
 * of it stays on the device until the player continues or removes it: the keys of a journey no build of the state
 * names would be removed as leftovers.
 */
function namingPartials(state: OfflineState, lists: ReadonlyMap<string, OfflineList>, keys: ReadonlySet<string>, scope: string, except?: string): OfflineState {
  const build = state.target ?? state.installed;
  const list = build && lists.get(build.build);
  if (!list) return state;
  const named = [...(state.installed?.journeys ?? []), ...(state.target?.journeys ?? [])];
  const begun = partialJourneys(list, named, keys, scope).filter((journeyId) => journeyId !== except);
  return begun.length ? startTarget(state, list, [...(state.target?.journeys ?? []), ...begun]) ?? state : state;
}

/** Remove from the store what the state no longer names (fonts stay: they belong to no build). */
async function removeLeftovers(cache: StoreCache, state: OfflineState, lists: ReadonlyMap<string, OfflineList>, keys: ReadonlySet<string>, scope: string): Promise<void> {
  for (const key of garbageKeys(keys, referencedKeys(state, lists, fontKeys(keys), scope))) await cache.delete(key);
}

/** What the run's caller gives it. */
export type RunHooks = {
  /** Tell the service worker that the store changed, and wait until it has read it. */
  tell(): Promise<void>;
  /** The room the browser gives the site, if it says. */
  estimate(): Promise<{ quota?: number; usage?: number } | undefined>;
  /** No new file starts while true. */
  held(): boolean;
  /** How many files load at once. */
  concurrency(): number;
  /**
   * Called once the run knows what it loads, and after every file: the bytes on the device of what the run is for, and
   * their whole (plan.ts runFiles: not the files the installed build already held).
   */
  progress(run: { kind: RunKind; done: number; total: number }): void;
  /** Called when a file did not arrive and is tried again: the run waits for the network. */
  waiting?(): void;
};

export type RunRequest = {
  /** index.html's folder. */
  scope: string;
  /** This page's entry script, as an address. */
  pageEntry: string;
  /** The journey the player asked for (a new one, or one to continue); null to load only what the installed journeys lack (a newer build, missing files). */
  add: string | null;
  signal: AbortSignal;
};

/**
 * How a run ended:
 * - "done": the target is the installed build now (`switched`: it is not the build this page runs);
 * - "nothing": there was nothing to load;
 * - "failed": it stopped, and the installed build is as before. `reason`, besides a file's (FailureReason):
 *   "reload" (the page runs an older build than the site's, and nothing is installed: load the page anew first),
 *   "mismatch" (the site's files are not the ones its list names: try later), "no-space" (refused before anything was
 *   written: `needed`, the room the run asks for — its files and the margin — and `free` bytes), "unreadable" (the
 *   store holds a state this version cannot read). With "quota", `needed` is what is still to load.
 */
export type RunOutcome =
  | { status: "done"; kind: RunKind; switched: boolean }
  | { status: "nothing" }
  | { status: "failed"; kind: RunKind | null; reason: FailureReason | "reload" | "mismatch" | "no-space" | "unreadable"; needed?: number; free?: number };

const failed = (kind: RunKind | null, reason: Extract<RunOutcome, { status: "failed" }>["reason"], sizes: { needed?: number; free?: number } = {}): RunOutcome =>
  ({ status: "failed", kind, reason, ...sizes });

/**
 * Load a target and switch to it (the caller holds the lock): the site's list, the files the device lacks of its
 * shared group and of the kept journeys (with `add`), then the one write that makes it the installed build, then the
 * removal of what no build names any more.
 */
export async function keepRun(env: DownloadEnv, request: RunRequest, hooks: RunHooks): Promise<RunOutcome> {
  const { scope, pageEntry, add, signal } = request;
  let answer = await fetchList(env, scope, signal);
  for (let round = 0; ; round += 1) {
    if (signal.aborted) return failed(null, "stopped");
    if (answer.kind !== "list") return failed(null, "offline");
    const store = await readStore(env, scope);
    if (store.state === "unreadable") return failed(null, "unreadable");
    const state = store.state;
    const kept = state?.installed ?? null;
    const standing = classifyList(answer.list, state, pageEntry, scope);
    if (standing === "first-reload") return failed("first", "reload");
    // An old copy of the list from the network: the installed build's own list decides.
    const list = standing === "stale" ? store.lists.get(kept!.build) : answer.list;
    if (!list) return failed(null, "offline");
    const next = startTarget(state, list, add === null ? [] : [add]);
    if (!next?.target || next === state) return { status: "nothing" };
    const kind: RunKind = add !== null && !kept?.journeys.includes(add) ? (kept ? "add" : "first") : kept && list.build !== kept.build ? "update" : "repair";
    const files = keptFiles(list, next.target.journeys);
    const missing = missingFiles(files, store.keys, scope);
    // The run counts toward what it is for: not the files the installed build already holds.
    const keptList = kept ? store.lists.get(kept.build) : undefined;
    const total = bytesOf(runFiles(files, kept && keptList ? keptFiles(keptList, kept.journeys) : [], store.keys, scope));
    let done = total - bytesOf(missing);
    // Everything the installed journeys need is there, and nothing was being loaded: no write.
    if (!missing.length && !state?.target && kept && kept.build === list.build && kept.journeys.join("\n") === next.target.journeys.join("\n"))
      return { status: "nothing" };
    if (round === 0) {
      const room = await hooks.estimate().catch(() => undefined);
      // The files, a tenth more for how the browser stores them, and a margin: the figure the refusal names.
      const needed = Math.ceil(bytesOf(missing) * 1.1) + SPACE_MARGIN_BYTES;
      if (missing.length && room?.quota !== undefined && room.usage !== undefined && room.quota - room.usage < needed)
        return failed(kind, "no-space", { needed, free: Math.max(0, room.quota - room.usage) });
    }
    // The list, then the state that names it, then the worker: from here the device knows what is being loaded.
    const cache = await env.caches.open(OFFLINE_CACHE);
    try {
      await cache.put(listKey(scope, list.build), json(list));
      await cache.put(stateKey(scope), json(next));
    } catch (error) {
      // A device that kept nothing keeps nothing: the cache this run made goes again (a list without its state says nothing).
      if (state === null) await env.caches.delete(OFFLINE_CACHE).catch(() => false);
      const reason = classifyFailure(error, "put");
      return failed(kind, reason, reason === "quota" ? { needed: bytesOf(missing) } : {});
    }
    await hooks.tell();
    hooks.progress({ kind, done, total });
    const sources = await workerCaches(env).catch((): WorkerCaches => []);
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) controller.abort();
    try {
      await runPool(missing, hooks.concurrency(), async (file, running) => {
        await fetchVerified(env, { scope, store: cache, sources, retrying: hooks.waiting }, file, running);
        done += file[1];
        hooks.progress({ kind, done, total });
      }, { controller, held: hooks.held, wait: (ms, running) => pause(env, ms, running) });
    } catch (error) {
      const reason = signal.aborted ? "stopped" : classifyFailure(error, "fetch");
      if (reason !== "replaced") return failed(kind, reason, reason === "quota" ? { needed: total - done } : {});
      // The site's files are not the list's: a newer build was put there meanwhile (move to it), or an old copy answers.
      const again = await fetchList(env, scope, signal);
      if (signal.aborted) return failed(kind, "stopped");
      if (again.kind !== "list") return failed(kind, "offline");
      if (again.list.build === list.build || round + 1 >= MAX_ROUNDS) return failed(kind, "mismatch");
      answer = again;
      continue;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    // The switch: only with every file of the target in the store.
    const keys = await storeKeys(cache);
    if (missingFiles(files, keys, scope).length) {
      if (round + 1 >= MAX_ROUNDS) return failed(kind, "storage");
      continue;
    }
    const lists = new Map(store.lists).set(list.build, list);
    const after = namingPartials(completeTarget(next), lists, keys, scope);
    try {
      await cache.put(stateKey(scope), json(after));
    } catch (error) {
      return failed(kind, classifyFailure(error, "put"));
    }
    await removeLeftovers(cache, after, lists, keys, scope).catch(() => undefined);
    await hooks.tell();
    return { status: "done", kind, switched: fileUrl(scope, list.entry) !== pageEntry };
  }
}

/**
 * Stop keeping a journey ("all": everything, the only removal offered for a state this version cannot read), on the
 * caller's lock. The cache goes whole when nothing is kept any more; else the journey leaves the state and its files
 * are removed, and the files other journeys share stay. Saves, settings and English notes are in localStorage: nothing
 * here touches them. False when there was nothing to remove (or a journey was named under a state that cannot be read).
 */
export async function removeKept(env: DownloadEnv, scope: string, target: string | "all", tell: () => Promise<void>): Promise<boolean> {
  const store = await readStore(env, scope);
  if (!store.cache) return false;
  if (target !== "all" && store.state === "unreadable") return false;
  const state = target === "all" || store.state === "unreadable" || store.state === null ? null
    : removeJourney(namingPartials(store.state, store.lists, store.keys, scope, target), target);
  if (!state) {
    await env.caches.delete(OFFLINE_CACHE);
  } else {
    await store.cache.put(stateKey(scope), json(state));
    await removeLeftovers(store.cache, state, store.lists, store.keys, scope);
  }
  await tell();
  return true;
}

/**
 * A journey left midway before anything was installed, on a device whose page now runs a newer build (`list`: the
 * site's list, which is this page's own build): the newer build becomes the one being loaded, with the same journeys,
 * on the caller's lock. The files the builds share keep counting; the older build's other files go, so the worker no
 * longer answers this page with them. True when the state changed. (With a build installed, a run moves to the newer
 * list by itself: keepRun.)
 */
export async function moveTarget(env: DownloadEnv, scope: string, list: OfflineList, pageEntry: string, tell: () => Promise<void>): Promise<boolean> {
  const store = await readStore(env, scope);
  const { cache, state } = store;
  if (!cache || state === null || state === "unreadable" || state.installed || !state.target || state.target.build === list.build) return false;
  if (classifyList(list, state, pageEntry, scope) !== "first-ok") return false;
  const next = startTarget(state, list, state.target.journeys);
  if (!next?.target || next.target.build !== list.build) return false;
  await cache.put(listKey(scope, list.build), json(list));
  await cache.put(stateKey(scope), json(next));
  await removeLeftovers(cache, next, new Map(store.lists).set(list.build, list), await storeKeys(cache), scope).catch(() => undefined);
  await tell();
  return true;
}

/**
 * Whether starts open the installed build (`pin` true) or take the page from the network again (false: the site has
 * no list any more), on the caller's lock. Writes only a change of a state it can read.
 */
export async function setPin(env: DownloadEnv, scope: string, pin: boolean, tell: () => Promise<void>): Promise<void> {
  const store = await readStore(env, scope);
  if (!store.cache || store.state === null || store.state === "unreadable") return;
  const next = pin ? repin(store.state) : unpin(store.state);
  if (next === store.state) return;
  await store.cache.put(stateKey(scope), json(next));
  await tell();
}

/**
 * Copy the page's web fonts into the store, under their own addresses (the stylesheet index.html links, then the font
 * files it names), on the caller's lock. Best effort: any failure leaves the state as it was (false), and what was
 * copied stays for the next try. Only a device with an installed build keeps them.
 */
export async function keepFonts(env: DownloadEnv, scope: string, stylesheetUrl: string, signal: AbortSignal, tell: () => Promise<void>): Promise<boolean> {
  try {
    const store = await readStore(env, scope);
    const { cache, state } = store;
    if (!cache || state === null || state === "unreadable" || !state.installed) return false;
    const request: RequestInit = { mode: "cors", credentials: "omit", signal };
    let sheet = await cache.match(stylesheetUrl);
    if (!sheet) {
      const response = await env.fetch(stylesheetUrl, request);
      if (response.status !== 200) return false;
      const text = await response.text();
      await cache.put(stylesheetUrl, new Response(text, { headers: { "Content-Type": response.headers.get("Content-Type") ?? "text/css; charset=utf-8" } }));
      sheet = new Response(text);
    }
    const wanted = fontFileUrls(await sheet.text()).filter((url) => !store.keys.has(url));
    await runPool(wanted, 2, async (url, running) => {
      const response = await env.fetch(url, { ...request, signal: running });
      if (response.status !== 200) throw new DownloadFailure("offline", url);
      await cache.put(url, response);
    }, { controller: linked(signal), held: () => false, wait: (ms, running) => pause(env, ms, running) });
    if (state.fonts === stylesheetUrl) return true;
    // Read anew: the state is written whole.
    const now = (await readStore(env, scope)).state;
    if (now === null || now === "unreadable") return false;
    await cache.put(stateKey(scope), json({ ...now, fonts: stylesheetUrl } satisfies OfflineState));
    await tell();
    return true;
  } catch {
    return false;
  }
}

/** A controller that aborts with `signal`. */
function linked(signal: AbortSignal): AbortController {
  const controller = new AbortController();
  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", () => controller.abort(), { once: true });
  return controller;
}

/** The part of the Web Locks API the store's lock uses. */
export type LockRequester = {
  request<T>(name: string, options: { ifAvailable: true }, work: (lock: unknown) => Promise<T>): Promise<T>;
};

/**
 * Run `work` as the one tab that writes the store: "other-tab" when another tab holds the lock (it is not waited
 * for), without running `work`.
 */
export function underLock<T>(locks: LockRequester, work: () => Promise<T>): Promise<T | "other-tab"> {
  return locks.request<T | "other-tab">(OFFLINE_LOCK, { ifAvailable: true }, (lock) => (lock ? work() : Promise.resolve("other-tab" as const)));
}
