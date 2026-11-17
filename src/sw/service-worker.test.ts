import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OfflineList } from "../offline/list";
import { listKey, OFFLINE_CACHE, offlineKey, stateKey, type OfflineState } from "../offline/state";

// The service worker itself, run with a small Cache Storage, network and worker scope of the test's own: what it
// answers to a device that keeps nothing (as before 「オフラインで遊ぶ」) and to one that keeps a journey (2026-11-17).
const scope = "https://example.github.io/dreamscape/";
const sha = (letter: string) => letter.repeat(16);
const PAGES = "dreamscape-pages";
const CODE = "dreamscape-code-c1";
const MEDIA = "dreamscape-media-m1";

/** A small Cache Storage: caches by name, each a map from address to answer. */
class FakeCaches {
  readonly stores = new Map<string, Map<string, Response>>();
  readonly opened: string[] = [];
  /** While set, the store has not answered yet whether a cache is there (a worker that has just started). */
  slow: Promise<void> | undefined;
  has = async (name: string) => {
    await this.slow;
    return this.stores.has(name);
  };
  keys = async () => [...this.stores.keys()];
  delete = async (name: string) => this.stores.delete(name);
  open = async (name: string) => {
    this.opened.push(name);
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    const store = this.stores.get(name)!;
    return {
      match: async (key: string) => store.get(key)?.clone(),
      put: async (key: string, response: Response) => { store.set(key, response.clone()); },
    };
  };
  match = async (key: string, options: { cacheName: string }) => this.stores.get(options.cacheName)?.get(key)?.clone();
  /** Put an answer without opening through the worker's eyes (the page's writes, or an earlier visit's). */
  set(name: string, key: string, response: Response) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    this.stores.get(name)!.set(key, response);
  }
}

type Listener = (event: never) => void;
let caches: FakeCaches;
let listeners: Map<string, Listener>;
/** The network: answers by address; an address without one fails as a device without a network does. */
let network: Map<string, () => Response>;
let fetched: string[];
let waiting: Promise<unknown>[];
let skipWaiting: ReturnType<typeof vi.fn>;

async function startWorker(): Promise<void> {
  vi.resetModules();
  await import("./service-worker");
}
/** Start the worker with a store that has not answered yet; the returned function lets it answer. */
async function startWorkerBeforeTheStoreAnswers(): Promise<() => void> {
  let answer = () => {};
  caches.slow = new Promise((resolve) => { answer = resolve; });
  await startWorker();
  return answer;
}

beforeEach(() => {
  caches = new FakeCaches();
  listeners = new Map();
  network = new Map();
  fetched = [];
  waiting = [];
  skipWaiting = vi.fn(async () => undefined);
  vi.stubGlobal("caches", caches);
  vi.stubGlobal("self", {
    registration: { scope }, skipWaiting, clients: { claim: async () => undefined },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  });
  vi.stubGlobal("fetch", async (request: { url: string } | string) => {
    const url = typeof request === "string" ? request : request.url;
    fetched.push(url);
    const answer = network.get(url);
    if (!answer) throw new TypeError("Failed to fetch");
    return answer();
  });
  vi.stubGlobal("__SW_CODE_VERSION__", "c1");
  vi.stubGlobal("__SW_MEDIA_VERSION__", "m1");
  vi.stubGlobal("__SW_ENTRY__", "assets/index-Aaaaaaaa.js");
});
afterEach(() => vi.unstubAllGlobals());

/** An answer of this site from the network (the worker keeps only such answers: status 200, type "basic"). */
function served(body: string, type = "text/plain", status = 200): Response {
  const response = new Response(body, { status, headers: { "Content-Type": type } });
  Object.defineProperty(response, "type", { value: "basic" });
  return response;
}

