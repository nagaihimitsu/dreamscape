// Temporary equivalence harness for the content pipeline refactor (WP21).
//
//   npx tsx scripts/dev/pipeline-equivalence.ts capture <out.json>
//   npx tsx scripts/dev/pipeline-equivalence.ts check <baseline.json> [<out.json>]
//   npx tsx scripts/dev/pipeline-equivalence.ts outputs <root>   (hashes of a root's generated outputs)
//
// It builds copies of the repository's content (journey and root images are
// linked, not copied) with buildContent and records (a) the hashes of every
// generated output for the repository and for layer variants, and (b) the
// error message (and its causes) that each known-bad mutation produces.
// `check` repeats the capture and compares it with a baseline.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

const repository = path.resolve(".");
const pipeline = path.join(repository, "scripts/content-pipeline.ts");

type Mutation = { name: string; apply: (root: string) => void };
type Outcome = { ok: boolean; message?: string; causes?: string[]; summary?: Record<string, number>; warnings: string[]; ms: number };

// ---------------------------------------------------------------- fixtures

function linkTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) linkTree(from, to);
    else symlinkSync(from, to);
  }
}

/** content/ copied (journey public/ folders linked file by file), public/ linked file by file. */
function makeBase(): string {
  const base = mkdtempSync(path.join(tmpdir(), "wp21-base-"));
  const journeys = path.join(repository, "content/journeys");
  const publics = new Set(readdirSync(journeys).map((id) => path.join(journeys, id, "public")));
  cpSync(path.join(repository, "content"), path.join(base, "content"), { recursive: true, filter: (source) => !publics.has(source) });
  for (const directory of publics) if (existsSync(directory)) linkTree(directory, path.join(base, path.relative(repository, directory)));
  linkTree(path.join(repository, "public"), path.join(base, "public"));
  return base;
}

function copyBase(base: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "wp21-run-"));
  cpSync(base, root, { recursive: true, verbatimSymlinks: true });
  return root;
}

// ---------------------------------------------------------------- edits

