import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { dialogueReactionCatalogSchema } from "../src/content/dialogue-reactions";
import { createDialogueExpressionValidator } from "./dialogue-expression-validation";
import { createDialogueReactionValidator } from "./dialogue-reaction-validation";
import { compileInk, validateStory } from "./ink-validation";
import {
  cacheKey,
  chooseStoryCache,
  inkCacheDisabledByEnv,
  openStoryValidationCache,
  validateStoryCached,
  validatorCodeFingerprint,
  type StoryValidationInput,
} from "./story-validation-cache";

const repository = path.resolve(import.meta.dirname, "..");
const header = `VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
# speaker: heroine
{player_address}、どれにする？
`;
const choices = ["a", "b", "c"].map((id) => `* [選択${id}]
    # effect: effect_${id}
    # speaker: heroine
    {romance_result == "positive":
        届いた${id}。
    - else:
        届かなかった${id}。
    }
    また明日。
    # speaker: narrator
    また明日。
    -> END
`).join("\n");
const source = header + choices;
const effectIds = ["effect_a", "effect_b", "effect_c"];
const input = (changes: Partial<StoryValidationInput> = {}): StoryValidationInput => ({
  compiled: compileInk(source),
  context: { effectIds, backgroundIds: [], emotionIds: [] },
  contract: { choiceCount: 1, effectCount: 1, kind: "special" },
  variables: { player_address: "検証主人公さん" },
  effects: effectIds.map((id) => ({ id, affectionDelta: 0, responseProfileId: "attentive" })),
  memories: { available: [], known: [] },
  randomReactions: true,
  tone: "reserved",
  ...changes,
});

const temporary: string[] = [];
const temporaryDirectory = () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ink-cache-"));
  temporary.push(directory);
  return directory;
};
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** A cache in a temporary folder, open whatever DREAMSCAPE_INK_CACHE says in the environment running the tests. */
const openTestCache = (directory = temporaryDirectory(), options: { codeRoot?: string; entryLimit?: number } = {}) =>
  openStoryValidationCache({ directory, ...options, env: {} });
const line = (text: string, speaker: string) => JSON.stringify([text, speaker, false]);

/** Run once and report what the callbacks saw (in call order). */
const runWith = (cache: ReturnType<typeof openStoryValidationCache>, value = input()) => {
  const observed: string[] = [];
  const effects: string[] = [];
  const routes = validateStoryCached(cache, value, (text, speaker, explicit) => observed.push(JSON.stringify([text, speaker, explicit])),
    (effectId) => effects.push(effectId));
  return { routes, observed, effects };
};

/** A copy of the validator code (the files of the fingerprint) and the package manifests it names. */
const copyValidatorCode = () => {
  const code = validatorCodeFingerprint()!;
  const root = temporaryDirectory();
  for (const file of code.files) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(repository, file), path.join(root, file));
  }
  for (const name of code.packages) {
    mkdirSync(path.join(root, "node_modules", name), { recursive: true });
    cpSync(path.join(repository, "node_modules", name, "package.json"), path.join(root, "node_modules", name, "package.json"));
  }
  return root;
};

