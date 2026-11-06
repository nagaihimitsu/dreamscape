import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assemblePublicDirectory, collectPublicFiles, findPublicFile, resolvePublicFile } from "./public-assets";

let root: string;
const write = (relative: string, data = "file") => {
  mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  writeFileSync(path.join(root, relative), data);
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "dreamscape-public-"));
  write("content/journeys/milano/manifest.json", JSON.stringify({ schemaVersion: 1, order: 10, id: "milano" }));
  write("content/journeys/golden_triangle/manifest.json", JSON.stringify({ schemaVersion: 1, order: 20, id: "golden_triangle" }));
  write("public/assets/items/item.svg");
  write("content/journeys/golden_triangle/public/assets/tourism/india/delhi.jpg");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("public files", () => {
  it("finds a URL path in the shared public folder or in a journey's public folder", () => {
    expect(resolvePublicFile(root, "assets/items/item.svg")).toBe(path.join(root, "public/assets/items/item.svg"));
    expect(resolvePublicFile(root, "assets/tourism/india/delhi.jpg"))
      .toBe(path.join(root, "content/journeys/golden_triangle/public/assets/tourism/india/delhi.jpg"));
    expect(findPublicFile(root, "assets/tourism/missing.jpg")).toBeUndefined();
    expect(() => resolvePublicFile(root, "assets/tourism/missing.jpg"))
      .toThrow("Missing public file: assets/tourism/missing.jpg (searched public/ and content/journeys/<journeyId>/public/)");
  });

  it("rejects a URL path provided by two folders", () => {
    write("content/journeys/milano/public/assets/items/item.svg");
    expect(() => findPublicFile(root, "assets/items/item.svg"))
      .toThrow("Public file assets/items/item.svg exists in more than one public folder: public/assets/items/item.svg and content/journeys/milano/public/assets/items/item.svg");
  });

  it("lists every served file of the shared and journey public folders by URL path", () => {
    write("public/.DS_Store");
    expect([...collectPublicFiles(root)]).toEqual([
      ["assets/items/item.svg", path.join(root, "public/assets/items/item.svg")],
      ["assets/tourism/india/delhi.jpg", path.join(root, "content/journeys/golden_triangle/public/assets/tourism/india/delhi.jpg")],
    ]);
    write("content/journeys/milano/public/assets/items/item.svg");
    expect(() => collectPublicFiles(root))
      .toThrow("Public file assets/items/item.svg exists in more than one public folder: public/assets/items/item.svg and content/journeys/milano/public/assets/items/item.svg");
  });

  it("assembles the served folder incrementally and removes files no folder provides", () => {
    const target = path.join(root, "src/content/generated/public");
    const served = (relative: string) => path.join(target, relative);
    expect(assemblePublicDirectory(collectPublicFiles(root), target)).toEqual({ copied: 2, removed: 0 });
    expect(readFileSync(served("assets/tourism/india/delhi.jpg"), "utf8")).toBe("file");
    // The copy keeps the source's modification time.
    expect(statSync(served("assets/items/item.svg")).mtimeMs)
      .toBeCloseTo(statSync(path.join(root, "public/assets/items/item.svg")).mtimeMs, 0);

    // Same size and time: left alone (a marker of the same size survives).
    const icon = statSync(served("assets/items/item.svg"));
    writeFileSync(served("assets/items/item.svg"), "mark");
    utimesSync(served("assets/items/item.svg"), icon.atimeMs / 1000, icon.mtimeMs / 1000);
    expect(assemblePublicDirectory(collectPublicFiles(root), target)).toEqual({ copied: 0, removed: 0 });
    expect(readFileSync(served("assets/items/item.svg"), "utf8")).toBe("mark");

    // Changed size, changed time only, a new journey file and a stray file.
    write("public/assets/items/item.svg", "changed icon");
    const photo = path.join(root, "content/journeys/golden_triangle/public/assets/tourism/india/delhi.jpg");
    writeFileSync(photo, "FILE");
    utimesSync(photo, new Date(2_000_000_000_000), new Date(2_000_000_000_000));
    write("content/journeys/milano/public/assets/tourism/duomo.webp", "duomo");
    write("src/content/generated/public/assets/old/stale.webp", "old");
    expect(assemblePublicDirectory(collectPublicFiles(root), target)).toEqual({ copied: 3, removed: 1 });
    expect(readFileSync(served("assets/items/item.svg"), "utf8")).toBe("changed icon");
    expect(readFileSync(served("assets/tourism/india/delhi.jpg"), "utf8")).toBe("FILE");
    expect(readFileSync(served("assets/tourism/duomo.webp"), "utf8")).toBe("duomo");
    expect(existsSync(served("assets/old"))).toBe(false);

    // A journey folder without public/ any more: its files leave the served folder.
    rmSync(path.join(root, "content/journeys/golden_triangle/public"), { recursive: true });
    expect(assemblePublicDirectory(collectPublicFiles(root), target)).toEqual({ copied: 0, removed: 1 });
    expect(existsSync(served("assets/tourism/india"))).toBe(false);
    expect(existsSync(served("assets/tourism/duomo.webp"))).toBe(true);
  });
});
