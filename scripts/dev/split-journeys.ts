// TEMPORARY tool for the journey-folder refactor (phases P6/P7). Delete in phase P10.
//
// Usage: npx tsx scripts/dev/split-journeys.ts [--dry-run] <journeyId>...
//
// Moves a journey's data out of the core layer (`content/`) into its journey
// folder `content/journeys/<journeyId>/`:
// - `git mv` of its city and travel files, its Ink files (same path below
//   `stories/`, so story IDs stay unchanged) and its quiz files;
// - its entries of every merged core catalog are moved into fragments with
//   the same relative path (relative order kept, schemaVersion copied, keys
//   without entries left out); a whole-file catalog it owns is moved as is.
// Every entry of every catalog is classified first (spec §4). An entry
// without exactly one owner aborts before anything is written. Afterwards
// the merged view (catalogs, cities, stories, quizzes) must equal the view
// before the split; otherwise the script exits with an error.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { CATALOG_RULES, coreLayerDirectory, journeyDirectory, toPosix, type FieldTable, type MergedKind } from "../content-layout";
import { loadContentSources, type ContentSources } from "../content-sources";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORE = "core";

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const format = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** ID prefixes of spec §4 (longest first). */
const PREFIXES: [string, string][] = [
  ["common_date_", CORE],
  ["luang_prabang_", "luang_prabang"],
  ["lpb_", "luang_prabang"],
  ["gt_", "golden_triangle"],
  ["uz_", "uzbekistan"],
  ["milano_", "milano"],
  ["sound_", "milano"],
];
const prefixOwner = (id: string | undefined) => (id ? PREFIXES.find(([prefix]) => id.startsWith(prefix))?.[1] : undefined);

/** Image folder of a tourism asset path (spec §4). */
function imageOwner(assetPath: string | undefined): string | undefined {
  if (!assetPath?.startsWith("assets/tourism/")) return undefined;
  const rest = assetPath.slice("assets/tourism/".length).split("/");
  if (rest.length === 1 || rest[0] === "dates") return "milano";
  return ({ india: "golden_triangle", uzbekistan: "uzbekistan", luang_prabang: "luang_prabang" } as Record<string, string>)[rest[0]];
}

/** Entries that stay in the core layer whatever their name says (spec §4). */
const CORE_ENTRIES = new Set(["romance/presentation.json:backgrounds:milano_cafe"]);
/** Keys whose entries are shared base-system data (spec §2). */
const CORE_KEYS = new Set([
  "learning/word-meanings.json:words",
  "presentation/characters.json:characters",
  "presentation/characters.json:battleCharacters",
]);

class Classifier {
  readonly problems: string[] = [];
  private readonly cityOwner = new Map<string, string>();
  private readonly value: Partial<Record<MergedKind, Entry>> = {};

  constructor(private readonly sources: ContentSources) {
    for (const manifest of sources.manifests)
      for (const city of (manifest.data.cities as { id: string }[] | undefined) ?? []) {
        if (this.cityOwner.has(city.id)) this.problems.push(`city ${city.id}: listed by two manifests`);
        this.cityOwner.set(city.id, manifest.id);
      }
    for (const [kind, merged] of Object.entries(sources.catalogs)) this.value[kind as MergedKind] = merged.value as Entry;
  }

  private list(kind: MergedKind, key: string): Entry[] {
    const value = this.value[kind]?.[key];
    return Array.isArray(value) ? value.filter(isObject) : [];
  }

  private find(kind: MergedKind, key: string, id: unknown, field = "id"): Entry | undefined {
    return this.list(kind, key).find((entry) => entry[field] === id);
  }

  /** The single owner of a set of signals, or a recorded problem. */
  resolve(label: string, signals: (string | undefined)[]): string | undefined {
    const owners = [...new Set(signals.filter((signal): signal is string => Boolean(signal)))];
    if (owners.length === 1) return owners[0];
    this.problems.push(`${label}: ${owners.length ? `owners ${owners.join(", ")}` : "no owner"}`);
    return undefined;
  }

  city(id: unknown): string | undefined {
    return typeof id === "string" ? this.cityOwner.get(id) : undefined;
  }

  landmark(id: unknown): string | undefined {
    return this.city(this.find("tourism/catalog.json", "landmarks", id)?.cityId);
  }

  battle(id: unknown): string | undefined {
    const battle = this.find("battles/catalog.json", "battles", id);
    return battle ? this.city(battle.cityId) ?? this.landmark(battle.landmarkId) : undefined;
  }

  episode(id: unknown): string | undefined {
    return this.city(this.find("progression/journey.json", "episodes", id)?.cityId);
  }

