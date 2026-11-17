import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  classifyFailure, DownloadFailure, fetchList, fetchVerified, keepFonts, keepRun, LIST_TIMEOUT_MS, moveTarget, readStore, removeKept, runPool, setPin,
  SPACE_MARGIN_BYTES, STALL_MS, underLock, workerCaches, type CacheStore, type DownloadEnv, type RunHooks, type RunOutcome, type StoreCache,
} from "./download";
import { listSha, type OfflineFile, type OfflineList } from "./list";
import { keptFiles } from "./plan";
import { fileUrl, listKey, OFFLINE_CACHE, OFFLINE_LOCK, offlineKey, stateKey, type OfflineState } from "./state";

// The page's run for 「オフラインで遊ぶ」 against a fake Cache Storage and a fake site (user request and decisions
// 2026-11-17): nothing is kept unchecked, the installed build changes only at the switch, a run that stops leaves what
// it loaded for the next one, and a state this version cannot read is never written over.
const scope = "https://example.github.io/dreamscape/";
const text = (value: string) => new Uint8Array(new TextEncoder().encode(value));
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fileOf = (path: string, content: string): OfflineFile => [path, text(content).byteLength, listSha(digest(text(content)))];

/** A build of the fake site: every file's content is its path and the version of its group. */
type Site = { list: OfflineList; contents: Map<string, string> };
function site(build: string, release: number, change: { duomo?: string } = {}): Site {
  const contents = new Map<string, string>();
  const add = (path: string, content: string) => { contents.set(path, content); return fileOf(path, content); };
  const list: OfflineList = {
    schemaVersion: 1, build: listSha(digest(text(`build ${build}`))), release, entry: `assets/index-${build}.js`,
    shared: [add("assets/bgm/tune.mp3", "tune"), add(`assets/index-${build}.js`, `code ${build}`), add("index.html", `page ${build}`)],
    journeys: {
      milano: [add("assets/milano/duomo.webp", change.duomo ?? "duomo"), add("assets/milano/voice.mp3", "voice")],
      golden_triangle: [add("assets/gt/movie.mp4", "movie"), add("assets/gt/taj.webp", "taj")],
    },
  };
  return { list, contents };
}

class FakeCache implements StoreCache {
  readonly entries = new Map<string, { bytes: Uint8Array<ArrayBuffer>; type: string | null }>();
  readonly puts: string[] = [];
  /** A write that fails (the device is full, or the store is broken). */
  failPut: ((key: string) => Error | null) | null = null;
  async match(key: string) {
    const entry = this.entries.get(key);
    return entry && new Response(entry.bytes, { headers: entry.type ? { "Content-Type": entry.type } : {} });
  }
  async put(key: string, response: Response) {
    const failure = this.failPut?.(key);
    if (failure) throw failure;
    this.entries.set(key, { bytes: new Uint8Array(await response.arrayBuffer()), type: response.headers.get("Content-Type") });
    this.puts.push(key);
  }
  async delete(key: string) { return this.entries.delete(key); }
  async keys() { return [...this.entries.keys()].map((url) => ({ url })); }
  json(key: string) { return JSON.parse(new TextDecoder().decode(this.entries.get(key)!.bytes)) as unknown; }
}

class FakeCaches implements CacheStore {
  readonly caches = new Map<string, FakeCache>();
  async has(name: string) { return this.caches.has(name); }
  async open(name: string) {
    if (!this.caches.has(name)) this.caches.set(name, new FakeCache());
    return this.caches.get(name)!;
  }
  async keys() { return [...this.caches.keys()]; }
  async delete(name: string) { return this.caches.delete(name); }
  get store() { return this.caches.get(OFFLINE_CACHE); }
}

/** The fake browser and site of a test. */
function world(served: Site) {
  const caches = new FakeCaches();
  const requests: string[] = [];
  const longTimers: (() => void)[] = [];
  const state = {
    served,
    online: true,
    /** What a request for a file gets instead of the site's answer. */
    answer: null as ((url: string, init: RequestInit | undefined) => Promise<Response> | Response | undefined) | null,
    inFlight: 0,
    mostInFlight: 0,
  };
  const listUrl = `${scope}offline-files.json?dreamscape-offline=list`;
  const env: DownloadEnv = {
    caches,
    async fetch(url, init) {
      requests.push(url);
      state.inFlight += 1;
      state.mostInFlight = Math.max(state.mostInFlight, state.inFlight);
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
        const special = await state.answer?.(url, init);
        if (special) return special;
        if (!state.online) throw new TypeError("Failed to fetch");
        if (url === listUrl) return new Response(JSON.stringify(state.served.list));
        const path = decodeURIComponent(new URL(url).pathname.slice(new URL(scope).pathname.length));
        const content = state.served.contents.get(path);
        return content === undefined ? new Response("not found", { status: 404 }) : new Response(text(content), { headers: { "Content-Type": "application/x-test" } });
      } finally {
        state.inFlight -= 1;
      }
    },
    digest: async (bytes) => digest(bytes),
    online: () => state.online,
    // The waits between tries and while held pass at once; the long timers (a stalled file, a list that does not come) only when a test fires them.
    setTimeout(run, ms) {
      if (ms >= LIST_TIMEOUT_MS) { longTimers.push(run); return run; }
      return setTimeout(run, 0);
    },
    clearTimeout(timer) {
      const index = longTimers.indexOf(timer as () => void);
      if (index >= 0) longTimers.splice(index, 1);
      else clearTimeout(timer as ReturnType<typeof setTimeout>);
    },
  };
  const told: number[] = [];
  const progress: { kind: string; done: number; total: number }[] = [];
  const hooks: RunHooks = {
    tell: async () => { told.push(caches.store?.puts.length ?? 0); },
    estimate: async () => undefined,
    held: () => false,
    concurrency: () => 2,
    progress: (run) => { progress.push(run); },
  };
  const run = (add: string | null, page = state.served.list.entry, signal = new AbortController().signal, change: Partial<RunHooks> = {}) =>
    keepRun(env, { scope, pageEntry: fileUrl(scope, page), add, signal }, { ...hooks, ...change });
  const downloads = () => requests.filter((url) => url !== listUrl);
  const stored = () => caches.store!.json(stateKey(scope)) as OfflineState;
  return { env, caches, state, requests, downloads, longTimers, told, progress, hooks, run, stored, listUrl };
}