/** Send a request to the worker: its answer, or "browser" when it leaves the request to the browser. */
async function ask(path: string, extra: { mode?: string; range?: string; method?: string } = {}): Promise<Response | "browser"> {
  const url = path.startsWith("https://") ? path : new URL(path, scope).href;
  let answer: Promise<Response> | undefined;
  const request = { url, method: extra.method ?? "GET", mode: extra.mode ?? "no-cors", headers: new Headers(extra.range ? { Range: extra.range } : {}) };
  listeners.get("fetch")!({ request, respondWith: (promise: Promise<Response>) => { answer = promise; }, waitUntil: (promise: Promise<unknown>) => waiting.push(promise) } as never);
  if (!answer) return "browser";
  const response = await answer;
  await Promise.all(waiting.splice(0));
  return response;
}
const page = (query = "") => ask(`./${query}`, { mode: "navigate" });
/** Send a message to the worker; the answers it posts on the message's port. */
async function tell(data: unknown): Promise<unknown[]> {
  const answers: unknown[] = [];
  listeners.get("message")!({ data, ports: [{ postMessage: (answer: unknown) => answers.push(answer) }], waitUntil: (promise: Promise<unknown>) => waiting.push(promise) } as never);
  await Promise.all(waiting.splice(0));
  return answers;
}
const text = async (answer: Response | "browser") => (answer === "browser" ? "browser" : answer.text());

// Build a (installed) and build b (a newer one: another page, entry script and Duomo photo).
const listA: OfflineList = {
  schemaVersion: 1, build: sha("a"), release: 3, entry: "assets/index-Aaaaaaaa.js",
  shared: [["assets/index-Aaaaaaaa.js", 14, sha("1")], ["assets/se/ui_tap.mp3", 3, sha("2")], ["index.html", 6, sha("3")]],
  journeys: {
    milano: [["assets/bgm/milano/theme.mp3", 10, sha("4")], ["assets/tourism/milano/duomo.webp", 7, sha("5")]],
    golden_triangle: [["assets/movies/gt_opening.mp4", 10, sha("6")]],
  },
};
const listB: OfflineList = {
  ...listA, build: sha("b"), release: 4, entry: "assets/index-Bbbbbbbb.js",
  shared: [["assets/index-Bbbbbbbb.js", 14, sha("8")], ["assets/se/ui_tap.mp3", 3, sha("2")], ["index.html", 6, sha("9")]],
  journeys: { ...listA.journeys, milano: [["assets/bgm/milano/theme.mp3", 10, sha("4")], ["assets/tourism/milano/duomo.webp", 7, sha("c")]] },
};
const fontsUrl = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap";
const fontFile = "https://fonts.gstatic.com/s/notosansjp/v53/a.woff2";
const installedA = (change: Partial<OfflineState> = {}): OfflineState => ({
  schemaVersion: 1, pin: true, target: null, previous: null, fonts: null,
  installed: { build: sha("a"), release: 3, entry: listA.entry, journeys: ["milano", "golden_triangle"] }, ...change,
});

/** Store a kept file as the page does: under its address with its hash, with its type and length. */
function keep(path: string, letter: string, body: string, type?: string): void {
  // (Bytes, not text: an answer made of text names a type by itself.)
  caches.set(OFFLINE_CACHE, offlineKey(scope, path, sha(letter)),
    new Response(new TextEncoder().encode(body), { headers: { ...(type ? { "Content-Type": type } : {}), "Content-Length": String(body.length) } }));
}
/** A device that keeps build a with Milano and the golden triangle (every file of them), written as the page does. */
function keepBuildA(state: OfflineState = installedA()): void {
  caches.set(OFFLINE_CACHE, stateKey(scope), new Response(JSON.stringify(state)));
  caches.set(OFFLINE_CACHE, listKey(scope, listA.build), new Response(JSON.stringify(listA)));
  keep("index.html", "3", "page A", "text/html; charset=utf-8");
  keep("assets/index-Aaaaaaaa.js", "1", "console.log(1)", "text/javascript");
  keep("assets/se/ui_tap.mp3", "2", "tap", "audio/mpeg");
  keep("assets/bgm/milano/theme.mp3", "4", "0123456789", "audio/mpeg");
  keep("assets/tourism/milano/duomo.webp", "5", "duomo A", "image/webp");
  keep("assets/movies/gt_opening.mp4", "6", "movie-data");
}