const file = (root: string, relative: string) => path.join(root, relative);
const readJson = (root: string, relative: string) => JSON.parse(readFileSync(file(root, relative), "utf8"));
/** Replace (never write through a link). */
const put = (root: string, relative: string, data: string | Buffer) => {
  const target = file(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  rmSync(target, { force: true });
  writeFileSync(target, data);
};
const json = (root: string, relative: string, change: (data: any) => void) => {
  const data = readJson(root, relative);
  change(data);
  put(root, relative, `${JSON.stringify(data, null, 2)}\n`);
};
const text = (root: string, relative: string, change: (source: string) => string) => {
  const source = readFileSync(file(root, relative), "utf8");
  const next = change(source);
  if (next === source) throw new Error(`Mutation did not change ${relative}`);
  put(root, relative, next);
};
const remove = (root: string, relative: string) => {
  if (!existsSync(file(root, relative)) && !existsSync(path.dirname(file(root, relative)))) throw new Error(`Nothing to remove: ${relative}`);
  rmSync(file(root, relative), { recursive: true, force: false });
};

const MI = "content/journeys/milano";
const GT = "content/journeys/golden_triangle";
const UZ = "content/journeys/uzbekistan";
const LP = "content/journeys/luang_prabang";
const heroineImage = (root: string): string => {
  const catalog = readJson(root, "content/presentation/characters.json");
  const heroine = catalog.characters.find((item: any) => item.id === "heroine");
  return Object.values(heroine.costumes[0].poses[0].expressions)[0] as string;
};

// ---------------------------------------------------------------- corpus

export const mutations: Mutation[] = [
  // Manifests and layer discovery (loader)
  { name: "manifest-id-mismatch", apply: (r) => json(r, `${UZ}/manifest.json`, (m) => { m.id = "uzbek"; }) },
  { name: "manifest-duplicate-order", apply: (r) => json(r, `${LP}/manifest.json`, (m) => { m.order = 10; }) },
  { name: "manifest-missing", apply: (r) => remove(r, `${LP}/manifest.json`) },
  { name: "manifest-schema-version", apply: (r) => json(r, `${UZ}/manifest.json`, (m) => { m.schemaVersion = 2; }) },
  { name: "manifest-bad-authoring", apply: (r) => json(r, `${GT}/manifest.json`, (m) => { m.authoring.eventPrefix = "GT!"; }) },
  { name: "manifest-catalog-schema", apply: (r) => json(r, `${UZ}/manifest.json`, (m) => { m.status = "someday"; }) },
  { name: "no-available-journey", apply: (r) => {
    for (const layer of [MI, GT]) json(r, `${layer}/manifest.json`, (m) => { m.status = "preparing"; });
  } },
  { name: "unknown-content-file", apply: (r) => put(r, `${MI}/misc/extra.json`, "{}") },
  { name: "core-journeys-catalog-file", apply: (r) => put(r, "content/journeys/catalog.json", "{}") },
  { name: "travel-without-city", apply: (r) => put(r, `${MI}/travel/zz_nowhere.json`, "{}") },
  { name: "duplicate-city-file", apply: (r) => {
    for (const suffix of ["", "-settings"]) put(r, `${LP}/travel/milano${suffix}.json`, readFileSync(file(r, `${MI}/travel/milano${suffix}.json`)));
    put(r, `${LP}/cities/milano.json`, readFileSync(file(r, `${MI}/cities/milano.json`)));
  } },
  { name: "duplicate-story-id", apply: (r) => put(r, `${GT}/stories/milano/sound_cafe_01.ink`, readFileSync(file(r, `${MI}/stories/milano/sound_cafe_01.ink`))) },
  // JSON reading and merging
  { name: "catalog-broken-json", apply: (r) => put(r, `${MI}/tourism/catalog.json`, "{ broken") },
  { name: "quiz-broken-json", apply: (r) => put(r, `${MI}/quizzes/sound_duomo_B1.json`, "{ broken") },
  { name: "city-broken-json", apply: (r) => put(r, `${UZ}/cities/khiva.json`, "[") },
  { name: "settings-broken-json", apply: (r) => put(r, `${GT}/travel/agra-settings.json`, "nope") },
  { name: "missing-travel-file", apply: (r) => remove(r, `${LP}/travel/luang_prabang.json`) },
  { name: "core-only-key-in-journey", apply: (r) => json(r, `${MI}/romance/presentation.json`, (p) => { p.emotions = {}; }) },
  { name: "schema-version-mismatch", apply: (r) => json(r, `${GT}/battles/catalog.json`, (c) => { c.schemaVersion = 2; }) },
  { name: "unknown-catalog-key", apply: (r) => json(r, `${GT}/tourism/catalog.json`, (c) => { c.extra = []; }) },
  { name: "duplicate-record-key", apply: (r) => json(r, `${GT}/romance/presentation.json`, (p) => {
    const milano = readJson(r, `${MI}/romance/presentation.json`);
    const [key, value] = Object.entries(milano.backgrounds)[0];
    p.backgrounds[key] = value;
  }) },
  // Ownership
  { name: "core-layer-city", apply: (r) => {
    put(r, "content/cities/zz_core.json", JSON.stringify({ id: "zz_core" }));
    put(r, "content/travel/zz_core.json", JSON.stringify({ cityId: "zz_core" }));
    put(r, "content/travel/zz_core-settings.json", "{}");
  } },
  { name: "core-layer-story", apply: (r) => put(r, "content/stories/zz/orphan.ink", "Hello.\n") },
  { name: "core-layer-journey-catalog", apply: (r) => put(r, "content/battles/catalog.json", JSON.stringify({ schemaVersion: 1, battles: [] })) },
  { name: "city-outside-journey", apply: (r) => {
    put(r, `${LP}/cities/zz_extra.json`, JSON.stringify({ id: "zz_extra" }));
    put(r, `${LP}/travel/zz_extra.json`, JSON.stringify({ cityId: "zz_extra", places: [], events: [] }));
    put(r, `${LP}/travel/zz_extra-settings.json`, "{}");
  } },
  { name: "cross-journey-background", apply: (r) => json(r, `${GT}/romance/date_catalog.json`, (c) => { c.dates[0].backgroundAssetId = "milano_starbucks_roastery_date"; }) },
  { name: "cross-journey-story", apply: (r) => json(r, `${GT}/battles/catalog.json`, (c) => { c.battles[0].storyId = "battles/sound_supper"; }) },
  { name: "cross-journey-city", apply: (r) => json(r, `${GT}/romance/date_destinations.json`, (c) => { c.destinations[0].cityId = "milano"; }) },
  { name: "cross-journey-ink-tag", apply: (r) => text(r, `${GT}/stories/arrivals/delhi.ink`, (s) => s.replace("# background: gt_bg_delhi_hotel_hub", "# background: milano_starbucks_roastery_date")) },
  { name: "cross-journey-quiz-landmark", apply: (r) => json(r, `${UZ}/../golden_triangle/quizzes/${readdirSync(file(r, `${GT}/quizzes`)).find((name) => !name.endsWith(".sample.json"))}`, (q) => { q.landmarkId = "duomo_milano"; }) },
  // Catalog and file schemas
  { name: "catalog-schema", apply: (r) => json(r, `${MI}/battles/catalog.json`, (c) => { c.battles[0].id = 5; }) },
  { name: "catalog-schema-second-layer", apply: (r) => json(r, `${GT}/tourism/catalog.json`, (c) => { c.landmarks[1].cityId = 7; }) },
  { name: "city-schema", apply: (r) => json(r, `${MI}/cities/milano.json`, (c) => { c.productionStatus = "bogus"; }) },
  { name: "city-id-mismatch", apply: (r) => json(r, `${MI}/cities/milano.json`, (c) => { c.id = "milan"; }) },
  { name: "route-mode-unknown", apply: (r) => json(r, `${GT}/travel/delhi.json`, (t) => { t.routes[0].mode = "hovercraft"; }) },
  { name: "route-unknown-place", apply: (r) => json(r, `${GT}/travel/delhi.json`, (t) => { t.routes[0].fromPlaceId = "zz_nowhere"; }) },
  { name: "settings-schema", apply: (r) => json(r, `${UZ}/travel/tashkent-settings.json`, (s) => { s.retryMinutes = "soon"; }) },
  { name: "quiz-schema", apply: (r) => json(r, `${MI}/quizzes/sound_duomo_B1.json`, (q) => { q.questions[0].options = []; }) },
  { name: "sample-quiz-schema", apply: (r) => json(r, `${MI}/quizzes/last_supper_B1.sample.json`, (q) => { q.id = 3; }) },
  // Cross-content rules
  { name: "lodging-mismatch", apply: (r) => json(r, `${GT}/travel/delhi-settings.json`, (s) => { s.lodgingCost = 100; }) },
  { name: "unknown-date-story", apply: (r) => json(r, `${MI}/romance/date_catalog.json`, (c) => { c.dates[0].storyId = "milano/no_such_story"; }) },
  { name: "date-destination-bg-mismatch", apply: (r) => json(r, `${MI}/romance/date_catalog.json`, (c) => { c.dates[0].backgroundAssetId = "milano_walk_landmark"; }) },
  { name: "duplicate-battle-id", apply: (r) => json(r, `${MI}/battles/catalog.json`, (c) => { c.battles.push(structuredClone(c.battles[1])); }) },
  { name: "duplicate-quiz-id", apply: (r) => put(r, `${MI}/quizzes/zz_copy_B1.json`, readFileSync(file(r, `${MI}/quizzes/sound_duomo_B1.json`))) },
  { name: "quiz-unknown-landmark", apply: (r) => json(r, `${MI}/quizzes/sound_duomo_B1.json`, (q) => { q.landmarkId = "zz_nowhere"; }) },
  { name: "battle-scene-count", apply: (r) => json(r, `${MI}/battles/catalog.json`, (c) => { c.battles[0].scenes.afterRounds.pop(); }) },
  { name: "unknown-battle-background", apply: (r) => json(r, `${MI}/battles/catalog.json`, (c) => { c.battles[3].backgroundAssetId = "zz_nope"; }) },
  { name: "unknown-effect-memory", apply: (r) => json(r, `${MI}/romance/effect_catalog.json`, (c) => { c.effects.find((e: any) => e.memoryId).memoryId = "zz_nope"; }) },
  { name: "common-date-effect-invalid", apply: (r) => json(r, "content/romance/effect_catalog.json", (c) => { c.effects[0].responseProfileId = "playful"; }) },
  { name: "encounter-icon-missing", apply: (r) => json(r, `${MI}/encounters/catalog.json`, (c) => { c.items[0].iconPath = "assets/items/zz_nope.svg"; }) },
  { name: "encounter-story-reused", apply: (r) => json(r, `${MI}/encounters/catalog.json`, (c) => { c.encounters[4].storyId = "milano/sound_cafe_01"; }) },
  { name: "reasoning-intro-not-special", apply: (r) => json(r, `${MI}/presentation/reasoning-intros.json`, (c) => { c.entries[0].battleId = "milano_duomo_01"; }) },
  { name: "learning-story-unknown", apply: (r) => json(r, `${MI}/learning/details.json`, (c) => { c.storyId = "learning/zz_nope"; }) },
  { name: "missing-translation", apply: (r) => json(r, `${MI}/learning/translations.json`, (c) => { delete c.questions[Object.keys(c.questions)[0]]; }) },
  { name: "missing-word-meaning", apply: (r) => json(r, `${MI}/quizzes/sound_duomo_B1.json`, (q) => { q.questions[0].options[0].textEn += " zyzzyva"; }) },
  { name: "dialogue-expression-unknown-story", apply: (r) => json(r, `${MI}/presentation/dialogue-expressions.json`, (c) => { c.entries[0].storyId = "battles/zz_nope"; }) },
  { name: "dialogue-reaction-unknown-text", apply: (r) => json(r, `${MI}/presentation/dialogue-reactions.json`, (c) => { c.entries[0].text = "「存在しない台詞」"; }) },
  // Ink
  { name: "ink-compile-error", apply: (r) => text(r, `${MI}/stories/milano/sound_cafe_01.ink`, (s) => `${s}\n{ unclosed\n`) },
  { name: "ink-unknown-background", apply: (r) => text(r, `${MI}/stories/milano/sound_cafe_01.ink`, (s) => s.replace("# background: milano_starbucks_roastery_date", "# background: zz_no_such_bg")) },
  { name: "ink-unknown-tag", apply: (r) => text(r, `${GT}/stories/arrivals/delhi.ink`, (s) => s.replace("# speaker: narrator", "# frobnicate: yes\n# speaker: narrator")) },
  { name: "ink-unknown-memory", apply: (r) => text(r, `${MI}/stories/milano/sound_cafe_01.ink`, (s) => s.replace("VAR player_name = \"\"", "VAR player_name = \"\"\nEXTERNAL has_memory(id)\n{has_memory(\"zz_no_memory\"):\nx\n}")) },
  { name: "orphan-story", apply: (r) => put(r, `${MI}/stories/milano/zz_orphan.ink`, "Hello.\n") },
  { name: "arrival-player-speaks", apply: (r) => text(r, `${GT}/stories/arrivals/delhi.ink`, (s) => s.replace("# speaker: heroine", "# speaker: player")) },
  { name: "ink-random", apply: (r) => text(r, `${MI}/stories/milano/sound_cafe_01.ink`, (s) => s.replace("# speaker: narrator", "~ temp roll = RANDOM(1, 2)\n# speaker: narrator")) },
  // Finale, epilogue, arrival
  { name: "finale-reward-ap", apply: (r) => json(r, `${GT}/progression/journey.json`, (c) => {
    c.rewards.find((rule: any) => rule.episodeId === "gt_delhi_finale" && rule.trigger === "city_clear").ap += 1;
  }) },
  { name: "finale-missing", apply: (r) => json(r, `${GT}/progression/journey.json`, (c) => {
    c.episodes = c.episodes.filter((episode: any) => episode.id !== "gt_agra_finale");
    c.rewards = c.rewards.filter((rule: any) => rule.episodeId !== "gt_agra_finale");
  }) },
  { name: "epilogue-unknown-story", apply: (r) => json(r, `${GT}/progression/journey.json`, (c) => {
    c.episodes.find((episode: any) => episode.id === "gt_delhi_finale").epilogueStoryId = "epilogues/zz_nope";
  }) },
  { name: "arrival-story-reused", apply: (r) => json(r, `${GT}/cities/delhi.json`, (c) => { c.arrivalStoryId = "epilogues/delhi"; }) },
  // Images
  { name: "missing-tourism-image", apply: (r) => remove(r, `${MI}/public/assets/tourism/dates/darsena.webp`) },
  { name: "invalid-tourism-image", apply: (r) => put(r, `${MI}/public/assets/tourism/dates/darsena.webp`, "not an image") },
  { name: "tourism-image-size", apply: (r) => json(r, `${MI}/tourism/catalog.json`, (c) => { c.assets[0].width -= 1; }) },
  { name: "duplicate-public-file", apply: (r) => put(r, "public/assets/tourism/dates/darsena.webp", readFileSync(file(r, `${MI}/public/assets/tourism/dates/darsena.webp`))) },
  { name: "character-image-canvas", apply: (r) => json(r, "content/presentation/characters.json", (c) => {
    c.characters.find((item: any) => item.id === "heroine").costumes[0].poses[0].canvas.width -= 1;
  }) },
  { name: "character-image-missing", apply: (r) => remove(r, path.join("public", heroineImage(r))) },
  { name: "character-image-not-png", apply: (r) => put(r, path.join("public", heroineImage(r)), readFileSync(file(r, `${MI}/public/assets/tourism/dates/darsena.webp`))) },
  { name: "background-image-missing", apply: (r) => json(r, `${MI}/romance/presentation.json`, (p) => {
    const [, background] = Object.entries(p.backgrounds).find(([, value]: any) => !value.imageAssetId) ?? Object.entries(p.backgrounds)[0];
    (background as any).imagePath = "assets/presentation/zz_nope.png";
  }) },
  // Warnings only (build succeeds)
  { name: "stale-reaction-warning", apply: (r) => {
    const entry = readJson(r, `${MI}/presentation/dialogue-reactions.json`).entries[0];
    const ink = `${MI}/stories/${entry.storyId}.ink`;
    text(r, ink, (s) => s.replace(entry.text, `${entry.text.slice(0, -1)}！」`));
  } },
];

// ---------------------------------------------------------------- running

function normalize(value: string, roots: readonly string[]): string {
  let result = value;
  for (const root of roots) result = result.split(root).join("<root>");
  return result;
}

async function build(root: string): Promise<Outcome> {
  const { buildContent } = await import(pipeline);
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(" ")); };
  const start = performance.now();
  try {
    const result = await buildContent(root);
    const summary = {
      dates: result.dates.length, stories: Object.keys(result.stories).length, routes: result.routes, battles: result.battles.length,
      reasoningBattles: result.reasoningBattles, battleScenarios: result.battleScenarios, tourismGuides: result.tourismGuides,
      epilogueScenarios: result.epilogueScenarios, clues: result.tourism.clues.length, episodes: result.journey.episodes.length,
      rewards: result.journey.rewards.length,
    };
    return { ok: true, summary, warnings: warnings.map((item) => normalize(item, [root, repository])), ms: performance.now() - start };
  } catch (error) {
    const causes: string[] = [];
    for (let cause = (error as Error).cause; cause; cause = (cause as Error).cause)
      causes.push(normalize(cause instanceof Error ? cause.message : String(cause), [root, repository]));
    return { ok: false, message: normalize((error as Error).message, [root, repository]), causes,
      warnings: warnings.map((item) => normalize(item, [root, repository])), ms: performance.now() - start };
  } finally {
    console.warn = warn;
  }
}