describe("Ink validation cache", () => {
  it("fingerprints the validator modules, every module they import and the packages they use", () => {
    const code = validatorCodeFingerprint()!;
    expect(code.fingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(code.files).toEqual(expect.arrayContaining([
      "scripts/ink-validation.ts", "scripts/story-validation-cache.ts", "scripts/content-validation-utils.ts",
      "src/content/tags.ts", "src/story/memory.ts", "src/domain/romance-tone.ts",
    ]));
    expect(code.packages).toContain("inkjs");
    // A broader scan than the import parser: every module-like specifier in
    // these files (also in comments or strings) must be part of the fingerprint.
    // Only type-only imports are skipped; they do not load the module.
    for (const file of code.files) {
      const text = readFileSync(path.join(repository, file), "utf8")
        .replace(/^\s*(?:import|export)\s+type\b[^;]*?\bfrom\s*["'][^"']+["']/gmu, "");
      expect(text, `${file} loads a module by a computed name`).not.toMatch(/\b(?:import|require)\s*\(\s*[^"'\s)]/u);
      for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gmu)) {
        const specifier = match[1];
        if (specifier.startsWith("node:") || !/^(?:\.|@?[a-z0-9])/u.test(specifier)) continue;
        if (specifier.startsWith(".")) {
          const base = path.relative(repository, path.resolve(path.dirname(path.join(repository, file)), specifier)).split(path.sep).join("/");
          expect(code.files.some((known) => [base, `${base}.ts`, `${base}.tsx`, `${base}.mts`].includes(known)),
            `${file} imports ${specifier}`).toBe(true);
        } else {
          expect(code.packages, `${file} imports ${specifier}`).toContain(specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/"));
        }
      }
    }
    // Data read at run time (files, the environment, the clock, chance) would
    // be in neither the fingerprint nor the key. Only the cache itself and the
    // import parser it uses (test-sets.ts) read files, and not for validateStory.
    const readers = ["scripts/story-validation-cache.ts", "scripts/test-sets.ts"];
    expect(code.files).toEqual(expect.arrayContaining(readers));
    for (const file of code.files.filter((name) => !readers.includes(name))) {
      expect(readFileSync(path.join(repository, file), "utf8"), `${file} reads data outside validateStory's input`).not.toMatch(
        /["'](?:node:)?(?:fs|fs\/promises|child_process|process|os)["']|\bimport\.meta\b|\bprocess\.|\b(?:fetch|require)\s*\(|\b(?:globalThis|window|localStorage|sessionStorage|indexedDB|document)\b|\bMath\.random\b|\bDate\b|\bperformance\b/u);
    }
  });

  it("changes the fingerprint when validator code or a package changes, not for other code", () => {
    const root = copyValidatorCode();
    const before = validatorCodeFingerprint(root)!.fingerprint;
    expect(validatorCodeFingerprint(root)!.fingerprint).toBe(before);
    mkdirSync(path.join(root, "src/components"), { recursive: true });
    writeFileSync(path.join(root, "src/components/Other.tsx"), "export const other = 1;\n");
    expect(validatorCodeFingerprint(root)!.fingerprint).toBe(before);
    // A module imported only indirectly (ink-validation → tags → dialogue-reactions).
    writeFileSync(path.join(root, "src/content/dialogue-reactions.ts"), `${readFileSync(path.join(root, "src/content/dialogue-reactions.ts"), "utf8")}\n// changed\n`);
    const changedCode = validatorCodeFingerprint(root)!.fingerprint;
    expect(changedCode).not.toBe(before);
    const manifest = path.join(root, "node_modules/inkjs/package.json");
    writeFileSync(manifest, readFileSync(manifest, "utf8").replace(/"version": "[^"]+"/u, '"version": "0.0.0-test"'));
    expect(validatorCodeFingerprint(root)!.fingerprint).not.toBe(changedCode);
    // An import that cannot be resolved is a doubt: no fingerprint, no cache.
    rmSync(path.join(root, "src/domain/romance-tone.ts"));
    expect(validatorCodeFingerprint(root)).toBeUndefined();
    expect(openTestCache(temporaryDirectory(), { codeRoot: root })).toBeUndefined();
  });

  it("reuses a stored result with the same routes and callbacks, and stores nothing without a cache", () => {
    const live = (() => {
      const value = input();
      const observed: string[] = [];
      const effects: string[] = [];
      const routes = validateStory(value.compiled, value.context, value.contract, value.variables, value.effects,
        (text, speaker, explicit) => observed.push(JSON.stringify([text, speaker, explicit])), value.memories, true,
        (effectId) => effects.push(effectId), "reserved");
      return { routes, observed, effects };
    })();
    // Without a cache it is validateStory itself, call for call.
    expect(runWith(undefined)).toEqual(live);
    const directory = temporaryDirectory();
    const cache = openTestCache(directory)!;
    const first = runWith(cache);
    expect(first).toEqual(live);
    expect(cache.stats).toEqual({ reused: 0, run: 1 });
    const second = runWith(cache);
    expect(cache.stats).toEqual({ reused: 1, run: 1 });
    expect(second.routes).toBe(live.routes);
    // Replayed once each, in the order first seen; the content observers collect sets.
    expect(second.observed).toEqual([...new Set(live.observed)]);
    expect(second.effects).toEqual([...new Set(live.effects)]);
    expect(live.observed.length).toBeGreaterThan(second.observed.length);
    // The same text from two speakers is two lines.
    expect(second.observed).toEqual(expect.arrayContaining([line("また明日。", "heroine"), line("また明日。", "narrator")]));
    // Another process (a new cache object) finds the same entry.
    const other = openTestCache(directory)!;
    runWith(other);
    expect(other.stats).toEqual({ reused: 1, run: 0 });
  });

  it("gives the dialogue annotation checks the same outcome from a stored result as from a live run", () => {
    // The content validation's observers: lines annotated in the dialogue
    // catalogs must be reached, or content:build warns that they are stale.
    const storyId = "milano/cache_test";
    const reached = { storyId, speaker: "heroine" as const, text: "届いたa。" };
    const unreached = { storyId, speaker: "narrator" as const, text: "届いたa。" };
    // One text, two speakers: each annotation is reached by its own line.
    const shared = (["heroine", "narrator"] as const).map((speaker) => ({ storyId, speaker, text: "また明日。" }));
    const outcome = (cache: ReturnType<typeof openStoryValidationCache>) => {
      const expressions = createDialogueExpressionValidator(
        dialogueExpressionCatalogSchema.parse({ schemaVersion: 1, entries: [reached, unreached, ...shared].map((entry) => ({ ...entry, emotion: "smile" })) }),
        { [storyId]: source }, [storyId], ["smile"]);
      const reactions = createDialogueReactionValidator(
        dialogueReactionCatalogSchema.parse({ schemaVersion: 1, entries: [{ ...reached, targetCharacterId: "heroine", mark: "heart" }] }),
        { [storyId]: source }, [storyId], ["smile"], ["heroine", "enemy"]);
      const warnings: string[] = [];
      const warn = vi.spyOn(console, "warn").mockImplementation((message: string) => { warnings.push(message); });
      try {
        validateStoryCached(cache, input(), (text, speaker, explicit) => {
          expressions.observe(storyId, text, speaker, explicit);
          reactions.observe(storyId, text, speaker);
        });
        expressions.finish();
        reactions.finish();
      } finally {
        warn.mockRestore();
      }
      return warnings;
    };
    const live = outcome(undefined);
    // The narrator entry of 届いたa。 is stale; the other lines are reached.
    expect(live).toEqual([expect.stringContaining("Stale dialogue expression (unreachable or speaker changed): milano/cache_test/narrator/")]);
    const cache = openTestCache()!;
    expect(outcome(cache)).toEqual(live);
    expect(outcome(cache)).toEqual(live);
    expect(cache.stats).toEqual({ reused: 1, run: 1 });
  });

  it("runs the validation again when the Ink source, the context or any other input changes", () => {
    const cache = openTestCache()!;
    runWith(cache);
    const variants: Array<Partial<StoryValidationInput>> = [
      { compiled: compileInk(source.replace("また明日。", "またね。")) },
      { context: { effectIds: [...effectIds, "effect_extra"], backgroundIds: [], emotionIds: [] } },
      { context: { effectIds, backgroundIds: ["street"], emotionIds: [] } },
      { context: { effectIds, backgroundIds: [], emotionIds: ["smile"] } },
      { contract: { choiceCount: 1, effectCount: 1, kind: "normal" } },
      { variables: { player_address: "検証主人公くん" } },
      { effects: effectIds.map((id) => ({ id, affectionDelta: 1, responseProfileId: "attentive" })) },
      { memories: { available: [], known: ["memory_x"] } },
      { tone: "warm" },
    ];
    const keys = new Set([cacheKey(cache.fingerprint, input()), ...variants.map((variant) => cacheKey(cache.fingerprint, input(variant)))]);
    expect(keys.size).toBe(variants.length + 1);
    for (const variant of variants) runWith(cache, input(variant));
    expect(cache.stats).toEqual({ reused: 0, run: variants.length + 1 });
    // An absent value and an explicit undefined are different inputs.
    expect(cacheKey(cache.fingerprint, input({ variables: {} }))).not.toBe(
      cacheKey(cache.fingerprint, input({ variables: { player_address: undefined } as unknown as Record<string, string> })));
    // Something that is not plain data is never cached.
    expect(cacheKey(cache.fingerprint, input({ variables: { when: new Date(0) } as unknown as Record<string, string> }))).toBeUndefined();
  });

  it("runs the validation again when the validator code changes", () => {
    const codeRoot = copyValidatorCode();
    const directory = temporaryDirectory();
    const before = openTestCache(directory, { codeRoot })!;
    runWith(before);
    runWith(before);
    expect(before.stats).toEqual({ reused: 1, run: 1 });
    writeFileSync(path.join(codeRoot, "scripts/ink-validation.ts"), `${readFileSync(path.join(codeRoot, "scripts/ink-validation.ts"), "utf8")}\n// changed\n`);
    const after = openTestCache(directory, { codeRoot })!;
    expect(after.fingerprint).not.toBe(before.fingerprint);
    runWith(after);
    expect(after.stats).toEqual({ reused: 0, run: 1 });
  });

  it("never stores a failure, so the error is the live one every time", () => {
    const cache = openTestCache()!;
    const failing = input({ context: { effectIds: ["effect_a", "effect_b"], backgroundIds: [], emotionIds: [] } });
    const message = (() => {
      try {
        validateStoryCached(undefined, failing);
      } catch (error) {
        return (error as Error).message;
      }
    })();
    expect(message).toBe("Unknown effect: effect_c");
    for (let attempt = 0; attempt < 2; attempt++) expect(() => validateStoryCached(cache, failing)).toThrow(message);
    expect(cache.stats).toEqual({ reused: 0, run: 2 });
    expect(readdirSync(cache.directory).filter((name) => name.endsWith(".json"))).toEqual([]);
  });

  it("treats a damaged or foreign entry as missing and replaces it", () => {
    const cache = openTestCache()!;
    const key = cacheKey(cache.fingerprint, input())!;
    const entry = path.join(cache.directory, `${key}.json`);
    for (const damaged of ["{", JSON.stringify({ format: 1, key: "other", routes: 6, observations: [], effects: [] }),
      JSON.stringify({ format: 1, key, routes: "6", observations: [], effects: [] })]) {
      writeFileSync(entry, damaged);
      const result = runWith(cache);
      expect(result.routes).toBe(6);
      expect(JSON.parse(readFileSync(entry, "utf8"))).toMatchObject({ format: 1, key, routes: 6 });
    }
    expect(cache.stats).toEqual({ reused: 0, run: 3 });
  });

  it("is never carried into CI, and the official checks (CI build, verify) start without it", () => {
    const workflows = readdirSync(path.join(repository, ".github/workflows")).filter((name) => name.endsWith(".yml"));
    expect(workflows.length).toBeGreaterThan(0);
    for (const name of workflows) {
      const text = readFileSync(path.join(repository, ".github/workflows", name), "utf8");
      // actions/cache would carry folders such as node_modules/.cache between runs (setup-node caches only ~/.npm).
      expect(text, name).not.toMatch(/uses:\s*actions\/cache\b/u);
      // Every job installs with npm ci, which starts node_modules (and the cache in it) empty.
      if (/npm (?:run |)(?:build|test|verify)/u.test(text)) expect(text, name).toContain("npm ci");
    }
    const ci = readFileSync(path.join(repository, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toMatch(/run: npm run build\n\s+env:\n\s+DREAMSCAPE_INK_CACHE: "off"/u);
    // verify (also pages.yml before deploying) validates every branch in its first generation.
    const { scripts } = JSON.parse(readFileSync(path.join(repository, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(scripts.verify).toMatch(/^npm run content:build -- --no-cache && /u);
  });

  it("is off with DREAMSCAPE_INK_CACHE=off and keeps only the newest code fingerprints", () => {
    expect(inkCacheDisabledByEnv({ DREAMSCAPE_INK_CACHE: "off" })).toBe(true);
    expect(inkCacheDisabledByEnv({ DREAMSCAPE_INK_CACHE: "0" })).toBe(true);
    expect(inkCacheDisabledByEnv({})).toBe(false);
    const directory = temporaryDirectory();
    expect(openStoryValidationCache({ directory, env: { DREAMSCAPE_INK_CACHE: "off" } })).toBeUndefined();
    expect(readdirSync(directory)).toEqual([]);
    // buildContent and journey:scenario take the default cache from the environment; an explicit one stays.
    const explicit = openTestCache()!;
    vi.stubEnv("DREAMSCAPE_INK_CACHE", "off");
    try {
      expect(chooseStoryCache(undefined)).toBeUndefined();
      expect(chooseStoryCache(null)).toBeUndefined();
      expect(chooseStoryCache(explicit)).toBe(explicit);
    } finally {
      vi.unstubAllEnvs();
    }
    ["old1", "old2", "old3"].forEach((name, index) => {
      mkdirSync(path.join(directory, name));
      const time = new Date(Date.UTC(2020, 0, index + 1));
      utimesSync(path.join(directory, name), time, time);
    });
    const cache = openTestCache(directory)!;
    expect(readdirSync(directory).sort()).toEqual([cache.fingerprint, "old2", "old3"].sort());
    expect(existsSync(cache.directory)).toBe(true);
  });

  it("keeps the most recently used entries of a code fingerprint up to a limit", () => {
    const directory = temporaryDirectory();
    const cache = openTestCache(directory)!;
    runWith(cache);
    const entry = path.join(cache.directory, `${cacheKey(cache.fingerprint, input())}.json`);
    const age = (days: number) => new Date(Date.UTC(2020, 0, days));
    utimesSync(entry, age(1), age(1));
    ["other1", "other2", "other3"].forEach((name, index) => {
      writeFileSync(path.join(cache.directory, `${name}.json`), "{}");
      utimesSync(path.join(cache.directory, `${name}.json`), age(index + 2), age(index + 2));
    });
    // Reusing the oldest entry makes it the most recently used.
    runWith(cache);
    expect(cache.stats).toEqual({ reused: 1, run: 1 });
    const reopened = openTestCache(directory, { entryLimit: 2 })!;
    expect(readdirSync(reopened.directory).sort()).toEqual([path.basename(entry), "other3.json"].sort());
    runWith(reopened);
    expect(reopened.stats).toEqual({ reused: 1, run: 0 });
  });
});
