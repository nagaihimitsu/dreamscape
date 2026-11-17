import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { JourneyFiles } from "./journey-files";
import { builtFile, describeOfflineSizes, offlineList, releaseNumber, type BuiltFile } from "./offline-list-build";
import { SERVICE_WORKER_FILE } from "./service-worker-build";
import { OFFLINE_LIST_FILE, readOfflineList, UNLISTED_FILES } from "../src/offline/list";

// The build's list for 「オフラインで遊ぶ」 (user request 2026-11-17), over a small fictional build: every file of it
// in exactly one group, the journey's own or what every journey shares.
const file = (path: string, text: string): BuiltFile => builtFile(path, Buffer.from(text));
const indexHtml = '<script type="module" crossorigin src="./assets/index-WvJOQTlj.js"></script><link rel="stylesheet" href="./assets/index-iQZgONSX.css">';
const dist: BuiltFile[] = [
  file("index.html", indexHtml),
  file("manifest.webmanifest", "{}"),
  file("third-party-licenses.json", "[]"),
  file("favicon-32.png", "icon"),
  file("assets/index-WvJOQTlj.js", "console.log(1)"),
  file("assets/index-iQZgONSX.css", "body{}"),
  // Debug's chunk and a preparing journey's part: a page of the kept build may ask for any built script.
  file("assets/DebugMode-x1y2z3a4.js", "debug"),
  file("assets/trip_b-b1b2b3b4.js", "part of trip_b"),
  file("assets/trip-t1t2t3t4.js", "part of trip"),
  file("assets/Fasol-Regular-f1f2f3f4.otf", "font"),
  file("assets/se/ui_tap.mp3", "tap"),
  file("assets/movies/opening.mp4", "movie of the root"),
  file("assets/tourism/trip/tower.webp", "tower"),
  file("assets/derived/trip/tower.card.webp", "tower, small"),
  file("assets/voice/trip_two/line_001.mp3", "voice"),
  file("assets/movies/trip_two_opening.mp4", "movie"),
];
const owners: JourneyFiles = { schemaVersion: 1, journeys: {
  trip: ["assets/derived/trip/tower.card.webp", "assets/tourism/trip/tower.webp"],
  trip_two: ["assets/movies/trip_two_opening.mp4", "assets/voice/trip_two/line_001.mp3"],
  trip_b: ["assets/tourism/b/harbour.webp"],
} };
const playable = ["trip", "trip_two"];
const list = (change: Partial<Parameters<typeof offlineList>[0]> = {}) => offlineList({ files: dist, indexHtml, owners, playable, release: 7, ...change });
const sha16 = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

