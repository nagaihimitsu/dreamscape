import { describe, expect, it } from "vitest";
import { cacheKey, cacheNames, cacheRule, fileRule, staleCache } from "./cache-rules";

// The service worker's rules (2026-11-13): which request it answers how, on GitHub Pages' sub-path.
const scope = "https://example.github.io/dreamscape/";
const get = (path: string, extra: { mode?: string; range?: boolean; method?: string } = {}) =>
  cacheRule({ url: new URL(path, scope).href, method: extra.method ?? "GET", mode: extra.mode, range: extra.range }, scope);

describe("service worker cache rules", () => {
  it("takes the page from the network first, whatever its query", () => {
    expect(get("./", { mode: "navigate" })).toBe("network-first");
    expect(get("./?debug&city=milano", { mode: "navigate" })).toBe("network-first");
    expect(get("./index.html")).toBe("network-first");
    // Every query opens the same page: one copy, kept under the scope.
    expect(cacheKey({ url: `${scope}?debug`, method: "GET", mode: "navigate" }, scope)).toBe(scope);
  });

  it("keeps Vite's content-named files and the served pictures and sounds, cache first", () => {
    expect(get("./assets/index-WvJOQTlj.js")).toBe("code");
    expect(get("./assets/leaflet-library-9SJOxb-Y.js")).toBe("code");
    expect(get("./assets/index-iQZgONSX.css")).toBe("code");
    expect(get("./assets/milano-CIROYwq3.js")).toBe("code");
    expect(get("./assets/derived/milano/duomo_milano_photo.card.webp")).toBe("media");
    expect(get("./assets/tourism/india/agra_taj_mahal.webp")).toBe("media");
    expect(get("./assets/voice/golden_triangle/gt_line_001.mp3")).toBe("media");
    expect(get("./assets/se/ui_confirm.mp3")).toBe("media");
    // A served file directly in assets/ without Vite's hash is a picture like the others.
    expect(fileRule("assets/title.webp")).toBe("media");
    expect(cacheKey({ url: `${scope}assets/se/ui_tap.mp3?v=2`, method: "GET" }, scope)).toBe(`${scope}assets/se/ui_tap.mp3`);
  });

  it("asks the network first for the other files of the site (an update shows at once)", () => {
    for (const file of ["manifest.webmanifest", "third-party-licenses.json", "favicon-32.png", "icon-192.png", "sw.js"])
      expect(get(`./${file}`), file).toBe("network-first");
  });

  it("leaves to the browser what it must not keep: other sites, other paths, writes, ranges and movies", () => {
    expect(cacheRule({ url: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP", method: "GET" }, scope)).toBe("pass");
    expect(cacheRule({ url: "https://tile.openstreetmap.org/16/1/2.png", method: "GET" }, scope)).toBe("pass");
    // Another project on the same GitHub Pages host is outside the scope.
    expect(cacheRule({ url: "https://example.github.io/other/assets/index-WvJOQTlj.js", method: "GET" }, scope)).toBe("pass");
    expect(get("./assets/index-WvJOQTlj.js", { method: "POST" })).toBe("pass");
    expect(get("./assets/voice/golden_triangle/gt_line_001.mp3", { range: true })).toBe("pass");
    expect(get("./assets/movies/gt_opening.mp4")).toBe("pass");
  });

  it("names its caches by version and removes only its own older ones", () => {
    const names = cacheNames({ code: "c1", media: "m1" });
    expect(names).toEqual({ "network-first": "dreamscape-pages", code: "dreamscape-code-c1", media: "dreamscape-media-m1" });
    const current = Object.values(names);
    expect(staleCache("dreamscape-code-c0", current)).toBe(true);
    expect(staleCache("dreamscape-code-c1", current)).toBe(false);
    expect(staleCache("dreamscape-media-m0", current)).toBe(true);
    expect(staleCache("dreamscape-pages", current)).toBe(false);
    expect(staleCache("another-app-cache", current)).toBe(false);
  });
});
