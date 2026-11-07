import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The unit test files, relative to the repository root. Every one of them runs
 * in `npm test`; `npm run test:quick` runs only the quick set (splitTestFiles).
 * Tests of shared code sit next to it in src/ and scripts/; the tests of one
 * journey's own content, route and tools sit in tests/journeys/<journeyId>/, so
 * a new journey's folder there is found without editing this list.
 */
export const testFilePatterns = ["src/**/*.test.ts", "scripts/**/*.test.ts", "tests/journeys/**/*.test.ts", "tests/explore/**/*.test.ts"];

/**
 * Long seeded explorations over every journey (tests/explore/, e.g. the random walk through
 * the game functions) run with the content set whatever they import: they take tens of seconds
 * and are not part of the daily quick set.
 */
export const longTestFolders = ["tests/explore/"];

/**
 * Modules that run the whole content build: the pipeline itself
 * (buildContent) and the helper that copies all content into a temporary
 * fixture for it (prepareContentFixture). A test that reaches one of them
 * belongs to the slow "content" set.
 */
export const contentBuildModules = ["scripts/content-pipeline.ts", "src/content/test-fixtures.ts"];

const sourceExtensions = [".ts", ".tsx", ".mts"];

/**
 * Module specifiers that `source` loads when it runs: static imports and
 * re-exports (statements at the start of a line), side-effect imports and
 * dynamic `import("…")` with a literal. Type-only imports and exports are left
 * out; they do not load the module. Code inside a string (a test writing a
 * source file) does not start a line and is not read as an import.
 */
export function runtimeImports(source: string): string[] {
  // Comments that start a line (a glob such as "src/**/*.ts" inside a string is not one).
  const code = source.replace(/^\s*\/\*[\s\S]*?\*\//gmu, "").replace(/^\s*\/\/.*$/gmu, "");
  const specifiers: string[] = [];
  for (const match of code.matchAll(/^[ \t]*(?:import|export)\s+(type\s+)?(?:[\w$*{},\s]+?\s+from\s+)?["']([^"']+)["']/gmu))
    if (!match[1]) specifiers.push(match[2]);
  for (const match of code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu)) specifiers.push(match[1]);
  return specifiers;
}

/** The source file a relative specifier of `from` points to, if it is one of the repository's TypeScript files. */
function resolveLocal(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [base, ...sourceExtensions.map((extension) => base + extension), ...sourceExtensions.map((extension) => path.join(base, `index${extension}`))];
  return candidates.find((candidate) => sourceExtensions.includes(path.extname(candidate)) && existsSync(candidate) && statSync(candidate).isFile());
}

/**
 * Split `files` (root-relative test files) into the quick set and the content
 * set. A file is in the content set when its own relative imports, followed to
 * any depth, reach one of contentBuildModules, or when it sits in one of
 * longTestFolders. The split is derived from the code and the folder alone, so a
 * new or moved test lands in the right set without a list to maintain. Both sets
 * together are exactly `files`.
 */
export function splitTestFiles(root: string, files: readonly string[]): { quick: string[]; content: string[] } {
  const targets = new Set(contentBuildModules.map((file) => path.join(root, file)));
  const importsOf = new Map<string, string[]>();
  const localImports = (file: string): string[] => {
    let known = importsOf.get(file);
    if (!known) {
      known = runtimeImports(readFileSync(file, "utf8"))
        .map((specifier) => resolveLocal(file, specifier))
        .filter((target): target is string => target !== undefined);
      importsOf.set(file, known);
    }
    return known;
  };
  // Every test file walks the import graph with its own visited set, so the
  // answer does not depend on the order of the files or on import cycles. Only
  // the parsed imports are shared between the walks.
  const reachesContentBuild = (start: string): boolean => {
    const visited = new Set([start]);
    const pending = [start];
    while (pending.length) {
      const file = pending.pop()!;
      if (targets.has(file)) return true;
      for (const next of localImports(file)) {
        if (visited.has(next)) continue;
        visited.add(next);
        pending.push(next);
      }
    }
    return false;
  };
  const quick: string[] = [];
  const content: string[] = [];
  const long = (file: string) => longTestFolders.some((folder) => file.split(path.sep).join("/").startsWith(folder));
  for (const file of files) (long(file) || reachesContentBuild(path.join(root, file)) ? content : quick).push(file);
  return { quick, content };
}

/** The repository's test files (testFilePatterns), relative to `root`, with forward slashes, sorted. */
export function listTestFiles(root: string): string[] {
  return testFilePatterns
    .flatMap((pattern) => globSync(pattern, { cwd: root, exclude: (name) => name === "node_modules" }))
    .map((file) => file.split(path.sep).join("/"))
    .sort();
}