describe("the offline list of a build", () => {
  it("puts each journey's own files in its group and everything else in the shared one, sorted by path", () => {
    const built = list();
    expect(built.journeys).toEqual({
      trip: [["assets/derived/trip/tower.card.webp", 12, sha16("tower, small")], ["assets/tourism/trip/tower.webp", 5, sha16("tower")]],
      trip_two: [["assets/movies/trip_two_opening.mp4", 5, sha16("movie")], ["assets/voice/trip_two/line_001.mp3", 5, sha16("voice")]],
    });
    // The catalog's order of the playable journeys, not the alphabet's.
    expect(Object.keys(list({ playable: ["trip_two", "trip"] }).journeys)).toEqual(["trip_two", "trip"]);
    expect(built.shared.map(([path]) => path)).toEqual([
      "assets/DebugMode-x1y2z3a4.js", "assets/Fasol-Regular-f1f2f3f4.otf", "assets/index-WvJOQTlj.js", "assets/index-iQZgONSX.css",
      "assets/movies/opening.mp4", "assets/se/ui_tap.mp3", "assets/trip-t1t2t3t4.js", "assets/trip_b-b1b2b3b4.js",
      "favicon-32.png", "index.html", "manifest.webmanifest", "third-party-licenses.json",
    ]);
    expect(built.shared.find(([path]) => path === "index.html")).toEqual(["index.html", Buffer.byteLength(indexHtml), sha16(indexHtml)]);
    expect({ schemaVersion: built.schemaVersion, release: built.release, entry: built.entry }).toEqual({ schemaVersion: 1, release: 7, entry: "assets/index-WvJOQTlj.js" });
    // Every file of the build is in exactly one group, and the page and the worker read the list back.
    const all = [...built.shared, ...Object.values(built.journeys).flat()].map(([path]) => path);
    expect(all.sort()).toEqual(dist.map((item) => item.path).sort());
    expect(readOfflineList(JSON.parse(JSON.stringify(built)))).toEqual(built);
  });

  it("leaves out the service worker and the list itself", () => {
    expect(UNLISTED_FILES).toContain(SERVICE_WORKER_FILE);
    const withBoth = list({ files: [...dist, file(SERVICE_WORKER_FILE, "worker"), file(OFFLINE_LIST_FILE, "an older list")] });
    expect(withBoth).toEqual(list());
    // A new worker alone is no new build for a device that keeps a journey.
    expect(list({ files: [...dist, file(SERVICE_WORKER_FILE, "worker, changed")] }).build).toBe(list().build);
  });

  it("names the build by its files: the same for any order, another when one listed byte or path changes", () => {
    const build = list().build;
    expect(build).toMatch(/^[0-9a-f]{16}$/u);
    expect(list({ files: [...dist].reverse() })).toEqual(list());
    const withText = (path: string, text: string) => dist.map((item) => item.path === path ? file(path, text) : item);
    expect(list({ files: withText("assets/tourism/trip/tower.webp", "tower!") }).build).not.toBe(build);
    expect(list({ files: withText("assets/se/ui_tap.mp3", "tap!") }).build).not.toBe(build);
    expect(list({ files: [...dist, file("assets/se/ui_back.mp3", "back")] }).build).not.toBe(build);
    // The deploy's number is passed through and is no part of the name: the same files are the same build.
    expect(list({ release: 8 })).toEqual({ ...list(), release: 8 });
    expect(list({ release: 0 }).release).toBe(0);
  });

  it("stops the build on a file of a journey players cannot open, a missing file of one they can, and a journey the content's list lacks", () => {
    expect(() => list({ files: [...dist, file("assets/tourism/b/harbour.webp", "harbour")] }))
      .toThrow("公開していない旅行編のファイルが本番ビルドにあります: assets/tourism/b/harbour.webp（trip_b）");
    expect(() => list({ files: dist.filter((item) => item.path !== "assets/voice/trip_two/line_001.mp3") }))
      .toThrow("trip_two の配信ファイルが本番ビルドにありません（1 件）: assets/voice/trip_two/line_001.mp3");
    expect(() => list({ playable: ["trip", "trip_two", "trip_new"] }))
      .toThrow("旅行編ごとの配信ファイルの一覧に trip_new がありません。npm run content:build で生成し直してからビルドしてください。");
    // A playable journey without files of its own has an empty group.
    expect(list({ owners: { schemaVersion: 1, journeys: { ...owners.journeys, trip_new: [] } }, playable: ["trip", "trip_two", "trip_new"] }).journeys.trip_new).toEqual([]);
  });

  it("stops the build when the page or its entry script is not in it", () => {
    expect(() => list({ files: dist.filter((item) => item.path !== "assets/index-WvJOQTlj.js") })).toThrow("offline-files.json を作れません");
    expect(() => list({ files: dist.filter((item) => item.path !== "index.html") })).toThrow("offline-files.json を作れません");
    expect(() => list({ indexHtml: "<p>no script</p>" })).toThrow("index.html has no module script");
  });

  it("reads the deploy's number from DREAMSCAPE_RELEASE: 0 without one, and no silent 0 for a value that is no number", () => {
    expect(releaseNumber(undefined)).toBe(0);
    expect(releaseNumber("")).toBe(0);
    expect(releaseNumber("0")).toBe(0);
    expect(releaseNumber("412")).toBe(412);
    for (const value of ["v12", "-1", "1.5", " 3", "1e3", "99999999999999999999"])
      expect(() => releaseNumber(value), value).toThrow(`DREAMSCAPE_RELEASE（${value}）は0以上の整数にしてください`);
  });

  // Without it every deploy would be release 0: a device could then take an older list (a stale copy of the site, a
  // re-run of an old deploy) for a newer build.
  it("the Pages workflow numbers each deploy: its build step sets DREAMSCAPE_RELEASE to the run number", () => {
    const workflow = readFileSync(path.join(import.meta.dirname, "../.github/workflows/pages.yml"), "utf8");
    expect(workflow).toMatch(/\n {8}run: npm run build\n {8}env:\n(?: {10}.*\n)*? {10}DREAMSCAPE_RELEASE: \$\{\{ github\.run_number \}\}\n/u);
  });

  it("prints what a device takes in: the shared files, each journey's own, and both for a first journey", () => {
    const big = (path: string, bytes: number): BuiltFile => ({ path, bytes, sha256: "a".repeat(64) });
    const sizes = describeOfflineSizes(offlineList({
      files: [file("index.html", indexHtml), big("assets/index-WvJOQTlj.js", 37_600_000 - Buffer.byteLength(indexHtml)), big("assets/tourism/trip/tower.webp", 7_300_000),
        big("assets/derived/trip/tower.card.webp", 10_000), big("assets/voice/trip_two/line_001.mp3", 132_200_000), big("assets/movies/trip_two_opening.mp4", 49_999)],
      indexHtml, owners, playable, release: 0,
    }));
    expect(sizes).toBe([
      "端末に入れる大きさ（オフラインで遊ぶ）: 共通 37.6 MB（2 ファイル）",
      "- trip: 7.3 MB（2 ファイル）。最初の旅行編なら共通と合わせて 44.9 MB",
      "- trip_two: 132.2 MB（2 ファイル）。最初の旅行編なら共通と合わせて 169.8 MB",
    ].join("\n"));
  });
});
