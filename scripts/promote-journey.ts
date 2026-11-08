import { createHash } from "node:crypto";
import { cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "./content-pipeline";
import { z } from "zod";
import { learningCatalogSchema, questionSource, translationSchema } from "../src/content/learning-schema";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { buildJourneyFragments, loadJourneyScaffold } from "./journey-scaffold";
import { authoringProfileOf, getJourneyAuthoringProfile, journeyAuthoringProfiles } from "./journey-authoring";
import { CONTENT_DIRECTORY, completeFragment, emptyCatalog, journeyManifestPath, trimFragment, type MergedKind } from "./content-layout";
import { displayPath, journeyLayer, loadContentSources } from "./content-sources";
import { createParentDirectories, removeCreatedDirectories } from "./created-directories";

/** The journey's own manifest.json carries its status and city order. */
const journeyCities = (original: ReleaseFiles, journeyId: string): string[] => {
  const file = journeyManifestPath(journeyId);
  const text = original[file];
  const manifest = typeof text === "string" ? JSON.parse(text) : undefined;
  if (!manifest || !authoringProfileOf(manifest, file)) throw new Error(`Unknown authoring journey: ${journeyId}`);
  const ids: string[] = Array.isArray(manifest.cities) ? manifest.cities.map((city: { id: string }) => city.id) : [];
  if (manifest.id !== journeyId || !ids.length || new Set(ids).size !== ids.length || ids.some((id) => !/^[a-z][a-z0-9_]*$/.test(id)))
    throw new Error(`Journey or city order is invalid: ${journeyId}`);
  return ids;
};
const prefix = (cityIds: readonly string[], through = cityIds.at(-1)!): readonly string[] => {
  const end = cityIds.indexOf(through);
  if (end < 0) throw new Error(`Unknown journey release city: ${through}`);
  return cityIds.slice(0, end + 1);
};
// `layer` is the root-relative directory of the content layer that owns the
// journey's cities (`content` or `content/journeys/<journeyId>`); a release
// writes only there and to the journey's manifest.
const releaseFiles = (journeyId: string, layer: string, cityIds: readonly string[], through?: string) => [journeyManifestPath(journeyId),
  ...prefix(cityIds, through).flatMap((id) => [`${layer}/cities/${id}.json`, `${layer}/travel/${id}.json`])];
/** Catalogs that receive generated definitions, addressed by kind (not by position). */
const fragmentKinds = {
  journey: "progression/journey.json", battles: "battles/catalog.json", dates: "romance/date_catalog.json",
  tourism: "tourism/catalog.json", effects: "romance/effect_catalog.json", presentation: "romance/presentation.json",
  translations: "learning/translations.json",
} as const satisfies Record<string, MergedKind>;
type FragmentName = keyof typeof fragmentKinds;
const fragmentFile = (layer: string, name: FragmentName) => `${layer}/${fragmentKinds[name]}`;
const fragmentFiles = (layer: string) => (Object.keys(fragmentKinds) as FragmentName[]).map((name) => fragmentFile(layer, name));
const text = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
/** The text of `value`; a file whose data stays the same keeps its exact text, so a release does not rewrite it. */
const textKeeping = (before: string | null | undefined, value: unknown) =>
  typeof before === "string" && isDeepStrictEqual(JSON.parse(before), value) ? before : text(value);
/** Original file contents for a release; null marks a fragment the layer does not have yet. */
export type ReleaseFiles = Record<string, string | null>;
/** Merged catalogs of all layers (by kind), for collision checks against other layers. */
export type MergedCatalogValues = Partial<Record<MergedKind, any>>;

/** Changes only release markers; authored content remains the single source. */
export function journeyReleaseChanges(original: ReleaseFiles, journeyId: string, through?: string, layer: string = CONTENT_DIRECTORY): Record<string, string> {
  const result: Record<string, string> = {};
  const cityIds = journeyCities(original, journeyId);
  const files = releaseFiles(journeyId, layer, cityIds, through);
  const manifest = JSON.parse(original[files[0]]!);
  manifest.status = "available";
  result[files[0]] = textKeeping(original[files[0]], manifest);
  for (const id of prefix(cityIds, through)) {
    const cityFile = `${layer}/cities/${id}.json`;
    const travelFile = `${layer}/travel/${id}.json`;
    if (typeof original[cityFile] !== "string" || typeof original[travelFile] !== "string") throw new Error(`Journey city mismatch: ${id}`);
    const city = JSON.parse(original[cityFile]);
    const travel = JSON.parse(original[travelFile]);
    if (city.id !== id || travel.cityId !== id || !Array.isArray(travel.events)) throw new Error(`Journey city mismatch: ${id}`);
    city.productionStatus = "complete";
    travel.events = travel.events.map(({ contentStatus, ...event }: { contentStatus?: string; [key: string]: unknown }) => {
      if (contentStatus !== undefined && contentStatus !== "pending_content") throw new Error(`Unknown event status: ${id}`);
      return event;
    });
    result[cityFile] = textKeeping(original[cityFile], city);
    result[travelFile] = textKeeping(original[travelFile], travel);
  }
  return result;
}

type Fragments = ReturnType<typeof buildJourneyFragments>;
/**
 * Merge generated technical definitions without deleting or overwriting
 * unrelated content. Definitions go to the fragments of `layer` (a missing
 * fragment, or a missing key of one, starts empty); an ID already defined in
 * any layer (`merged`) must be identical and is not added again.
 */
export function mergeJourneyReleaseFragments(original: ReleaseFiles, release: Record<string, string>, fragments: Fragments,
  quizzes: ReturnType<typeof loadJourneyReadiness>["quizzes"] = [], translations?: unknown,
  { layer = CONTENT_DIRECTORY, merged = {} }: { layer?: string; merged?: MergedCatalogValues } = {}): Record<string, string> {
  const result = { ...release };
  const read = (file: string): any => JSON.parse(result[file] ?? original[file] ?? "null");
  // Keys an existing fragment leaves out are added for editing and trimmed again when they stay empty.
  const added = new Map<FragmentName, ReadonlyMap<string, unknown>>();
  const fragment = (name: FragmentName): any => {
    const file = fragmentFile(layer, name);
    const schemaVersion = merged[fragmentKinds[name]]?.schemaVersion;
    if (!(result[file] ?? original[file])) return emptyCatalog(fragmentKinds[name], schemaVersion);
    const data = read(file);
    added.set(name, completeFragment(fragmentKinds[name], data, schemaVersion));
    return data;
  };
  const write = (name: FragmentName, value: Record<string, unknown>) => {
    const file = fragmentFile(layer, name);
    // A fragment (or a key of it) the layer does not have yet is created only when it gains entries.
    if (typeof original[file] !== "string" && isDeepStrictEqual(value, emptyCatalog(fragmentKinds[name], value.schemaVersion))) return;
    result[file] = textKeeping(original[file], trimFragment(value, added.get(name) ?? new Map()));
  };
  const others = (name: FragmentName, key: string): any[] => merged[fragmentKinds[name]]?.[key] ?? [];
  const merge = (existing: any[], incoming: readonly any[], label: string, all: readonly any[] = []) => {
    const ids = new Set<string>();
    for (const item of existing) {
      if (!item.id || ids.has(item.id)) throw new Error(`Duplicate existing ${label} ID: ${item.id}`);
      ids.add(item.id);
    }
    const incomingIds = new Set<string>();
    for (const item of incoming) {
      if (!item.id || incomingIds.has(item.id)) throw new Error(`Duplicate fragment ${label} ID: ${item.id}`);
      incomingIds.add(item.id);
      const previous = existing.find((entry) => entry.id === item.id) ?? all.find((entry) => entry.id === item.id);
      if (previous && !isDeepStrictEqual(previous, item)) throw new Error(`Existing ${label} differs: ${item.id}`);
      if (!previous) { existing.push(item); ids.add(item.id); }
    }
  };
  const journey = fragment("journey");
  merge(journey.episodes, fragments.episodes, "episode", others("journey", "episodes"));
  merge(journey.rewards, fragments.rewards, "reward", others("journey", "rewards"));
  write("journey", journey);
  const battles = fragment("battles");
  merge(battles.battles, fragments.battles, "battle", others("battles", "battles"));
  write("battles", battles);
  const dates = fragment("dates");
  merge(dates.dates, fragments.dates, "date", others("dates", "dates"));
  write("dates", dates);
  const tourism = fragment("tourism");
  merge(tourism.landmarks, fragments.landmarks, "landmark", others("tourism", "landmarks"));
  merge(tourism.clues, fragments.clues, "observation", others("tourism", "clues"));
  write("tourism", tourism);
  const effects = fragment("effects");
  merge(effects.effects, fragments.effects, "effect", others("effects", "effects"));
  write("effects", effects);
  const presentation = fragment("presentation");
  const mergedMemories: Record<string, unknown> = merged[fragmentKinds.presentation]?.memories ?? {};
  for (const [id, memory] of Object.entries(fragments.memories)) {
    const previous = Object.hasOwn(presentation.memories, id) ? presentation.memories[id] : mergedMemories[id];
    if (previous !== undefined && !isDeepStrictEqual(previous, memory))
      throw new Error(`Existing memory differs: ${id}`);
    if (previous === undefined || Object.hasOwn(presentation.memories, id)) presentation.memories[id] = memory;
  }
  write("presentation", presentation);
  const learning = learningCatalogSchema.parse(fragment("translations"));
  const mergedQuestions: Record<string, z.infer<typeof translationSchema>> = merged[fragmentKinds.translations]?.questions ?? {};
  const supplied = translations === undefined ? {} : z.object({ schemaVersion: z.literal(1), questions: z.record(z.string(), translationSchema.omit({ source: true })) }).strict().parse(translations).questions;
  const quizIds = new Set(fragments.battles.map((battle) => battle.quizId));
  const usedQuestions = new Set<string>();
  for (const quizId of quizIds) {
    const quiz = quizzes.find((item) => item.id === quizId);
    if (!quiz) throw new Error(`Journey quiz is missing: ${quizId}`);
    for (const question of quiz.questions) {
      usedQuestions.add(question.id);
      const translated = supplied[question.id];
      const own = Object.hasOwn(learning.questions, question.id);
      const existing = own ? learning.questions[question.id] : mergedQuestions[question.id];
      if (!translated && !existing) throw new Error(`Journey quiz translation is missing: ${question.id}`);
      if (translated) {
        const entry = translationSchema.parse({ source: questionSource(question), ...translated });
        if (existing && !isDeepStrictEqual(existing, entry)) throw new Error(`Existing translation differs: ${question.id}`);
        if (own || !existing) learning.questions[question.id] = entry;
      } else if (!isDeepStrictEqual(existing.source, questionSource(question))) throw new Error(`Existing translation source differs: ${question.id}`);
    }
  }
  if (Object.keys(supplied).some((id) => !usedQuestions.has(id))) throw new Error("Translation contains an unknown or unselected question");
  write("translations", learning);
  const cityIds = new Set([...fragments.episodes.map((item) => item.cityId), ...fragments.landmarks.map((item) => item.cityId),
    ...fragments.finaleEvents.map((item) => item.cityId)]);
  for (const cityId of cityIds) {
    const travelFile = `${layer}/travel/${cityId}.json`;
    if (!(travelFile in release)) throw new Error(`Journey fragments include unselected city: ${cityId}`);
    const cityLandmarks = fragments.landmarks.filter((item) => item.cityId === cityId);
    const finales = fragments.finaleEvents.filter((item) => item.cityId === cityId).map(({ contentStatus: _pending, ...event }) => event);
    if (!cityLandmarks.length && !finales.length) continue;
    const travel = read(travelFile);
    for (const landmark of cityLandmarks) {
      const place = travel.places.find((item: { id: string }) => item.id === landmark.id);
      if (!place) throw new Error(`Journey fragment has unknown place: ${landmark.id}`);
      place.landmarkIds ??= [];
      if (!place.landmarkIds.includes(landmark.id)) place.landmarkIds.push(landmark.id);
    }
    merge(travel.events, finales, "finale travel event");
    result[travelFile] = textKeeping(original[travelFile], travel);
  }
  return result;
}

/** Fingerprint all validation inputs, including additions and binary changes. */
export function journeyInputFingerprint(root: string, ignore: ReadonlySet<string> = new Set()): string {
  const hash = createHash("sha256");
  const walk = (relative: string) => {
    if (ignore.has(relative)) return;
    const absolute = path.join(root, relative);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Cannot safely validate a symlink: ${relative}`);
    if (stat.isDirectory()) {
      hash.update(`dir\0${relative}\0`);
      for (const child of readdirSync(absolute).sort()) walk(path.join(relative, child));
    } else if (stat.isFile()) {
      const content = readFileSync(absolute);
      hash.update(`file\0${relative}\0${content.length}\0`);
      hash.update(content);
    } else throw new Error(`Unsupported validation input: ${relative}`);
  };
  walk("content");
  walk("public");
  for (const { observationFile } of journeyAuthoringProfiles(root).values()) {
    if (existsSync(path.join(root, observationFile))) walk(observationFile);
    else hash.update(`missing-observation-cards\0${observationFile}\0`);
  }
  return hash.digest("hex");
}

/**
 * Stage all files first, then rename; roll back earlier renames on failure.
 * Only the journey's manifest and the files of its owner `layer` may be
 * written; a fragment the layer does not have yet (original null) is created
 * without overwriting (link), together with its directories, and removed again
 * on rollback. A file whose text stays the same (e.g. an already published
 * city) is not rewritten, but it must still be unchanged on disk. Returns the
 * written files. `move` and `afterStaging` (called once the temporary files
 * are written, before they are checked again) let tests fail a rename or edit
 * a file at that moment.
 */
export function writeJourneyReleaseFiles(root: string, original: ReleaseFiles, next: Record<string, string>, journeyId: string, move = renameSync,
  expectedFingerprint?: string, layer: string = CONTENT_DIRECTORY, afterStaging?: () => void): string[] {
  const requested = Object.keys(next);
  const cityIds = journeyCities(original, journeyId);
  const fragments = new Set(fragmentFiles(layer));
  // The release markers of one city prefix, plus any of the layer's fragments.
  const validSet = cityIds.some((id) => {
    const release = releaseFiles(journeyId, layer, cityIds, id);
    return release.every((file) => requested.includes(file)) && requested.every((file) => release.includes(file) || fragments.has(file));
  });
  if (!validSet || requested.some((file) => !Object.hasOwn(original, file) || typeof next[file] !== "string" ||
    (typeof original[file] !== "string" && !(original[file] === null && fragments.has(file)))))
    throw new Error("Invalid Journey release file set");
  const files = changedReleaseFiles(original, next);
  const current = (relative: string) => {
    const target = path.join(root, relative);
    return existsSync(target) ? readFileSync(target, "utf8") : null;
  };
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staged: string[] = [];
  const changed: string[] = [];
  let created: string[] = [];
  let committed = false;
  try {
    // Every requested file, also one that is not rewritten: the release was validated against all of them.
    for (const relative of requested) if (current(relative) !== original[relative]) throw new Error(`File changed while validating: ${relative}`);
    created = createParentDirectories(root, files);
    for (const relative of files) {
      const target = path.join(root, relative);
      const temporary = `${target}.journey-release-${token}`;
      writeFileSync(temporary, next[relative], { flag: "wx", mode: original[relative] === null ? 0o644 : statSync(target).mode });
      staged.push(temporary);
    }
    afterStaging?.();
    // Detect changes even if the files were edited while the temporary files were written.
    for (const relative of requested) if (current(relative) !== original[relative])
      throw new Error(`File changed while validating: ${relative}`);
    const ignored = new Set([...staged.map((file) => path.relative(root, file)), ...created]);
    if (expectedFingerprint && journeyInputFingerprint(root, ignored) !== expectedFingerprint)
      throw new Error("Content or assets changed while preparing release files.");
    for (const relative of files) {
      const target = path.join(root, relative);
      const temporary = `${target}.journey-release-${token}`;
      if (original[relative] === null) {
        // link() is create-only: a fragment created meanwhile by someone else is never overwritten.
        linkSync(temporary, target);
        changed.push(relative);
        rmSync(temporary);
      } else {
        move(temporary, target);
        changed.push(relative);
      }
    }
    committed = true;
    return [...changed];
  } catch (error) {
    const failures: string[] = [];
    for (const relative of changed.reverse()) {
      const target = path.join(root, relative);
      try {
        const before = original[relative];
        if (before === null) {
          // Remove only our own new file, never another editor's later change.
          if (current(relative) !== next[relative]) failures.push(relative);
          else rmSync(target);
          continue;
        }
        const temporary = `${target}.journey-rollback-${token}`;
        writeFileSync(temporary, before, { flag: "wx", mode: statSync(target).mode });
        renameSync(temporary, target);
      } catch { failures.push(relative); }
    }
    if (failures.length) throw new Error(`Release failed and rollback failed for ${failures.join(", ")}; restore these files from version control.`, { cause: error });
    throw error;
  } finally {
    for (const file of staged) if (existsSync(file)) rmSync(file, { force: true });
    if (!committed) removeCreatedDirectories(root, created);
  }
}

/** The files of `next` whose text differs from `original` (the ones a release writes). */
const changedReleaseFiles = (original: ReleaseFiles, next: Record<string, string>) =>
  Object.keys(next).filter((file) => next[file] !== original[file]);

export interface JourneyReleaseResult {
  /** The journey and the last city of the released city prefix, with their Japanese names. */
  journey: { id: string; nameJa: string };
  lastCity: { id: string; nameJa: string };
  /** Root-relative files the apply wrote, or that an apply would write after a check. */
  files: string[];
}

/** Preview in a temporary copy; only explicitly apply after full validation. */
export async function prepareJourneyRelease(root: string, journeyId: string, apply: boolean, through?: string, narrativeFile?: string, translationsFile?: string): Promise<JourneyReleaseResult> {
  getJourneyAuthoringProfile(root, journeyId);
  const before = loadJourneyReadiness(root, journeyId);
  const cityIds = before.trip.cities.map((city) => city.id);
  const report = inspectJourneyReadiness(before);
  // A journey made from the sample (journey:new) is never published with the sample's fictional content.
  const leftovers = report.issues.filter((issue) => issue.code === "sample_content_left");
  if (leftovers.length) throw new Error(`見本の内容が残っているため公開できません。実在の出典・画像・文章に置き換えてから実行し直してください（一覧: npm run journey:readiness -- --journey ${journeyId}）。\n${leftovers.map((issue) => `- ${issue.detail}`).join("\n")}`);
  const ids = prefix(cityIds, through);
  const last = before.trip.cities.find((city) => city.id === ids.at(-1))!;
  const candidate = report.cities.filter((city) => ids.includes(city.cityId));
  const hasBlocker = report.issues.some((issue) => issue.code !== "journey_unavailable") || candidate.length !== ids.length || candidate.some((city) =>
    city.issues.some((issue) => issue.code !== "city_incomplete") || city.events.some((event) => event.issues.some((issue) => issue.code !== "event_pending")));
  if (hasBlocker && !narrativeFile) throw new Error(`Journey has unfinished references through ${last.id}; supply scenario metadata or run the readiness report.`);
  const fingerprint = journeyInputFingerprint(root);
  const unpublished = new Set(before.cities.filter((entry) => ids.includes(entry.city.id) && entry.city.productionStatus !== "complete").map((entry) => entry.city.id));
  const includeFragments = !!narrativeFile && unpublished.size > 0;
  // Releases write to the layer that owns the journey's cities (the core layer while they live there).
  const sources = loadContentSources(root);
  const layer = displayPath(root, journeyLayer(sources, journeyId).directory);
  const files = includeFragments ? [...releaseFiles(journeyId, layer, cityIds, through), ...fragmentFiles(layer)] : releaseFiles(journeyId, layer, cityIds, through);
  const original: ReleaseFiles = Object.fromEntries(files.map((file) => {
    const target = path.join(root, file);
    return [file, existsSync(target) ? readFileSync(target, "utf8") : null];
  }));
  let next = journeyReleaseChanges(original, journeyId, through, layer);
  let narrativeOriginal: string | undefined;
  let translationsOriginal: string | undefined;
  if (narrativeFile && includeFragments) {
    narrativeOriginal = readFileSync(narrativeFile, "utf8");
    if (translationsFile) translationsOriginal = readFileSync(translationsFile, "utf8");
    const scaffold = loadJourneyScaffold(root, journeyId);
    const fragments = buildJourneyFragments(scaffold, JSON.parse(narrativeOriginal), [...unpublished]);
    const merged = Object.fromEntries(Object.entries(sources.catalogs).map(([kind, catalog]) => [kind, catalog.value]));
    next = mergeJourneyReleaseFragments(original, next, fragments, before.quizzes,
      translationsOriginal === undefined ? undefined : JSON.parse(translationsOriginal), { layer, merged });
  }
  const stage = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-release-"));
  try {
    cpSync(path.join(root, "content"), path.join(stage, "content"), { recursive: true });
    cpSync(path.join(root, "public"), path.join(stage, "public"), { recursive: true });
    for (const [relative, value] of Object.entries(next)) {
      mkdirSync(path.dirname(path.join(stage, relative)), { recursive: true });
      writeFileSync(path.join(stage, relative), value);
    }
    const stagedReport = inspectJourneyReadiness(loadJourneyReadiness(stage, journeyId));
    const stageCities = stagedReport.cities.filter((city) => ids.includes(city.cityId));
    if (stagedReport.issues.length || stageCities.length !== ids.length || stageCities.some((city) => city.issues.length || city.events.some((event) => event.issues.length)))
      throw new Error(`Journey has unfinished scenario, quiz or content references through ${last.id}.`);
    await buildContent(stage, false);
    if (journeyInputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation; release was not applied.");
    if (narrativeFile && includeFragments && readFileSync(narrativeFile, "utf8") !== narrativeOriginal) throw new Error("Scenario metadata changed during validation; release was not applied.");
    if (translationsFile && includeFragments && readFileSync(translationsFile, "utf8") !== translationsOriginal) throw new Error("Quiz translations changed during validation; release was not applied.");
    const written = apply ? writeJourneyReleaseFiles(root, original, next, journeyId, renameSync, fingerprint, layer) : changedReleaseFiles(original, next);
    return { journey: { id: journeyId, nameJa: before.trip.nameJa }, lastCity: { id: last.id, nameJa: last.nameJa }, files: written };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
