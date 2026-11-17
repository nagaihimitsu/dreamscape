import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OfflineList } from "./list";
import { offlineKey, type OfflineState } from "./state";
import type { RunOutcome, StoreRead } from "./download";
import type { OfflineEvent } from "./offline-status";

// The page's controller of 「オフラインで遊ぶ」 (offline-controller.ts) with the browser and the store's work faked:
// what it tells the player while they are elsewhere in the game (the short words under the header), the fonts it tries
// again, the move of a first run left midway to a newer build at a page's start, and the mirror of the kept journeys
// the next start's title reads (kept-journeys.ts). download.ts, which does the work, has tests of its own.
vi.mock("./download", () => ({
  fetchList: vi.fn(), keepFonts: vi.fn(), keepRun: vi.fn(), moveTarget: vi.fn(), readStore: vi.fn(), removeKept: vi.fn(), setPin: vi.fn(),
  underLock: vi.fn((_locks: unknown, work: () => Promise<unknown>) => work()),
}));
vi.mock("../app/worker-takeover", () => ({ takeOver: vi.fn(async () => true), browserTakeover: vi.fn(() => ({})) }));

const scope = "https://example.github.io/dreamscape/";
const ENTRY_A = "assets/index-Aaaaaaaa.js";
const ENTRY_B = "assets/index-Bbbbbbbb.js";
const FONTS = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP";
const sha = (letter: string) => letter.repeat(16);
const list = (letter: "a" | "b", entry: string): OfflineList => ({
  schemaVersion: 1, build: sha(letter), release: letter === "a" ? 3 : 4, entry,
  shared: [[entry, 14, sha("1")], ["index.html", 6, sha(letter === "a" ? "2" : "3")]],
  journeys: { milano: [["assets/tourism/milano/duomo.webp", 5, sha("4")]] },
});
const LIST_A = list("a", ENTRY_A);
const LIST_B = list("b", ENTRY_B);
const allKeys = (of: OfflineList) => new Set([...of.shared, ...of.journeys.milano].map(([path, , hash]) => offlineKey(scope, path, hash)));
const state = (change: Partial<OfflineState>): OfflineState =>
  ({ schemaVersion: 1, installed: null, pin: true, target: null, previous: null, fonts: null, ...change });
const build = (of: OfflineList) => ({ build: of.build, release: of.release, entry: of.entry, journeys: ["milano"] });

type Download = typeof import("./download");
type Status = typeof import("./offline-status");
let download: { [K in keyof Download]: ReturnType<typeof vi.fn> };
let status: Status;
let controller: typeof import("./offline-controller")["offlineController"];
let windowListeners: Map<string, () => void>;
let storage: Map<string, string>;
let fake: { onLine: boolean; connection: { saveData?: boolean } | undefined };

/** The store as the controller reads it. */
function storeOf(value: OfflineState | null, keys = new Set<string>(), lists = new Map<string, OfflineList>()): StoreRead {
  return { cache: value ? ({} as StoreRead["cache"]) : null, state: value, keys, lists };
}

async function load() {
  vi.resetModules();
  download = await import("./download") as never;
  status = await import("./offline-status");
  status.publishOffline({ support: "ok" });
  controller = (await import("./offline-controller")).offlineController;
}

