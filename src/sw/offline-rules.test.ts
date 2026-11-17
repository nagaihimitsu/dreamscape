import { describe, expect, it } from "vitest";
import { cacheRule } from "./cache-rules";
import {
  installedPage, keptMaps, keptOf, offlineRoute, parseRange, rangeHeaders, storeTarget, unsatisfiableHeaders, wholeHeaders, type Kept, type Known,
} from "./offline-rules";
import type { OfflineList } from "../offline/list";
import { offlineKey, type OfflineState } from "../offline/state";

// How the service worker answers from what 「オフラインで遊ぶ」 keeps (user decisions 2026-11-17), on GitHub Pages' sub-path.
const scope = "https://example.github.io/dreamscape/";
const sha = (letter: string) => letter.repeat(16);
const key = (path: string, letter: string) => offlineKey(scope, path, sha(letter));

// Build a: the installed one. Build b: a newer one (its page, entry script and the Duomo photo changed). Build z: the one before a.
const listA: OfflineList = {
  schemaVersion: 1, build: sha("a"), release: 3, entry: "assets/index-Aaaaaaaa.js",
  shared: [["assets/index-Aaaaaaaa.js", 20, sha("1")], ["assets/se/ui_tap.mp3", 5, sha("2")], ["index.html", 10, sha("3")]],
  journeys: {
    milano: [["assets/bgm/milano/theme.mp3", 500, sha("4")], ["assets/tourism/milano/duomo.webp", 300, sha("5")]],
    golden_triangle: [["assets/movies/gt_opening.mp4", 900, sha("6")], ["assets/voice/golden_triangle/gt_line_001.mp3", 40, sha("7")]],
  },
};
const listB: OfflineList = {
  ...listA, build: sha("b"), release: 4, entry: "assets/index-Bbbbbbbb.js",
  shared: [["assets/index-Bbbbbbbb.js", 22, sha("8")], ["assets/se/ui_tap.mp3", 5, sha("2")], ["index.html", 10, sha("9")]],
  journeys: { ...listA.journeys, milano: [["assets/bgm/milano/theme.mp3", 500, sha("4")], ["assets/tourism/milano/duomo.webp", 310, sha("c")]] },
};
const listZ: OfflineList = {
  ...listA, build: sha("f"), release: 2, entry: "assets/index-Zzzzzzzz.js",
  shared: [["assets/index-Zzzzzzzz.js", 18, sha("d")], ["assets/se/ui_tap.mp3", 5, sha("2")], ["index.html", 10, sha("e")]],
};
const lists = new Map([listA, listB, listZ].map((list) => [list.build, list]));
const state = (change: Partial<OfflineState> = {}): OfflineState => ({
  schemaVersion: 1, pin: true, target: null, previous: null, fonts: null,
  installed: { build: sha("a"), release: 3, entry: listA.entry, journeys: ["milano"] }, ...change,
});
const updating = state({
  target: { build: sha("b"), release: 4, entry: listB.entry, journeys: ["milano", "golden_triangle"] },
  previous: { build: sha("f"), journeys: ["milano"] },
});