const keyOf = ([path, , sha]: OfflineFile) => offlineKey(scope, path, sha);
const done = (outcome: RunOutcome) => expect(outcome).toMatchObject({ status: "done" });

describe("keeping a first journey", () => {
  it("loads the shared files and the journey's own, checks them, and only then names the build installed", async () => {
    const c = site("c", 5);
    const w = world(c);
    expect(await w.run("milano")).toEqual({ status: "done", kind: "first", switched: false });
    const files = keptFiles(c.list, ["milano"]);
    expect(w.downloads().sort()).toEqual(files.map(keyOf).sort());
    const store = w.caches.store!;
    for (const file of files) expect(store.entries.has(keyOf(file))).toBe(true);
    expect(store.entries.has(keyOf(c.list.journeys.golden_triangle[0]))).toBe(false);
    expect(w.stored()).toEqual({
      schemaVersion: 1, pin: true, target: null, previous: null, fonts: null,
      installed: { build: c.list.build, release: 5, entry: "assets/index-c.js", journeys: ["milano"] },
    });
    // The list and the state that names the target come first; the state is written once more, at the switch, after every file.
    const statePuts = store.puts.flatMap((key, index) => (key === stateKey(scope) ? [index] : []));
    expect(store.puts.slice(0, 2)).toEqual([listKey(scope, c.list.build), stateKey(scope)]);
    expect(statePuts).toEqual([1, store.puts.length - 1]);
    // The worker is told after the first writes and after the switch.
    expect(w.told).toEqual([2, store.puts.length]);
    // 「tune」 4 + 「code c」 6 + 「page c」 6 + 「duomo」 5 + 「voice」 5 bytes.
    expect(w.progress[0]).toEqual({ kind: "first", done: 0, total: 26 });
    expect(w.progress.at(-1)).toMatchObject({ done: 26, total: 26 });
  });

  it("keeps a file with the type the site gave it and its length", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    const copy = await w.caches.store!.match(keyOf(c.list.shared[0]));
    expect(copy!.headers.get("Content-Type")).toBe("application/x-test");
    expect(await copy!.text()).toBe("tune");
  });

  it("loads at most the allowed number of files at once", async () => {
    const w = world(site("c", 5));
    done(await w.run("golden_triangle"));
    expect(w.state.mostInFlight).toBe(2);
    const one = world(site("c", 5));
    done(await one.run("golden_triangle", undefined, undefined, { concurrency: () => 1 }));
    expect(one.state.mostInFlight).toBe(1);
  });

  it("refuses on a page of another build than the list's: the page is loaded anew first", async () => {
    const w = world(site("d", 6));
    expect(await w.run("milano", "assets/index-c.js")).toEqual({ status: "failed", kind: "first", reason: "reload" });
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
  });

  it("refuses without room and creates nothing", async () => {
    const w = world(site("c", 5));
    const outcome = await w.run("milano", undefined, undefined, { estimate: async () => ({ quota: 20_000_120, usage: 100 }) });
    // 26 bytes to load: a tenth more and 20 MB of room are asked for, and that is the figure the refusal names (never
    // one below the room the device has).
    expect(SPACE_MARGIN_BYTES).toBe(20_000_000);
    expect(outcome).toEqual({ status: "failed", kind: "first", reason: "no-space", needed: 20_000_029, free: 20_000_020 });
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
    expect(w.downloads()).toEqual([]);
    // With room, or a browser that does not say, it goes on.
    done(await w.run("milano", undefined, undefined, { estimate: async () => ({ quota: 20_000_129, usage: 100 }) }));
  });

  it("stops as offline when the list cannot be loaded, and writes nothing", async () => {
    const w = world(site("c", 5));
    w.state.online = false;
    expect(await w.run("milano")).toEqual({ status: "failed", kind: null, reason: "offline" });
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
  });

  it("leaves nothing behind when its first writes fail: the device keeps nothing, and the next run starts anew", async () => {
    const c = site("c", 5);
    const w = world(c);
    // The list is written, the state is not (the device is full at that very write).
    const store = await w.caches.open(OFFLINE_CACHE);
    store.failPut = (key) => (key === stateKey(scope) ? new DOMException("full", "QuotaExceededError") : null);
    // 26 bytes were still to load.
    expect(await w.run("milano")).toEqual({ status: "failed", kind: "first", reason: "quota", needed: 26 });
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
    expect((await readStore(w.env, scope)).state).toBeNull();
    done(await w.run("milano"));
    expect(w.stored().installed?.journeys).toEqual(["milano"]);
  });

  it("reads a list without its state as nothing kept (a first run cut off between the two writes), and goes on from there", async () => {
    const c = site("c", 5);
    const w = world(c);
    const store = await w.caches.open(OFFLINE_CACHE);
    await store.put(listKey(scope, c.list.build), new Response(JSON.stringify(c.list)));
    const read = await readStore(w.env, scope);
    expect([read.state, [...read.keys]]).toEqual([null, [listKey(scope, c.list.build)]]);
    expect(await w.run("milano")).toEqual({ status: "done", kind: "first", switched: false });
    // …and such a leftover can be removed like anything else.
    const other = world(c);
    await (await other.caches.open(OFFLINE_CACHE)).put(listKey(scope, c.list.build), new Response(JSON.stringify(c.list)));
    expect(await removeKept(other.env, scope, "all", other.hooks.tell)).toBe(true);
    expect(await other.caches.has(OFFLINE_CACHE)).toBe(false);
  });
});