  encounter(id: unknown): string | undefined {
    return this.city(this.find("encounters/catalog.json", "encounters", id)?.cityId);
  }

  asset(id: unknown): string | undefined {
    const asset = this.find("tourism/catalog.json", "assets", id);
    return asset ? imageOwner(str(asset.path)) ?? prefixOwner(str(asset.id)) : undefined;
  }

  /** Owner of a quiz (by its JSON id): battles using it, its landmark or city. */
  quiz(quiz: Entry): (string | undefined)[] {
    return [
      ...this.list("battles/catalog.json", "battles").filter((battle) => battle.quizId === quiz.id).map((battle) => this.battle(battle.id)),
      this.landmark(quiz.landmarkId), this.city(quiz.cityId),
    ];
  }

  private quizzes = new Map<string, Entry>();
  quizData(file: string): Entry {
    if (!this.quizzes.has(file)) this.quizzes.set(file, readJson(file) as Entry);
    return this.quizzes.get(file)!;
  }

  /** Owner signals of a production quiz question (translation keys, learning details). */
  question(id: string): (string | undefined)[] {
    return this.sources.quizFiles.filter((quiz) => !quiz.sample).flatMap((quiz) => {
      const data = this.quizData(quiz.file);
      const questions = Array.isArray(data.questions) ? data.questions.filter(isObject) : [];
      return questions.some((question) => question.id === id) ? this.quiz(data) : [];
    });
  }

  /** Owner signals of a story: every catalog entry or city that uses it, plus its file name prefix. */
  story(id: string): (string | undefined)[] {
    const uses = (kind: MergedKind, key: string, fields: string[], owner: (entry: Entry) => string | undefined) =>
      this.list(kind, key).filter((entry) => fields.some((field) => entry[field] === id ||
        (isObject(entry.quiz) && entry.quiz[field] === id))).map(owner);
    const details = this.value["learning/details.json"];
    return [
      ...uses("battles/catalog.json", "battles", ["storyId"], (entry) => this.battle(entry.id)),
      ...uses("tourism/catalog.json", "landmarks", ["guideStoryId"], (entry) => this.city(entry.cityId)),
      ...uses("romance/date_catalog.json", "dates", ["storyId"], (entry) => this.city(entry.chapterId)),
      ...uses("progression/journey.json", "episodes", ["epilogueStoryId"], (entry) => this.city(entry.cityId)),
      ...uses("encounters/catalog.json", "encounters", ["storyId", "wonStoryId", "lostStoryId", "alreadyStoryId"], (entry) => this.city(entry.cityId)),
      ...uses("presentation/reasoning-intros.json", "entries", ["storyId"], (entry) => this.battle(entry.battleId)),
      ...this.sources.cities.filter((city) => (readJson(city.file) as Entry).arrivalStoryId === id).map((city) => this.city(city.id)),
      ...(details?.storyId === id ? this.learningDetails() : []),
      prefixOwner(path.posix.basename(id)),
    ];
  }

  learningDetails(): (string | undefined)[] {
    const questions = this.value["learning/details.json"]?.questions;
    return isObject(questions) ? Object.keys(questions).flatMap((id) => this.question(id)) : [];
  }

  private memoryUsers(id: string): (string | undefined)[] {
    return this.list("romance/effect_catalog.json", "effects").filter((effect) => effect.memoryId === id).map((effect) => prefixOwner(str(effect.id)));
  }

  /** Owner of one catalog entry (array element, or record key with its value). */
  entry(kind: MergedKind, key: string, entry: unknown, recordKey?: string): string | undefined {
    const label = `${kind} ${key} ${recordKey ?? (isObject(entry) ? str(entry.id) ?? JSON.stringify(entry).slice(0, 80) : String(entry))}`;
    if (CORE_KEYS.has(`${kind}:${key}`)) return CORE;
    if (recordKey !== undefined && CORE_ENTRIES.has(`${kind}:${key}:${recordKey}`)) return CORE;
    const signals: (string | undefined)[] = [];
    if (recordKey !== undefined) {
      if (key === "questions") signals.push(...this.question(recordKey));
      else if (key === "wardrobe.cities") signals.push(this.city(recordKey));
      signals.push(prefixOwner(recordKey));
      if (key === "memories") signals.push(...this.memoryUsers(recordKey));
    }
    if (isObject(entry)) {
      if (recordKey === undefined) signals.push(prefixOwner(str(entry.id)));
      if ("cityId" in entry) signals.push(this.city(entry.cityId));
      if ("chapterId" in entry) signals.push(this.city(entry.chapterId));
      if ("landmarkId" in entry && entry.landmarkId !== null) signals.push(this.landmark(entry.landmarkId));
      for (const field of ["episodeId", "completedEpisodeId"]) if (field in entry) signals.push(this.episode(entry[field]));
      for (const field of ["battleId", "completedStoryBattleId"]) if (field in entry) signals.push(this.battle(entry[field]));
      if ("encounterId" in entry) signals.push(this.encounter(entry.encounterId));
      if ("path" in entry) signals.push(imageOwner(str(entry.path)));
      if ("imageAssetId" in entry) signals.push(this.asset(entry.imageAssetId));
      if (key === "memoryCallbacks") signals.push(prefixOwner(str(entry.memoryId)));
      if (key === "entries" && typeof entry.storyId === "string" && !("battleId" in entry) && !("encounterId" in entry))
        signals.push(...this.story(entry.storyId));
    }
    return this.resolve(label, signals);
  }
}