describe("what the worker reads of the store", () => {
  it("maps every kept path to its store keys: the installed build's first, then the target's, then the previous build's", () => {
    const files = keptMaps(lists, updating, scope);
    expect(files.get("index.html")).toEqual([key("index.html", "3"), key("index.html", "9"), key("index.html", "e")]);
    expect(files.get("assets/tourism/milano/duomo.webp")).toEqual([key("assets/tourism/milano/duomo.webp", "5"), key("assets/tourism/milano/duomo.webp", "c")]);
    // A file the builds share has one key.
    expect(files.get("assets/se/ui_tap.mp3")).toEqual([key("assets/se/ui_tap.mp3", "2")]);
    expect(files.get("assets/bgm/milano/theme.mp3")).toEqual([key("assets/bgm/milano/theme.mp3", "4")]);
    // Each build's own entry script, and the journey only the target keeps.
    expect(files.get("assets/index-Aaaaaaaa.js")).toEqual([key("assets/index-Aaaaaaaa.js", "1")]);
    expect(files.get("assets/index-Bbbbbbbb.js")).toEqual([key("assets/index-Bbbbbbbb.js", "8")]);
    expect(files.get("assets/index-Zzzzzzzz.js")).toEqual([key("assets/index-Zzzzzzzz.js", "d")]);
    expect(files.get("assets/movies/gt_opening.mp4")).toEqual([key("assets/movies/gt_opening.mp4", "6")]);
  });

  it("maps a build's shared files and only the journeys kept of it", () => {
    const files = keptMaps(lists, state(), scope);
    expect([...files.keys()].sort()).toEqual(["assets/bgm/milano/theme.mp3", "assets/index-Aaaaaaaa.js", "assets/se/ui_tap.mp3", "assets/tourism/milano/duomo.webp", "index.html"]);
    // A build whose list is not in the store adds nothing; with none, nothing is mapped.
    expect(keptMaps(new Map([[listB.build, listB]]), updating, scope).get("index.html")).toEqual([key("index.html", "9")]);
    expect(keptMaps(new Map(), updating, scope).size).toBe(0);
    expect(keptMaps(lists, state({ installed: null }), scope).size).toBe(0);
  });

  it("names the installed build's page and entry script, never the target's, with the state's pin", () => {
    expect(installedPage(lists, updating, scope)).toEqual({ key: key("index.html", "3"), entry: key("assets/index-Aaaaaaaa.js", "1"), pinned: true });
    expect(installedPage(lists, state({ pin: false }), scope)).toEqual({ key: key("index.html", "3"), entry: key("assets/index-Aaaaaaaa.js", "1"), pinned: false });
    // Nothing installed yet (a first journey still loading), or the installed build's list is gone: no page to open.
    expect(installedPage(lists, state({ installed: null, target: updating.target }), scope)).toBeNull();
    expect(installedPage(new Map([[listB.build, listB]]), updating, scope)).toBeNull();
    // A list without the page (the reader refuses such a list; the rule does not rely on it).
    const noPage = { ...listA, shared: listA.shared.filter(([path]) => path !== "index.html") };
    expect(installedPage(new Map([[listA.build, noPage]]), state(), scope)).toBeNull();
    expect(keptOf(lists, state({ fonts: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP" }), scope)).toEqual({
      files: keptMaps(lists, state(), scope), page: installedPage(lists, state(), scope), fonts: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP",
    });
  });
});

describe("where a request goes", () => {
  const fontsUrl = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap";
  const holder: Kept = keptOf(lists, state({ fonts: fontsUrl }), scope);
  const holderWithoutFonts: Kept = keptOf(lists, state(), scope);
  const loading: Kept = keptOf(lists, state({ installed: null, target: updating.target }), scope);
  const everyKnown: [string, Known][] = [["not read yet", "unknown"], ["nothing kept", null], ["a journey kept", holder]];
  const request = (url: string, extra: { mode?: string; range?: boolean; method?: string } = {}) =>
    ({ url: url.startsWith("https://") ? url : new URL(url, scope).href, method: extra.method ?? "GET", mode: extra.mode, range: extra.range });
  const route = (url: string, known: Known, extra?: { mode?: string; range?: boolean; method?: string }) => offlineRoute(request(url, extra), scope, known);

  it("leaves the page's own downloads and its list check to the network, whatever is kept", () => {
    for (const [name, known] of everyKnown) {
      expect(route(`./assets/tourism/milano/duomo.webp?dreamscape-offline=${sha("5")}`, known), name).toBe("pass");
      expect(route("./offline-files.json?dreamscape-offline=list", known), name).toBe("pass");
      expect(route(`./index.html?dreamscape-offline=${sha("3")}`, known), name).toBe("pass");
    }
    // The rule of before agrees: such a request is never kept in the worker's own caches either.
    expect(cacheRule(request(`./assets/tourism/milano/duomo.webp?dreamscape-offline=${sha("5")}`), scope)).toBe("pass");
  });

  it("leaves writes, other paths of the host and other sites to the browser, the map's tiles too", () => {
    for (const [name, known] of everyKnown) {
      expect(route("./assets/se/ui_tap.mp3", known, { method: "POST" }), name).toBe("pass");
      expect(route("./", known, { method: "POST", mode: "navigate" }), name).toBe("pass");
      expect(route("https://example.github.io/other/assets/se/ui_tap.mp3", known), name).toBe("pass");
      expect(route("https://tile.openstreetmap.org/16/1/2.png", known), name).toBe("pass");
      expect(route("https://example.org/", known, { mode: "navigate" }), name).toBe("pass");
    }
  });

  it("waits for the store when it has not been read yet: every request of the site and the fonts", () => {
    expect(route("./", "unknown", { mode: "navigate" })).toBe("await-state");
    expect(route("./assets/index-Aaaaaaaa.js", "unknown")).toBe("await-state");
    expect(route("./assets/bgm/milano/theme.mp3", "unknown", { range: true })).toBe("await-state");
    expect(route("./assets/movies/gt_opening.mp4", "unknown", { range: true })).toBe("await-state");
    expect(route("./manifest.webmanifest", "unknown")).toBe("await-state");
    expect(route(fontsUrl, "unknown")).toBe("await-state");
    expect(route("https://fonts.gstatic.com/s/notosansjp/v53/a.woff2", "unknown")).toBe("await-state");
  });

  it("answers a device that keeps nothing as before: today's rule for the site, the browser for the fonts", () => {
    for (const known of [null, { files: new Map(), page: null, fonts: null }] satisfies Known[]) {
      expect(route("./", known, { mode: "navigate" })).toBe("today");
      expect(route("./?debug&city=milano", known, { mode: "navigate" })).toBe("today");
      expect(route("./assets/index-Aaaaaaaa.js", known)).toBe("today");
      expect(route("./assets/tourism/milano/duomo.webp", known)).toBe("today");
      expect(route("./manifest.webmanifest", known)).toBe("today");
      // Today's rule itself leaves a range and a movie to the browser.
      expect(route("./assets/bgm/milano/theme.mp3", known, { range: true })).toBe("today");
      expect(cacheRule(request("./assets/bgm/milano/theme.mp3", { range: true }), scope)).toBe("pass");
      expect(route("./assets/movies/gt_opening.mp4", known)).toBe("today");
      expect(cacheRule(request("./assets/movies/gt_opening.mp4"), scope)).toBe("pass");
      expect(route(fontsUrl, known)).toBe("pass");
      expect(route("https://fonts.gstatic.com/s/notosansjp/v53/a.woff2", known)).toBe("pass");
    }
  });

  it("opens the page from the store when a build is installed, whatever its query", () => {
    expect(route("./", holder, { mode: "navigate" })).toBe("store");
    expect(route("./?debug&city=milano", holder, { mode: "navigate" })).toBe("store");
    expect(route("./index.html", holder, { mode: "navigate" })).toBe("store");
    expect(storeTarget(request("./?debug", { mode: "navigate" }), scope)).toEqual({ kind: "page" });
    // With only a target (a first journey still loading), the page is today's.
    expect(route("./", loading, { mode: "navigate" })).toBe("today");
  });

  it("answers a kept file from the store: code, pictures, sounds, a range, a movie, the unhashed files", () => {
    expect(route("./assets/index-Aaaaaaaa.js", holder)).toBe("store");
    expect(route("./assets/tourism/milano/duomo.webp", holder)).toBe("store");
    expect(route("./assets/tourism/milano/duomo.webp?v=2", holder)).toBe("store");
    expect(route("./assets/se/ui_tap.mp3", holder)).toBe("store");
    expect(route("./assets/bgm/milano/theme.mp3", holder, { range: true })).toBe("store");
    expect(route("./index.html", holder)).toBe("store");
    expect(storeTarget(request("./index.html"), scope)).toEqual({ kind: "file", path: "index.html" });
    // The movie of a journey that is being loaded is answered from the store as far as it is there.
    expect(route("./assets/movies/gt_opening.mp4", loading, { range: true })).toBe("store");
    expect(route("./assets/movies/gt_opening.mp4", loading)).toBe("store");
    // A path with escaped characters is found by its name.
    const spaced: Kept = { files: new Map([["assets/photo 1.webp", [key("assets/photo 1.webp", "1")]]]), page: null, fonts: null };
    expect(route("./assets/photo%201.webp", spaced)).toBe("store");
  });

  it("answers what is not kept as before: another journey's files, a newer build's script, a range and a movie", () => {
    expect(route("./assets/voice/golden_triangle/gt_line_001.mp3", holder)).toBe("today");
    expect(route("./assets/index-Bbbbbbbb.js", holder)).toBe("today");
    expect(route("./manifest.webmanifest", holder)).toBe("today");
    expect(route("./assets/voice/golden_triangle/gt_line_001.mp3", holder, { range: true })).toBe("today");
    expect(route("./assets/movies/gt_opening.mp4", holder, { range: true })).toBe("today");
    // A navigation to another address of the site is not the page.
    expect(route("./assets/voice/golden_triangle/gt_line_001.mp3", holder, { mode: "navigate" })).toBe("today");
    // A path that cannot be read as one is left to the browser.
    expect(route(`${scope}assets/%E0%A4%A.webp`, holder)).toBe("pass");
  });

  it("answers the fonts from the store only on a device that holds them: the held stylesheet and the font files", () => {
    expect(route(fontsUrl, holder)).toBe("store");
    expect(route("https://fonts.gstatic.com/s/notosansjp/v53/a.woff2", holder)).toBe("store");
    expect(storeTarget(request(fontsUrl), scope)).toEqual({ kind: "font" });
    // Another stylesheet of the host (another query) is not the held one.
    expect(route("https://fonts.googleapis.com/css2?family=Roboto", holder)).toBe("pass");
    expect(route(fontsUrl, holderWithoutFonts)).toBe("pass");
    expect(route("https://fonts.gstatic.com/s/notosansjp/v53/a.woff2", holderWithoutFonts)).toBe("pass");
    expect(route(fontsUrl, holder, { method: "POST" })).toBe("pass");
  });
});

describe("the part of a kept file a request asks for", () => {
  it("reads one byte range, clipped to the file", () => {
    expect(parseRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=0-", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=100-199", 1000)).toEqual({ start: 100, end: 199 });
    expect(parseRange("bytes=-500", 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange("bytes=-5000", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=999-999", 1000)).toEqual({ start: 999, end: 999 });
    expect(parseRange(" bytes=0-99 ", 1000)).toEqual({ start: 0, end: 99 });
  });

  it("calls a range that starts at or after the end unsatisfiable", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=1000-1100", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=5000-", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=0-", 0)).toBe("unsatisfiable");
    expect(parseRange("bytes=-5", 0)).toBe("unsatisfiable");
  });

  it("answers with the whole file for a header that is no single byte range", () => {
    for (const header of ["bytes=0-1,5-6", "items=0-1", "bytes=", "bytes=-", "bytes=a-b", "bytes=5-2", "0-1", "bytes 0-1", ""])
      expect(parseRange(header, 1000), header).toBeNull();
  });

  it("writes the headers of a whole file, of a part and of a part no file has", () => {
    expect(wholeHeaders("audio/mpeg", 1000)).toEqual({ "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "Content-Length": "1000" });
    expect(wholeHeaders("text/javascript", null)).toEqual({ "Content-Type": "text/javascript", "Accept-Ranges": "bytes" });
    expect(rangeHeaders(0, 99, 1000, "video/mp4")).toEqual({ "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Content-Range": "bytes 0-99/1000", "Content-Length": "100" });
    expect(rangeHeaders(999, 999, 1000, "audio/mpeg")["Content-Length"]).toBe("1");
    expect(unsatisfiableHeaders(1000)).toEqual({ "Content-Range": "bytes */1000" });
  });
});