describe("a run that stops", () => {
  it("keeps what it loaded and leaves nothing installed; the next run fetches only what is missing", async () => {
    const c = site("c", 5);
    const w = world(c);
    const stop = new AbortController();
    let loaded = 0;
    const outcome = await w.run("golden_triangle", undefined, stop.signal, { progress: () => { if ((loaded += 1) === 3) stop.abort(); } });
    expect(outcome).toEqual({ status: "failed", kind: "first", reason: "stopped" });
    const store = w.caches.store!;
    const files = keptFiles(c.list, ["golden_triangle"]);
    const kept = files.filter((file) => store.entries.has(keyOf(file)));
    expect(kept.length).toBeGreaterThanOrEqual(2);
    expect(kept.length).toBeLessThan(files.length);
    expect(w.stored()).toMatchObject({ installed: null, target: { journeys: ["golden_triangle"] } });
    // Continue: each file is asked for at most once more, and only those not stored.
    const before = w.downloads().length;
    expect(await w.run("golden_triangle")).toMatchObject({ status: "done", kind: "first" });
    const again = w.downloads().slice(before);
    expect(again.sort()).toEqual(files.filter((file) => !kept.includes(file)).map(keyOf).sort());
    expect(w.stored().installed?.journeys).toEqual(["golden_triangle"]);
  });

  it("stops as offline after two more tries of a file the network does not give, and says each time that it waits", async () => {
    const c = site("c", 5);
    const w = world(c);
    const tune = keyOf(c.list.shared[0]);
    w.state.answer = (url) => { if (url === tune) throw new TypeError("Failed to fetch"); return undefined; };
    let waits = 0;
    expect(await w.run("milano", undefined, undefined, { waiting: () => { waits += 1; } })).toEqual({ status: "failed", kind: "first", reason: "offline" });
    expect(w.requests.filter((url) => url === tune)).toHaveLength(3);
    // Before each of the two further tries: the screens say that the run waits for the network.
    expect(waits).toBe(2);
    expect(w.stored().installed).toBeNull();
  });

  it("does not switch when a file of the target is not in the store after all (the browser dropped it)", async () => {
    const c = site("c", 5);
    const w = world(c);
    const store = await w.caches.open(OFFLINE_CACHE) as unknown as { put(key: string, response: Response): Promise<void>; entries: Map<string, unknown>; puts: string[] };
    const lost = keyOf(c.list.journeys.milano[0]);
    const put = store.put.bind(store);
    // The write of one file succeeds, and the copy is gone right after (a browser short of room).
    store.put = async (key: string, response: Response) => { await put(key, response); if (key === lost) store.entries.delete(key); };
    expect(await w.run("milano")).toMatchObject({ status: "failed" });
    expect(w.stored().installed).toBeNull();
  });

  it("does not try again while the browser itself says it is offline", async () => {
    const c = site("c", 5);
    const w = world(c);
    const tune = keyOf(c.list.shared[0]);
    w.state.answer = (url) => { if (url === tune) { w.state.online = false; throw new TypeError("Failed to fetch"); } return undefined; };
    expect(await w.run("milano", undefined, undefined, { concurrency: () => 1 })).toMatchObject({ status: "failed", reason: "offline" });
    expect(w.requests.filter((url) => url === tune)).toHaveLength(1);
  });

  it("tries a server in trouble again, then goes on", async () => {
    const c = site("c", 5);
    const w = world(c);
    const tune = keyOf(c.list.shared[0]);
    let failures = 2;
    w.state.answer = (url) => (url === tune && failures-- > 0 ? new Response("busy", { status: 503 }) : undefined);
    done(await w.run("milano"));
    expect(w.requests.filter((url) => url === tune)).toHaveLength(3);
  });

  it("gives up a file of which no byte arrives and fetches it again", async () => {
    const c = site("c", 5);
    const w = world(c);
    const tune = keyOf(c.list.shared[0]);
    let hung = 0;
    w.state.answer = (url, init) => {
      if (url !== tune || hung > 0) return undefined;
      hung += 1;
      // Never answers; the stall timer of this try is the long timer set last.
      return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        setTimeout(() => w.longTimers.at(-1)!(), 5);
      });
    };
    expect(STALL_MS).toBe(20_000);
    done(await w.run("milano", undefined, undefined, { concurrency: () => 1 }));
    expect(w.requests.filter((url) => url === tune)).toHaveLength(2);
  });

  it("stops when the device is full, and says how much is left to load", async () => {
    const c = site("c", 5);
    const w = world(c);
    const store = await w.caches.open(OFFLINE_CACHE);
    const voice = keyOf(c.list.journeys.milano[1]);
    store.failPut = (key) => (key === voice ? new DOMException("full", "QuotaExceededError") : null);
    const outcome = await w.run("milano", undefined, undefined, { concurrency: () => 1 });
    expect(outcome).toEqual({ status: "failed", kind: "first", reason: "quota", needed: 5 });
    expect(w.stored().installed).toBeNull();
    store.failPut = (key) => (key === voice ? new Error("broken") : null);
    expect(await w.run("milano")).toMatchObject({ status: "failed", reason: "storage" });
  });

  it("starts no new file while held, then goes on", async () => {
    const w = world(site("c", 5));
    let polls = 0;
    done(await w.run("milano", undefined, undefined, {
      held: () => {
        if (polls < 6) { polls += 1; expect(w.downloads()).toEqual([]); return true; }
        return false;
      },
    }));
    expect(polls).toBe(6);
  });
});

