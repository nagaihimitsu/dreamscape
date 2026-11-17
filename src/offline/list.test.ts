import { describe, expect, it } from "vitest";
import { listSha, OFFLINE_LIST_FILE, PAGE_FILE, readOfflineList, UNLISTED_FILES, type OfflineList } from "./list";

// The list of 「オフラインで遊ぶ」 (user request 2026-11-17): the page and the worker read it strictly, so a list that
// is not one (a captive portal's page, a later format, a damaged copy) never decides what a device keeps or opens.
const sha = (letter: string) => letter.repeat(16);
const valid = (): OfflineList => ({
  schemaVersion: 1,
  build: sha("b"),
  release: 12,
  entry: "assets/index-WvJOQTlj.js",
  shared: [["assets/index-WvJOQTlj.js", 120, sha("1")], ["assets/se/ui_tap.mp3", 0, sha("2")], [PAGE_FILE, 40, sha("3")]],
  journeys: { milano: [["assets/tourism/milano/duomo.webp", 300, sha("4")]], golden_triangle: [] },
});
const changed = (change: (list: Record<string, unknown>) => void): unknown => {
  const list = JSON.parse(JSON.stringify(valid())) as Record<string, unknown>;
  change(list);
  return list;
};

describe("the offline list's reader", () => {
  it("reads a list as the build writes it, keeping the journeys' order and only the fields it knows", () => {
    expect(readOfflineList(JSON.parse(JSON.stringify(valid())))).toEqual(valid());
    const read = readOfflineList(changed((list) => { list.later = "field"; }));
    expect(read).toEqual(valid());
    expect(Object.keys((read as OfflineList).journeys)).toEqual(["milano", "golden_triangle"]);
    // A file without bytes (an empty one) and a local build's release 0 are a list.
    expect(readOfflineList(changed((list) => { list.release = 0; }))).toEqual({ ...valid(), release: 0 });
  });

  it("tells a later format from what is no list at all", () => {
    expect(readOfflineList(changed((list) => { list.schemaVersion = 2; }))).toBe("newer");
    expect(readOfflineList({ schemaVersion: 3 })).toBe("newer");
    for (const value of [null, undefined, "<!doctype html>", 1, [], {}, { schemaVersion: 0 }, { schemaVersion: "1" }, { schemaVersion: 1.5 }])
      expect(readOfflineList(value), JSON.stringify(value)).toBe("malformed");
  });

  it("refuses each shape that is not the list's", () => {
    const bad: [string, (list: Record<string, unknown>) => void][] = [
      ["a build name that is no 16 hex", (list) => { list.build = "B".repeat(16); }],
      ["a short build name", (list) => { list.build = "abc"; }],
      ["a negative release", (list) => { list.release = -1; }],
      ["a release that is no whole number", (list) => { list.release = 1.5; }],
      ["a release as text", (list) => { list.release = "3"; }],
      ["shared files that are no array", (list) => { list.shared = {}; }],
      ["journeys as an array", (list) => { list.journeys = []; }],
      ["a journey whose files are no array", (list) => { (list.journeys as Record<string, unknown>).milano = "assets"; }],
      ["a file that is no [path, bytes, sha]", (list) => { (list.shared as unknown[]).push(["assets/a.webp", 1]); }],
      ["a file as an object", (list) => { (list.shared as unknown[]).push({ path: "assets/a.webp", bytes: 1, sha: sha("5") }); }],
      ["a hash that is no 16 hex", (list) => { (list.shared as unknown[]).push(["assets/a.webp", 1, "xyz"]); }],
      ["a full SHA-256 as the hash", (list) => { (list.shared as unknown[]).push(["assets/a.webp", 1, "a".repeat(64)]); }],
      ["negative bytes", (list) => { (list.shared as unknown[]).push(["assets/a.webp", -1, sha("5")]); }],
      ["bytes that are no whole number", (list) => { (list.shared as unknown[]).push(["assets/a.webp", 1.5, sha("5")]); }],
      ["bytes as text", (list) => { (list.shared as unknown[]).push(["assets/a.webp", "1", sha("5")]); }],
      ["a path twice in one group", (list) => { (list.shared as unknown[]).push(["assets/se/ui_tap.mp3", 0, sha("2")]); }],
      ["a path in two groups", (list) => { (list.journeys as Record<string, unknown[]>).golden_triangle.push(["assets/tourism/milano/duomo.webp", 300, sha("4")]); }],
      ["an absolute path", (list) => { (list.shared as unknown[]).push(["/assets/a.webp", 1, sha("5")]); }],
      ["a path above the folder", (list) => { (list.shared as unknown[]).push(["assets/../../other/a.webp", 1, sha("5")]); }],
      ["a path that starts above the folder", (list) => { (list.shared as unknown[]).push(["../a.webp", 1, sha("5")]); }],
      ["a path with a backslash", (list) => { (list.shared as unknown[]).push(["\\\\other.example\\a.webp", 1, sha("5")]); }],
      ["an empty path", (list) => { (list.shared as unknown[]).push(["", 1, sha("5")]); }],
      ["a folder as a path", (list) => { (list.shared as unknown[]).push(["assets/", 1, sha("5")]); }],
      ["an entry script that is not listed", (list) => { list.entry = "assets/index-Other.js"; }],
      ["an entry script listed only in a journey", (list) => { list.entry = "assets/tourism/milano/duomo.webp"; }],
      ["no entry script", (list) => { delete list.entry; }],
      ["no page among the shared files", (list) => { list.shared = (list.shared as unknown[][]).filter(([path]) => path !== PAGE_FILE); }],
    ];
    for (const [name, change] of bad) expect(readOfflineList(changed(change)), name).toBe("malformed");
  });

  it("accepts file names with dots in them: only a whole `..` part leaves the folder", () => {
    expect(readOfflineList(changed((list) => { (list.shared as unknown[]).push(["assets/photo..large.webp", 1, sha("5")]); }))).not.toBe("malformed");
  });

  it("shortens a file's SHA-256 to the list's 16 hex, and never names the worker or itself", () => {
    expect(listSha("0123456789abcdef".repeat(4))).toBe("0123456789abcdef");
    expect(OFFLINE_LIST_FILE).toBe("offline-files.json");
    expect(UNLISTED_FILES).toEqual(["sw.js", "offline-files.json"]);
  });
});
