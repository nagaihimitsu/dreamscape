import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The game reads content only through the validated, merged mirror in
// src/content/generated/. The authored content/ tree is the pipeline's input:
// game code and browser tests must not import or read it directly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
/** Unit tests and their fixture helpers may copy and edit authored sources. */
const testCode = /(\.test\.tsx?|test-fixtures?\.ts)$/u;
const literalPatterns = [/"([^"\n]*)"/gu, /'([^'\n]*)'/gu, /`([^`]*)`/gu];

function codeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return location === path.join(root, "src/content/generated") ? [] : codeFiles(location);
    return /\.tsx?$/u.test(entry.name) ? [location] : [];
  });
}

/** String literals in `text` (the source of `file`) that point into the root content/ tree. */
export function rootContentReferences(file: string, text: string): string[] {
  // Each quote style is scanned separately so a stray apostrophe cannot hide a literal.
  return literalPatterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1])).filter((literal) => {
    const target = literal.split("?")[0];
    const resolved = target.startsWith(".")
      ? path.resolve(path.dirname(file), target)
      : /^\/?content(\/|$)/u.test(target) ? path.join(root, target) : undefined;
    return resolved !== undefined && (resolved === contentRoot || resolved.startsWith(`${contentRoot}${path.sep}`));
  });
}

describe("content boundary", () => {
  it("detects imports and file reads of the authored content/ tree", () => {
    const file = path.join(root, "src/content/index.ts");
    expect(rootContentReferences(file, [
      'import a from "../../content/battles/catalog.json";',
      "const b = import.meta.glob('../../content/cities/*.json');",
      "const c = `../../content/travel/${id}.json`;",
      'readFileSync(path.join(root, "content", "x.json"));',
      'fetch("/content/romance/balance.json?raw");',
      'readFile("content/quizzes/a.json");',
      // Allowed: the generated mirror and modules in src/content/.
      'import d from "./generated/content/battles/catalog.json";',
      'import { journeys } from "../content/journeys";',
      'const label = "contents";',
    ].join("\n"))).toEqual([
      "../../content/battles/catalog.json",
      "content",
      "/content/romance/balance.json?raw",
      "content/quizzes/a.json",
      "../../content/cities/*.json",
      "../../content/travel/${id}.json",
    ]);
    expect(rootContentReferences(path.join(root, "src/app/App.tsx"), 'import { getJourney } from "../content/journeys";')).toEqual([]);
  });

  it("keeps game code and browser tests on the generated mirror", () => {
    const files = [...codeFiles(path.join(root, "src")).filter((file) => !testCode.test(file)), ...codeFiles(path.join(root, "tests/e2e"))];
    expect(files.length).toBeGreaterThan(50);
    const violations = files.flatMap((file) =>
      rootContentReferences(file, readFileSync(file, "utf8")).map((literal) => `${path.relative(root, file)}: ${literal}`));
    expect(violations).toEqual([]);
  });
});
