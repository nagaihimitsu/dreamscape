import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareContentFixture } from "../src/content/test-fixtures";
import { buildContent } from "./content-pipeline";
import { dateCatalogSchema } from "../src/content/schemas";
import { isPlaceStory } from "../src/content/story-address";
import { loadContentSources, parseCatalog } from "./content-sources";
import { openStoryValidationCache } from "./story-validation-cache";

// The validation cache on the repository's real content: a build answered
// from the cache gives the same result, warnings and errors as one without it.

const repository = path.resolve(import.meta.dirname, "..");
let cacheDirectory: string;
let fixture: string;

beforeAll(async () => {
  cacheDirectory = mkdtempSync(path.join(tmpdir(), "ink-cache-content-"));
  fixture = mkdtempSync(path.join(tmpdir(), "ink-cache-fixture-"));
  await prepareContentFixture(fixture);
});
afterAll(() => {
  rmSync(cacheDirectory, { recursive: true, force: true });
  rmSync(fixture, { recursive: true, force: true });
});

/** The test's cache, open whatever DREAMSCAPE_INK_CACHE says in the environment running the tests. */
const openTestCache = () => openStoryValidationCache({ directory: cacheDirectory, env: {} });

/** Build without writing, returning the result (or the error message) and every console warning. */
const check = async (root: string, storyCache: ReturnType<typeof openStoryValidationCache> | null) => {
  const warnings: string[] = [];
  const warn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
  try {
    const result = await buildContent(root, false, { storyCache });
    return { result: JSON.stringify(result), warnings };
  } catch (error) {
    return { error: (error as Error).message, warnings };
  } finally {
    warn.mockRestore();
  }
};

describe("Ink validation cache on the real content", () => {
  it("gives the same result and warnings as a build without it, and reuses every date validation", async () => {
    const live = await check(repository, null);
    expect(live.result).toBeDefined();
    const cold = openTestCache()!;
    expect(await check(repository, cold)).toEqual(live);
    // Two declared contexts of a date can give the same inputs; the second one is reused even in the first build. The cache
    // holds the one-scene dates' validations (Milan's confession; the other dates are knots of place files, walked as scenes).
    expect(cold.stats.run).toBeGreaterThan(0);
    expect(cold.stats.reused).toBeLessThan(5);
    const warm = openTestCache()!;
    expect(await check(repository, warm)).toEqual(live);
    expect(warm.stats).toEqual({ reused: cold.stats.reused + cold.stats.run, run: 0 });
  });

  it("reports the same error with and without it when a date story breaks", async () => {
    // The first date validated through the cache (a one-scene date): break its first choice moment by repeating a choice text.
    const sources = loadContentSources(fixture);
    const firstDate = parseCatalog(sources, dateCatalogSchema, "romance/date_catalog.json").dates.find((date) => !isPlaceStory(date.storyId))!;
    const file = sources.storyFiles.find((story) => story.id === firstDate.storyId)!.file;
    const source = readFileSync(file, "utf8");
    const choices = [...source.matchAll(/^\s*[*+]\s*\[([^\]]+)\]/gmu)];
    expect(choices.length).toBeGreaterThanOrEqual(2);
    const second = choices[1];
    const broken = source.slice(0, second.index) + second[0].replace(second[1], choices[0][1]) + source.slice(second.index! + second[0].length);
    writeFileSync(file, broken);
    const live = await check(fixture, null);
    expect(live.error).toMatch(/Duplicate choice text/u);
    const cache = openTestCache()!;
    expect(await check(fixture, cache)).toEqual(live);
    expect(await check(fixture, cache)).toEqual(live);
    // Only the failing validation ran, both times: a failure is never stored.
    expect(cache.stats).toEqual({ reused: 0, run: 2 });
    writeFileSync(file, source);
  });
});
