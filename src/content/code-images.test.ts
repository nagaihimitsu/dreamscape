import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CODE_IMAGE_FILES } from "./code-images";

// The dev server answers a missing image with its HTML page (status 200), so
// a lost file of the code would not show in the browser or the E2E guard.

const root = process.cwd();
/** Source files of the game (tests and generated content excluded), relative to the repository. */
function sourceFiles(directory = "src"): string[] {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return relative === "src/content/generated" ? [] : sourceFiles(relative);
    return /\.(?:tsx?|css)$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [relative] : [];
  });
}

describe("images the code uses", () => {
  it("are files of the root public/ folder, which every journey shares", () => {
    expect(CODE_IMAGE_FILES.length).toBeGreaterThan(0);
    const missing = CODE_IMAGE_FILES.filter((file) => {
      try {
        return !statSync(path.join(root, "public", file)).isFile();
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("are named only in code-images.ts", () => {
    // A served path in a string, after a template expression (`${BASE_URL}assets/`) or in CSS url(…).
    const servedPath = /[`"'}(](?:\.?\/)?assets\//u;
    // The folders whose files the content names by ID (album images, music, ambience, sounds, voices; content:build
    // checks each named file) are named by their modules as the folder alone or with a placeholder (`<folder>/<ID>`), never a file of the code.
    const contentFolder = /assets\/(?:album|ambience|bgm|se|voice)(?=["'`]|\/<)/gu;
    const naming = sourceFiles().filter((file) => file !== "src/content/code-images.ts")
      .flatMap((file) => readFileSync(path.join(root, file), "utf8").split("\n")
        .flatMap((line, index) => (servedPath.test(line.replace(contentFolder, "")) ? [`${file}:${index + 1}: ${line.trim()}`] : [])));
    expect(naming).toEqual([]);
  });
});
