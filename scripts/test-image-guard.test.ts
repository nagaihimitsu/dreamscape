import path from "node:path";
import { describe, expect, it } from "vitest";
import { changedFiles, changedImagesMessage, journeyImageStates } from "./test-image-guard";

describe("journey image guard", () => {
  it("records every file of the journeys' public folders, not the shared public/", () => {
    const root = path.resolve(".");
    const files = [...journeyImageStates(root).keys()].map((file) => path.relative(root, file));
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => /^content\/journeys\/[a-z][a-z0-9_]*\/public\//u.test(file))).toBe(true);
  });

  it("reports changed, added and removed files", () => {
    const before = new Map([["a.webp", "10:1"], ["b.webp", "20:2"], ["c.webp", "30:3"]]);
    const after = new Map([["a.webp", "10:1"], ["b.webp", "20:9"], ["d.webp", "40:4"]]);
    expect(changedFiles(before, after)).toEqual(["b.webp", "c.webp", "d.webp"]);
    expect(changedFiles(before, new Map(before))).toEqual([]);
  });

  it("says how to restore the committed images and warns about images that were never committed", () => {
    const root = path.resolve("repo");
    const file = (name: string) => path.join(root, "content/journeys/x/public", name);
    const message = changedImagesMessage(root, new Map([[file("a.webp"), "1:1"], [file("b.webp"), "2:2"]]), [file("a.webp"), file("b.webp"), file("new.webp")]);
    expect(message).toContain("git checkout -- content/journeys/x/public/a.webp content/journeys/x/public/b.webp\n");
    expect(message).toContain("  content/journeys/x/public/new.webp (added by the tests: delete it)");
    expect(message).toContain("cannot be restored from git");
  });
});