describe("files that are not the list's", () => {
  it("keeps nothing of a file with other bytes, and stops while the site's list is the same", async () => {
    const c = site("c", 5);
    const w = world(c);
    const duomo = keyOf(c.list.journeys.milano[0]);
    w.state.answer = (url) => (url === duomo ? new Response(text("other")) : undefined);
    expect(await w.run("milano")).toEqual({ status: "failed", kind: "first", reason: "mismatch" });
    expect(w.caches.store!.entries.has(duomo)).toBe(false);
    expect(w.stored()).toMatchObject({ installed: null, target: { journeys: ["milano"] } });
  });

  it("takes a longer, a shorter and a missing file the same way", async () => {
    for (const answer of [() => new Response(text("duomo and more")), () => new Response(text("duo")), () => new Response("gone", { status: 404 })]) {
      const c = site("c", 5);
      const w = world(c);
      const duomo = keyOf(c.list.journeys.milano[0]);
      w.state.answer = (url) => (url === duomo ? answer() : undefined);
      expect(await w.run("milano")).toMatchObject({ status: "failed", reason: "mismatch" });
      expect(w.caches.store!.entries.has(duomo)).toBe(false);
    }
  });

  it("moves an update to the build the site put in place meanwhile", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    // D is announced, but by the time its photo is asked for the site serves E.
    const d = site("d", 6, { duomo: "duomo of d" });
    const e = site("e", 7, { duomo: "duomo of e" });
    w.state.served = d;
    const photoOfD = keyOf(d.list.journeys.milano[0]);
    w.state.answer = (url) => { if (url === photoOfD) { w.state.served = e; } return undefined; };
    expect(await w.run(null, "assets/index-c.js")).toEqual({ status: "done", kind: "update", switched: true });
    expect(w.stored()).toMatchObject({
      installed: { build: e.list.build, release: 7, journeys: ["milano"] }, target: null, previous: { build: c.list.build, journeys: ["milano"] },
    });
    const store = w.caches.store!;
    // E's files and C's (the page still running) are there; what only D needed is gone, its list too.
    for (const file of [...keptFiles(e.list, ["milano"]), ...keptFiles(c.list, ["milano"])]) expect(store.entries.has(keyOf(file))).toBe(true);
    expect(store.entries.has(keyOf(d.list.shared[1]))).toBe(false);
    expect(store.entries.has(listKey(scope, d.list.build))).toBe(false);
  });

  it("asks for a reload when a first journey's build is replaced by one with other code", async () => {
    const c = site("c", 5);
    const w = world(c);
    const d = site("d", 6);
    const tune = keyOf(c.list.shared[0]);
    w.state.answer = (url) => { if (url === tune) w.state.served = d; return undefined; };
    // C's code is gone from the site (404): the list is read anew, and it is D's, whose page this is not.
    expect(await w.run("milano", "assets/index-c.js")).toEqual({ status: "failed", kind: "first", reason: "reload" });
    expect(w.stored().installed).toBeNull();
  });
});