type Split = { journeyId: string; kind: MergedKind; key: string; count: number };

/** Split one field table of a core file between the core and the target journeys. */
function splitFields(
  classifier: Classifier, kind: MergedKind, table: FieldTable, data: Entry, prefix: string, targets: ReadonlySet<string>,
  fragments: Map<string, Entry>, splits: Split[],
): Entry {
  const kept: Entry = {};
  for (const [key, value] of Object.entries(data)) {
    const rule = table[key];
    const name = `${prefix}${key}`;
    if (!rule) throw new Error(`Unknown key ${name} in ${kind}`);
    if (rule.mode === "same") {
      kept[key] = value;
      for (const fragment of fragments.values()) fragment[key] = value;
    } else if (rule.mode === "core") {
      kept[key] = value;
    } else if (rule.mode === "concat") {
      const items = value as unknown[];
      const owners = items.map((item) => classifier.entry(kind, name, item));
      kept[key] = items.filter((_, index) => !targets.has(owners[index]!));
      for (const [journeyId, fragment] of fragments) {
        const moved = items.filter((_, index) => owners[index] === journeyId);
        if (moved.length) fragment[key] = moved;
        if (moved.length) splits.push({ journeyId, kind, key: name, count: moved.length });
      }
    } else if (rule.mode === "record") {
      const record = Object.entries(value as Entry);
      const owners = record.map(([recordKey, item]) => classifier.entry(kind, name, item, recordKey));
      kept[key] = Object.fromEntries(record.filter((_, index) => !targets.has(owners[index]!)));
      for (const [journeyId, fragment] of fragments) {
        const moved = record.filter((_, index) => owners[index] === journeyId);
        if (moved.length) fragment[key] = Object.fromEntries(moved);
        if (moved.length) splits.push({ journeyId, kind, key: name, count: moved.length });
      }
    } else if (rule.mode === "nested") {
      const nested = new Map([...fragments.keys()].map((journeyId) => [journeyId, {} as Entry]));
      kept[key] = splitFields(classifier, kind, rule.fields, value as Entry, `${name}.`, targets, nested, splits);
      for (const [journeyId, fragment] of fragments) {
        const part = nested.get(journeyId)!;
        // A nested object contributes only when one of its mergeable keys gained entries.
        if (Object.entries(part).some(([nestedKey]) => rule.fields[nestedKey]?.mode !== "same")) fragment[key] = part;
      }
    }
  }
  return kept;
}

/** Comparable snapshot of the merged view. */
function snapshot(sources: ContentSources) {
  const relativeTo = (file: string, layer: string) =>
    toPosix(path.relative(sources.layers.find((item) => item.id === layer)!.directory, file));
  return {
    catalogs: Object.fromEntries(Object.entries(sources.catalogs).map(([kind, merged]) => [kind, JSON.stringify(merged.value)])),
    cities: sources.cities.map((city) => [city.id, ...[city.file, city.travelFile, city.settingsFile].map((file) => readFileSync(file, "utf8"))]),
    stories: sources.storyFiles.map((story) => [story.id, relativeTo(story.file, story.layer), readFileSync(story.file, "utf8")]),
    quizzes: sources.quizFiles.map((quiz) => [relativeTo(quiz.file, quiz.layer), quiz.sample, readFileSync(quiz.file, "utf8")]),
  };
}

