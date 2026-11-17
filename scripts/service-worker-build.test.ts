import { describe, expect, it } from "vitest";
import { builtFile, type BuiltFile } from "./offline-list-build";
import { cacheVersions, entryScript } from "./service-worker-build";
import { fileRule } from "../src/sw/cache-rules";
import { OFFLINE_LIST_FILE } from "../src/offline/list";

const file = (path: string, text: string): BuiltFile => builtFile(path, Buffer.from(text));
const build: BuiltFile[] = [
  file("index.html", '<script type="module" crossorigin src="./assets/index-WvJOQTlj.js"></script>'),
  file("assets/index-WvJOQTlj.js", "console.log(1)"),
  file("assets/derived/milano/duomo.card.webp", "picture"),
  file("assets/movies/gt_opening.mp4", "movie"),
];

describe("service worker build", () => {
  it("versions the built files and the media apart, by their paths and contents", () => {
    const versions = cacheVersions(build);
    expect(versions.code).toMatch(/^[0-9a-f]{16}$/u);
    // The order of the files does not matter.
    expect(cacheVersions([...build].reverse())).toEqual(versions);
    // A new script keeps the media version (the player's cached pictures and sounds stay).
    const code = cacheVersions(build.map((item) => item.path.endsWith(".js") ? file("assets/index-Bx1yZ2aQ.js", "console.log(2)") : item));
    expect(code.code).not.toBe(versions.code);
    expect(code.media).toBe(versions.media);
    // A changed picture (same name) changes the media version only.
    const media = cacheVersions(build.map((item) => item.path.endsWith(".webp") ? file(item.path, "picture, again") : item));
    expect(media).toEqual({ code: versions.code, media: expect.not.stringMatching(versions.media) });
    // Files the worker never keeps (the page, a movie) change no version.
    expect(cacheVersions(build.map((item) => item.path.endsWith(".mp4") || item.path === "index.html" ? file(item.path, "new") : item))).toEqual(versions);
  });

  it("keeps the versions it has given since 2026-11-13: each file's hash is computed once (for the offline list too) and used as before", () => {
    // Another formula would make every player's device drop its kept pictures and sounds once, for nothing.
    expect(cacheVersions(build)).toEqual({ code: "0899816ca90abbd6", media: "fe0cf85a8a264fcf" });
    // The versions read the hash the list reads: no second pass over the bytes.
    const hashes = Object.fromEntries(build.map((item) => [item.path, item.sha256]));
    expect(cacheVersions(build.map(({ path }) => ({ path, sha256: hashes[path] })))).toEqual(cacheVersions(build));
    expect(build[1].sha256).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("gives the offline list's file no part in either version: writing it changes no player's caches", () => {
    expect(fileRule(OFFLINE_LIST_FILE)).toBe("network-first");
    const versions = cacheVersions(build);
    expect(cacheVersions([...build, file(OFFLINE_LIST_FILE, '{"schemaVersion":1}')])).toEqual(versions);
    expect(cacheVersions([...build, file(OFFLINE_LIST_FILE, '{"schemaVersion":1,"release":2}')])).toEqual(versions);
  });

  it("names the page's entry script", () => {
    expect(entryScript('<script type="module" crossorigin src="./assets/index-WvJOQTlj.js"></script>')).toBe("assets/index-WvJOQTlj.js");
    expect(() => entryScript("<p>no script</p>")).toThrow("index.html has no module script");
  });
});
