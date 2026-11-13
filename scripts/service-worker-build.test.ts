import { describe, expect, it } from "vitest";
import { cacheVersions, entryScript, type BuiltFile } from "./service-worker-build";

const file = (path: string, text: string): BuiltFile => ({ path, bytes: Buffer.from(text) });
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

  it("names the page's entry script", () => {
    expect(entryScript(build[0].bytes.toString())).toBe("assets/index-WvJOQTlj.js");
    expect(() => entryScript("<p>no script</p>")).toThrow("index.html has no module script");
  });
});