function hashFile(target: string): string {
  return createHash("sha256").update(readFileSync(target)).digest("hex");
}

function listAll(directory: string, prefix = ""): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listAll(directory, relative) : [relative];
  }).sort();
}

/** Hashes of stories.json, quizzes.json, every mirror file and every assembled public file (path, size, hash). */
export function outputHashes(root: string): Record<string, string> {
  const generated = path.join(root, "src/content/generated");
  const hashes: Record<string, string> = {};
  for (const name of ["stories.json", "quizzes.json"]) hashes[name] = hashFile(path.join(generated, name));
  for (const relative of listAll(path.join(generated, "content"))) hashes[`content/${relative}`] = hashFile(path.join(generated, "content", relative));
  for (const relative of listAll(path.join(generated, "public"))) {
    const target = path.join(generated, "public", relative);
    hashes[`public/${relative}`] = `${statSync(target).size}:${hashFile(target)}`;
  }
  return hashes;
}

type Variant = { name: string; apply: (root: string) => void };
const variants: Variant[] = [
  { name: "repository", apply: () => {} },
  ...["milano", "golden_triangle", "uzbekistan", "luang_prabang"].map((id): Variant => ({
    name: `without-${id}`, apply: (root) => renameSync(path.join(root, "content/journeys", id), path.join(root, `removed-${id}`)),
  })),
  { name: "with-zz_fixture_trip", apply: (root) => cpSync(path.join(repository, "tests/fixtures/journeys/zz_fixture_trip"), path.join(root, "content/journeys/zz_fixture_trip"), { recursive: true }) },
];