describe("updates and added journeys", () => {
  it("loads only the changed files of a newer build, and keeps the old build's until the next switch", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    const d = site("d", 6, { duomo: "new duomo" });
    w.state.served = d;
    const before = w.downloads().length;
    expect(await w.run(null, "assets/index-c.js")).toEqual({ status: "done", kind: "update", switched: true });
    expect(w.downloads().slice(before).sort()).toEqual([d.list.shared[1], d.list.shared[2], d.list.journeys.milano[0]].map(keyOf).sort());
    expect(w.stored()).toMatchObject({ installed: { build: d.list.build }, previous: { build: c.list.build, journeys: ["milano"] }, pin: true });
    expect(w.caches.store!.entries.has(keyOf(c.list.journeys.milano[0]))).toBe(true);
    // One more build: C's own files go.
    const e = site("e", 7, { duomo: "new duomo" });
    w.state.served = e;
    done(await w.run(null, "assets/index-d.js"));
    expect(w.caches.store!.entries.has(keyOf(c.list.journeys.milano[0]))).toBe(false);
    expect(w.caches.store!.entries.has(keyOf(d.list.shared[1]))).toBe(true);
  });

  it("has nothing to do when the installed build is the site's and complete", async () => {
    const w = world(site("c", 5));
    done(await w.run("milano"));
    const puts = w.caches.store!.puts.length;
    expect(await w.run(null)).toEqual({ status: "nothing" });
    expect(w.caches.store!.puts).toHaveLength(puts);
    // Nothing kept and no journey asked for: nothing either, and no cache.
    const empty = world(site("c", 5));
    expect(await empty.run(null)).toEqual({ status: "nothing" });
    expect(await empty.caches.has(OFFLINE_CACHE)).toBe(false);
  });

  it("loads files that went missing again", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    await w.caches.store!.delete(keyOf(c.list.shared[0]));
    const before = w.downloads().length;
    expect(await w.run(null)).toEqual({ status: "done", kind: "repair", switched: false });
    expect(w.downloads().slice(before)).toEqual([keyOf(c.list.shared[0])]);
    expect(w.stored()).toMatchObject({ installed: { build: c.list.build }, previous: null });
  });

  it("adds a second journey with its own files only", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    const before = w.downloads().length;
    w.progress.length = 0;
    expect(await w.run("golden_triangle")).toEqual({ status: "done", kind: "add", switched: false });
    expect(w.downloads().slice(before).sort()).toEqual(c.list.journeys.golden_triangle.map(keyOf).sort());
    expect(w.stored().installed?.journeys).toEqual(["milano", "golden_triangle"]);
    // The run counts toward its own files (「movie」 5 + 「taj」 3 bytes), from nothing: what the screens named before it started.
    expect([w.progress[0], w.progress.at(-1)]).toEqual([{ kind: "add", done: 0, total: 8 }, { kind: "add", done: 8, total: 8 }]);
  });

  it("counts an update toward the changed files, a repair toward the missing ones, and a continued run from what it had", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    // A newer build changed the page (6 bytes), its code (6) and the photo (「new duomo」, 9).
    w.state.served = site("d", 6, { duomo: "new duomo" });
    w.progress.length = 0;
    done(await w.run(null, "assets/index-c.js"));
    expect([w.progress[0], w.progress.at(-1)]).toEqual([{ kind: "update", done: 0, total: 21 }, { kind: "update", done: 21, total: 21 }]);
    // The tune (4 bytes) went missing.
    await w.caches.store!.delete(keyOf(c.list.shared[0]));
    w.progress.length = 0;
    done(await w.run(null, "assets/index-d.js"));
    expect([w.progress[0], w.progress.at(-1)]).toEqual([{ kind: "repair", done: 0, total: 4 }, { kind: "repair", done: 4, total: 4 }]);
    // A second journey stopped after its movie (5 of 8 bytes) continues from there.
    const stop = new AbortController();
    const movie = keyOf(c.list.journeys.golden_triangle[0]);
    await w.run("golden_triangle", "assets/index-d.js", stop.signal, { concurrency: () => 1, progress: () => { if (w.caches.store?.entries.has(movie)) stop.abort(); } });
    w.progress.length = 0;
    done(await w.run("golden_triangle", "assets/index-d.js"));
    expect([w.progress[0], w.progress.at(-1)]).toEqual([{ kind: "add", done: 5, total: 8 }, { kind: "add", done: 8, total: 8 }]);
  });

  it("uses the installed build's own list when the network gives an old copy", async () => {
    const d = site("d", 6);
    const w = world(d);
    done(await w.run("milano"));
    w.state.served = site("c", 5);
    expect(await w.run("golden_triangle", "assets/index-d.js")).toMatchObject({ status: "done", kind: "add" });
    expect(w.stored().installed).toMatchObject({ build: d.list.build, release: 6, journeys: ["milano", "golden_triangle"] });
  });

  it("keeps a journey left midway through another journey's switch, named in the target", async () => {
    const c = site("c", 5);
    const w = world(c);
    const stop = new AbortController();
    const movie = keyOf(c.list.journeys.golden_triangle[0]);
    // The golden triangle stops after its movie.
    await w.run("golden_triangle", undefined, stop.signal, { concurrency: () => 1, progress: () => { if (w.caches.store?.entries.has(movie)) stop.abort(); } });
    expect(w.stored()).toMatchObject({ installed: null, target: { journeys: ["golden_triangle"] } });
    // Milano is asked for alone: it becomes the installed journey, and the movie stays.
    done(await w.run("milano"));
    expect(w.stored()).toMatchObject({ installed: { journeys: ["milano"] }, target: { build: c.list.build, journeys: ["milano", "golden_triangle"] } });
    expect(w.caches.store!.entries.has(movie)).toBe(true);
  });
});

