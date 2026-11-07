import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_ID } from "./content-layout";

// The game reads content only through the validated, merged mirror in
// src/content/generated/. The authored content/ tree is the pipeline's input:
// game code and browser tests must not import or read it directly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
/**
 * Unit tests and their fixture helper (src/content/test-fixtures.ts) may copy
 * and edit authored sources. The in-memory test cities (src/dev/test-cities.ts)
 * are imported by Debug mode at runtime and stay checked.
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
    expect(files).toContain(path.join(root, "src/dev/test-cities.ts"));
    const violations = files.flatMap((file) =>
      rootContentReferences(file, readFileSync(file, "utf8")).map((literal) => `${path.relative(root, file)}: ${literal}`));
    expect(violations).toEqual([]);
  });
});

describe("journey-specific tools and tests", () => {
  // scripts/journeys/<journeyId>/ holds tools for one journey and
  // tests/journeys/<journeyId>/ the tests of its own content, route and tools.
  // Shared code, tools and tests choose per-journey behavior from manifest
  // data, never by importing them, and one journey's folders never import
  // another journey's, so a journey's folders go with the journey.
  const journeyFolders = [path.join(root, "scripts/journeys"), path.join(root, "tests/journeys")];
  const inside = (file: string, folder: string) => file === folder || file.startsWith(`${folder}${path.sep}`);
  /** The journey whose tool or test folder holds `file`, or undefined for shared code. */
  const journeyOf = (file: string) => {
    const folder = journeyFolders.find((candidate) => inside(file, candidate));
    return folder === undefined || file === folder ? undefined : path.relative(folder, file).split(path.sep)[0];
  };
  // Every module specifier: `… from "x"` (type-only imports too: deleting the
  // folder would break the type check), side-effect `import "x"` and `import("x")`.
  const specifiers = (text: string) => [...text.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/gu)].map((match) => match[1]);
  /** Relative imports of `file` that reach a journey folder other than its own. */
  const imports = (file: string, text: string) => specifiers(text).filter((specifier) => {
    if (!specifier.startsWith(".")) return false;
    const target = path.resolve(path.dirname(file), specifier);
    return journeyFolders.some((folder) => inside(target, folder)) && journeyOf(target) !== journeyOf(file);
  });

  // The examples use made-up journeys (trip_a, trip_b): this file names no journey of the
  // repository, so removing any journey leaves it unchanged.
  it("detects imports of a journey's tools and tests", () => {
    expect(imports(path.join(root, "scripts/city-bundle.ts"), [
      'import { a } from "./journeys/trip_a/draft";',
      'const b = await import("../scripts/journeys/trip_a/followup");',
      'import { c } from "./journey-transit-decisions";',
      'import { d } from "../tests/journeys/trip_a/test-journey";',
      'import { e } from "../tests/fixtures/current-game";',
      'import "../tests/journeys/trip_b/setup";',
      'import type { F } from "../tests/journeys/trip_b/types";',
      'export { g } from "./journeys/trip_a/draft";',
    ].join("\n"))).toEqual([
      "./journeys/trip_a/draft",
      "../scripts/journeys/trip_a/followup",
      "../tests/journeys/trip_a/test-journey",
      "../tests/journeys/trip_b/setup",
      "../tests/journeys/trip_b/types",
      "./journeys/trip_a/draft",
    ]);
  });

  it("detects imports of another journey's tools and tests from a journey folder", () => {
    const testOfA = path.join(root, "tests/journeys/trip_a/city.test.ts");
    expect(imports(testOfA, [
      // Its own folder, its own tools and shared code are fine.
      'import { a } from "./full-route-helpers";',
      'import { b } from "../../../scripts/journeys/trip_a/tool";',
      'import { c } from "../../../src/domain/city";',
      // Another journey's tests and tools are not.
      'import { installTestTrip } from "../trip_b/test-journey";',
      'import "../trip_b/setup";',
      'import { d } from "../../../scripts/journeys/trip_b/draft";',
    ].join("\n"))).toEqual([
      "../trip_b/test-journey",
      "../trip_b/setup",
      "../../../scripts/journeys/trip_b/draft",
    ]);
    const toolOfB = path.join(root, "scripts/journeys/trip_b/draft.ts");
    expect(imports(toolOfB, [
      'import { a } from "../../../tests/journeys/trip_b/test-journey";',
      'import { b } from "../../../tests/journeys/trip_a/full-route-helpers";',
    ].join("\n"))).toEqual(["../../../tests/journeys/trip_a/full-route-helpers"]);
  });

  it("keeps shared code, tools and tests independent of them, and each journey's folders of the others'", () => {
    // This file's own examples above are not imports.
    const files = ["src", "scripts", "tests"].flatMap((folder) => codeFiles(path.join(root, folder)))
      .filter((file) => file !== fileURLToPath(import.meta.url));
    expect(files).toContain(path.join(root, "scripts/city-bundle.ts"));
    expect(files).toContain(path.join(root, "tests/e2e/helpers.ts"));
    // Journey folders are scanned too (no journey named here: removing one must not fail this test).
    expect(files.some((file) => journeyOf(file) !== undefined)).toBe(true);
    const violations = files.flatMap((file) => imports(file, readFileSync(file, "utf8")).map((specifier) => `${path.relative(root, file)}: ${specifier}`));
    expect(violations).toEqual([]);
  });

  it("names a journey with each of its tool and test folders", () => {
    // A folder left behind after its journey was removed fails here.
    const journeyIds = readdirSync(path.join(contentRoot, "journeys"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(path.join(contentRoot, "journeys", entry.name, "manifest.json")))
      .map((entry) => entry.name);
    expect(journeyIds.length).toBeGreaterThan(0);
    // scripts/journeys/ goes away with the last journey that has its own tools (Git keeps no empty folder).
    const folders = journeyFolders.filter((folder) => existsSync(folder)).flatMap((folder) => readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => path.relative(root, path.join(folder, entry.name))));
    expect(folders.length).toBeGreaterThan(0);
    expect(folders.filter((folder) => ![...journeyIds, SAMPLE_JOURNEY_ID].includes(path.basename(folder)))).toEqual([]);
  });
});
