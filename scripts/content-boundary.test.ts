import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The game reads content only through the validated, merged mirror in
// src/content/generated/. The authored content/ tree is the pipeline's input:
// game code and browser tests must not import or read it directly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
/**
 * Unit tests and their fixture helper (src/content/test-fixtures.ts) may copy
 * and edit authored sources. Other *-test-fixture.ts modules are imported by
 * Debug mode at runtime and stay checked.
 */
const testCode = (file: string) => /\.test\.tsx?$/u.test(file) || file === path.join(root, "src/content/test-fixtures.ts");
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
    const files = [...codeFiles(path.join(root, "src")).filter((file) => !testCode(file)), ...codeFiles(path.join(root, "tests/e2e"))];
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain(path.join(root, "src/domain/multi-city-test-fixture.ts"));
    expect(files).toContain(path.join(root, "src/domain/golden-triangle-test-fixture.ts"));
    const violations = files.flatMap((file) =>
      rootContentReferences(file, readFileSync(file, "utf8")).map((literal) => `${path.relative(root, file)}: ${literal}`));
    expect(violations).toEqual([]);
  });
});

describe("journey-specific tools", () => {
  // scripts/journeys/<journeyId>/ holds tools for one journey. Shared code and
  // tools choose per-journey behavior from manifest data, never by importing them.
  const journeyTools = path.join(root, "scripts/journeys");
  const imports = (file: string, text: string) => [...text.matchAll(/(?:from|import\()\s*["']([^"']+)["']/gu)]
    .map((match) => match[1]).filter((specifier) => specifier.startsWith("."))
    .filter((specifier) => {
      const target = path.resolve(path.dirname(file), specifier);
      return target === journeyTools || target.startsWith(`${journeyTools}${path.sep}`);
    });

  it("detects imports of a journey's tools", () => {
    expect(imports(path.join(root, "scripts/city-bundle.ts"), [
      'import { a } from "./journeys/golden_triangle/india-draft";',
      'const b = await import("../scripts/journeys/golden_triangle/india-followup");',
      'import { c } from "./journey-transit-decisions";',
    ].join("\n"))).toEqual(["./journeys/golden_triangle/india-draft", "../scripts/journeys/golden_triangle/india-followup"]);
  });

  it("keeps shared code and tools independent of them", () => {
    // This file's own examples above are not imports.
    const files = [...codeFiles(path.join(root, "src")), ...codeFiles(path.join(root, "scripts"))]
      .filter((file) => !file.startsWith(`${journeyTools}${path.sep}`) && file !== fileURLToPath(import.meta.url));
    expect(files).toContain(path.join(root, "scripts/city-bundle.ts"));
    const violations = files.flatMap((file) => imports(file, readFileSync(file, "utf8")).map((specifier) => `${path.relative(root, file)}: ${specifier}`));
    expect(violations).toEqual([]);
  });
});
