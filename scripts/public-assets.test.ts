import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPublicFile, resolvePublicFile } from "./public-assets";

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
});
