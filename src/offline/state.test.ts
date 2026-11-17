import { describe, expect, it } from "vitest";
import type { OfflineList } from "./list";
import {
  completeTarget, DOWNLOAD_PARAM, fileType, fileUrl, listKey, OFFLINE_CACHE, OFFLINE_LOCK, offlineKey, readOfflineState, removeJourney, repin, startTarget, stateKey, unpin,
  type KeptBuild, type OfflineState,
} from "./state";
import { staleCache } from "../sw/cache-rules";

// What a device keeps for 「オフラインで遊ぶ」 (user decisions 2026-11-17): the keys of the store and the state's steps.
// A device opens the installed build until a newer one is complete, and never goes back to an older one.
const scope = "https://example.github.io/dreamscape/";
const sha = (letter: string) => letter.repeat(16);
const list = (build: string, release: number, journeys = ["milano", "golden_triangle"]): OfflineList => ({
  schemaVersion: 1, build: sha(build), release, entry: `assets/index-${build}.js`,
  shared: [["index.html", 10, sha("1")], [`assets/index-${build}.js`, 20, sha("2")]],
  journeys: Object.fromEntries(journeys.map((id) => [id, []])),
});
const build = (name: string, release: number, journeys: string[]): KeptBuild => ({ build: sha(name), release, entry: `assets/index-${name}.js`, journeys });
const state = (change: Partial<OfflineState> = {}): OfflineState => ({ schemaVersion: 1, installed: null, pin: true, target: null, previous: null, fonts: null, ...change });

describe("the store's keys", () => {
  it("is a cache no service worker's cleanup removes, written under one lock", () => {
    expect(OFFLINE_CACHE).toBe("dreamscape.offline");
    expect(OFFLINE_LOCK).toBe("dreamscape.offline");
    // Every worker, this version's and older ones, removes only its own caches of other versions: names that start with "dreamscape-".
    expect(staleCache(OFFLINE_CACHE, [])).toBe(false);
    expect(staleCache(OFFLINE_CACHE, ["dreamscape-pages", "dreamscape-code-c1", "dreamscape-media-m1"])).toBe(false);
  });

  it("stores each file under its address with the hash of its bytes, so two builds sit side by side", () => {
    expect(DOWNLOAD_PARAM).toBe("dreamscape-offline");
    expect(offlineKey(scope, "assets/tourism/milano/duomo.webp", sha("a"))).toBe(`${scope}assets/tourism/milano/duomo.webp?dreamscape-offline=${sha("a")}`);
    expect(offlineKey(scope, "index.html", sha("a"))).not.toBe(offlineKey(scope, "index.html", sha("b")));
    expect(listKey(scope, sha("c"))).toBe(`${scope}offline-files.json?dreamscape-offline=${sha("c")}`);
    expect(stateKey(scope)).toBe(`${scope}__offline__/state.json`);
  });

  it("makes an address of any file name, inside the folder", () => {
    expect(fileUrl(scope, "assets/se/ui_tap.mp3")).toBe(`${scope}assets/se/ui_tap.mp3`);
    expect(fileUrl(scope, "assets/photo 1#a?b%c.webp")).toBe(`${scope}assets/photo%201%23a%3Fb%25c.webp`);
    expect(fileUrl(scope, "assets/写真.webp")).toBe(`${scope}assets/${encodeURIComponent("写真")}.webp`);
    // The address reads back as the path (the worker finds a kept file by the path of the request).
    expect(decodeURIComponent(new URL(fileUrl(scope, "assets/photo 1#a?b%c.webp")).pathname.slice(new URL(scope).pathname.length))).toBe("assets/photo 1#a?b%c.webp");
    // A name that looks like an address stays a name.
    expect(fileUrl(scope, "https:evil.example")).toBe(`${scope}https%3Aevil.example`);
  });

  it("names a kept file's type by its extension, for every kind of file the build has", () => {
    expect(fileType("assets/index-WvJOQTlj.js")).toBe("text/javascript");
    expect(fileType("assets/index-iQZgONSX.css")).toBe("text/css");
    expect(fileType("index.html")).toBe("text/html; charset=utf-8");
    expect(fileType("third-party-licenses.json")).toBe("application/json");
    expect(fileType("manifest.webmanifest")).toBe("application/manifest+json");
    expect(fileType("assets/tourism/milano/duomo.WEBP")).toBe("image/webp");
    expect(fileType("icon-192.png")).toBe("image/png");
    expect(fileType("assets/a.jpg")).toBe("image/jpeg");
    expect(fileType("assets/items/item.svg")).toBe("image/svg+xml");
    expect(fileType("assets/voice/golden_triangle/gt_line_001.mp3")).toBe("audio/mpeg");
    expect(fileType("assets/movies/gt_opening.mp4")).toBe("video/mp4");
    expect(fileType("assets/Fasol-Regular-f1f2f3f4.otf")).toBe("font/otf");
    expect(fileType("assets/a.woff2")).toBe("font/woff2");
    expect(fileType("assets/unknown.bin")).toBe("application/octet-stream");
    expect(fileType("LICENSE")).toBe("application/octet-stream");
  });
});