beforeEach(async () => {
  windowListeners = new Map();
  storage = new Map();
  fake = { onLine: true, connection: undefined };
  // The worker that serves the page answers that it read the store anew.
  const worker = { postMessage: (_data: unknown, ports?: MessagePort[]) => ports?.[0]?.postMessage({ type: "offline-read" }) };
  vi.stubGlobal("window", {
    caches: { has: async () => true },
    location: { href: scope },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    },
    addEventListener: (type: string, listener: () => void) => windowListeners.set(type, listener),
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: () => undefined,
    querySelector: (selector: string) => selector.startsWith("link") ? { href: FONTS } : { src: `${scope}${ENTRY_A}` },
  });
  vi.stubGlobal("navigator", {
    get onLine() { return fake.onLine; },
    get connection() { return fake.connection; },
    storage: { persist: async () => true, persisted: async () => true, estimate: async () => ({}) },
    locks: { query: async () => ({ held: [] }), request: async () => undefined },
    serviceWorker: { controller: worker, ready: Promise.resolve({}), getRegistration: async () => ({ active: worker }) },
  });
  await load();
  download.fetchList.mockResolvedValue({ kind: "list", list: LIST_A });
  download.keepFonts.mockResolvedValue(true);
  download.moveTarget.mockResolvedValue(true);
});
afterEach(() => {
  controller.stop();
  vi.unstubAllGlobals();
});

/** The short words the controller says while the player is elsewhere, for a journey's run that ends this way. */
async function wordsFor(outcome: RunOutcome, by: "keep" | "update" = "keep"): Promise<OfflineEvent[]> {
  const heard: OfflineEvent[] = [];
  status.onOfflineEvent((event) => heard.push(event));
  download.readStore.mockResolvedValue(storeOf(null));
  download.keepRun.mockResolvedValue(outcome);
  await (by === "keep" ? controller.keep("milano") : controller.update());
  return heard;
}