describe("a device that keeps nothing: answered as before", () => {
  beforeEach(() => {
    network.set(scope, () => served("page from the network", "text/html"));
    network.set(`${scope}?debug`, () => served("page from the network", "text/html"));
    network.set(`${scope}assets/index-Aaaaaaaa.js`, () => served("console.log(1)", "text/javascript"));
    network.set(`${scope}assets/tourism/milano/duomo.webp`, () => served("duomo", "image/webp"));
    network.set(`${scope}assets/bgm/milano/theme.mp3`, () => served("0123456789", "audio/mpeg"));
    network.set(fontsUrl, () => new Response("@font-face{}"));
  });

  it("takes the page from the network and keeps the last copy for a start without one", async () => {
    await startWorker();
    expect(await text(await page("?debug"))).toBe("page from the network");
    expect(await caches.match(scope, { cacheName: PAGES })).toBeDefined();
    network.clear();
    expect(await text(await page())).toBe("page from the network");
    caches.stores.delete(PAGES);
    await expect(page()).rejects.toThrow("Failed to fetch");
  });

  it("keeps built files and pictures cache first in the versioned caches", async () => {
    await startWorker();
    await page();
    expect(await text(await ask("./assets/index-Aaaaaaaa.js"))).toBe("console.log(1)");
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo");
    expect([...caches.stores.get(CODE)!.keys()]).toEqual([`${scope}assets/index-Aaaaaaaa.js`]);
    expect([...caches.stores.get(MEDIA)!.keys()]).toEqual([`${scope}assets/tourism/milano/duomo.webp`]);
    // The second time from the cache: the network is not asked again.
    fetched.length = 0;
    expect(await text(await ask("./assets/index-Aaaaaaaa.js"))).toBe("console.log(1)");
    expect(fetched).toEqual([]);
  });

  it("leaves ranges, movies, the fonts, writes and other sites to the browser", async () => {
    await startWorker();
    await page();
    expect(await ask("./assets/bgm/milano/theme.mp3", { range: "bytes=0-3" })).toBe("browser");
    expect(await ask("./assets/movies/gt_opening.mp4")).toBe("browser");
    expect(await ask(fontsUrl)).toBe("browser");
    expect(await ask(fontFile)).toBe("browser");
    expect(await ask("./assets/index-Aaaaaaaa.js", { method: "POST" })).toBe("browser");
    expect(await ask("https://tile.openstreetmap.org/16/1/2.png")).toBe("browser");
    expect(await ask(`./assets/tourism/milano/duomo.webp?dreamscape-offline=${sha("5")}`)).toBe("browser");
    expect(await ask("./offline-files.json?dreamscape-offline=list")).toBe("browser");
  });

  it("answers what comes before it has looked at the store through the network, unchanged", async () => {
    const storeAnswers = await startWorkerBeforeTheStoreAnswers();
    // The very first requests of a worker that has just started: a range and the fonts' stylesheet.
    const range = ask("./assets/bgm/milano/theme.mp3", { range: "bytes=0-3" });
    const fonts = ask(fontsUrl);
    expect(fetched).toEqual([]);
    storeAnswers();
    expect(await text(await range)).toBe("0123456789");
    expect(await text(await fonts)).toBe("@font-face{}");
    expect(fetched).toEqual([`${scope}assets/bgm/milano/theme.mp3`, fontsUrl]);
    // Nothing of them is kept: the worker's caches hold no range and no font.
    expect(caches.stores.has(MEDIA)).toBe(false);
  });

  it("never creates or opens the cache of 「オフラインで遊ぶ」", async () => {
    await startWorker();
    await page();
    await ask("./assets/index-Aaaaaaaa.js");
    await tell({ type: "offline-changed" });
    await tell({ type: "keep", urls: [`${scope}assets/tourism/milano/duomo.webp`] });
    expect(caches.stores.has(OFFLINE_CACHE)).toBe(false);
    expect(caches.opened).not.toContain(OFFLINE_CACHE);
    expect([...caches.stores.get(MEDIA)!.keys()]).toEqual([`${scope}assets/tourism/milano/duomo.webp`]);
  });

  it("treats a store whose state it cannot read as nothing kept, and changes nothing in it", async () => {
    keepBuildA();
    caches.set(OFFLINE_CACHE, stateKey(scope), new Response(JSON.stringify({ ...installedA(), schemaVersion: 2 })));
    const before = [...caches.stores.get(OFFLINE_CACHE)!.keys()];
    await startWorker();
    expect(await text(await page())).toBe("page from the network");
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo");
    expect([...caches.stores.get(OFFLINE_CACHE)!.keys()]).toEqual(before);
    // A state that is no JSON at all, the same.
    caches.set(OFFLINE_CACHE, stateKey(scope), new Response("<!doctype html>"));
    await startWorker();
    expect(await text(await page())).toBe("page from the network");
  });
});