describe("the state's reader", () => {
  const full = state({ installed: build("a", 3, ["milano"]), target: build("b", 4, ["milano", "golden_triangle"]), previous: { build: sha("9"), journeys: [] }, fonts: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP", pin: false });

  it("reads a state as the page writes it, and only the fields it knows", () => {
    expect(readOfflineState(JSON.parse(JSON.stringify(state())))).toEqual(state());
    expect(readOfflineState(JSON.parse(JSON.stringify(full)))).toEqual(full);
    expect(readOfflineState({ ...JSON.parse(JSON.stringify(full)), later: 1 })).toEqual(full);
  });

  it("calls unreadable a later version, nothing at all, and every shape that is not the state's", () => {
    const bad: [string, unknown][] = [
      ["nothing (a cache with files but no state)", undefined],
      ["null", null],
      ["text", "state"],
      ["an array", []],
      ["a later version", { ...full, schemaVersion: 2 }],
      ["no version", { ...full, schemaVersion: undefined }],
      ["a pin that is no boolean", { ...full, pin: "yes" }],
      ["no installed field", { ...full, installed: undefined }],
      ["an installed build without journeys", { ...full, installed: { ...full.installed, journeys: [] } }],
      ["a journey twice", { ...full, target: { ...full.target, journeys: ["milano", "milano"] } }],
      ["journeys that are no array", { ...full, installed: { ...full.installed, journeys: "milano" } }],
      ["a build name that is no 16 hex", { ...full, installed: { ...full.installed, build: "today" } }],
      ["a negative release", { ...full, installed: { ...full.installed, release: -1 } }],
      ["a release that is no whole number", { ...full, target: { ...full.target, release: 1.5 } }],
      ["no entry script", { ...full, installed: { ...full.installed, entry: "" } }],
      ["a target that is no build", { ...full, target: "b" }],
      ["a previous build without a name", { ...full, previous: { journeys: [] } }],
      ["a previous build whose journeys are no array", { ...full, previous: { build: sha("9") } }],
      ["fonts that are no address", { ...full, fonts: 1 }],
      ["no fonts field", { ...full, fonts: undefined }],
    ];
    for (const [name, value] of bad) expect(readOfflineState(value), name).toBe("unreadable");
  });
});

describe("the state's steps", () => {
  it("starts a first target on a device that keeps nothing: pinned once complete, nothing installed until then", () => {
    const started = startTarget(null, list("a", 3), ["golden_triangle"]);
    expect(started).toEqual(state({ target: build("a", 3, ["golden_triangle"]) }));
    expect(completeTarget(started!)).toEqual(state({ installed: build("a", 3, ["golden_triangle"]) }));
  });

  it("keeps the target's journeys in the list's order, with every installed journey, and only those the list has", () => {
    const installed = state({ installed: build("a", 3, ["golden_triangle"]) });
    // Adding a journey to the same build, and moving to a new build, both carry the installed journey along.
    expect(startTarget(installed, list("a", 3), ["milano"])?.target).toEqual(build("a", 3, ["milano", "golden_triangle"]));
    expect(startTarget(installed, list("b", 4), [])?.target).toEqual(build("b", 4, ["golden_triangle"]));
    expect(startTarget(installed, list("b", 4), ["milano", "trip_gone"])?.target).toEqual(build("b", 4, ["milano", "golden_triangle"]));
    // A journey the new list no longer has is left behind.
    expect(startTarget(installed, list("b", 4, ["milano"]), ["milano"])?.target).toEqual(build("b", 4, ["milano"]));
    // The rest of the state stays.
    const held = state({ installed: build("a", 3, ["milano"]), previous: { build: sha("9"), journeys: ["milano"] }, fonts: "https://fonts.googleapis.com/css2", pin: false });
    expect(startTarget(held, list("b", 4), [])).toEqual({ ...held, target: build("b", 4, ["milano"]) });
  });

  it("starts nothing for a list older than the installed build, or with none of the journeys", () => {
    const installed = state({ installed: build("b", 4, ["milano"]) });
    expect(startTarget(installed, list("a", 3), ["golden_triangle"])).toBe(installed);
    expect(startTarget(null, list("a", 3), ["trip_gone"])).toBeNull();
    expect(startTarget(null, list("a", 3), [])).toBeNull();
    // The same release (every local build is 0) is no step back.
    expect(startTarget(state({ installed: build("b", 0, ["milano"]) }), list("c", 0), [])?.target).toEqual(build("c", 0, ["milano"]));
  });

  it("switches to the complete target: the replaced build becomes the previous one only when the build changes", () => {
    const old = { build: sha("9"), journeys: ["milano"] };
    // A new build: the installed one becomes previous (the earlier previous is no longer named).
    const update = state({ installed: build("a", 3, ["milano"]), target: build("b", 4, ["milano"]), previous: old });
    expect(completeTarget(update)).toEqual(state({ installed: build("b", 4, ["milano"]), previous: { build: sha("a"), journeys: ["milano"] } }));
    // A journey added to the same build: previous stays.
    const added = state({ installed: build("a", 3, ["milano"]), target: build("a", 3, ["milano", "golden_triangle"]), previous: old });
    expect(completeTarget(added)).toEqual(state({ installed: build("a", 3, ["milano", "golden_triangle"]), previous: old }));
    // A first journey: nothing was replaced.
    expect(completeTarget(state({ target: build("a", 3, ["milano"]) })).previous).toBeNull();
    // The switch pins again a device that had taken the page from the network.
    expect(completeTarget({ ...update, pin: false }).pin).toBe(true);
    // Fonts are not the switch's business.
    expect(completeTarget({ ...update, fonts: "https://fonts.googleapis.com/css2" }).fonts).toBe("https://fonts.googleapis.com/css2");
  });

  it("never goes back: a target of a lower release is dropped, and without a target nothing changes", () => {
    const stale = state({ installed: build("b", 4, ["milano"]), target: build("a", 3, ["milano"]) });
    expect(completeTarget(stale)).toEqual(state({ installed: build("b", 4, ["milano"]) }));
    const settled = state({ installed: build("b", 4, ["milano"]) });
    expect(completeTarget(settled)).toBe(settled);
  });

  it("removes a journey from the installed build, the target and the previous build", () => {
    const both = state({
      installed: build("a", 3, ["milano", "golden_triangle"]), target: build("b", 4, ["milano", "golden_triangle"]),
      previous: { build: sha("9"), journeys: ["milano", "golden_triangle"] }, fonts: "https://fonts.googleapis.com/css2",
    });
    expect(removeJourney(both, "golden_triangle")).toEqual({
      ...both, installed: build("a", 3, ["milano"]), target: build("b", 4, ["milano"]), previous: { build: sha("9"), journeys: ["milano"] },
    });
    // A journey that was only being added: the target then equals the installed build, and nothing is left to load.
    const adding = state({ installed: build("a", 3, ["milano"]), target: build("a", 3, ["milano", "golden_triangle"]) });
    expect(removeJourney(adding, "golden_triangle")).toEqual(state({ installed: build("a", 3, ["milano"]) }));
    // The installed journey goes while another is still loading: only the target is left.
    expect(removeJourney(adding, "milano")).toEqual(state({ target: build("a", 3, ["golden_triangle"]) }));
    // A journey that is not kept changes nothing that is.
    expect(removeJourney(both, "trip_gone")).toEqual(both);
  });

  it("gives null when the last journey goes: the whole cache can be removed", () => {
    expect(removeJourney(state({ installed: build("a", 3, ["milano"]), previous: { build: sha("9"), journeys: ["milano"] }, fonts: "https://fonts.googleapis.com/css2" }), "milano")).toBeNull();
    expect(removeJourney(state({ target: build("a", 3, ["milano"]) }), "milano")).toBeNull();
    expect(removeJourney(state({ installed: build("a", 3, ["milano"]), target: build("b", 4, ["milano"]) }), "milano")).toBeNull();
  });

  it("unpins and pins again, changing nothing else", () => {
    const pinned = state({ installed: build("a", 3, ["milano"]) });
    expect(unpin(pinned)).toEqual({ ...pinned, pin: false });
    expect(repin(unpin(pinned))).toEqual(pinned);
    expect(repin(pinned)).toBe(pinned);
    expect(unpin(unpin(pinned))).toEqual({ ...pinned, pin: false });
  });
});