describe("a journey left midway before anything was installed, on a page of a newer build", () => {
  /** Milano stopped on build c once its tune and its photo were in. */
  async function stoppedOnC() {
    const c = site("c", 5);
    const w = world(c);
    const stop = new AbortController();
    const photo = keyOf(c.list.journeys.milano[0]);
    await w.run("milano", undefined, stop.signal, { concurrency: () => 1, progress: () => { if (w.caches.store?.entries.has(photo)) stop.abort(); } });
    expect(w.stored()).toMatchObject({ installed: null, target: { build: c.list.build, journeys: ["milano"] } });
    return { c, w, photo };
  }

  it("names the page's build as the one being loaded: the shared progress stays, the older build's other files go", async () => {
    const { c, w, photo } = await stoppedOnC();
    const store = w.caches.store!;
    expect(store.entries.has(photo)).toBe(true);
    // The site now has build d, with another photo; the page was loaded anew and runs d.
    const d = site("d", 6, { duomo: "new duomo" });
    const told = w.told.length;
    expect(await moveTarget(w.env, scope, d.list, fileUrl(scope, d.list.entry), w.hooks.tell)).toBe(true);
    expect(w.stored()).toEqual({
      schemaVersion: 1, installed: null, pin: true, previous: null, fonts: null,
      target: { build: d.list.build, release: 6, entry: "assets/index-d.js", journeys: ["milano"] },
    });
    expect(w.told).toHaveLength(told + 1);
    // The tune is the same in both builds: it stays. Build c's photo, page, code and list are no longer named: gone,
    // so no worker answers the newer page with them.
    expect(store.entries.has(keyOf(d.list.shared[0]))).toBe(true);
    for (const key of [photo, keyOf(c.list.shared[1]), keyOf(c.list.shared[2]), listKey(scope, c.list.build)]) expect(store.entries.has(key), key).toBe(false);
    expect(store.entries.has(listKey(scope, d.list.build))).toBe(true);
    // 「続きを入れる」 then loads the rest of build d.
    w.state.served = d;
    const before = w.downloads().length;
    done(await w.run("milano"));
    expect(w.downloads().slice(before)).not.toContain(keyOf(d.list.shared[0]));
    expect(w.stored().installed).toMatchObject({ build: d.list.build, journeys: ["milano"] });
  });

  it("changes nothing on a page of another build than the list's, for the same build, with a build installed, or with nothing kept", async () => {
    const { c, w } = await stoppedOnC();
    const d = site("d", 6);
    const puts = () => w.caches.store!.puts.length;
    const before = puts();
    // The page still runs build c (it was open across the deploy): its own files are the ones it needs.
    expect(await moveTarget(w.env, scope, d.list, fileUrl(scope, c.list.entry), w.hooks.tell)).toBe(false);
    expect(await moveTarget(w.env, scope, c.list, fileUrl(scope, c.list.entry), w.hooks.tell)).toBe(false);
    expect(puts()).toBe(before);
    // With a build installed, a run moves to the newer list by itself.
    done(await w.run("milano"));
    const installed = puts();
    expect(await moveTarget(w.env, scope, d.list, fileUrl(scope, d.list.entry), w.hooks.tell)).toBe(false);
    expect(puts()).toBe(installed);
    const empty = world(c);
    expect(await moveTarget(empty.env, scope, d.list, fileUrl(scope, d.list.entry), empty.hooks.tell)).toBe(false);
    expect(await empty.caches.has(OFFLINE_CACHE)).toBe(false);
  });
});

describe("what the device already holds", () => {
  it("moves a file from the worker's cache into the store instead of fetching it", async () => {
    const c = site("c", 5);
    const w = world(c);
    const media = await w.caches.open("dreamscape-media-m1");
    const pages = await w.caches.open("dreamscape-pages");
    const tuneUrl = fileUrl(scope, "assets/bgm/tune.mp3");
    await media.put(tuneUrl, new Response(text("tune"), { headers: { "Content-Type": "audio/mpeg" } }));
    await pages.put(fileUrl(scope, "index.html"), new Response(text("page c")));
    // An older version of a photo under the same name: not the listed bytes.
    await media.put(fileUrl(scope, "assets/milano/duomo.webp"), new Response(text("old duomo")));
    done(await w.run("milano"));
    expect(w.downloads()).not.toContain(keyOf(c.list.shared[0]));
    expect(w.downloads()).not.toContain(keyOf(c.list.shared[2]));
    expect(w.downloads()).toContain(keyOf(c.list.journeys.milano[0]));
    const store = w.caches.store!;
    expect((await store.match(keyOf(c.list.shared[0])))!.headers.get("Content-Type")).toBe("audio/mpeg");
    // Nothing is held twice in the versioned caches; the page's cache is the worker's to rewrite.
    expect(media.entries.has(tuneUrl)).toBe(false);
    expect(media.entries.has(fileUrl(scope, "assets/milano/duomo.webp"))).toBe(true);
    expect(pages.entries.has(fileUrl(scope, "index.html"))).toBe(true);
  });

  it("looks only in the worker's own caches", async () => {
    const w = world(site("c", 5));
    await w.caches.open("dreamscape-code-c1");
    await w.caches.open("another-site");
    await w.caches.open(OFFLINE_CACHE);
    expect((await workerCaches(w.env)).map(({ name }) => name)).toEqual(["dreamscape-code-c1"]);
  });
});

describe("a store this version cannot read", () => {
  it("is never written over by a run, and only removed whole", async () => {
    const w = world(site("c", 5));
    const store = await w.caches.open(OFFLINE_CACHE);
    await store.put(stateKey(scope), new Response(JSON.stringify({ schemaVersion: 2, installed: "?" })));
    await store.put(`${scope}assets/x.webp?dreamscape-offline=${"a".repeat(16)}`, new Response("x"));
    expect((await readStore(w.env, scope)).state).toBe("unreadable");
    expect(await w.run("milano")).toEqual({ status: "failed", kind: null, reason: "unreadable" });
    expect(store.json(stateKey(scope))).toEqual({ schemaVersion: 2, installed: "?" });
    expect(await removeKept(w.env, scope, "milano", w.hooks.tell)).toBe(false);
    expect(store.entries.size).toBe(2);
    expect(await removeKept(w.env, scope, "all", w.hooks.tell)).toBe(true);
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
  });

  it("is never written over by the pin, the fonts or a move to a newer build either", async () => {
    const c = site("c", 5);
    const w = world(c);
    const store = await w.caches.open(OFFLINE_CACHE);
    const later = { schemaVersion: 2, installed: "?", pin: false };
    await store.put(stateKey(scope), new Response(JSON.stringify(later)));
    await setPin(w.env, scope, true, w.hooks.tell);
    await setPin(w.env, scope, false, w.hooks.tell);
    expect(await keepFonts(w.env, scope, "https://fonts.googleapis.com/css2?family=X", new AbortController().signal, w.hooks.tell)).toBe(false);
    expect(await moveTarget(w.env, scope, c.list, fileUrl(scope, c.list.entry), w.hooks.tell)).toBe(false);
    expect(store.json(stateKey(scope))).toEqual(later);
    expect(w.requests).toEqual([]);
  });

  it("reads files without a state as unreadable, and no cache or an empty one as nothing kept", async () => {
    const w = world(site("c", 5));
    expect(await readStore(w.env, scope)).toEqual({ cache: null, state: null, keys: new Set(), lists: new Map() });
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
    const store = await w.caches.open(OFFLINE_CACHE);
    expect((await readStore(w.env, scope)).state).toBeNull();
    await store.put(`${scope}assets/x.webp?dreamscape-offline=${"a".repeat(16)}`, new Response("x"));
    expect((await readStore(w.env, scope)).state).toBe("unreadable");
  });
});