describe("a device that keeps a journey", () => {
  beforeEach(() => {
    keepBuildA();
    // The network has a newer build: the kept one opens all the same.
    network.set(scope, () => served("page B from the network", "text/html"));
    network.set(`${scope}assets/index-Bbbbbbbb.js`, () => served("console.log(2)", "text/javascript"));
    network.set(`${scope}assets/tourism/milano/duomo.webp`, () => served("duomo B", "image/webp"));
  });

  it("opens the installed page from the store at every start, online too, whatever the query", async () => {
    await startWorker();
    for (const query of ["", "?debug&city=milano", "index.html"]) {
      const answer = await page(query) as Response;
      expect(await answer.text(), query).toBe("page A");
      expect(answer.status).toBe(200);
      expect(answer.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
      // A new answer under the address asked for, not the stored one's (which carries the hash).
      expect(answer.url).toBe("");
    }
    expect(fetched).toEqual([]);
    // Nothing is written to the worker's own caches.
    expect(caches.stores.has(PAGES)).toBe(false);
  });

  it("answers the kept files from the store with their type, and writes none of them to its own caches", async () => {
    await startWorker();
    await page();
    const script = await ask("./assets/index-Aaaaaaaa.js") as Response;
    expect(await script.text()).toBe("console.log(1)");
    expect(Object.fromEntries(script.headers)).toEqual({ "accept-ranges": "bytes", "content-length": "14", "content-type": "text/javascript" });
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo A");
    expect(await text(await ask("./assets/tourism/milano/duomo.webp?v=2"))).toBe("duomo A");
    // A copy stored without a type gets one by its extension.
    expect((await ask("./assets/movies/gt_opening.mp4") as Response).headers.get("Content-Type")).toBe("video/mp4");
    expect(fetched).toEqual([]);
    expect(caches.stores.has(CODE)).toBe(false);
    expect(caches.stores.has(MEDIA)).toBe(false);
    expect(caches.opened).not.toContain(OFFLINE_CACHE);
  });

  it("answers a range with that part of the kept file: streamed audio and the movie play without a network", async () => {
    await startWorker();
    const part = await ask("./assets/bgm/milano/theme.mp3", { range: "bytes=2-5" }) as Response;
    expect(part.status).toBe(206);
    expect(await part.text()).toBe("2345");
    expect(Object.fromEntries(part.headers)).toEqual({ "accept-ranges": "bytes", "content-length": "4", "content-range": "bytes 2-5/10", "content-type": "audio/mpeg" });
    const tail = await ask("./assets/movies/gt_opening.mp4", { range: "bytes=6-" }) as Response;
    expect([tail.status, await tail.text(), tail.headers.get("Content-Range"), tail.headers.get("Content-Type")]).toEqual([206, "data", "bytes 6-9/10", "video/mp4"]);
    const last = await ask("./assets/bgm/milano/theme.mp3", { range: "bytes=-3" }) as Response;
    expect([last.status, await last.text()]).toEqual([206, "789"]);
    // A part the file does not have, and a header that is no single range (the whole file).
    const beyond = await ask("./assets/bgm/milano/theme.mp3", { range: "bytes=10-" }) as Response;
    expect([beyond.status, beyond.headers.get("Content-Range")]).toEqual([416, "bytes */10"]);
    const whole = await ask("./assets/bgm/milano/theme.mp3", { range: "bytes=0-1,4-5" }) as Response;
    expect([whole.status, await whole.text(), whole.headers.get("Accept-Ranges")]).toEqual([200, "0123456789", "bytes"]);
    expect(fetched).toEqual([]);
  });

  it("answers from the store the first requests after it starts, before the page asked for anything else", async () => {
    const storeAnswers = await startWorkerBeforeTheStoreAnswers();
    // A worker the browser restarted in the middle of play: the next part of the tune comes first.
    const asked = ask("./assets/bgm/milano/theme.mp3", { range: "bytes=0-1" });
    const picture = ask("./assets/tourism/milano/duomo.webp");
    storeAnswers();
    const part = await asked as Response;
    expect([part.status, await part.text()]).toEqual([206, "01"]);
    expect(await text(await picture)).toBe("duomo A");
    expect(fetched).toEqual([]);
  });

  it("answers what is not kept as before: another build's script from the network into its own cache", async () => {
    await startWorker();
    await page();
    expect(await text(await ask("./assets/index-Bbbbbbbb.js"))).toBe("console.log(2)");
    expect([...caches.stores.get(CODE)!.keys()]).toEqual([`${scope}assets/index-Bbbbbbbb.js`]);
    // A listed file whose copy is not in the store (the browser removed it): the network, as before.
    caches.stores.get(OFFLINE_CACHE)!.delete(offlineKey(scope, "assets/tourism/milano/duomo.webp", sha("5")));
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo B");
    // …and for a range of such a file, the network's answer unchanged.
    caches.stores.get(OFFLINE_CACHE)!.delete(offlineKey(scope, "assets/bgm/milano/theme.mp3", sha("4")));
    network.set(`${scope}assets/bgm/milano/theme.mp3`, () => served("01", "audio/mpeg", 206));
    expect(await text(await ask("./assets/bgm/milano/theme.mp3", { range: "bytes=0-1" }))).toBe("01");
  });

  it("opens the network's page when the installed page or its entry script is not in the store", async () => {
    caches.stores.get(OFFLINE_CACHE)!.delete(offlineKey(scope, "assets/index-Aaaaaaaa.js", sha("1")));
    await startWorker();
    expect(await text(await page())).toBe("page B from the network");
  });

  it("prefers the installed build's copy, then the target's: a build still loading never opens", async () => {
    const updating = installedA({ target: { build: sha("b"), release: 4, entry: listB.entry, journeys: ["milano", "golden_triangle"] } });
    caches.set(OFFLINE_CACHE, stateKey(scope), new Response(JSON.stringify(updating)));
    caches.set(OFFLINE_CACHE, listKey(scope, listB.build), new Response(JSON.stringify(listB)));
    keep("index.html", "9", "page B", "text/html; charset=utf-8");
    keep("assets/index-Bbbbbbbb.js", "8", "console.log(2)", "text/javascript");
    keep("assets/tourism/milano/duomo.webp", "c", "duomo B", "image/webp");
    await startWorker();
    expect(await text(await page())).toBe("page A");
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo A");
    // The target's own files are answered from the store too (a tab of the new build after the switch reads them).
    expect(await text(await ask("./assets/index-Bbbbbbbb.js"))).toBe("console.log(2)");
    expect(fetched).toEqual([]);
    // The switch: the page writes the new state and says so; the next start opens build b.
    const switched = installedA({ installed: updating.target, previous: { build: sha("a"), journeys: ["milano", "golden_triangle"] } });
    caches.set(OFFLINE_CACHE, stateKey(scope), new Response(JSON.stringify(switched)));
    // The worker answers once it has read the store anew (the page then knows this worker opens what is kept).
    expect(await tell({ type: "offline-changed" })).toEqual([{ type: "offline-read" }]);
    expect(await text(await page())).toBe("page B");
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo B");
    // The page of the previous build that is still open keeps its own script.
    expect(await text(await ask("./assets/index-Aaaaaaaa.js"))).toBe("console.log(1)");
  });

  it("reads the store anew at every start of a page, even when no one told it of a change", async () => {
    await startWorker();
    expect(await text(await page())).toBe("page A");
    // Another tab removed everything; this worker heard nothing.
    caches.stores.delete(OFFLINE_CACHE);
    expect(await text(await page())).toBe("page B from the network");
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo B");
    expect(caches.stores.has(OFFLINE_CACHE)).toBe(false);
  });

  /** The page loads build b's files and switches to it (one write of the state), as the page does. */
  function switchToB(): void {
    const kept = { build: sha("b"), release: 4, entry: listB.entry, journeys: ["milano", "golden_triangle"] };
    caches.set(OFFLINE_CACHE, listKey(scope, listB.build), new Response(JSON.stringify(listB)));
    keep("index.html", "9", "page B", "text/html; charset=utf-8");
    keep("assets/index-Bbbbbbbb.js", "8", "console.log(2)", "text/javascript");
    keep("assets/tourism/milano/duomo.webp", "c", "duomo B", "image/webp");
    caches.set(OFFLINE_CACHE, stateKey(scope), new Response(JSON.stringify(installedA({ installed: kept, previous: { build: sha("a"), journeys: ["milano", "golden_triangle"] } }))));
  }

  it("opens the newer build at the next start after a switch it was not told of", async () => {
    await startWorker();
    expect(await text(await page())).toBe("page A");
    // The page switched to build b; its message never reached this worker.
    switchToB();
    expect(await text(await page())).toBe("page B");
  });

  it("reads the store anew as it takes over: a worker that waited through a switch answers with the newer build's files at once", async () => {
    // This worker started (was installed) while build a was the installed one, and waited.
    await startWorker();
    switchToB();
    // A page of its version asks it to take over. No page starts through it and no one tells it of the switch: its
    // first requests are that page's files.
    listeners.get("activate")!({ waitUntil: (promise: Promise<unknown>) => waiting.push(promise) } as never);
    await Promise.all(waiting.splice(0));
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo B");
    expect(await text(await ask("./assets/index-Bbbbbbbb.js"))).toBe("console.log(2)");
    expect(fetched).toEqual([]);
  });

  it("takes the page from the network first when not pinned, and the installed page without a network", async () => {
    keepBuildA(installedA({ pin: false }));
    await startWorker();
    expect(await text(await page())).toBe("page B from the network");
    network.clear();
    // The installed page comes before the last copy of the network's page.
    expect(await caches.match(scope, { cacheName: PAGES })).toBeDefined();
    expect(await text(await page())).toBe("page A");
    // The files are answered from the store either way.
    expect(await text(await ask("./assets/tourism/milano/duomo.webp"))).toBe("duomo A");
  });

  it("answers the fonts from the store only when the device holds them", async () => {
    network.set(fontsUrl, () => new Response("@font-face{/* network */}"));
    await startWorker();
    await page();
    expect(await ask(fontsUrl)).toBe("browser");
    keepBuildA(installedA({ fonts: fontsUrl }));
    caches.set(OFFLINE_CACHE, fontsUrl, new Response("@font-face{/* kept */}", { headers: { "Content-Type": "text/css" } }));
    caches.set(OFFLINE_CACHE, fontFile, new Response("font"));
    await tell({ type: "offline-changed" });
    expect(await text(await ask(fontsUrl))).toBe("@font-face{/* kept */}");
    expect(await text(await ask(fontFile))).toBe("font");
    // A font file the store lacks (the browser asked for another one): the network.
    network.set("https://fonts.gstatic.com/s/notosansjp/v53/b.woff2", () => new Response("font b"));
    expect(await text(await ask("https://fonts.gstatic.com/s/notosansjp/v53/b.woff2"))).toBe("font b");
    expect(await ask("https://fonts.googleapis.com/css2?family=Roboto")).toBe("browser");
  });

  it("keeps no second copy of a kept file the first page had loaded, and its start removes no kept file", async () => {
    network.set(`${scope}assets/se/ui_back.mp3`, () => served("back", "audio/mpeg"));
    caches.set("dreamscape-media-m0", `${scope}assets/old.webp`, new Response("old"));
    await startWorker();
    await tell({ type: "keep", urls: [`${scope}assets/tourism/milano/duomo.webp`, `${scope}assets/se/ui_back.mp3`] });
    expect([...caches.stores.get(MEDIA)!.keys()]).toEqual([`${scope}assets/se/ui_back.mp3`]);
    const before = [...caches.stores.get(OFFLINE_CACHE)!.keys()];
    listeners.get("activate")!({ waitUntil: (promise: Promise<unknown>) => waiting.push(promise) } as never);
    await Promise.all(waiting.splice(0));
    expect(caches.stores.has("dreamscape-media-m0")).toBe(false);
    expect([...caches.stores.get(OFFLINE_CACHE)!.keys()]).toEqual(before);
  });

  it("takes over only when a page of its own version asks, as before, and says so to that page", async () => {
    await startWorker();
    expect(await tell({ type: "activate", entry: `${scope}assets/index-Bbbbbbbb.js` })).toEqual([]);
    expect(skipWaiting).not.toHaveBeenCalled();
    expect(await tell({ type: "activate", entry: `${scope}assets/index-Aaaaaaaa.js` })).toEqual([{ type: "activating" }]);
    expect(skipWaiting).toHaveBeenCalledTimes(1);
    // A page of before this answer sends no port: the worker takes over all the same.
    listeners.get("message")!({ data: { type: "activate", entry: `${scope}assets/index-Aaaaaaaa.js` }, waitUntil: (promise: Promise<unknown>) => waiting.push(promise) } as never);
    await Promise.all(waiting.splice(0));
    expect(skipWaiting).toHaveBeenCalledTimes(2);
    // A message without a port (as "offline-changed" may be sent) is fine.
    listeners.get("message")!({ data: { type: "offline-changed" }, waitUntil: (promise: Promise<unknown>) => waiting.push(promise) } as never);
    await Promise.all(waiting.splice(0));
  });
});