function gitMove(from: string, to: string, dryRun: boolean): void {
  if (existsSync(to)) throw new Error(`Target exists: ${to}`);
  if (dryRun) return;
  mkdirSync(path.dirname(to), { recursive: true });
  const result = spawnSync("git", ["mv", from, to], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git mv ${from} ${to} failed: ${result.stderr}`);
}

function main(argv: string[]): void {
  const dryRun = argv.includes("--dry-run");
  const targets = new Set(argv.filter((arg) => arg !== "--dry-run"));
  const before = loadContentSources(root);
  const expected = snapshot(before);
  for (const id of targets)
    if (!before.manifests.some((manifest) => manifest.id === id)) throw new Error(`Unknown journey: ${id}`);
  if (!targets.size) throw new Error("Usage: split-journeys.ts [--dry-run] <journeyId>...");
  const core = coreLayerDirectory(root);
  const classifier = new Classifier(before);
  const moves: [string, string][] = [];
  const target = (journeyId: string, relative: string) => path.join(journeyDirectory(root, journeyId), relative);

  // Files: cities with their travel files, stories and quizzes of the core layer.
  for (const city of before.cities) {
    const owner = classifier.resolve(`city ${city.id}`, [classifier.city(city.id)]);
    if (!owner || !targets.has(owner)) continue;
    if (city.layer !== CORE) throw new Error(`City ${city.id} is not in the core layer: ${city.file}`);
    for (const file of [city.file, city.travelFile, city.settingsFile]) moves.push([file, target(owner, path.relative(core, file))]);
  }
  for (const story of before.storyFiles) {
    const owner = classifier.resolve(`story ${story.id}`, classifier.story(story.id));
    if (owner && targets.has(owner) && story.layer === CORE) moves.push([story.file, target(owner, path.relative(core, story.file))]);
  }
  for (const quiz of before.quizFiles) {
    const owner = classifier.resolve(`quiz ${path.basename(quiz.file)}`,
      [...classifier.quiz(classifier.quizData(quiz.file)), prefixOwner(path.basename(quiz.file))]);
    if (owner && targets.has(owner) && quiz.layer === CORE) moves.push([quiz.file, target(owner, path.relative(core, quiz.file))]);
  }

  // Catalogs of the core layer.
  const writes: [string, Entry][] = [];
  const splits: Split[] = [];
  for (const rule of CATALOG_RULES) {
    const file = path.join(core, rule.kind);
    if (!existsSync(file)) continue;
    if ("file" in rule) {
      if (rule.file === "core") continue;
      const owner = classifier.resolve(`${rule.kind} (whole file)`, classifier.learningDetails());
      if (owner && targets.has(owner)) moves.push([file, target(owner, rule.kind)]);
      continue;
    }
    const fragments = new Map([...targets].map((journeyId) => [journeyId, {} as Entry]));
    const kept = splitFields(classifier, rule.kind, rule.fields, readJson(file) as Entry, "", targets, fragments, splits);
    if (!splits.some((split) => split.kind === rule.kind)) continue;
    writes.push([file, kept]);
    for (const [journeyId, fragment] of fragments) {
      if (!splits.some((split) => split.kind === rule.kind && split.journeyId === journeyId)) continue;
      const fragmentFile = target(journeyId, rule.kind);
      if (existsSync(fragmentFile)) throw new Error(`Fragment already exists: ${fragmentFile}`);
      writes.push([fragmentFile, fragment]);
    }
  }

  if (classifier.problems.length)
    throw new Error(`Cannot classify every entry (nothing was changed):\n${[...new Set(classifier.problems)].join("\n")}`);

  for (const journeyId of targets) {
    const files = moves.filter(([, to]) => to.startsWith(journeyDirectory(root, journeyId) + path.sep));
    console.log(`${journeyId}: ${files.length} files moved`);
    for (const split of splits.filter((item) => item.journeyId === journeyId))
      console.log(`  ${split.kind} ${split.key}: ${split.count}`);
  }
  if (dryRun) {
    for (const [from, to] of moves) gitMove(from, to, true);
    console.log("Dry run: nothing was changed.");
    return;
  }
  for (const [from, to] of moves) gitMove(from, to, false);
  for (const [file, data] of writes) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, format(data));
  }

  const after = loadContentSources(root);
  const actual = snapshot(after);
  const differences = (Object.keys(expected) as (keyof typeof expected)[]).filter((key) => !isDeepStrictEqual(expected[key], actual[key]));
  if (differences.length) throw new Error(`The merged view changed after the split: ${differences.join(", ")}`);
  for (const journeyId of targets) {
    const layer = after.layers.find((item) => item.id === journeyId)!;
    const own = (file: string) => file.startsWith(layer.directory + path.sep);
    const cities = after.cities.filter((city) => own(city.file)).length;
    const stories = after.storyFiles.filter((story) => story.layer === journeyId).length;
    const quizzes = after.quizFiles.filter((quiz) => quiz.layer === journeyId).length;
    console.log(`${journeyId}: ${cities} cities, ${stories} stories, ${quizzes} quizzes in ${toPosix(path.relative(root, layer.directory))}`);
  }
  console.log("Merged view unchanged (catalogs, cities, stories, quizzes).");
}

main(process.argv.slice(2));
