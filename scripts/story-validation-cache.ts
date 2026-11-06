import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DateDefinition, EffectDefinition } from "../src/content/schemas";
import type { TagContext } from "../src/content/tags";
import type { RelationshipTone } from "../src/domain/romance-tone";
import type { DialogueObserver } from "./dialogue-expression-validation";
import { validateStory } from "./ink-validation";
import { runtimeImports } from "./test-sets";

// A disk cache for the full-branch Ink validation (validateStory), the bulk of
// content:build and of the unit tests. Only successful runs are stored: the
// number of routes and what the run reported to its callbacks. A failing story
// is validated again every time, so its error message is always the live one.
// The key holds every input of validateStory and a fingerprint of the code it
// runs; a missing, unreadable or doubtful entry means the validation runs.

/** Everything validateStory reads, apart from the callbacks it reports to. */
export interface StoryValidationInput {
  compiled: string;
  context: TagContext;
  contract: Pick<DateDefinition, "choiceCount" | "effectCount" | "kind">;
  variables: Record<string, string | number | boolean>;
  effects: EffectDefinition[];
  memories: { available: readonly string[]; known: readonly string[] };
  randomReactions: boolean;
  tone?: RelationshipTone;
}

/** What a successful validateStory run produced. Lines and effects are listed once each, in the order first seen. */
interface StoryValidationRecord {
  routes: number;
  observations: Array<[text: string, speaker: string, explicitEmotion: boolean]>;
  effects: string[];
}

export interface StoryValidationCache {
  /** The folder of this code fingerprint, where the entries are stored. */
  directory: string;
  fingerprint: string;
  /** Validations answered from the cache / actually run since the cache was opened. */
  stats: { reused: number; run: number };
}

/** Bump when the stored record or the key text changes shape. */
const cacheFormat = 1;
/** The code fingerprint folders kept side by side (e.g. two branches); older ones are removed. */
const keptFingerprints = 3;
const repositoryRoot = path.resolve(import.meta.dirname, "..");
/** The modules whose code (with every module they import) decides a validateStory result. */
export const validatorEntryModules = ["scripts/ink-validation.ts", "scripts/story-validation-cache.ts"];

/** DREAMSCAPE_INK_CACHE=off (or 0/false/no) turns the cache off, e.g. for an official check. */
export function inkCacheDisabledByEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return ["off", "0", "false", "no"].includes((env.DREAMSCAPE_INK_CACHE ?? "").trim().toLowerCase());
}

/**
 * The code a validateStory result depends on: the entry modules and every
 * module they import, followed to any depth (runtimeImports, the parser of
 * the unit-test split), the installed version of each package they import and
 * the Node.js version. Undefined when an import cannot be resolved — then the
 * cache is not used.
 */
export function validatorCodeFingerprint(codeRoot = repositoryRoot, entries = validatorEntryModules):
  { fingerprint: string; files: string[]; packages: string[] } | undefined {
  const files = new Map<string, string>();
  const packages = new Map<string, string>();
  const pending = entries.map((entry) => path.join(codeRoot, entry));
  while (pending.length) {
    const file = pending.pop()!;
    if (files.has(file)) continue;
    if (!existsSync(file) || !statSync(file).isFile()) return undefined;
    const source = readFileSync(file, "utf8");
    files.set(file, source);
    if (![".ts", ".tsx", ".mts"].includes(path.extname(file))) continue;
    for (const specifier of runtimeImports(source)) {
      if (specifier.startsWith("node:")) continue;
      if (specifier.startsWith(".")) {
        const base = path.resolve(path.dirname(file), specifier);
        const candidates = [base, ...[".ts", ".tsx", ".mts"].flatMap((extension) => [base + extension, path.join(base, `index${extension}`)])];
        const target = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
        if (!target) return undefined;
        pending.push(target);
        continue;
      }
      const name = specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
      const manifest = path.join(codeRoot, "node_modules", name, "package.json");
      if (!existsSync(manifest)) return undefined;
      packages.set(name, readFileSync(manifest, "utf8"));
    }
  }
  const relative = (file: string) => path.relative(codeRoot, file).split(path.sep).join("/");
  const parts = [
    `node ${process.version}`,
    ...[...files].map(([file, source]) => `file ${relative(file)} ${sha256(source)}`),
    ...[...packages].map(([name, manifest]) => `package ${name} ${sha256(manifest)}`),
  ].sort();
  return { fingerprint: sha256(parts.join("\n")), files: [...files.keys()].map(relative).sort(), packages: [...packages.keys()].sort() };
}

/**
 * Open the cache for the current validator code, or undefined when it is off
 * (DREAMSCAPE_INK_CACHE) or the code fingerprint cannot be determined. The
 * entries live in a git-ignored folder (node_modules/.cache), which a fresh
 * checkout or `npm ci` starts empty.
 */
