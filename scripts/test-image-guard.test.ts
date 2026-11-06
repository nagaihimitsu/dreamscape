import path from "node:path";
import { describe, expect, it } from "vitest";
import { changedFiles, journeyImageStates } from "./test-image-guard";

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
});