describe("removing", () => {
  it("removes a journey's own files and keeps the shared ones while another journey stays", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    done(await w.run("golden_triangle"));
    const told = w.told.length;
    expect(await removeKept(w.env, scope, "golden_triangle", w.hooks.tell)).toBe(true);
    // The worker hears of it (it would answer with what it read before).
    expect(w.told).toHaveLength(told + 1);
    const store = w.caches.store!;
    for (const file of c.list.journeys.golden_triangle) expect(store.entries.has(keyOf(file))).toBe(false);
    for (const file of keptFiles(c.list, ["milano"])) expect(store.entries.has(keyOf(file))).toBe(true);
    expect(w.stored()).toMatchObject({ installed: { journeys: ["milano"] }, target: null });
    // The last journey: the whole cache goes.
    expect(await removeKept(w.env, scope, "milano", w.hooks.tell)).toBe(true);
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
    expect(await removeKept(w.env, scope, "milano", w.hooks.tell)).toBe(false);
  });

  it("removes a journey left midway, and keeps another one left midway", async () => {
    const c = site("c", 5);
    const w = world(c);
    done(await w.run("milano"));
    const store = w.caches.store!;
    // The golden triangle's movie is there, but no target names it (an update ran in between).
    await store.put(keyOf(c.list.journeys.golden_triangle[0]), new Response(text("movie")));
    expect(await removeKept(w.env, scope, "milano", w.hooks.tell)).toBe(true);
    expect(w.stored()).toMatchObject({ installed: null, target: { journeys: ["golden_triangle"] } });
    expect(store.entries.has(keyOf(c.list.journeys.golden_triangle[0]))).toBe(true);
    expect(store.entries.has(keyOf(c.list.shared[0]))).toBe(true);
    expect(store.entries.has(keyOf(c.list.journeys.milano[0]))).toBe(false);
    expect(await removeKept(w.env, scope, "golden_triangle", w.hooks.tell)).toBe(true);
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
  });
});

describe("the pin", () => {
  it("is written only when it changes, on a state that can be read", async () => {
    const w = world(site("c", 5));
    await setPin(w.env, scope, false, w.hooks.tell);
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
    done(await w.run("milano"));
    const puts = w.caches.store!.puts.length;
    await setPin(w.env, scope, true, w.hooks.tell);
    expect(w.caches.store!.puts).toHaveLength(puts);
    await setPin(w.env, scope, false, w.hooks.tell);
    expect(w.stored().pin).toBe(false);
    await setPin(w.env, scope, true, w.hooks.tell);
    expect(w.stored().pin).toBe(true);
  });
});

describe("the site's list", () => {
  it("tells a list, a site without one, another answer and no answer apart", async () => {
    const c = site("c", 5);
    const w = world(c);
    expect(await fetchList(w.env, scope)).toEqual({ kind: "list", list: c.list });
    expect(w.requests).toEqual([`${scope}offline-files.json?dreamscape-offline=list`]);
    w.state.answer = () => new Response("not found", { status: 404 });
    expect(await fetchList(w.env, scope)).toEqual({ kind: "gone" });
    w.state.answer = () => new Response(JSON.stringify({ ...c.list, schemaVersion: 2 }));
    expect(await fetchList(w.env, scope)).toEqual({ kind: "gone" });
    w.state.answer = () => new Response("<html>sign in</html>");
    expect(await fetchList(w.env, scope)).toEqual({ kind: "unknown" });
    w.state.answer = () => new Response("oops", { status: 500 });
    expect(await fetchList(w.env, scope)).toEqual({ kind: "unknown" });
    w.state.answer = () => { throw new TypeError("Failed to fetch"); };
    expect(await fetchList(w.env, scope)).toEqual({ kind: "offline" });
  });

  it("gives up a list that does not come", async () => {
    const w = world(site("c", 5));
    w.state.answer = (_url, init) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      setTimeout(() => w.longTimers.at(-1)!(), 5);
    });
    expect(await fetchList(w.env, scope)).toEqual({ kind: "offline" });
  });
});