type Capture = {
  variants: Record<string, { outcome: Outcome; hashes?: Record<string, string> }>;
  mutations: Record<string, Outcome>;
};

async function runWorker(shard: number, shards: number, out: string): Promise<void> {
  const base = makeBase();
  const result: Capture = { variants: {}, mutations: {} };
  try {
    const jobs = [...variants.map((item) => ({ kind: "variant" as const, ...item })), ...mutations.map((item) => ({ kind: "mutation" as const, ...item }))];
    for (const [index, job] of jobs.entries()) {
      if (index % shards !== shard) continue;
      const root = copyBase(base);
      try {
        job.apply(root);
        const outcome = await build(root);
        if (job.kind === "variant") result.variants[job.name] = { outcome, hashes: outcome.ok ? outputHashes(root) : undefined };
        else result.mutations[job.name] = outcome;
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
  writeFileSync(out, JSON.stringify(result));
}


function spawnAsync(command: string, args: string[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function captureAll(shards = 4): Promise<Capture> {
  const scratch = mkdtempSync(path.join(tmpdir(), "wp21-shards-"));
  try {
    const outs = Array.from({ length: shards }, (_, shard) => path.join(scratch, `${shard}.json`));
    const codes = await Promise.all(outs.map((out, shard) =>
      spawnAsync(process.execPath, [...process.execArgv, process.argv[1], "worker", String(shard), String(shards), out])));
    if (codes.some((code) => code !== 0)) throw new Error(`A worker failed: ${codes.join(", ")}`);
    const merged: Capture = { variants: {}, mutations: {} };
    for (const out of outs) {
      const part = JSON.parse(readFileSync(out, "utf8")) as Capture;
      Object.assign(merged.variants, part.variants);
      Object.assign(merged.mutations, part.mutations);
    }
    // Stable key order.
    return {
      variants: Object.fromEntries(variants.map((item) => [item.name, merged.variants[item.name]])),
      mutations: Object.fromEntries(mutations.map((item) => [item.name, merged.mutations[item.name]])),
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const strip = (outcome: Outcome) => ({ ...outcome, ms: undefined });

function compare(baseline: Capture, current: Capture): string[] {
  const problems: string[] = [];
  for (const [name, entry] of Object.entries(baseline.variants)) {
    const now = current.variants[name];
    if (!now) { problems.push(`variant ${name}: missing`); continue; }
    if (!isDeepStrictEqual(strip(entry.outcome), strip(now.outcome)))
      problems.push(`variant ${name}: outcome differs\n  before ${JSON.stringify(strip(entry.outcome))}\n  after  ${JSON.stringify(strip(now.outcome))}`);
    const keys = new Set([...Object.keys(entry.hashes ?? {}), ...Object.keys(now.hashes ?? {})]);
    for (const key of keys)
      if (entry.hashes?.[key] !== now.hashes?.[key]) problems.push(`variant ${name}: output ${key} differs (${entry.hashes?.[key]} → ${now.hashes?.[key]})`);
  }
  for (const [name, outcome] of Object.entries(baseline.mutations)) {
    const now = current.mutations[name];
    if (!now) { problems.push(`mutation ${name}: missing`); continue; }
    if (!isDeepStrictEqual(strip(outcome), strip(now)))
      problems.push(`mutation ${name}: differs\n  before ${JSON.stringify(strip(outcome))}\n  after  ${JSON.stringify(strip(now))}`);
  }
  return problems;
}

const [command, ...args] = process.argv.slice(2);
if (command === "worker") {
  await runWorker(Number(args[0]), Number(args[1]), args[2]);
} else if (command === "capture") {
  const start = performance.now();
  const result = await captureAll();
  writeFileSync(args[0], `${JSON.stringify(result, null, 2)}\n`);
  const failed = Object.entries(result.mutations).filter(([, outcome]) => !outcome.ok).length;
  console.log(`Captured ${Object.keys(result.variants).length} variants and ${Object.keys(result.mutations).length} mutations (${failed} rejected) in ${((performance.now() - start) / 1000).toFixed(1)} s`);
} else if (command === "check") {
  const start = performance.now();
  const baseline = JSON.parse(readFileSync(args[0], "utf8")) as Capture;
  const current = await captureAll();
  if (args[1]) writeFileSync(args[1], `${JSON.stringify(current, null, 2)}\n`);
  const problems = compare(baseline, current);
  console.log(problems.length ? problems.join("\n") : `Equivalent: ${Object.keys(current.variants).length} variants, ${Object.keys(current.mutations).length} mutations`);
  console.log(`(${((performance.now() - start) / 1000).toFixed(1)} s)`);
  process.exitCode = problems.length ? 1 : 0;
} else if (command === "outputs") {
  console.log(JSON.stringify(outputHashes(path.resolve(args[0])), null, 2));
} else {
  console.error("usage: pipeline-equivalence.ts capture <out> | check <baseline> [<out>] | outputs <root>");
  process.exitCode = 2;
}