describe("the words under the header", () => {
  it("say that a journey is in once its run is done, and not for a run of the kept journeys' newer files", async () => {
    expect(await wordsFor({ status: "done", kind: "first", switched: true })).toEqual([{ type: "done", journeyId: "milano" }]);
    await load();
    expect(await wordsFor({ status: "done", kind: "update", switched: true }, "update")).toEqual([]);
  });

  it("say why a journey's run stopped: the network, the room, or another problem; nothing for 止める", async () => {
    const cases: [RunOutcome & { status: "failed" }, OfflineEvent[]][] = [
      [{ status: "failed", kind: "first", reason: "offline" }, [{ type: "stopped", journeyId: "milano", reason: "offline" }]],
      [{ status: "failed", kind: "first", reason: "quota" }, [{ type: "stopped", journeyId: "milano", reason: "quota" }]],
      [{ status: "failed", kind: "first", reason: "no-space", needed: 9, free: 1 }, [{ type: "stopped", journeyId: "milano", reason: "quota" }]],
      [{ status: "failed", kind: "first", reason: "storage" }, [{ type: "stopped", journeyId: "milano", reason: "problem" }]],
      [{ status: "failed", kind: "first", reason: "mismatch" }, [{ type: "stopped", journeyId: "milano", reason: "problem" }]],
      [{ status: "failed", kind: null, reason: "stopped" }, []],
    ];
    for (const [outcome, words] of cases) {
      await load();
      expect(await wordsFor(outcome), outcome.reason).toEqual(words);
      expect(status.getOfflineSnapshot().stop?.reason, outcome.reason).toBe(outcome.reason === "replaced" ? "mismatch" : outcome.reason);
    }
  });

  it("say nothing a second time when the run that lost its network is tried again by itself and stops again", async () => {
    vi.useFakeTimers();
    try {
      const heard = await wordsFor({ status: "failed", kind: "first", reason: "offline" });
      expect(heard).toHaveLength(1);
      // The network is back: the same run goes on by itself, and stops again.
      windowListeners.get("online")!();
      await vi.advanceTimersByTimeAsync(0);
      await vi.waitFor(() => expect(download.keepRun).toHaveBeenCalledTimes(2));
      await vi.advanceTimersByTimeAsync(10);
      expect(heard).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the fonts", () => {
  const kept = () => storeOf(state({ installed: build(LIST_A) }), allKeys(LIST_A), new Map([[LIST_A.build, LIST_A]]));

  it("follow a journey's run once it is done", async () => {
    download.readStore.mockResolvedValue(kept());
    download.keepRun.mockResolvedValue({ status: "done", kind: "first", switched: true });
    await controller.keep("milano");
    await vi.waitFor(() => expect(download.keepFonts).toHaveBeenCalledTimes(1));
    expect(download.keepFonts.mock.calls[0].slice(1, 3)).toEqual([scope, FONTS]);
  });

  it("are tried again at a page's start and when the network is back, until they are kept", async () => {
    download.readStore.mockResolvedValue(kept());
    // (Each try ends with a look at the store: the fonts are not kept there yet.)
    const tried = async (times: number) => {
      await vi.waitFor(() => expect(download.keepFonts).toHaveBeenCalledTimes(times));
      await vi.waitFor(() => expect(status.getOfflineSnapshot().fonts).toBe("none"));
    };
    await controller.startup();
    await tried(1);
    windowListeners.get("online")!();
    await tried(2);
    // Kept: the next look says so, and nothing is tried again.
    download.readStore.mockResolvedValue(storeOf(state({ installed: build(LIST_A), fonts: FONTS }), allKeys(LIST_A), new Map([[LIST_A.build, LIST_A]])));
    await controller.refresh();
    windowListeners.get("online")!();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(download.keepFonts).toHaveBeenCalledTimes(2);
  });

  it("are not tried again with data saving, nor without a network", async () => {
    download.readStore.mockResolvedValue(kept());
    fake.connection = { saveData: true };
    await controller.startup();
    fake.connection = undefined;
    fake.onLine = false;
    windowListeners.get("online")!();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(download.keepFonts).not.toHaveBeenCalled();
  });
});

describe("a page's start", () => {
  it("moves a first run left midway to the site's newer build (the worker then no longer answers with the older files)", async () => {
    download.readStore.mockResolvedValue(storeOf(state({ target: build(LIST_A) }), new Set(), new Map([[LIST_A.build, LIST_A]])));
    download.fetchList.mockResolvedValue({ kind: "list", list: LIST_B });
    await controller.startup();
    expect(download.moveTarget).toHaveBeenCalledTimes(1);
    expect(download.moveTarget.mock.calls[0].slice(1, 4)).toEqual([scope, LIST_B, `${scope}${ENTRY_A}`]);
    // Nothing is loaded by itself: a journey left midway goes on only when the player asks.
    expect(download.keepRun).not.toHaveBeenCalled();
  });

  it("moves nothing when the run left midway is of the site's build, or without a network", async () => {
    download.readStore.mockResolvedValue(storeOf(state({ target: build(LIST_A) }), new Set(), new Map([[LIST_A.build, LIST_A]])));
    await controller.startup();
    fake.onLine = false;
    download.fetchList.mockResolvedValue({ kind: "list", list: LIST_B });
    await controller.startup();
    expect(download.moveTarget).not.toHaveBeenCalled();
  });
});

describe("the mirror of the kept journeys (the next start's title reads it before it can read the store)", () => {
  it("names the journeys complete on the device, and is removed when none is", async () => {
    download.readStore.mockResolvedValue(storeOf(state({ installed: build(LIST_A), target: { ...build(LIST_B), journeys: ["milano", "golden_triangle"] } }),
      allKeys(LIST_A), new Map([[LIST_A.build, LIST_A]])));
    await controller.refresh();
    expect(storage.get("dreamscape.offline.kept.v1")).toBe('["milano"]');
    // A first run left midway keeps nothing complete yet; a state of a later form tells nothing.
    for (const store of [storeOf(state({ target: build(LIST_A) })), { ...storeOf(null), cache: {} as StoreRead["cache"], state: "unreadable" as const }, storeOf(null)]) {
      storage.set("dreamscape.offline.kept.v1", '["milano"]');
      download.readStore.mockResolvedValue(store);
      await controller.refresh();
      expect(storage.has("dreamscape.offline.kept.v1"), JSON.stringify(store.state)).toBe(false);
    }
  });
});