describe("the web fonts", () => {
  const sheetUrl = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP";
  const fontUrl = (name: string) => `https://fonts.gstatic.com/s/${name}.woff2`;
  const css = ["a", "b", "a"].map((name) => `@font-face { src: url(${fontUrl(name)}) format('woff2'); }`).join("\n");
  const fonts = (w: ReturnType<typeof world>, failing: string | null = null) => {
    w.state.answer = (url, init) => {
      if (url === sheetUrl) { expect(init).toMatchObject({ mode: "cors", credentials: "omit" }); return new Response(css, { headers: { "Content-Type": "text/css; charset=utf-8" } }); }
      if (url === failing) return new Response("no", { status: 500 });
      return url.startsWith("https://fonts.gstatic.com/") ? new Response(text(`font ${url}`)) : undefined;
    };
  };

  it("copies the stylesheet and each font file under its own address, then names them in the state", async () => {
    const w = world(site("c", 5));
    done(await w.run("milano"));
    fonts(w);
    expect(await keepFonts(w.env, scope, sheetUrl, new AbortController().signal, w.hooks.tell)).toBe(true);
    const store = w.caches.store!;
    expect([sheetUrl, fontUrl("a"), fontUrl("b")].every((key) => store.entries.has(key))).toBe(true);
    expect(w.stored().fonts).toBe(sheetUrl);
    // A later switch keeps them.
    w.state.answer = null;
    w.state.served = site("d", 6);
    done(await w.run(null, "assets/index-c.js"));
    expect(store.entries.has(fontUrl("a"))).toBe(true);
    expect(w.stored().fonts).toBe(sheetUrl);
  });

  it("leaves the state alone when a font file cannot be copied, and fetches only the rest the next time", async () => {
    const w = world(site("c", 5));
    done(await w.run("milano"));
    fonts(w, fontUrl("b"));
    expect(await keepFonts(w.env, scope, sheetUrl, new AbortController().signal, w.hooks.tell)).toBe(false);
    expect(w.stored().fonts).toBeNull();
    fonts(w);
    const before = w.requests.length;
    expect(await keepFonts(w.env, scope, sheetUrl, new AbortController().signal, w.hooks.tell)).toBe(true);
    expect(w.requests.slice(before)).toEqual([fontUrl("b")]);
  });

  it("copies nothing for a device that keeps no journey", async () => {
    const w = world(site("c", 5));
    fonts(w);
    expect(await keepFonts(w.env, scope, sheetUrl, new AbortController().signal, w.hooks.tell)).toBe(false);
    expect(w.requests).toEqual([]);
    expect(await w.caches.has(OFFLINE_CACHE)).toBe(false);
    // …nor for one whose first journey is only begun (nothing is installed yet).
    const stop = new AbortController();
    await w.run("milano", undefined, stop.signal, { progress: () => stop.abort() });
    expect(w.stored()).toMatchObject({ installed: null, target: { journeys: ["milano"] } });
    fonts(w);
    const before = w.requests.length;
    expect(await keepFonts(w.env, scope, sheetUrl, new AbortController().signal, w.hooks.tell)).toBe(false);
    expect(w.requests).toHaveLength(before);
  });
});

describe("one file", () => {
  it("is kept only with the listed size and hash", async () => {
    const c = site("c", 5);
    const w = world(c);
    const store = await w.caches.open(OFFLINE_CACHE);
    const file = c.list.shared[0];
    const signal = new AbortController().signal;
    expect(await fetchVerified(w.env, { scope, store, sources: [] }, file, signal)).toBe("fetched");
    expect(store.entries.has(keyOf(file))).toBe(true);
    const wrong: OfflineFile = [file[0], file[1], "0".repeat(16)];
    await expect(fetchVerified(w.env, { scope, store, sources: [] }, wrong, signal)).rejects.toMatchObject({ reason: "replaced", path: file[0] });
    expect(store.entries.has(keyOf(wrong))).toBe(false);
  });

  it("asks the network alone, under the address with its hash", async () => {
    const c = site("c", 5);
    const w = world(c);
    const seen: (RequestInit | undefined)[] = [];
    w.state.answer = (_url, init) => { seen.push(init); return undefined; };
    await fetchVerified(w.env, { scope, store: await w.caches.open(OFFLINE_CACHE), sources: [] }, c.list.shared[0], new AbortController().signal);
    expect(w.requests).toEqual([`${scope}assets/bgm/tune.mp3?dreamscape-offline=${c.list.shared[0][2]}`]);
    expect(seen[0]).toMatchObject({ cache: "no-store", priority: "low" });
  });
});

describe("the pool, the reasons and the lock", () => {
  it("throws the first failure once the others have stopped", async () => {
    const started: number[] = [];
    const controller = new AbortController();
    const work = async (item: number, signal: AbortSignal) => {
      started.push(item);
      await new Promise((resolve) => setTimeout(resolve, item === 2 ? 1 : 20));
      if (item === 2) throw new DownloadFailure("quota", "two");
      if (signal.aborted) throw new DownloadFailure("stopped");
    };
    await expect(runPool([1, 2, 3, 4, 5], 2, work, { controller, held: () => false, wait: async () => undefined })).rejects.toMatchObject({ reason: "quota" });
    expect(controller.signal.aborted).toBe(true);
    expect(started).toEqual([1, 2]);
  });

  it("names the reason of a failure by where it happened", () => {
    expect(classifyFailure(new DOMException("x", "AbortError"), "fetch")).toBe("stopped");
    expect(classifyFailure(new TypeError("Failed to fetch"), "fetch")).toBe("offline");
    expect(classifyFailure(new DOMException("x", "QuotaExceededError"), "put")).toBe("quota");
    expect(classifyFailure(new Error("x"), "put")).toBe("storage");
    expect(classifyFailure(new DownloadFailure("replaced"), "put")).toBe("replaced");
  });

  it("does not run, and says so, while another tab holds the lock", async () => {
    const asked: unknown[] = [];
    const locks = (held: boolean) => ({
      request: async <T>(name: string, options: { ifAvailable: true }, work: (lock: unknown) => Promise<T>) => { asked.push([name, options]); return work(held ? null : {}); },
    });
    let ran = 0;
    expect(await underLock(locks(true), async () => { ran += 1; return "ran"; })).toBe("other-tab");
    expect(ran).toBe(0);
    expect(await underLock(locks(false), async () => { ran += 1; return "ran"; })).toBe("ran");
    expect(asked[0]).toEqual([OFFLINE_LOCK, { ifAvailable: true }]);
  });
});