export function openStoryValidationCache(options: { directory?: string; codeRoot?: string; env?: NodeJS.ProcessEnv } = {}): StoryValidationCache | undefined {
  if (inkCacheDisabledByEnv(options.env)) return undefined;
  const codeRoot = options.codeRoot ?? repositoryRoot;
  const code = validatorCodeFingerprint(codeRoot);
  if (!code) return undefined;
  const base = options.directory ?? path.join(codeRoot, "node_modules", ".cache", "dreamscape", "ink-validation");
  const directory = path.join(base, code.fingerprint);
  try {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
      removeOldFingerprints(base);
    }
  } catch {
    return undefined;
  }
  return { directory, fingerprint: code.fingerprint, stats: { reused: 0, run: 0 } };
}

/** The cache a caller asked for: undefined means the default (openStoryValidationCache), null means none. */
export function chooseStoryCache(option: StoryValidationCache | null | undefined): StoryValidationCache | undefined {
  return option === undefined ? openStoryValidationCache() : option ?? undefined;
}

function removeOldFingerprints(base: string) {
  const folders = readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ folder: path.join(base, entry.name), modified: statSync(path.join(base, entry.name)).mtimeMs }))
    .sort((left, right) => right.modified - left.modified);
  for (const { folder } of folders.slice(keptFingerprints)) rmSync(folder, { recursive: true, force: true });
}

/**
 * validateStory with the cache: a stored result is replayed (each observed
 * line and each effect once, in the order first seen), otherwise the story is
 * validated and a successful result stored. Without a cache this is
 * validateStory itself. The callers' observers must not depend on how often a
 * line is seen: content:build's collect sets, journey:scenario's checks each line.
 */
export function validateStoryCached(
  cache: StoryValidationCache | undefined,
  input: StoryValidationInput,
  observe?: DialogueObserver,
  onEffect?: (effectId: string) => void,
): number {
  const run = (watch?: DialogueObserver, effect?: (effectId: string) => void) => validateStory(
    input.compiled, input.context, input.contract, input.variables, input.effects, watch,
    input.memories, input.randomReactions, effect, input.tone,
  );
  if (!cache) return run(observe, onEffect);
  const key = cacheKey(cache.fingerprint, input);
  const file = key && path.join(cache.directory, `${key}.json`);
  const stored = file ? readRecord(file, key) : undefined;
  if (stored) {
    cache.stats.reused++;
    for (const [text, speaker, explicitEmotion] of stored.observations) observe?.(text, speaker, explicitEmotion);
    for (const effectId of stored.effects) onEffect?.(effectId);
    return stored.routes;
  }
  cache.stats.run++;
  const observations = new Map<string, [string, string, boolean]>();
  const effects = new Set<string>();
  const routes = run(
    (text, speaker, explicitEmotion) => {
      const seen = JSON.stringify([text, speaker, explicitEmotion]);
      if (!observations.has(seen)) observations.set(seen, [text, speaker, explicitEmotion]);
      observe?.(text, speaker, explicitEmotion);
    },
    (effectId) => {
      effects.add(effectId);
      onEffect?.(effectId);
    },
  );
  if (file) writeRecord(file, key, { routes, observations: [...observations.values()], effects: [...effects] });
  return routes;
}

/** The entry name for this input, or undefined when the input is not plain data (then nothing is cached). */
export function cacheKey(fingerprint: string, input: StoryValidationInput): string | undefined {
  try {
    return sha256(`${cacheFormat}\n${fingerprint}\n${keyText(input)}`);
  } catch {
    return undefined;
  }
}

/** An unambiguous text of plain data. Throws for anything else (functions, class instances, non-finite numbers). */
function keyText(value: unknown): string {
  if (value === undefined) return "u";
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number");
    return Object.is(value, -0) ? "-0" : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${Array.from(value, keyText).join(",")}]`;
  const prototype = typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
  if (prototype !== Object.prototype && prototype !== null) throw new Error("Not plain data");
  return `{${Object.entries(value as object).map(([name, item]) => `${JSON.stringify(name)}:${keyText(item)}`).join(",")}}`;
}

function readRecord(file: string, key: string): StoryValidationRecord | undefined {
  try {
    const entry = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!entry || typeof entry !== "object") return undefined;
    const { format, key: storedKey, routes, observations, effects } = entry as Record<string, unknown>;
    if (format !== cacheFormat || storedKey !== key || !Number.isSafeInteger(routes) || (routes as number) < 0) return undefined;
    if (!Array.isArray(observations) || !observations.every((item) => Array.isArray(item) && item.length === 3 &&
      typeof item[0] === "string" && typeof item[1] === "string" && typeof item[2] === "boolean")) return undefined;
    if (!Array.isArray(effects) || !effects.every((item) => typeof item === "string")) return undefined;
    return { routes: routes as number, observations: observations as StoryValidationRecord["observations"], effects: effects as string[] };
  } catch {
    return undefined;
  }
}

/** Write through a temporary file and rename, so a parallel reader never sees half an entry. Failures are ignored. */
function writeRecord(file: string, key: string, record: StoryValidationRecord) {
  const temporary = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(temporary, JSON.stringify({ format: cacheFormat, key, ...record }));
    renameSync(temporary, file);
  } catch {
    try {
      rmSync(temporary, { force: true });
    } catch {
      // Leave the temporary file; it is never read as an entry.
    }
  }
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
