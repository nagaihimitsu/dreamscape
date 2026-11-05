import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "./content-pipeline";
import { z } from "zod";
import { learningCatalogSchema, questionSource, translationSchema } from "../src/content/learning-schema";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { buildJourneyFragments, loadJourneyScaffold } from "./journey-scaffold";
import { authoringProfileOf, getJourneyAuthoringProfile, journeyAuthoringProfiles } from "./journey-authoring";
import { journeyManifestPath } from "./content-layout";

/** The journey's own manifest.json carries its status and city order. */
const journeyCities = (original: Record<string, string>, journeyId: string): string[] => {
  const file = journeyManifestPath(journeyId);
  const manifest = typeof original[file] === "string" ? JSON.parse(original[file]) : undefined;
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
const releaseFiles = (journeyId: string, cityIds: readonly string[], through?: string) => [journeyManifestPath(journeyId), ...prefix(cityIds, through).flatMap((id) => [`content/cities/${id}.json`, `content/travel/${id}.json`])];
const fragmentFiles = ["content/progression/journey.json", "content/battles/catalog.json", "content/romance/date_catalog.json", "content/tourism/catalog.json", "content/romance/effect_catalog.json", "content/romance/presentation.json", "content/learning/translations.json"];
const text = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Changes only release markers; authored content remains the single source. */
export function journeyReleaseChanges(original: Record<string, string>, journeyId: string, through?: string): Record<string, string> {
  const result: Record<string, string> = {};
  const cityIds = journeyCities(original, journeyId);
  const files = releaseFiles(journeyId, cityIds, through);
  const manifest = JSON.parse(original[files[0]]);
  manifest.status = "available";
  result[files[0]] = text(manifest);
  for (const id of prefix(cityIds, through)) {
    const cityFile = `content/cities/${id}.json`;
    const travelFile = `content/travel/${id}.json`;
    const city = JSON.parse(original[cityFile]);
    const travel = JSON.parse(original[travelFile]);
    if (city.id !== id || travel.cityId !== id || !Array.isArray(travel.events)) throw new Error(`Journey city mismatch: ${id}`);
    city.productionStatus = "complete";
    travel.events = travel.events.map(({ contentStatus, ...event }: { contentStatus?: string; [key: string]: unknown }) => {
      if (contentStatus !== undefined && contentStatus !== "pending_content") throw new Error(`Unknown event status: ${id}`);
      return event;
    });
    result[cityFile] = text(city);
    result[travelFile] = text(travel);
  }
  return result;
}

type Fragments = ReturnType<typeof buildJourneyFragments>;
/** Merge generated technical definitions without deleting or overwriting unrelated content. */
export function mergeJourneyReleaseFragments(original: Record<string, string>, release: Record<string, string>, fragments: Fragments,
  quizzes: ReturnType<typeof loadJourneyReadiness>["quizzes"] = [], translations?: unknown): Record<string, string> {
  const result = { ...release };
  const read = (file: string): any => JSON.parse(result[file] ?? original[file]);
  const merge = (existing: any[], incoming: readonly any[], label: string) => {
    const ids = new Set<string>();
    for (const item of existing) {
      if (!item.id || ids.has(item.id)) throw new Error(`Duplicate existing ${label} ID: ${item.id}`);
      ids.add(item.id);
    }
    const incomingIds = new Set<string>();
    for (const item of incoming) {
      if (!item.id || incomingIds.has(item.id)) throw new Error(`Duplicate fragment ${label} ID: ${item.id}`);
      incomingIds.add(item.id);
      const previous = existing.find((entry) => entry.id === item.id);
      if (previous && !isDeepStrictEqual(previous, item)) throw new Error(`Existing ${label} differs: ${item.id}`);
      if (!previous) { existing.push(item); ids.add(item.id); }
    }
  };
  const journey = read(fragmentFiles[0]);
  merge(journey.episodes, fragments.episodes, "episode");
  merge(journey.rewards, fragments.rewards, "reward");
  result[fragmentFiles[0]] = text(journey);
  const battles = read(fragmentFiles[1]);
  merge(battles.battles, fragments.battles, "battle");
  result[fragmentFiles[1]] = text(battles);
  const dates = read(fragmentFiles[2]);
  merge(dates.dates, fragments.dates, "date");
  result[fragmentFiles[2]] = text(dates);
  const tourism = read(fragmentFiles[3]);
  merge(tourism.landmarks, fragments.landmarks, "landmark");
  merge(tourism.clues, fragments.clues, "observation");
  result[fragmentFiles[3]] = text(tourism);
  const effects = read(fragmentFiles[4]);
  merge(effects.effects, fragments.effects, "effect");
  result[fragmentFiles[4]] = text(effects);
  const presentation = read(fragmentFiles[5]);
  for (const [id, memory] of Object.entries(fragments.memories)) {
    if (Object.hasOwn(presentation.memories, id) && !isDeepStrictEqual(presentation.memories[id], memory))
      throw new Error(`Existing memory differs: ${id}`);
    presentation.memories[id] = memory;
  }
  result[fragmentFiles[5]] = text(presentation);
  const learning = learningCatalogSchema.parse(read(fragmentFiles[6]));
  const supplied = translations === undefined ? {} : z.object({ schemaVersion: z.literal(1), questions: z.record(z.string(), translationSchema.omit({ source: true })) }).strict().parse(translations).questions;
  const quizIds = new Set(fragments.battles.map((battle) => battle.quizId));
  const usedQuestions = new Set<string>();
  for (const quizId of quizIds) {
    const quiz = quizzes.find((item) => item.id === quizId);
    if (!quiz) throw new Error(`Journey quiz is missing: ${quizId}`);
    for (const question of quiz.questions) {
      usedQuestions.add(question.id);
      const translated = supplied[question.id];
      const existing = learning.questions[question.id];
      if (!translated && !existing) throw new Error(`Journey quiz translation is missing: ${question.id}`);
      if (translated) {
        const entry = translationSchema.parse({ source: questionSource(question), ...translated });
        if (existing && !isDeepStrictEqual(existing, entry)) throw new Error(`Existing translation differs: ${question.id}`);
        learning.questions[question.id] = entry;
      } else if (!isDeepStrictEqual(existing.source, questionSource(question))) throw new Error(`Existing translation source differs: ${question.id}`);
    }
  }
  if (Object.keys(supplied).some((id) => !usedQuestions.has(id))) throw new Error("Translation contains an unknown or unselected question");
  result[fragmentFiles[6]] = text(learning);
  const cityIds = new Set([...fragments.episodes.map((item) => item.cityId), ...fragments.landmarks.map((item) => item.cityId),
    ...fragments.finaleEvents.map((item) => item.cityId)]);
  for (const cityId of cityIds) {
    const travelFile = `content/travel/${cityId}.json`;
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
    result[travelFile] = text(travel);
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

/** Stage all files first, then rename; roll back earlier renames on failure. */
export function writeJourneyReleaseFiles(root: string, original: Record<string, string>, next: Record<string, string>, journeyId: string, move = renameSync, expectedFingerprint?: string): void {
  const files = Object.keys(next);
  const cityIds = journeyCities(original, journeyId);
  const validSets = cityIds.flatMap((id) => [releaseFiles(journeyId, cityIds, id), [...releaseFiles(journeyId, cityIds, id), ...fragmentFiles]].map((set) => set.sort().join("\n")));
  if (!validSets.includes([...files].sort().join("\n")) || files.some((file) => typeof original[file] !== "string"))
    throw new Error("Invalid Journey release file set");
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staged: string[] = [];
  const changed: string[] = [];
  try {
    for (const relative of files) {
      const target = path.join(root, relative);
      if (readFileSync(target, "utf8") !== original[relative]) throw new Error(`File changed while validating: ${relative}`);
      const temporary = `${target}.journey-release-${token}`;
      writeFileSync(temporary, next[relative], { flag: "wx", mode: statSync(target).mode });
      staged.push(temporary);
    }
    // Detect changes even if the files were edited while the temporary files were written.
    for (const relative of files) if (readFileSync(path.join(root, relative), "utf8") !== original[relative])
      throw new Error(`File changed while validating: ${relative}`);
    const ignored = new Set(staged.map((file) => path.relative(root, file)));
    if (expectedFingerprint && journeyInputFingerprint(root, ignored) !== expectedFingerprint)
      throw new Error("Content or assets changed while preparing release files.");
    for (const relative of files) {
      const target = path.join(root, relative);
      move(`${target}.journey-release-${token}`, target);
      changed.push(relative);
    }
  } catch (error) {
    const failures: string[] = [];
    for (const relative of changed.reverse()) {
      const target = path.join(root, relative);
      try {
        const temporary = `${target}.journey-rollback-${token}`;
        writeFileSync(temporary, original[relative], { flag: "wx", mode: statSync(target).mode });
        renameSync(temporary, target);
      } catch { failures.push(relative); }
    }
    if (failures.length) throw new Error(`Release failed and rollback failed for ${failures.join(", ")}; restore these files from version control.`, { cause: error });
    throw error;
  } finally {
    for (const file of staged) if (existsSync(file)) rmSync(file, { force: true });
  }
}

/** Preview in a temporary copy; only explicitly apply after full validation. */
export async function prepareJourneyRelease(root: string, journeyId: string, apply: boolean, through?: string, narrativeFile?: string, translationsFile?: string): Promise<void> {
  getJourneyAuthoringProfile(root, journeyId);
  const before = loadJourneyReadiness(root, journeyId);
  const cityIds = before.trip.cities.map((city) => city.id);
  const report = inspectJourneyReadiness(before);
  const ids = prefix(cityIds, through);
  const candidate = report.cities.filter((city) => ids.includes(city.cityId));
  const hasBlocker = report.issues.some((issue) => issue.code !== "journey_unavailable") || candidate.length !== ids.length || candidate.some((city) =>
    city.issues.some((issue) => issue.code !== "city_incomplete") || city.events.some((event) => event.issues.some((issue) => issue.code !== "event_pending")));
  if (hasBlocker && !narrativeFile) throw new Error(`Journey has unfinished references through ${through}; supply scenario metadata or run the readiness report.`);
  const fingerprint = journeyInputFingerprint(root);
  const unpublished = new Set(before.cities.filter((entry) => ids.includes(entry.city.id) && entry.city.productionStatus !== "complete").map((entry) => entry.city.id));
  const includeFragments = !!narrativeFile && unpublished.size > 0;
  const files = includeFragments ? [...releaseFiles(journeyId, cityIds, through), ...fragmentFiles] : releaseFiles(journeyId, cityIds, through);
  const original = Object.fromEntries(files.map((file) => [file, readFileSync(path.join(root, file), "utf8")]));
  let next = journeyReleaseChanges(original, journeyId, through);
  let narrativeOriginal: string | undefined;
  let translationsOriginal: string | undefined;
  if (narrativeFile && includeFragments) {
    narrativeOriginal = readFileSync(narrativeFile, "utf8");
    if (translationsFile) translationsOriginal = readFileSync(translationsFile, "utf8");
    const scaffold = loadJourneyScaffold(root, journeyId);
    const fragments = buildJourneyFragments(scaffold, JSON.parse(narrativeOriginal), [...unpublished]);
    next = mergeJourneyReleaseFragments(original, next, fragments, before.quizzes, translationsOriginal === undefined ? undefined : JSON.parse(translationsOriginal));
  }
  const stage = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-release-"));
  try {
    cpSync(path.join(root, "content"), path.join(stage, "content"), { recursive: true });
    cpSync(path.join(root, "public"), path.join(stage, "public"), { recursive: true });
    for (const relative of files) writeFileSync(path.join(stage, relative), next[relative]);
    const stagedReport = inspectJourneyReadiness(loadJourneyReadiness(stage, journeyId));
    const stageCities = stagedReport.cities.filter((city) => ids.includes(city.cityId));
    if (stagedReport.issues.length || stageCities.length !== ids.length || stageCities.some((city) => city.issues.length || city.events.some((event) => event.issues.length)))
      throw new Error(`Journey has unfinished scenario, quiz or content references through ${through}.`);
    await buildContent(stage, false);
    if (journeyInputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation; release was not applied.");
    if (narrativeFile && includeFragments && readFileSync(narrativeFile, "utf8") !== narrativeOriginal) throw new Error("Scenario metadata changed during validation; release was not applied.");
    if (translationsFile && includeFragments && readFileSync(translationsFile, "utf8") !== translationsOriginal) throw new Error("Quiz translations changed during validation; release was not applied.");
    if (apply) writeJourneyReleaseFiles(root, original, next, journeyId, renameSync, fingerprint);
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
