import {
  commonDateEffect,
  compileInk,
  validateNoInkRandom,
  validateRelationshipToneSource,
  validateLearningTopic,
} from "./ink-validation";
import { unique, withContext } from "./content-validation-utils";
import { validateStoryCached, type StoryValidationCache } from "./story-validation-cache";
import { requireServedFile, servedFile } from "./public-assets";
import path from "node:path";
import { SAMPLE_JOURNEY_ID, type CatalogKind } from "./content-layout";
import { exampleUrlCount } from "./sample-journey";
import { displayPath, journeyFolderPath, parseCatalog as parseSourceCatalog, parseSourceFile, requireJourneyManifests, type ContentSources } from "./content-sources";
import { DEFAULT_BACKGROUND_ID } from "../src/content/default-background";
import { authoringProfileOf } from "./journey-authoring";
import { checkContentOwnership } from "./content-ownership";
import { checkImageRights, OWN_ARTWORK_KIND, ownArtworkByLayer, servingLayer } from "./image-rights";
import { contentWarnings, journeyContents, unusedWordMeanings, type ContentWarning } from "./content-report";
import { characterCatalogSchema } from "../src/content/character-assets";
import { encounterCatalogInputSchema, normalizeEncounterCatalog } from "../src/content/encounter-schemas";
import { encounterEntryRulesSchema, validateEncounterEntryRules } from "../src/content/encounter-entry-rules";
import { validateEncounterContent } from "./encounter-validation";
import { dataLanguageWarnings, translationLanguageWarning } from "./data-language";
import { transitLedgerSchema } from "./transit-ledger";
import type { z } from "zod";
import { headEntryRule, HEAD_TAGS, readEncounterHead, type EncounterHead } from "./encounter-head";
import { checkConditions, conditionWarnings, dateConditionOwners, entryRuleConditionOwners, mapConditionOwners, type ConditionContent, type ConditionOwner } from "./condition-validation";
import { mainPaymentsOf, progressionErrors, progressionWarnings, sceneItemsOf, tourProgression, type ProgressionContent } from "./progression-check";
import { parseSceneConditions, readSceneConditions } from "./scene-conditions";
import type { Condition } from "../src/content/condition-schemas";
import { validateBackgroundAssets, validateBackgroundPlaces, validateCharacters } from "./presentation-validation";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { dialogueReactionCatalogSchema } from "../src/content/dialogue-reactions";
import { createDialogueReactionValidator } from "./dialogue-reaction-validation";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { validateMemoryReferences } from "../src/story/memory";
import { validateItemReferences } from "../src/story/items";
import { RELATIONSHIP_TONES } from "../src/domain/romance-tone";
import { createDialogueExpressionValidator, type DialogueObserver } from "./dialogue-expression-validation";
import {
  battleCatalogSchema,
  quizSchema,
  type QuizDefinition,
  balanceSchema,
  citySchema,
  dateCatalogSchema,
  effectCatalogSchema,
  responseProfileCatalogSchema,
  presentationSchema,
  quizExampleSchema,
  progressionSchema,
  type DateDefinition,
} from "../src/content/schemas";
import type { TagContext } from "../src/content/tags";
import { albumFolderPath, albumImagesOf, checkAlbumTags } from "./album-images";
import { checkVoiceCredits, checkVoiceTags, voiceFilesOf, voiceFolderPath } from "./voice-files";
import { checkSoundTags, soundRegistry, soundUseProblem, soundVolumesOf, soundWarnings, transportModeSounds } from "./sound-files";
import { checkBgmTags, musicDataOf, musicRegistry, musicWarnings } from "./music-files";
import { ambienceDataOf, ambienceRegistry, ambienceWarnings, checkAmbienceTags } from "./ambience-files";
import { audioLayersOf } from "./audio-layers";
import { sceneAudioOf } from "./scene-audio";
import { checkSceneEffectTags, itemJourneys } from "./scene-effect-tags";
import { checkEmphasisTags } from "./line-emphasis";
import { checkHelperKnot, revealRegionProblem, validateBattleEvidence } from "./battle-validation";
import { landmarkOrderError, landmarkParts, tourismCatalogSchema, type VisitPart } from "../src/content/tourism-schemas";
import type { SceneOption } from "../src/content/scene-schemas";
import { validateTourism } from "./tourism-validation";
import { isTourOnlyPlace, travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { validateTravelContent } from "./travel-validation";
import { tourSchema } from "../src/content/tour-schemas";
import { parseTourFiles, validateTours } from "./tour-validation";
import { checkCityRentals, checkCityTransit, checkRouteModes, checkTransportModeCount, cityTransitWarnings, transportSummary } from "./transport-validation";
import type { CityTransitReview } from "./transit-ledger";
import { getAllRewardRules, journeySchema } from "../src/content/journey-schemas";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { validateJourney } from "./journey-validation";
import { validateEpilogue } from "./epilogue-validation";
import { isPlaceStory, splitStoryAddress, storyFileOf } from "../src/content/story-address";
import { includesModules, readFileChoices, readMainFileHead, readPlaceFile, choiceOption, parseDone, parseThen, type PlaceFile } from "./place-files";
import { checkSpeakerPeople } from "./speaker-people";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { walkScene } from "./scene-walk";
import { catalogScenes, checkRuleIds, checkSceneReferences, insertedSceneEncounter, mainFileSceneId, mergeCatalogChoiceTags, placeScenes, sceneConditionsOf, sceneRewardErrors, sceneTagRules, thenLoopErrors, thenLoopWarnings, momentText, momentWarnings, tourMomentErrors, type MainAddresses, type ThenLoopContext } from "./scene-table";
import { sceneDataCatalogSchema, storyStateCatalogSchema, type SceneEntry, type SceneMain } from "../src/content/scene-schemas";
import { fnvHash } from "../src/content/fingerprint";
import { parseConditionText, combineWhenUntil } from "../src/content/condition-text";
import { validateQuizEntries } from "./quiz-validation";
import { validateCityLinks } from "./city-links";
import {
  wordMeaningsSchema,
  wordPattern,
  normalizeWord,
} from "../src/content/word-meanings";
import {
  learningDetailsSchema,
  validateLearningDetails,
} from "../src/content/learning-details";
import {
  learningCatalogSchema,
  validateLearning,
} from "../src/content/learning-schema";
import { localWordsCatalogSchema } from "../src/content/local-words";

// Validation of the loaded content (validateContent): pure checks of the
// sources that content-sources.ts read, with the Ink compiled here. Nothing
// is read from or written to disk; image contents are decoded afterwards
// (content-images.ts) and the outputs written by content-outputs.ts.

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Checks of the journeys' cities on the loaded data, before the schemas (so
 * they name the files even when other content is unfinished; values of the
 * wrong type are left to the schemas):
 * - a city's name in the manifest (`cities[].nameJa`) equals its city file's `nameJa`;
 * - a complete city (`productionStatus` "complete") has a city finale episode
 *   (`kind` "city_finale" in progression/journey.json): the city clear,
 *   epilogue and departure happen only after the finale.
 */
function checkJourneyCities(sources: ContentSources): void {
  const show = (file: string) => displayPath(sources.root, file);
  for (const manifest of sources.manifests) {
    const planned = Array.isArray(manifest.data.cities) ? manifest.data.cities : [];
    planned.forEach((entry, index) => {
      if (!isObject(entry)) return;
      const city = sources.cities.find((item) => item.id === entry.id);
      const cityName = isObject(city?.data) ? city.data.nameJa : undefined;
      if (city && typeof entry.nameJa === "string" && typeof cityName === "string" && entry.nameJa !== cityName)
        throw new Error(`City name differs from the manifest: ${show(manifest.file)} cities[${index}] has nameJa ${JSON.stringify(entry.nameJa)}, ` +
          `${show(city.file)} has ${JSON.stringify(cityName)}; use the same name in both files`);
    });
  }
  const progression = sources.catalogs["progression/journey.json"];
  const episodes = isObject(progression?.value) && Array.isArray(progression.value.episodes) ? progression.value.episodes : [];
  for (const city of sources.cities) {
    if (!isObject(city.data) || city.data.productionStatus !== "complete") continue;
    if (!episodes.some((episode) => isObject(episode) && episode.kind === "city_finale" && episode.cityId === city.id))
      throw new Error(`Complete city has no city finale: ${show(city.file)} is "complete", but no episode of progression/journey.json ` +
        `has "kind": "city_finale" and "cityId": ${JSON.stringify(city.id)}; add the finale or keep the city "prototype"`);
  }
}

/**
 * A published journey (`status` "available") keeps no URL at example.com,
 * the domain reserved for examples, where the sample journey's fictional
 * sources point: a journey copied by journey:new and set to available by
 * hand stops here (journey:readiness and journey:release check every kind of
 * sample content left: sources, images and texts). The sample itself (dev
 * and tests only, never in a production build) is exempt.
 */
function checkPublishedSources(sources: ContentSources): void {
  for (const manifest of sources.manifests) {
    if (manifest.data.status !== "available" || manifest.id === SAMPLE_JOURNEY_ID) continue;
    const folder = `${journeyFolderPath(sources.tree, manifest.id)}/`;
    for (const [file, bytes] of sources.tree.files) {
      if (!bytes || !file.startsWith(folder) || !file.endsWith(".json")) continue;
      const text = bytes.toString("utf8");
      if (!/example\.com/iu.test(text)) continue;
      let count = 0;
      try { count = exampleUrlCount(text); } catch { continue; } // JSON that does not parse is reported by the loader and the schemas.
      if (count) throw new Error(`見本の出典が残っている旅行編は公開（status "available"）にできません: ${file} に見本の出典（example.com のURL）が${count}件あります` +
        `（Available journey with sample sources）。実際に確認した出典に置き換えるか、manifest.json の status を "preparing" に戻し、` +
        `npm run journey:readiness -- --journey ${manifest.id} で残っている見本の内容を確かめてください。`);
    }
  }
}

/**
 * A quiz file is named after its quiz ID: `quizzes/<id>.json`, an example
 * quiz `quizzes/<id>.example.json` (docs/02 「IDの付け方」). Checked on the
 * loaded data, before the schemas, so the message names the file even when
 * the quiz is otherwise unfinished (an `id` that is not a string is left to
 * the schema).
 */
function checkQuizFileNames(sources: ContentSources): void {
  for (const { file, example, data } of sources.quizFiles) {
    if (!isObject(data) || typeof data.id !== "string") continue;
    const expected = `${data.id}${example ? ".example.json" : ".json"}`;
    if (path.basename(file) !== expected)
      throw new Error(`クイズのファイル名がクイズIDと違います（Quiz file name differs from its id）: ${displayPath(sources.root, file)} のIDは ` +
        `${JSON.stringify(data.id)} です。ファイル名を ${expected} にしてください（${example ? "例のクイズは <ID>.example.json" : "クイズのファイル名は <ID>.json"}）。`);
  }
}

/**
 * The head of every encounter story that has head tags (by story ID). A head tag in any other
 * story stops the build, as do a malformed head, a head naming another landmark than the
 * catalog's, and a priority `after observe` at a landmark without an observation.
 */
function readEncounterHeads(sources: ContentSources, encounters: readonly { id: string; storyId: string; landmarkId?: string }[],
  landmarks: readonly { id: string }[], storyLabel: (storyId: string) => string): Map<string, EncounterHead> {
  const heads = new Map<string, EncounterHead>();
  const headTag = new RegExp(`^\\s*#\\s*(?:${HEAD_TAGS.join("|")})\\s*:`, "mu");
  for (const { id, source } of sources.storyFiles) {
    // A place file's knots carry their own heads (place-files.ts).
    if (isPlaceStory(id)) continue;
    const event = encounters.find((item) => item.storyId === id);
    if (!event) {
      if (headTag.test(source))
        throw new Error(`Head tags (# at:, # priority:, # when:, # until:, # repeat:) are written only in an encounter's story for now: ${storyLabel(id)}`);
      continue;
    }
    const { head } = withContext(storyLabel(id), () => readEncounterHead(source));
    if (!head) continue;
    if (head.landmarkId !== event.landmarkId)
      throw new Error(`Encounter head names another landmark: ${storyLabel(id)} has # at: visit ${head.landmarkId}, encounters/catalog.json gives ${event.id} the landmark ${event.landmarkId}`);
    // Every landmark has an observation until stage 2b lets a place leave it out.
    if (head.priority === "after observe" && !landmarks.some((landmark) => landmark.id === event.landmarkId))
      throw new Error(`# priority: after observe needs a landmark with an observation: ${storyLabel(id)}`);
    heads.set(id, head);
  }
  return heads;
}

/** The validated content: compiled stories, quizzes and the parsed catalogs content:build reports. */
export type ValidatedContent = ReturnType<typeof validateContent>;

/**
 * Validate the loaded content: layers and ownership, every catalog, city,
 * travel, quiz and Ink file, and the rules between them. Throws the first
 * problem found. Works on any ContentSources (e.g. one journey layer with
 * the core layer, see selectJourneys), without reading the disk. With a
 * storyCache, the full-branch date validations (validateStory) reuse stored
 * successful results (story-validation-cache.ts); that is the only disk access.
 */
export function validateContent(sources: ContentSources, options: { storyCache?: StoryValidationCache } = {}) {
  const { root } = sources;
  requireJourneyManifests(sources.manifests);
  // The authoring tools read these profiles; a broken one still fails the build early.
  for (const manifest of sources.manifests) authoringProfileOf(manifest.data, manifest.file);
  const manifestFiles = new Map(sources.manifests.map((manifest) => [manifest.id, displayPath(root, manifest.file)]));
  // Each journey folder keeps to its own cities and content (and the core layer to core content).
  checkContentOwnership(sources);
  // Every journey falls back to the shared default background, so the core layer provides it.
  const coreLayer = sources.layers.find((layer) => layer.type === "core")!;
  if (sources.catalogs["romance/presentation.json"]?.provenance.keys.backgrounds?.[DEFAULT_BACKGROUND_ID] !==
    path.join(coreLayer.directory, "romance", "presentation.json"))
    throw new Error(`Missing default background: content/romance/presentation.json must define backgrounds.${DEFAULT_BACKGROUND_ID} (the shared default of every journey)`);
  checkJourneyCities(sources);
  checkPublishedSources(sources);
  checkQuizFileNames(sources);
  // The game's static files (root public/ plus every journey's public/), listed by the loader.
  const { publicFiles } = sources;
  // A missing image is named with the public/ folder of the journey whose data file names it.
  const journeyFolderOf = (file: string | undefined) => {
    const layer = file === undefined ? undefined
      : sources.layers.find((item) => item.type === "journey" && file.startsWith(item.directory + path.sep));
    return layer && displayPath(root, layer.directory);
  };
  // The fields whose text is not in their marked language: warnings, not errors (data-language.ts).
  const languageNotes: ContentWarning[] = [];
  /** The file a merged catalog's field comes from: the layer of its list item or record key, else the catalog's first file. */
  const catalogFileOf = (kind: CatalogKind, fieldPath: string) => {
    const merged = sources.catalogs[kind];
    const [, key, index] = /^([^.[]+)(?:\[(\d+)\]|\.([^.[]+))?/u.exec(fieldPath) ?? [];
    const recordKey = /^[^.[]+\.([^.[]+)/u.exec(fieldPath)?.[1];
    const file = (index !== undefined ? merged?.provenance.items[key]?.[Number(index)] : undefined) ??
      (recordKey !== undefined ? merged?.provenance.keys[key]?.[recordKey] : undefined) ?? merged?.provenance.files[0];
    return file ? displayPath(root, file) : kind;
  };
  const parseCatalog = <T>(schema: z.ZodType<T>, kind: CatalogKind): T => {
    const parsed = parseSourceCatalog(sources, schema, kind);
    const merged = sources.catalogs[kind];
    if (merged) languageNotes.push(...dataLanguageWarnings(schema, merged.value, (fieldPath) => catalogFileOf(kind, fieldPath)));
    return parsed;
  };
  // Messages name the real Ink file of a story, whichever layer it is in.
  const storyFiles = new Map(sources.storyFiles.map((story) => [story.id, displayPath(root, story.file)]));
  const storyLabel = (storyId: string) => storyFiles.get(storyId) ?? `${storyId}.ink`;
  let journey = parseCatalog(journeySchema, "progression/journey.json");
  // The place files (stage 3a): read statically here (heads, choices, targets), compiled with the stories below.
  const placeFiles = new Map<string, PlaceFile>();
  for (const { id, source } of sources.storyFiles)
    if (isPlaceStory(id)) placeFiles.set(id, withContext(storyLabel(id), () => readPlaceFile(id, source)));
  // The declared story state (flags, people, named conditions) and the scene JSON (sources).
  const storyStateCatalog = parseCatalog(storyStateCatalogSchema, "progression/story.json");
  unique(storyStateCatalog.flags.map((flag) => flag.id), "story flag ID");
  unique(storyStateCatalog.people.map((person) => person.id), "story person ID");
  const sceneData = parseCatalog(sceneDataCatalogSchema, "scenes/catalog.json");
  unique(sceneData.scenes.map((scene) => scene.id), "scene JSON ID");
  const tourism = parseCatalog(tourismCatalogSchema, "tourism/catalog.json");
  const authoredEncounterInput = parseCatalog(encounterCatalogInputSchema, "encounters/catalog.json");
  // An encounter written in JSON is met at its landmark's visit (a place file's scene names its moments with # at:).
  for (const event of authoredEncounterInput.encounters) if (!event.landmarkId)
    throw new Error(`An encounter of encounters/catalog.json needs its landmarkId: ${event.id}`);
  // The head tags of the encounters' Ink (encounter-head.ts): read and removed before compiling,
  // they become the encounters' entry rules and `repeatable` (written to the generated catalogs).
  const encounterHeads = readEncounterHeads(sources, authoredEncounterInput.encounters, tourism.landmarks, storyLabel);
  const encounterInput = { ...authoredEncounterInput, encounters: authoredEncounterInput.encounters.map((event) => {
    const head = encounterHeads.get(event.storyId);
    if (head?.repeat !== undefined && event.repeatable !== undefined)
      throw new Error(`Encounter repetition is written twice: ${event.id} has repeatable in encounters/catalog.json and # repeat: in ${storyLabel(event.storyId)} (keep one)`);
    return head?.repeat === "always" ? { ...event, repeatable: true } : event;
  }) };
  const encounterCatalog = normalizeEncounterCatalog(encounterInput, tourism.landmarks);
  const authoredEntryRules = parseCatalog(encounterEntryRulesSchema, "encounters/entry-rules.json");
  const headRules = encounterCatalog.encounters.flatMap((event) => {
    const head = encounterHeads.get(event.storyId);
    if (!head) return [];
    if (authoredEntryRules.entries.some((rule) => rule.encounterId === event.id))
      throw new Error(`Encounter entry rule is written twice: ${event.id} has a rule in encounters/entry-rules.json and head tags in ${storyLabel(event.storyId)} (keep one)`);
    return [headEntryRule(event.id, head)];
  });
  const encounterEntryRules = encounterEntryRulesSchema.parse({ ...authoredEntryRules, entries: [...authoredEntryRules.entries, ...headRules] });
  validateEncounterEntryRules(encounterEntryRules, encounterCatalog.encounters);
  // A landmark without an observation (stage 2b) has no moment while observing: an encounter met there could never run.
  for (const event of encounterCatalog.encounters) {
    const landmark = tourism.landmarks.find((item) => item.id === event.landmarkId);
    const rule = encounterEntryRules.entries.find((item) => item.encounterId === event.id);
    if (landmark?.observation === false && typeof rule?.priority !== "number")
      throw new Error(`Encounter while observing at a landmark without an observation: ${event.id} is met ` +
        `${rule?.priority === "after observe" ? "after observe" : "while observing (no priority)"} at ${landmark.id}, which has observation: false ` +
        `(give it a priority before or after the main part, e.g. # priority: -1)`);
  }
  // What the generated mirror holds instead of the merged sources (content-outputs.ts).
  const catalogOverrides: Partial<Record<CatalogKind, unknown>> = encounterHeads.size ? {
    "encounters/catalog.json": { ...(sources.catalogs["encounters/catalog.json"]?.value as object), encounters: encounterInput.encounters },
    "encounters/entry-rules.json": encounterEntryRules,
  } : {};
  const encounterStoryIds = [...new Set(encounterCatalog.encounters.flatMap((event) => [
    event.storyId,
    ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : []),
  ]))];
  const battles = parseCatalog(battleCatalogSchema, "battles/catalog.json").battles;
  unique(
    battles.map((battle) => battle.id),
    "battleId",
  );
  let dates = parseCatalog(dateCatalogSchema, "romance/date_catalog.json").dates;
  // A battle's or a date's knot head # when: (and a date's # until:) is its map condition (decision 22): the
  // build writes it into the same JSON field; writing both stops (A4).
  const knotWhenOverrides: Partial<Record<CatalogKind, unknown>> = {};
  {
    const knotWhen = (address: string) => {
      const { storyId, path: knotPath } = splitStoryAddress(address);
      const knot = knotPath && placeFiles.get(storyId)?.knots.find((item) => item.name === knotPath);
      if (!knot) return undefined;
      const texts = (key: string) => knot.head.filter((tag) => tag.key === key).map((tag) => tag.value);
      const read = (text: string, key: string) => withContext(`${storyLabel(storyId)} (${knot.name}) # ${key}: ${text}`, () => parseConditionText(text));
      const when = texts("when").map((text) => read(text, "when"));
      const until = texts("until").map((text) => read(text, "until"));
      return when.length || until.length ? { when, until, label: `${storyLabel(storyId)} (${knot.name})` } : undefined;
    };
    const journeyValue = structuredClone(sources.catalogs["progression/journey.json"]?.value) as { episodes: Record<string, unknown>[]; storyBattles?: Record<string, unknown>[] } | undefined;
    const dateValue = structuredClone(sources.catalogs["romance/date_catalog.json"]?.value) as { dates: Record<string, unknown>[] } | undefined;
    let journeyChanged = false;
    let datesChanged = false;
    for (const battle of battles) {
      const head = knotWhen(battle.storyId);
      if (!head) continue;
      if (head.until.length) throw new Error(`A battle's knot takes # when: only (its map condition): ${head.label}`);
      const condition = combineWhenUntil(head.when, [])!;
      const episodeIndex = journey.episodes.findIndex((episode) => episode.battleId === battle.id);
      const storyIndex = journey.storyBattles.findIndex((item) => item.battleId === battle.id);
      const target = episodeIndex >= 0 ? journey.episodes[episodeIndex] : journey.storyBattles[storyIndex];
      if (!target) throw new Error(`A battle's knot # when: needs an episode or a special battle for ${battle.id}: ${head.label}`);
      if (target.when || target.requiredEpisodeIds.length)
        throw new Error(`The map condition of ${battle.id} is written twice: ${head.label} has # when:, progression/journey.json has ` +
          `${target.when ? "when" : "requiredEpisodeIds"} (keep one; A4)`);
      if (episodeIndex >= 0) {
        journey = { ...journey, episodes: journey.episodes.map((episode, index) => (index === episodeIndex ? { ...episode, when: condition } : episode)) };
        const raw = journeyValue?.episodes.find((item) => item.id === journey.episodes[episodeIndex].id);
        if (raw) raw.when = condition;
      } else {
        journey = { ...journey, storyBattles: journey.storyBattles.map((item, index) => (index === storyIndex ? { ...item, when: condition } : item)) };
        const raw = journeyValue?.storyBattles?.find((item) => item.battleId === battle.id);
        if (raw) raw.when = condition;
      }
      journeyChanged = true;
    }
    // A date's head # hint: (2026-11-13): a date knot's of a place file, or the head of a one-scene date file; the build
    // writes it into the date's hintJa (writing both stops, as for when).
    const headHint = (address: string): { hint: string; label: string } | undefined => {
      const { storyId, path: knotPath } = splitStoryAddress(address);
      if (knotPath !== undefined) {
        const hint = placeFiles.get(storyId)?.knots.find((item) => item.name === knotPath)?.head.find((tag) => tag.key === "hint")?.value;
        return hint ? { hint, label: `${storyLabel(storyId)} (${knotPath})` } : undefined;
      }
      const file = sources.storyFiles.find((story) => story.id === storyId);
      const hint = file && withContext(file.file, () => readMainFileHead(file.source).hint);
      return hint ? { hint, label: storyLabel(storyId) } : undefined;
    };
    for (const date of dates) {
      const hinted = headHint(date.storyId);
      if (hinted) {
        if (date.hintJa)
          throw new Error(`The hint of date ${date.id} is written twice: ${hinted.label} has # hint:, romance/date_catalog.json has hintJa (keep one; A4)`);
        dates = dates.map((item) => (item.id === date.id ? { ...item, hintJa: hinted.hint } : item));
        const raw = dateValue?.dates.find((item) => item.id === date.id);
        if (raw) raw.hintJa = hinted.hint;
        datesChanged = true;
      }
      const head = knotWhen(date.storyId);
      if (!head) continue;
      if ((head.when.length && date.when) || (head.until.length && date.until))
        throw new Error(`The condition of date ${date.id} is written twice: ${head.label} has # when:/# until:, romance/date_catalog.json has when/until (keep one; A4)`);
      const when = head.when.length ? combineWhenUntil(head.when, []) : date.when;
      const until = head.until.length ? (head.until.length === 1 ? head.until[0] : { any: head.until }) : date.until;
      dates = dates.map((item) => (item.id === date.id ? { ...item, ...(when ? { when } : {}), ...(until ? { until } : {}) } : item));
      const raw = dateValue?.dates.find((item) => item.id === date.id);
      if (raw) { if (when) raw.when = when; if (until) raw.until = until; }
      datesChanged = true;
    }
    if (journeyChanged) knotWhenOverrides["progression/journey.json"] = journeyValue;
    if (datesChanged) knotWhenOverrides["romance/date_catalog.json"] = dateValue;
  }
  const destinations = parseCatalog(dateDestinationsSchema, "romance/date_destinations.json").destinations;
  const effects = parseCatalog(effectCatalogSchema, "romance/effect_catalog.json").effects;
  const responseProfiles = parseCatalog(responseProfileCatalogSchema, "romance/response_profiles.json").profiles;
  unique(responseProfiles.map((profile) => profile.id), "response profile ID");
  const cities = sources.cities.map(({ file, data }) => {
    const city = parseSourceFile(citySchema, file, data);
    if (path.basename(file) !== `${city.id}.json`) throw new Error(`City file ID mismatch: ${file}/${city.id}`);
    return city;
  });
  unique(cities.map((city) => city.id), "city ID");
  const journeyCatalog = parseCatalog(journeyCatalogSchema, "journeys/catalog.json");
  // The first available journey (manifest order) opens the title screen, a new
  // game and Debug; each available journey's starting city is checked below.
  if (!journeyCatalog.journeys.some((item) => item.status === "available"))
    throw new Error('No available journey: at least one content/journeys/<journeyId>/manifest.json needs "status": "available"');
  for (const plannedJourney of journeyCatalog.journeys)
    checkTransportModeCount({ journey: plannedJourney, manifestFile: manifestFiles.get(plannedJourney.id) });
  for (const plannedJourney of journeyCatalog.journeys) {
    const art = plannedJourney.titleArt;
    if (art && !servedFile(publicFiles, art.imagePath))
      throw new Error(`Missing title art image: ${plannedJourney.id}/${art.imagePath} (place it in ${journeyFolderPath(sources.tree, plannedJourney.id)}/public/)`);
    const movie = plannedJourney.openingMovie;
    if (movie && !servedFile(publicFiles, movie.videoPath))
      throw new Error(`オープニングムービーのファイルがありません：${plannedJourney.id} の openingMovie.videoPath "${movie.videoPath}" を ` +
        `${journeyFolderPath(sources.tree, plannedJourney.id)}/public/ に置いてください（Missing opening movie: ${plannedJourney.id}/${movie.videoPath}）。`);
  }
  // A registered future prototype may be referenced by its predecessor;
  // getNextCity still hides departures to incomplete cities at runtime.
  validateCityLinks(cities, journeyCatalog);
  for (const plannedJourney of journeyCatalog.journeys) {
    if (plannedJourney.status === "available") {
      const start = plannedJourney.cities[0];
      if (!cities.some((item) => item.id === start.id && item.productionStatus === "complete"))
        throw new Error(`Available journey has unknown or incomplete starting city: ${plannedJourney.id}/${start.id}`);
      if (plannedJourney.initialBudget === null)
        throw new Error(`Available journey has no initial budget: ${plannedJourney.id}`);
    }
  }
  const balance = parseCatalog(balanceSchema, "romance/balance.json");
  for (const plannedJourney of journeyCatalog.journeys) {
    if (plannedJourney.initialState && plannedJourney.initialState.ap > balance.apCap)
      throw new Error(`Journey initial AP exceeds cap: ${plannedJourney.id}`);
    if (plannedJourney.cityPlan && plannedJourney.cityPlan.cityClearAp > balance.apCap)
      throw new Error(`Journey city clear AP exceeds cap: ${plannedJourney.id}`);
  }
  const presentation = parseCatalog(presentationSchema, "romance/presentation.json");
  const travels = cities.map((item, index) => {
    const files = sources.cities[index];
    const travel = parseSourceFile(travelCatalogSchema, files.travelFile, files.travel);
    return { city: item, travel, travelFile: displayPath(root, files.travelFile), settingsFile: displayPath(root, files.settingsFile),
      transit: files.transit, transitFile: displayPath(root, files.transitFile),
      settings: parseSourceFile(travelSettingsSchema, files.settingsFile, files.settings) };
  });
  for (const { city: registeredCity, settings } of travels) {
    const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === registeredCity.id));
    if (owner?.cityPlan && settings.lodgingCost !== owner.cityPlan.lodgingCost)
      throw new Error(`City lodging cost does not match journey plan: ${registeredCity.id}`);
  }
  unique(travels.flatMap(({ travel }) => travel.places.map((place) => place.id)), "travel place ID");
  unique(travels.flatMap(({ travel }) => travel.events.map((event) => event.id)), "travel event ID");
  unique(destinations.map((destination) => destination.id), "date destination ID");
  for (const destination of destinations) {
    if (!cities.some((item) => item.id === destination.cityId))
      throw new Error(`Unknown date destination city: ${destination.id}/${destination.cityId}`);
    if (!presentation.backgrounds[destination.backgroundId])
      throw new Error(`Unknown date destination background: ${destination.id}/${destination.backgroundId}`);
  }
  const characters = parseCatalog(characterCatalogSchema, "presentation/characters.json");
  validateBackgroundAssets(publicFiles, presentation.backgrounds, tourism.assets);
  validateBackgroundPlaces(presentation.backgrounds, new Set(travels.flatMap(({ travel }) => travel.places.map((place) => place.id))));
  const wardrobeSceneIds = new Set([
    ...dates.map((date) => date.id),
    ...battles.map((battle) => battle.id),
    ...tourism.landmarks.map((landmark) => landmark.id),
    ...journey.episodes.filter((episode) => episode.epilogueStoryId).map((episode) => episode.id),
  ]);
  const characterImages = validateCharacters(publicFiles, characters, {
    cities,
    emotions: presentation.emotions,
    battleIds: new Set(battles.map((battle) => battle.id)),
    sceneIds: wardrobeSceneIds,
  });
  const progression = parseCatalog(progressionSchema, "romance/progression.json");
  unique(
    dates.map((date) => date.id),
    "dateId",
  );
  unique(
    effects.map((effect) => effect.id),
    "effectId",
  );
  unique(cities.flatMap((item) => item.landmarkIdsPlanned), "landmarkId");
  unique(tourism.landmarks.map((item) => item.id), "tourism landmark ID");
  unique(tourism.assets.map((item) => item.id), "tourism asset ID");
  unique(tourism.clues.map((item) => item.id), "tourism clue ID");
  unique(tourism.clues.map((item) => item.factId), "tourism fact ID");
  unique(encounterCatalog.items.map((item) => item.id), "encounter item ID");
  unique(encounterCatalog.encounters.map((item) => item.id), "encounter ID");
  if (encounterCatalog.items.some((item) => !cities.some((entry) => entry.id === item.cityId)) ||
      encounterCatalog.encounters.some((item) => !cities.some((entry) => entry.id === item.cityId)))
    throw new Error("Unknown encounter/item city");
  const itemFiles = sources.catalogs["encounters/catalog.json"]?.provenance.items.items ?? [];
  encounterCatalog.items.forEach((item, index) => {
    if (item.iconPath) withContext(`encounter item ${item.id}`, () => requireServedFile(publicFiles, item.iconPath!, journeyFolderOf(itemFiles[index])));
  });
  unique(journey.episodes.map((item) => item.id), "episode ID");
  unique(journey.episodes.map((item) => item.battleId), "episode battle ID");
  unique(journey.storyBattles.map((item) => item.battleId), "story battle ID");
  unique(cities.map((item) => item.firstClearReward.rewardSourceId), "reward source");
  unique(journey.rewards.map((item) => item.id), "journey reward ID");
  unique([...journey.rewards.map((item) => item.id), ...journey.storyBattles.flatMap((item) => item.completionReward ? [item.completionReward.id] : [])], "journey reward ID");
  if (tourism.clues.some((clue) => !tourism.landmarks.some((landmark) => landmark.id === clue.landmarkId)))
    throw new Error("Unknown or mismatched tourism clue");
  if (tourism.landmarks.some((landmark) => !cities.some((entry) => entry.id === landmark.cityId && entry.landmarkIdsPlanned.includes(landmark.id))))
    throw new Error("Unknown tourism city/landmark");
  // The free-time backdrop names a tourism asset (of the same journey: checkContentOwnership). A placeholder
  // asset is allowed (journey:new marks every copied image so); the game shows the plain background for it.
  cities.forEach((item, index) => {
    if (item.backdropAssetId && !tourism.assets.some((asset) => asset.id === item.backdropAssetId))
      throw new Error(`Unknown city backdrop asset: ${displayPath(root, sources.cities[index].file)} backdropAssetId ` +
        `"${item.backdropAssetId}" is not an asset of tourism/catalog.json; use the ID of a registered tourism photo or remove the field`);
  });
  // Or the backdrop is artwork made for Dreamscape (backdropImagePath): an image the city's own journey serves from its
  // public/ folder and lists in its presentation/own-artwork.json (never credited, so never a tourism photo). One backdrop a city.
  const ownArtwork = ownArtworkByLayer(sources).byLayer;
  cities.forEach((item, index) => {
    const imagePath = item.backdropImagePath;
    if (imagePath === undefined) return;
    const source = sources.cities[index];
    const cityFile = displayPath(root, source.file);
    const layer = sources.layers.find((entry) => entry.id === source.layer)!;
    const where = `${cityFile} backdropImagePath "${imagePath}"`;
    if (item.backdropAssetId !== undefined)
      throw new Error(`都市の背景が2つあります：${cityFile} に backdropAssetId と backdropImagePath の両方があります。どちらか一方にしてください` +
        `（City backdrop named twice: ${cityFile} sets both backdropAssetId and backdropImagePath）`);
    const served = servedFile(publicFiles, imagePath);
    const publicFolder = displayPath(root, path.join(layer.directory, "public"));
    if (!served || servingLayer(sources, served) !== layer)
      throw new Error(`都市の背景の絵がありません：${where} は ${publicFolder}/ にありません。同じ旅行編の public/ に置いてください` +
        `（Missing city backdrop image: ${imagePath} is not served by ${publicFolder}/）`);
    if (!ownArtwork.get(layer.id)?.has(path.posix.normalize(imagePath)))
      throw new Error(`都市の背景の絵が自作の絵の一覧にありません：${where} を ${displayPath(root, path.join(layer.directory, OWN_ARTWORK_KIND))} に登録してください。` +
        `出典のある写真なら、tourism/catalog.json に登録して backdropAssetId で指定します` +
        `（City backdrop image is not listed as own artwork of its journey: ${imagePath}）`);
  });
  // A travel place's own card photo (photoAssetId) names a tourism asset in the same way.
  for (const { travel, travelFile } of travels)
    for (const place of travel.places)
      if (place.photoAssetId && !tourism.assets.some((asset) => asset.id === place.photoAssetId))
        throw new Error(`Unknown travel place photo asset: ${travelFile} places["${place.id}"] photoAssetId ` +
          `"${place.photoAssetId}" is not an asset of tourism/catalog.json; use the ID of a registered tourism photo or remove the field`);
  if (
    balance.defaultPlayerName.length > balance.maxNameLength ||
    balance.defaultHeroineName.length > balance.maxNameLength
  ) {
    throw new Error("Default name exceeds maxNameLength");
  }
  if (cities.some((item) => item.firstClearReward.ap > balance.apCap))
    throw new Error("First clear reward exceeds AP cap");
  // The words of the countries visited (optional; 2026-11-11 user decision): a line's # local_word: names one of them.
  const localWords = parseCatalog(localWordsCatalogSchema, "learning/local-words.json").words;
  unique(localWords.map((word) => word.id), "local word ID");
  for (const word of localWords)
    if (word.cityId !== undefined && !cities.some((item) => item.id === word.cityId))
      throw new Error(`Unknown local word city: ${word.id}/${word.cityId}`);
  // The album's illustrations (2026-11-11): the files of each journey's public/assets/album/, the ID their file name.
  const albumImages = albumImagesOf(sources);
  // The voices of lines (2026-11-12): the files of each journey's public/assets/voice/, the ID their file name.
  const voiceFiles = voiceFilesOf(sources);
  // A manifest's voiceCredits (2026-11-13) credits voices its journey has.
  checkVoiceCredits(sources.manifests.map((manifest) => ({ ...manifest, file: displayPath(root, manifest.file) })), voiceFiles);
  // The sound effects (2026-11-12): each layer's presentation/sounds.json against its public/assets/se/ (sound-files.ts).
  const sounds = soundRegistry(sources);
  // A journey's transport mode may name its ride's sound (`se`): a shared sound or one of that journey's own.
  for (const mode of transportModeSounds(sources)) {
    const problem = soundUseProblem(mode.id, mode.journeyId, sounds, `${displayPath(root, mode.file)} の transportModes "${mode.modeId}" の se "${mode.id}"`);
    if (problem) throw new Error(problem);
  }
  // The background music (2026-11-12): each layer's presentation/music.json against its public/assets/bgm/ and its play (music-files.ts).
  const music = musicRegistry(sources);
  // The ambience (2026-11-13): each layer's presentation/ambience.json against its public/assets/ambience/ and its play (ambience-files.ts).
  const ambience = ambienceRegistry(sources);
  const context: TagContext = {
    effectIds: effects.map((effect) => effect.id),
    backgroundIds: Object.keys(presentation.backgrounds),
    emotionIds: Object.keys(presentation.emotions),
    // A line's # photo: and # recall: name an album image (of the story's own journey: checkAlbumTags below).
    photoIds: albumImages.map((image) => image.id),
    localWordIds: localWords.map((word) => word.id),
    personIds: storyStateCatalog.people.map((person) => person.id),
    // A line's # minigame: runs in a place file's date only (its walk below says true); every other story refuses it.
    miniGames: false,
  };
  for (const effect of effects) {
    if (effect.responseProfileId && !responseProfiles.some((profile) => profile.id === effect.responseProfileId))
      throw new Error(`Unknown response profile: ${effect.id}/${effect.responseProfileId}`);
    if (effect.outcome && effect.responseProfileId)
      throw new Error(`Confession outcome cannot use a response profile: ${effect.id}`);
    if (effect.outcome && (effect.affectionDelta !== 0 || (effect.trustDelta ?? 0) !== 0 || (effect.sparkDelta ?? 0) !== 0))
      throw new Error("Confession outcome cannot award relationship points");
    if (!effect.memoryId && !effect.outcome && !effect.responseProfileId)
      throw new Error(`Effect has neither memory nor outcome: ${effect.id}`);
    if (effect.memoryId && !presentation.memories[effect.memoryId])
      throw new Error(`Unknown memory: ${effect.memoryId}`);
  }
  const stories: Record<string, string> = {};
  const storySources: Record<string, string> = {};
  const storyMemoryReferences: Record<string, string[]> = {};
  // The texts of each story's cond("…") (scene-conditions.ts), checked once the scenes' cities are known.
  const storyConditionTexts: Record<string, string[]> = {};
  let routes = 0;
  /** The routes walked for each date, by date ID (their sum is routes). */
  const dateRoutes: Record<string, number> = {};
  /** A place file's date: the distinct variable sets it was walked with (only the variables its file reads). */
  const placeDateWalks: Record<string, Record<string, unknown>[]> = {};
  // Where the catalogs point at a main part (a story file, or a place file's knot; 3.1).
  const earlyBattleCity = (battleId: string) => {
    const battle = battles.find((item) => item.id === battleId);
    return battle?.cityId ?? tourism.landmarks.find((item) => item.id === battle?.landmarkId)?.cityId ?? "";
  };
  const mains: MainAddresses = [
    ...tourism.landmarks.flatMap((landmark) => landmark.guideStoryId
      ? [{ address: landmark.guideStoryId, main: { guide: landmark.id }, cityId: landmark.cityId, title: landmark.nameJa, kind: "guide" as const }] : []),
    ...battles.map((battle) => ({ address: battle.storyId, main: { battle: battle.id }, cityId: earlyBattleCity(battle.id), title: battle.titleJa, kind: "battle" as const })),
    ...dates.map((date) => ({ address: date.storyId, main: { date: date.id }, cityId: date.chapterId, title: date.titleJa, kind: "date" as const })),
    ...cities.flatMap((city) => city.arrivalStoryId
      ? [{ address: city.arrivalStoryId, main: { arrival: city.id }, cityId: city.id, title: city.nameJa, kind: "arrival" as const }] : []),
    ...journey.episodes.flatMap((episode) => episode.epilogueStoryId
      ? [{ address: episode.epilogueStoryId, main: { epilogue: episode.cityId }, cityId: episode.cityId,
        title: cities.find((city) => city.id === episode.cityId)?.nameJa ?? episode.cityId, kind: "epilogue" as const }] : []),
  ];
  for (const main of mains) {
    const { storyId, path: knot } = splitStoryAddress(main.address);
    if (knot !== undefined && (!isPlaceStory(storyId) || knot.includes(".")))
      throw new Error(`A catalog names a knot only in a place file (stories/places/…): ${main.address} (${JSON.stringify(main.main)})`);
  }
  // The one-scene files of main parts: their head # on_done: / # then: (read and blanked) and their choices.
  const mainFileHeads = new Map<string, { onDone: string[]; then?: string }>();
  // A line's # speaker: <person ID> names a person of progression/story.json people (2026-11-11).
  const declaredPeople = new Set(storyStateCatalog.people.map((person) => person.id));
  // Each item's journey (its city's), for a line's # item_show: (scene-effect-tags.ts).
  const storyItemJourneys = itemJourneys(encounterCatalog.items, sources.cities);
  for (const { id, file, layer: storyLayer, source: authored } of sources.storyFiles) {
    withContext(file, () => checkSpeakerPeople(authored, declaredPeople));
    // A line's # photo: and # recall: name an album image of the story's own journey (2026-11-11).
    const journeyLayerOfStory = sources.layers.find((item) => item.id === storyLayer)!;
    withContext(file, () => checkAlbumTags(authored, storyLayer, albumImages, albumFolderPath(sources, journeyLayerOfStory)));
    // A line's # voice: names a recording of the story's own journey (2026-11-12).
    withContext(file, () => checkVoiceTags(authored, storyLayer, voiceFiles, voiceFolderPath(sources, journeyLayerOfStory)));
    // A line's # se: names a shared sound or one of the story's own journey (2026-11-12).
    withContext(file, () => checkSoundTags(authored, storyLayer, sounds));
    // A line's # bgm: names a shared track or one of the story's own journey, or stop or default (2026-11-12).
    withContext(file, () => checkBgmTags(authored, storyLayer, music.tracks));
    // A line's # ambience: names a shared ambience track or one of the story's own journey, or stop or default (2026-11-13).
    withContext(file, () => checkAmbienceTags(authored, storyLayer, ambience.tracks));
    // A line's # item_show: names an item of the story's own journey; # weather: and # tint: their own values (2026-11-13).
    withContext(file, () => checkSceneEffectTags(authored, storyLayer, storyItemJourneys));
    // A line's # em: and # em_shake: name a word of its own text (2026-11-13).
    withContext(file, () => checkEmphasisTags(authored));
    const place = placeFiles.get(id);
    const main = !place && mains.some((item) => item.address === id);
    const mainHead = main ? withContext(file, () => readMainFileHead(authored)) : undefined;
    if (mainHead && (mainHead.onDone.length || mainHead.then !== undefined)) mainFileHeads.set(id, mainHead);
    // A head # hint: is a date's (2026-11-13; dates read it above).
    if (mainHead?.hint !== undefined && !mains.some((item) => item.address === id && item.kind === "date"))
      throw new Error(`# hint: は、デートの頭の札です：${storyLabel(id)} はデートではありません。デートのファイルか knot に書いてください` +
        `（# hint: is a date's head tag; ${id} is not a date）。`);
    const source = place ? place.source : mainHead ? mainHead.source
      : encounterHeads.has(id) ? withContext(file, () => readEncounterHead(authored).source) : authored;
    // A place file, or a one-scene file that includes the game's modules.ink (a battle, stage 5).
    const modules = !!place || includesModules(source);
    storyMemoryReferences[id] = withContext(file, () => validateMemoryReferences(source, Object.keys(presentation.memories)));
    storyConditionTexts[id] = withContext(file, () => readSceneConditions(source, modules));
    const itemReferences = withContext(file, () => validateItemReferences(source, encounterCatalog.items.map((item) => item.id)));
    if (itemReferences.length && !encounterStoryIds.includes(id))
      throw new Error(`Item references are only supported in encounters: ${id}`);
    if (itemReferences.length) {
      const owner = encounterCatalog.encounters.find((event) =>
        event.storyId === id || (event.quiz && [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId].includes(id)),
      );
      for (const itemId of itemReferences) {
        if (encounterCatalog.items.find((item) => item.id === itemId)?.cityId !== owner?.cityId)
          throw new Error(`Encounter story item city mismatch: ${id}/${itemId}`);
      }
    }
    const compiled = modules ? compileInk(source, file, { [MODULES_FILE]: MODULES_INK }) : compileInk(source, file);
    stories[id] = compiled;
    storySources[id] = source;
  }
  const expressionCatalog = parseCatalog(dialogueExpressionCatalogSchema, "presentation/dialogue-expressions.json");
  const expressionValidator = createDialogueExpressionValidator(
    expressionCatalog,
    storySources,
    Object.keys(stories),
    context.emotionIds.filter((id) => characters.expressionIds?.includes(id) ?? true),
  );
  const learningDetails = parseCatalog(learningDetailsSchema, "learning/details.json");
  // Every story an English-note question opens (each question names its own).
  const learningStoryIds = new Set(Object.values(learningDetails.questions).map((detail) => detail.storyId));
  const reactionCatalog = parseCatalog(dialogueReactionCatalogSchema, "presentation/dialogue-reactions.json");
  const reactionValidator = createDialogueReactionValidator(
    reactionCatalog, storySources, Object.keys(stories),
    context.emotionIds.filter((id) => characters.expressionIds?.includes(id) ?? true),
    characters.characters.map((character) => character.id),
    [...learningStoryIds],
  );
  const observeForStory = (storyId: string): DialogueObserver =>
    (text, speaker, explicitEmotion) => {
      expressionValidator.observe(storyId, text, speaker, explicitEmotion);
      reactionValidator.observe(storyId, text, speaker);
    };
  // Tours (tour design stage 2a): their shape here (the scene table reads their steps: `# at: tour <tour> <step>`); their rules
  // against the cities below (validateTours).
  const tourFiles = parseTourFiles(sources);
  for (const { file, tour } of tourFiles) languageNotes.push(...dataLanguageWarnings(tourSchema, tour, displayPath(root, file)));
  const tourStep = (tourId: string, stepId: string) => {
    const tour = tourFiles.find((item) => item.tour.id === tourId)?.tour;
    const step = tour?.steps.find((item) => item.id === stepId);
    return tour && step ? { cityId: tour.cityId, kind: step.kind } : undefined;
  };
  // ── The scene table (the unified event design, stage 3a; scene-table.ts): the place files' scenes, the
  // one-scene main files' heads and choices, and today's encounter catalogs read as the same table.
  const sceneNotes: ContentWarning[] = [];
  const sceneWarn = (message: string) => sceneNotes.push({ kind: "scene-tag", message });
  const landmarkCity = (landmarkId: string) => tourism.landmarks.find((landmark) => landmark.id === landmarkId)?.cityId;
  const placeCity = (placeId: string) => travels.find(({ travel }) => travel.places.some((place) => place.id === placeId))?.city.id;
  // The landmarks a scene's moment runs at (stage 3: visit <landmark>, visit any = the city's landmarks, place <place> = the landmarks visited there).
  const landmarksAtPlace = (placeId: string) => travels.flatMap(({ travel }) => travel.events.filter((event) => event.placeId === placeId)
    .flatMap((event) => [journey.episodes.find((episode) => episode.id === event.id && episode.kind !== "city_finale")?.landmarkId,
      battles.find((battle) => battle.id === event.id)?.landmarkId])
    .filter((id): id is string => !!id));
  const momentLandmarks = (moment: SceneEntry["at"][number], cityId: string): string[] => "place" in moment ? [...new Set(landmarksAtPlace(moment.place))]
    : !("visit" in moment) ? [] : moment.visit === "any" ? tourism.landmarks.filter((landmark) => landmark.cityId === cityId).map((landmark) => landmark.id) : [moment.visit];
  // The dates and finales of a place (stage 4: `place <place>` runs at them too).
  const eventsAtPlace = (placeId: string) => travels.flatMap(({ travel }) => travel.events.filter((event) => event.placeId === placeId));
  const datesAtPlace = (placeId: string) => eventsAtPlace(placeId).filter((event) => dates.some((date) => date.id === event.id));
  const finalesAtPlace = (placeId: string) => eventsAtPlace(placeId).filter((event) => journey.episodes.some((episode) => episode.id === event.id && episode.kind === "city_finale"));
  const placeEntries: SceneEntry[] = [];
  // The data-language warning of a place file's `# translation:` (as for today's encounters).
  for (const file of placeFiles.values()) for (const knot of file.knots) for (const choice of knot.choices) if (choice.translation) {
    const warning = translationLanguageWarning(file.storyId, choice.text ?? "", choice.translation);
    if (warning) languageNotes.push(warning);
  }
  for (const file of placeFiles.values()) {
    const read = withContext(storyLabel(file.storyId), () => placeScenes({
      file, compiled: stories[file.storyId], apCap: balance.apCap, mains, landmarkCity, placeCity,
      dateCity: (dateId) => dates.find((date) => date.id === dateId)?.chapterId, cityExists: (cityId) => cities.some((city) => city.id === cityId),
      tourStep, onWarning: sceneWarn,
    }));
    if (!read.length) throw new Error(`A place file without scenes: ${storyLabel(file.storyId)} (give a knot the head tag # scene:)`);
    placeEntries.push(...read.map((item) => item.entry));
  }
  // A tour's steps across the files (tour stages 2b, 3): one narration and one in-car encounter per leg, and what that encounter takes.
  const tourProblems = tourMomentErrors(placeEntries);
  if (tourProblems.length) throw new Error(tourProblems.join("\n"));
  const fileEntries: SceneEntry[] = [];
  /** A one-scene guide, arrival or epilogue with choices: walked as a scene (its choices may have tags from stage 3a). */
  const fileChoiceStories = new Set<string>();
  for (const main of mains) {
    if (splitStoryAddress(main.address).path !== undefined || !stories[main.address]) continue;
    const head = mainFileHeads.get(main.address);
    // A battle may have its conversation's choices too (A15 lifted).
    const choices = main.kind === "guide" || main.kind === "arrival" || main.kind === "epilogue" || main.kind === "battle"
      ? withContext(storyLabel(main.address), () => readFileChoices(main.address, storySources[main.address])) : [];
    if (choices.length) fileChoiceStories.add(main.address);
    const options = choices.flatMap((choice) => {
      const option = withContext(storyLabel(main.address), () => choiceOption(choice, balance.apCap, sceneWarn));
      return option ? [option] : [];
    });
    if (main.kind === "date") {
      const confession = dates.find((date) => date.storyId === main.address)?.kind === "confession";
      if (confession && withContext(storyLabel(main.address), () => readFileChoices(main.address, storySources[main.address]))
        .some((choice) => choice.tags.some((tag) => tag.key === "profile")))
        throw new Error(`A confession date takes no # profile: (its outcome is never random; B2): ${storyLabel(main.address)}`);
    }
    if (!head && !options.length) continue;
    unique(options.map((option) => option.id), `option ID of ${main.address}`);
    const done = withContext(storyLabel(main.address), () => parseDone(head?.onDone ?? [], balance.apCap));
    fileEntries.push({
      id: mainFileSceneId(main.main), kind: main.kind, title: main.title, cityId: main.cityId, story: { storyId: main.address }, main: main.main,
      at: [], order: 0, repeat: "once", people: [], options, done,
      ...(head?.then !== undefined ? { then: withContext(storyLabel(main.address), () => parseThen(head.then!)) } : {}),
      conds: storyConditionTexts[main.address] ?? [], knots: [], fingerprint: fnvHash(stories[main.address]), origin: "file",
    });
  }
  const taggedScenes = [...placeEntries, ...fileEntries];
  unique(taggedScenes.map((scene) => scene.id), "scene ID");
  // A date scene's catalog date: the one whose address names the scene (its knot name need not be the date ID).
  const dateOf = (scene: SceneEntry) => {
    const dateId = scene.main && "date" in scene.main ? scene.main.date : undefined;
    return dateId === undefined ? undefined : dates.find((date) => date.id === dateId);
  };
  const itemCities = new Map(encounterCatalog.items.map((item) => [item.id, item.cityId]));
  // An item carried through the journey ("carry": "journey") is held, given and used in its journey's later cities (the item design §2.5).
  const journeyCityPosition = (cityId: string) => {
    const owner = journeyCatalog.journeys.find((item) => item.cities.some((city) => city.id === cityId));
    return owner ? { journey: owner.id, index: owner.cities.findIndex((city) => city.id === cityId) } : undefined;
  };
  const carriedInto = (itemId: string, cityId: string) => {
    const item = encounterCatalog.items.find((entry) => entry.id === itemId);
    const from = item && journeyCityPosition(item.cityId);
    const to = journeyCityPosition(cityId);
    return item?.carry === "journey" && !!from && !!to && from.journey === to.journey && from.index < to.index;
  };
  const sceneRefs = {
    carriedInto,
    items: itemCities, flags: new Set(storyStateCatalog.flags.map((flag) => flag.id)),
    people: new Set(storyStateCatalog.people.map((person) => person.id)), memories: new Set(Object.keys(presentation.memories)),
    profiles: new Set(responseProfiles.map((profile) => profile.id)), effects: new Set(effects.map((effect) => effect.id)),
  };
  for (const person of storyStateCatalog.people) if (!cities.some((city) => city.id === person.cityId))
    throw new Error(`Unknown city of the person ${person.id} in progression/story.json: ${person.cityId}`);
  for (const person of storyStateCatalog.people) if (person.characterId && !characters.characters.some((item) => item.id === person.characterId))
    throw new Error(`Unknown portrait of the person ${person.id} in progression/story.json: ${person.characterId} (register it in presentation/characters.json)`);
  const journeyOfCityId = (cityId: string) => journeyCatalog.journeys.find((item) => item.cities.some((city) => city.id === cityId))?.id;
  for (const scene of taggedScenes) {
    const label = `${storyLabel(scene.story.storyId)}${scene.story.knot ? ` (${scene.story.knot})` : ""}`;
    withContext(label, () => checkSceneReferences(scene, sceneRefs));
    if (scene.main && scene.options.some((option) => option.later))
      throw new Error(`A main part takes no # later (「また今度」; its end is the game's record, A13): ${label}`);
    if (scene.origin === "place" && scene.options.some((option) => option.effect))
      throw new Error(`A place file's date writes its choices with # profile: (and # memory:, # rel:) instead of # effect: (A14): ${label}`);
    // B4: a production journey's conversation, encounter or tour leg's narration says where its facts come from, or that it states none.
    if ((scene.kind === "talk" || scene.kind === "encounter" || scene.kind === "tour_leg") && scene.origin === "place" && journeyOfCityId(scene.cityId) !== SAMPLE_JOURNEY_ID &&
        scene.sources !== "none" && !sceneData.scenes.some((item) => item.id === scene.id))
      throw new Error(`A scene of a journey needs its sources: ${label} has neither # sources: none nor sources in scenes/catalog.json (B4)`);
    if (sceneData.scenes.some((item) => item.id === scene.id) && scene.sources === "none")
      throw new Error(`The sources of ${scene.id} are written twice: # sources: none in ${label} and sources in scenes/catalog.json (keep one; A4)`);
    if (scene.title !== undefined && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(scene.title) && scene.origin === "place")
      languageNotes.push({ kind: "data-language", message: `\`# title:\` に日本語がありません：${scene.id}「${scene.title}」。道中交流の題名や保留 AP の題名として、そのまま出ます（止めません）。` });
    for (const option of scene.options) if (option.profile && scene.kind === "date" && dateOf(scene)?.kind === "confession")
      throw new Error(`A confession date takes no # profile: (its outcome is never random; B2): ${label}`);
  }
  // A date knot's # title: and the date catalog's titleJa (what the map and the records show) are kept equal (DA-5; a note, not stopped).
  for (const scene of placeEntries) if (scene.kind === "date") {
    const date = dateOf(scene);
    if (date && scene.title !== date.titleJa)
      sceneWarn(`${storyLabel(scene.story.storyId)} (${scene.id}${date.id === scene.id ? "" : `, the date ${date.id}`}): # title: 「${scene.title}」 differs from titleJa 「${date.titleJa}」 in romance/date_catalog.json (the map shows titleJa)`);
  }
  // A place file's date: its own knot's choices are the romance choices (# profile:), a helper knot's are in-scene choices (no profile; 3.5).
  for (const scene of placeEntries) if (scene.kind === "date") for (const option of scene.options) {
    const own = option.knot === scene.story.knot;
    // A confession's own choices are its direct choices (no # profile:, B2; its outcome is confession_result, DA-1).
    if (own && dateOf(scene)?.kind === "confession") continue;
    if (own && !option.profile)
      throw new Error(`A romance choice of the date ${scene.id} needs # profile: (the choice ${option.id}); an in-scene choice goes in a helper knot`);
    if (!own && option.profile)
      throw new Error(`An in-scene choice of the date ${scene.id} takes no # profile: (the choice ${option.id} in ${option.knot}; no ticket is drawn for it)`);
  }
  // The other one-scene files: today's encounters and dates take the choice tags too (a one-scene file is a place file
  // with one scene; coordinator's decision on the first principle). An encounter's tags join its catalog options (by
  // # option:); what the catalog already says (gift, use, 「また今度」, reaction) stays in the catalog (A4). A date's join
  // its scene (origin file). The other stories (quiz results, battles, notes) take no choice tags.
  const catalogChoiceTags = new Map<string, SceneOption[]>();
  for (const { id } of sources.storyFiles) {
    if (placeFiles.has(id) || fileChoiceStories.has(id)) continue;
    const choices = readFileChoices(id, storySources[id]);
    const tagged = choices.flatMap((choice) => choice.tags.filter((tag) => tag.key !== "effect"));
    if (!tagged.length) continue;
    const options = choices.flatMap((choice) => {
      const option = withContext(storyLabel(id), () => choiceOption(choice, balance.apCap, sceneWarn));
      return option ? [option] : [];
    });
    const event = encounterCatalog.encounters.find((item) => item.storyId === id);
    const date = dates.find((item) => item.storyId === id);
    if (event) {
      for (const option of options) for (const key of ["give", "use", "later", "profile"] as const) if (option[key] !== undefined)
        throw new Error(`# ${key === "later" ? "later" : key}: in ${storyLabel(id)} (${option.id}): the catalog of this one-scene encounter says it ` +
          `(${{ give: "giftItemId", use: "consumeItemId", later: "deferCompletion", profile: "responseProfileId" }[key]}); write it once (A4)`);
      catalogChoiceTags.set(event.id, options);
    } else if (date) {
      if (date.kind === "confession" && options.some((option) => option.profile)) throw new Error(`A confession date takes no # profile: (B2): ${storyLabel(id)}`);
      if (fileEntries.some((entry) => entry.story.storyId === id)) { fileEntries.find((entry) => entry.story.storyId === id)!.options.push(...options); continue; }
      fileEntries.push({ id: mainFileSceneId({ date: date.id }), kind: "date", title: date.titleJa, cityId: date.chapterId, story: { storyId: id }, main: { date: date.id },
        at: [], order: 0, repeat: "once", people: [], options, done: {}, conds: storyConditionTexts[id] ?? [], knots: [], fingerprint: fnvHash(stories[id]), origin: "file" });
      taggedScenes.push(fileEntries.at(-1)!);
    } else throw new Error(`A choice tag # ${tagged[0].key} in ${storyLabel(id)} (line ${tagged[0].line}): this story has no scene of its own (a quiz result, a battle or a note); ` +
      `write the choice in its encounter's or scene's story`);
  }
  const catalogEntries = catalogScenes(encounterCatalog.encounters, encounterEntryRules.entries, (storyId) => fnvHash(stories[storyId] ?? ""))
    .map((scene) => mergeCatalogChoiceTags(scene, catalogChoiceTags.get(scene.id) ?? []));
  for (const scene of catalogEntries) if (catalogChoiceTags.has(scene.id)) withContext(storyLabel(scene.story.storyId), () => checkSceneReferences(scene, sceneRefs));
  // A21: an arrival, or an epilogue the game starts by itself, takes no # on_done: that spends. An epilogue its city starts by a
  // then: epilogue may (the then: keeps it back and greys when it cannot be paid): such a city is read from every scene, a
  // catalog encounter's choice tags too, as the game reads them (isAuthoredEpilogueCity; 3.9 (d)).
  const authoredEpilogueCities = new Set([...taggedScenes, ...catalogEntries].filter((scene) => (scene.then && "epilogue" in scene.then) ||
    scene.options.some((option) => option.then && "epilogue" in option.then)).map((scene) => scene.cityId));
  for (const scene of taggedScenes)
    if ((scene.kind === "arrival" || (scene.kind === "epilogue" && !authoredEpilogueCities.has(scene.cityId))) && ((scene.done.money ?? 0) < 0 || (scene.done.ap ?? 0) < 0))
      throw new Error(`An arrival or an epilogue the game starts by itself takes no # on_done: that spends money or AP (it cannot be refused; A21, A23; ` +
        `an epilogue its city starts by a then: epilogue may): ${storyLabel(scene.story.storyId)}${scene.story.knot ? ` (${scene.story.knot})` : ""}`);
  for (const item of sceneData.scenes) if (!taggedScenes.some((scene) => scene.id === item.id))
    throw new Error(`scenes/catalog.json names no scene of a place file: ${item.id}`);
  // A25: one source per item (today's encounter catalog, the place scenes' # on_done: item).
  unique([
    ...encounterCatalog.encounters.flatMap((event) => [...(event.completionItemId ? [event.completionItemId] : []), ...(event.quiz ? [event.quiz.rewardItemId] : [])]),
    ...taggedScenes.flatMap((scene) => scene.done.items ?? []),
  ], "item source (an item is obtained from one scene, A25)");
  // The inserted scenes run as encounters (the runtime's encounter path; scene-table.ts insertedSceneEncounter).
  const insertedEncounters = placeEntries.filter((scene) => scene.kind === "talk" || scene.kind === "encounter")
    .map((scene) => withContext(scene.id, () => insertedSceneEncounter(scene, (landmarkId) => tourism.landmarks.find((item) => item.id === landmarkId)?.nameJa ?? landmarkId,
      momentLandmarks)));
  for (const { encounter } of insertedEncounters)
    if (encounterCatalog.encounters.some((event) => event.id === encounter.id))
      throw new Error(`The scene ${encounter.id} is written twice: a place file's knot and encounters/catalog.json (keep one; A4)`);
  // A2: a landmark, place, date, city, mode the moment names exists, and `after <part>` names a part the moment has
  // (3.3 check 2; visit any and place: at least one). Stage 4: the other moments of 2.3.
  for (const scene of placeEntries) for (const moment of scene.at) {
    const cityTravel = travels.find(({ city: item }) => item.id === scene.cityId);
    if ("visit" in moment && moment.visit !== "any" && !tourism.landmarks.some((landmark) => landmark.id === moment.visit))
      throw new Error(`Unknown landmark in # at: visit ${moment.visit} (${scene.id})`);
    if ("place" in moment && !landmarksAtPlace(moment.place).length && !datesAtPlace(moment.place).length && !finalesAtPlace(moment.place).length)
      throw new Error(`No landmark, date or finale is at the place of # at: place ${moment.place} (${scene.id}); place runs at their moments (A2)`);
    if ("hotel" in moment && moment.hotel !== "any" && cityTravel?.settings.hotelPlaceId !== moment.hotel)
      throw new Error(`# at: hotel ${moment.hotel} names no hotel (${scene.id}): the hotel of ${scene.cityId} is ${cityTravel?.settings.hotelPlaceId} (A2)`);
    if ("trip" in moment && moment.trip !== "walk" && !cityTravel?.travel.routes.some((route) => route.mode === moment.trip))
      throw new Error(`# at: trip ${moment.trip} names no mode of ${scene.cityId} (${scene.id}; walk, or a mode of its routes, A2)`);
    if ("ticket" in moment && !eventsAtPlace(moment.ticket).some((event) => (event.admissionCost ?? 0) > 0))
      sceneWarn(`${scene.id}: # at: ticket ${moment.ticket} never runs (no destination there charges admission; the ticket counter opens only with an admission)`);
    if ("depart" in moment && !cities.find((city) => city.id === moment.depart)?.nextCityId)
      sceneWarn(`${scene.id}: # at: depart ${moment.depart} never runs (the city has no next city, so its departure never opens)`);
    if ("arrive" in moment && !cities.find((city) => city.id === moment.arrive)?.arrivalStoryId)
      sceneWarn(`${scene.id}: # at: arrive ${moment.arrive} never runs (the city has no arrival, so its arrival's moment never opens)`);
    if ("trip" in moment && !cityTravel?.travel.routes.some((route) => route.mode === moment.trip && route.fromPlaceId !== route.toPlaceId &&
        (!moment.from || route.fromPlaceId === moment.from) && (!moment.to || route.toPlaceId === moment.to)))
      sceneWarn(`${scene.id}: # at: ${momentText(moment)} never runs (no route by ${moment.trip} joins two places as its from and to say)`);
    if ("finale" in moment && !journey.episodes.some((episode) => episode.kind === "city_finale" && episode.cityId === moment.finale))
      throw new Error(`# at: finale ${moment.finale}: the city has no finale (${scene.id}, A2)`);
    if (scene.priority === "after date" && "place" in moment && !datesAtPlace(moment.place).length)
      throw new Error(`# priority: after date needs a date at the place: ${scene.id} at place ${moment.place} (A2)`);
    if (!("visit" in moment) && !("place" in moment)) continue;
    const part = typeof scene.priority === "string" ? scene.priority.slice("after ".length) as VisitPart : undefined;
    if (!part || (part as string) === "date" || ("place" in moment && !landmarksAtPlace(moment.place).length && part === "battle" && finalesAtPlace(moment.place).length)) continue;
    const landmarksThere = momentLandmarks(moment, scene.cityId).map((id) => tourism.landmarks.find((landmark) => landmark.id === id)!);
    const named = "visit" in moment && moment.visit !== "any";
    const having = landmarksThere.filter((landmark) => landmarkParts(landmark).includes(part));
    if (named ? having.length !== landmarksThere.length : !having.length)
      throw new Error(`# priority: after ${part} needs a landmark with a ${part === "observe" ? "observation" : part}: ${scene.id} at ${landmarksThere.map((landmark) => landmark.id).join(", ")} (A2)`);
  }
  // 2.5/2.6's warnings at the moments other than a visit (stage 4): the same priority, a repetition without until, 「また今度」 there.
  sceneNotes.push(...momentWarnings(placeEntries, { landmarksAt: (placeId) => [...new Set(landmarksAtPlace(placeId))],
    datesAt: (placeId) => datesAtPlace(placeId).map((event) => event.id),
    finaleAt: (placeId) => journey.episodes.find((episode) => episode.kind === "city_finale" && finalesAtPlace(placeId).some((event) => event.id === episode.id))?.cityId }));
  // The order of each landmark's main parts (3.9 (b)): each part it has, once.
  for (const landmark of tourism.landmarks) {
    const problem = landmarkOrderError(landmark);
    if (problem) throw new Error(problem);
  }
  // The walk of each tagged scene with choices or tags (scene-walk.ts): every path ends, A8, A10.
  const walkedGuides = new Set<string>();
  const sceneContext = (cityId: string): TagContext => ({ ...context, backgroundIds: context.backgroundIds });
  for (const scene of taggedScenes) {
    const storyId = scene.story.storyId;
    const label = `${storyLabel(storyId)}${scene.story.knot ? ` (${scene.story.knot})` : ""}`;
    const base = { compiled: stories[storyId], start: scene.story.knot, label, context: sceneContext(scene.cityId), conds: scene.conds,
      options: scene.options, ...(scene.when ? { when: scene.when } : {}), headThen: !!scene.then, done: scene.done,
      itemIds: encounterCatalog.items.map((item) => item.id), memoryIds: Object.keys(presentation.memories), observe: observeForStory(storyId), onWarning: sceneWarn };
    if (scene.kind === "battle") continue; // The battle walk below walks it, its calls answered.
    if (scene.kind === "date") {
      if (scene.origin !== "place") continue; // today's dates: validateStory below.
      const date = dateOf(scene)!;
      // A confession is walked with each validation context's outcome (confession_result; DA-1): its own choice points
      // (no # profile:) are the direct choices its choiceCount counts.
      // Contexts that differ only in variables the file never reads walk the same paths: each distinct one is walked
      // once and counted for every context (the route total is unchanged).
      const compiledText = stories[storyId];
      const walked = new Map<string, number>();
      for (const seed of date.validationContexts) for (const tone of RELATIONSHIP_TONES) {
        const variables = { romance_stage: seed.romanceStage, ending_reached: seed.endingReached ?? false,
          relationship_tone: tone, relationship_tone_before: tone, relationship_tone_after: tone,
          memory_callback: progression.fallbackMemoryCallbackJa, confession_ready: date.kind === "confession" && seed.confessionReady,
          confession_result: date.kind === "confession" ? seed.confessionResult ?? (seed.confessionReady ? "accepted" : "deferred") : "deferred" };
        const key = JSON.stringify(Object.entries(variables).filter(([name]) => compiledText.includes(`"VAR?":"${name}"`)));
        if (!walked.has(key)) walked.set(key, withContext(label, () => walkScene({ ...base, context: { ...base.context, miniGames: true }, variables,
          romanceChoices: { knot: scene.story.knot!, count: date.choiceCount } })));
        routes += walked.get(key)!;
        dateRoutes[date.id] = (dateRoutes[date.id] ?? 0) + walked.get(key)!;
      }
      placeDateWalks[date.id] = [...walked.keys()].map((key) => Object.fromEntries(JSON.parse(key) as [string, unknown][]));
      continue;
    }
    if (scene.kind === "guide") walkedGuides.add(scene.story.knot ? `${storyId}.${scene.story.knot}` : storyId);
    // A one-scene arrival or epilogue without choices: validateEpilogue below; a place file's knot is walked here.
    if ((scene.kind === "arrival" || scene.kind === "epilogue") && scene.origin !== "place" && !fileChoiceStories.has(storyId)) continue;
    if (scene.kind === "guide" && scene.origin === "file" && !fileChoiceStories.has(storyId)) { walkedGuides.delete(storyId); continue; }
    const contexts = scene.kind === "arrival" || scene.kind === "epilogue"
      ? [1, 2, 3, 4].flatMap((stage) => [false, true].map((ending) => ({ romance_stage: stage, ending_reached: ending })))
      : [{ romance_stage: 1, ending_reached: false }];
    // An arrival, like every scene, may show any registered background (2026-11-13: the street or station it happens at
    // need not be a place of the map; content-ownership.ts keeps it to the journey's own).
    for (const variables of contexts) withContext(label, () => walkScene({ ...base, variables }));
  }
  // Guides with choices (one-scene files) are walked as scenes even without tags.
  for (const storyId of fileChoiceStories) {
    const main = mains.find((item) => item.address === storyId)!;
    // A battle (its choices, plain or tagged): the battle walk below walks it with its calls answered.
    if (main.kind === "battle") continue;
    if (taggedScenes.some((scene) => scene.story.storyId === storyId && !scene.story.knot)) continue;
    if (main.kind === "guide") walkedGuides.add(storyId);
    const contexts = main.kind === "guide" ? [{ romance_stage: 1, ending_reached: false }]
      : [1, 2, 3, 4].flatMap((stage) => [false, true].map((ending) => ({ romance_stage: stage, ending_reached: ending })));
    for (const variables of contexts) withContext(storyLabel(storyId), () => walkScene({ compiled: stories[storyId], label: storyLabel(storyId), context,
      variables, conds: storyConditionTexts[storyId] ?? [], options: [], itemIds: [], memoryIds: Object.keys(presentation.memories),
      observe: observeForStory(storyId), onWarning: sceneWarn }));
  }
  // A12: an unconditional then: loop.
  const placeLandmarks = (placeId: string) => travels.flatMap(({ travel }) => travel.events.filter((event) => event.placeId === placeId)
    .flatMap((event) => [journey.episodes.find((episode) => episode.id === event.id)?.landmarkId, battles.find((battle) => battle.id === event.id)?.landmarkId])
    .filter((id): id is string => !!id));
  const loopContext: ThenLoopContext = {
    routes: (cityId) => travels.find(({ city: item }) => item.id === cityId)?.travel.routes ?? [],
    hotel: (cityId) => travels.find(({ city: item }) => item.id === cityId)?.settings.hotelPlaceId,
    rental: (cityId, modeId) => !!journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === cityId))
      ?.transportModes.some((mode) => mode.id === modeId && mode.rental),
    finaleAt: (placeId) => {
      const event = finalesAtPlace(placeId)[0];
      const cityId = event && journey.episodes.find((episode) => episode.id === event.id)?.cityId;
      return cityId ? { cityId, admission: (event.admissionCost ?? 0) > 0 } : undefined;
    },
    departs: (cityId) => !!cities.find((item) => item.id === cityId)?.nextCityId,
    epilogueRequired: (cityId) => {
      const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === cityId));
      return !owner || owner.cityTransition === "after_epilogue" || owner.cities.at(-1)?.id === cityId;
    },
  };
  const loops = thenLoopErrors([...taggedScenes, ...catalogEntries], placeLandmarks, loopContext);
  if (loops.length) throw new Error(loops.join("\n"));
  for (const message of thenLoopWarnings([...taggedScenes, ...catalogEntries], placeLandmarks, loopContext)) sceneNotes.push({ kind: "then-loop", message });
  // # then: (stage 3b runs it; an arrival's and an epilogue's from stage 4, decision 36): move goes to a place of the scene's city (by a mode it has).
  for (const scene of [...taggedScenes, ...catalogEntries]) for (const then of [scene.then, ...scene.options.map((option) => option.then)]) {
    if (!then) continue;
    const label = `${storyLabel(scene.story.storyId)}${scene.story.knot ? ` (${scene.story.knot})` : ""}`;
    if (!("move" in then)) continue;
    const cityTravel = travels.find(({ city: item }) => item.id === scene.cityId)?.travel;
    if (!cityTravel?.places.some((place) => place.id === then.move))
      throw new Error(`# then: move ${then.move} names no place of ${scene.cityId} (A2): ${label}`);
    if (then.by && then.by !== "walk" && !cityTravel.routes.some((route) => route.toPlaceId === then.move && route.mode === then.by))
      throw new Error(`# then: move ${then.move} by ${then.by}: no ${then.by} route goes there (A2): ${label}`);
    if (!cityTravel.routes.some((route) => route.toPlaceId === then.move && (!then.by || route.mode === then.by)))
      throw new Error(`# then: move ${then.move}: no route goes there (A2): ${label}`);
  }
  // Warnings (not stopped): a then: ends its moment (the steps after it do not run), and an order that puts the
  // observation after the battle leaves the battle's clues findable only afterwards (3.3).
  for (const scene of [...taggedScenes, ...catalogEntries]) {
    const where = `${storyLabel(scene.story.storyId)}${scene.story.knot ? ` (${scene.story.knot})` : ""}`;
    if (scene.then) sceneWarn(`${where}: its head's then: ends the moment right after it; the steps after it in that moment do not run (the fare and admission paid are not returned)`);
    for (const option of scene.options) if (option.then)
      sceneWarn(`${where}: the choice ${option.id}'s then: ends the moment right after the scene; the steps after it do not run`);
  }
  for (const landmark of tourism.landmarks) {
    const parts = landmarkParts(landmark);
    if (parts.indexOf("observe") < parts.indexOf("battle")) continue;
    const used = tourism.clues.filter((clue) => clue.landmarkId === landmark.id && clue.relatedQuestionIds.length).map((clue) => clue.id);
    if (used.length) sceneNotes.push({ kind: "unfindable-clue", message: `The order of ${landmark.id} observes after its battle: its clue(s) ${used.join(", ")} that the battle's questions use are found only after it (not stopped)` });
  }
  // The tags' AP rules (scene_tag), made from the Ink text; their IDs may not collide with the authors' rewards.
  if (journey.rewards.some((rule) => rule.trigger === "scene_tag"))
    throw new Error("progression/journey.json rewards cannot use the trigger scene_tag: content:build makes those rules from the scenes' # ap: tags");
  const sceneTitle = (scene: SceneEntry) => scene.title ?? tourism.landmarks.find((landmark) => scene.at[0] && landmark.id === momentLandmarks(scene.at[0], scene.cityId)[0])?.nameJa ??
    cities.find((city) => city.id === scene.cityId)?.nameJa ?? scene.id;
  const tagRules = sceneTagRules([...taggedScenes, ...catalogEntries], sceneTitle);
  // `# on_done: reward` (an inserted scene's other way to earn a one-off reward): a reward of the scene's city, with AP, named once.
  const rewardCity = (rule: (typeof journey.rewards)[number]) => rule.episodeId !== undefined
    ? journey.episodes.find((episode) => episode.id === rule.episodeId)?.cityId
    : (() => { const battle = battles.find((item) => item.id === rule.battleId);
      return battle?.cityId ?? tourism.landmarks.find((item) => item.id === battle?.landmarkId)?.cityId; })();
  const rewardProblems = sceneRewardErrors(taggedScenes, journey.rewards.map((rule) => ({ id: rule.id, ap: rule.ap, trigger: rule.trigger, cityId: rewardCity(rule) })),
    encounterCatalog.encounters.flatMap((event) => event.alternativeApRewardId ? [{ encounterId: event.id, rewardId: event.alternativeApRewardId }] : []));
  if (rewardProblems.length) throw new Error(rewardProblems.join("\n"));
  checkRuleIds(tagRules, [
    ...journey.rewards.map((rule) => ({ id: rule.id, origin: `the reward ${rule.id} of progression/journey.json` })),
    ...journey.storyBattles.flatMap((battle) => battle.completionReward ? [{ id: battle.completionReward.id, origin: `the completion reward of ${battle.battleId}` }] : []),
  ]);
  const generatedScenes = {
    scenes: [...taggedScenes, ...catalogEntries],
    rewards: tagRules.map(({ origin: _origin, ...rule }) => rule),
  };
  const effectDates = new Map<string, Set<string>>();
  const deferredDateValidation: Array<() => void> = [];
  for (const date of dates) {
    const dateFile = storyFileOf(date.storyId);
    if (!Object.hasOwn(stories, dateFile) || (dateFile !== date.storyId && !placeEntries.some((scene) => scene.main && "date" in scene.main && scene.main.date === date.id)))
      throw new Error(`Unknown storyId: ${date.storyId}`);
    if (date.kind !== "confession" && date.choiceCount > 0)
      withContext(`${storyLabel(dateFile)} (date ${date.id})`, () => {
        validateNoInkRandom(stories[dateFile]);
        validateRelationshipToneSource(storySources[dateFile]);
      });
    if (date.destinationId) {
      const destination = destinations.find((item) => item.id === date.destinationId);
      if (!destination)
        throw new Error(`Unknown date destination: ${date.id}/${date.destinationId}`);
      if (destination.cityId !== date.chapterId)
        throw new Error(`Date destination city mismatch: ${date.id}/${date.destinationId}`);
      if (destination.backgroundId !== date.backgroundId)
        throw new Error(`Date destination background mismatch: ${date.id}/${date.destinationId}`);
    }
    if (!cities.some((item) => item.id === date.chapterId))
      throw new Error(`Unknown chapter reference: ${date.id}`);
    if (!presentation.backgrounds[date.backgroundId])
      throw new Error(`Unknown background: ${date.backgroundId}`);
    if (date.apCost > balance.apCap)
      throw new Error(`Date cost exceeds AP cap: ${date.id}`);
    if (
      date.allowAfterEnding && date.kind !== "normal"
    )
      throw new Error(`After-ending date must be normal: ${date.id}`);
    // A hint (2026-11-13) shows only while the date's when does not hold: without a when, nobody sees it; a date that
    // also opens on the relationship (or a repair) may close its locked card without opening (both warnings).
    if (date.hintJa && (!date.when || date.recovery))
      sceneNotes.push({ kind: "scene-tag", message: `鍵の札が出ないデートです：${date.id} の # hint:（hintJa）は、${date.recovery
        ? "関係修復のデートには出ません" : "地図に出る条件（# when: か when）がないので、どこにも出ません"}（止めません）。` });
    else if (date.hintJa && (date.minAffection > 0 || date.minRomanceStage > 1 || date.needsDeferred))
      sceneNotes.push({ kind: "scene-tag", message: `鍵の札が開かずに消えることがあります：${date.id} は関係の値でも開くので、` +
        "# when: がかなっても関係が足りなければ、鍵の札が消えてデートは出ません（止めません）。" });
    // Decision 32: a special date that costs AP is the author's choice (a warning; it cannot start without the AP).
    if (date.kind !== "normal" && date.apCost !== 0)
      sceneNotes.push({ kind: "special-date-ap", message: `AP を使う特別なデートです：${date.id}（${date.kind}）は ${date.apCost} AP。ふつうは AP 不要（0）です。AP が足りないと始められません（止めません）。` +
        (date.recovery ? "関係修復のデートは、通常デートを選べないときに出ます。AP が足りないと始められず、関係を築き直せないことがあります。" : "") });
    if (date.recovery && (date.kind !== "special" || !date.repeatable || date.rewardOnlyOnce ||
      date.choiceCount !== 1 || date.effectCount !== 1))
      throw new Error(`Recovery event must be a repeatable special with one choice and effect: ${date.id}`);
    if (
      (date.kind === "normal" || date.kind === "special" || date.kind === "reassurance") &&
      date.repeatable && !date.recovery
    )
      throw new Error(`One-time event is repeatable: ${date.id}`);
    // Rev. 5: the number of romance choices is the date definition's (the walk checks the Ink meets it).
    if (
      date.kind === "confession" &&
      (!date.validationContexts.some((c) => c.confessionReady) ||
        !date.validationContexts.some((c) => !c.confessionReady))
    )
      throw new Error("Confession validation needs both readiness states");
    if (date.kind === "confession" && ["accepted", "deferred", "rejected"].some((result) =>
      !date.validationContexts.some((context) => context.confessionResult === result)))
      throw new Error("Confession validation needs accepted, deferred and rejected contexts");
    // Traverse the complete Ink tree after inexpensive cross-content checks (a place file's date: the scene walk above).
    if (dateFile !== date.storyId) continue;
    deferredDateValidation.push(() => {
      for (const storyId of [date.storyId]) {
        for (const reference of storyMemoryReferences[storyId]) {
          const hasReference = (seed: (typeof date.validationContexts)[number]) =>
            (seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : [])).includes(reference);
          if (!date.validationContexts.some(hasReference) || !date.validationContexts.some((seed) => !hasReference(seed)))
            throw new Error(`Memory reference needs present and absent validation contexts: ${storyId}/${reference}`);
        }
        const randomReactions = storyId === date.storyId && date.kind !== "confession" && date.choiceCount > 0;
        // Reuse existing contexts and add only enough representative contexts
        // to exercise all tones.
        const contextCount = randomReactions
          ? Math.max(date.validationContexts.length, RELATIONSHIP_TONES.length)
          : date.validationContexts.length;
        for (let seedIndex = 0; seedIndex < contextCount; seedIndex++) {
          const seed = date.validationContexts[seedIndex % date.validationContexts.length];
          if (seed.memoryId && !presentation.memories[seed.memoryId])
            throw new Error(`Unknown validation memory: ${seed.memoryId}`);
          unique(seed.memoryIds ?? [], "validation memory ID");
          for (const memoryId of seed.memoryIds ?? [])
            if (!presentation.memories[memoryId]) throw new Error(`Unknown validation memory: ${memoryId}`);
          const suffix = progression.stages.find(
            (stage) => stage.stage === seed.romanceStage,
          )!.playerSuffix;
          const memory =
            progression.memoryCallbacks.find(
              (callback) => callback.memoryId === seed.memoryId,
            )?.textJa ?? progression.fallbackMemoryCallbackJa;
          const checkedRoutes = withContext(
            `${storyLabel(storyId)} (date ${date.id})`,
            () =>
              validateStoryCached(
                options.storyCache,
                {
                  compiled: stories[storyId],
                  context,
                  contract: { choiceCount: date.choiceCount, effectCount: date.effectCount, kind: date.kind },
                  variables: {
                    player_address: `検証主人公${suffix}`,
                    romance_stage: seed.romanceStage,
                    memory_callback: memory,
                    confession_ready: seed.confessionReady,
                    confession_result: seed.confessionResult ?? (seed.confessionReady ? "accepted" : "deferred"),
                    ending_reached: seed.endingReached ?? false,
                  },
                  effects,
                  memories: { available: seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : []), known: Object.keys(presentation.memories) },
                  randomReactions,
                  tone: randomReactions ? RELATIONSHIP_TONES[seedIndex % RELATIONSHIP_TONES.length] : undefined,
                },
                observeForStory(storyId),
                (effectId) => {
                  const users = effectDates.get(effectId) ?? new Set<string>();
                  users.add(date.id);
                  effectDates.set(effectId, users);
                },
                (message) => sceneNotes.push({ kind: "scene-tag", message: `${storyLabel(storyId)} (date ${date.id}): ${message}` }),
              ),
          );
          if (storyId === date.storyId && seedIndex < date.validationContexts.length) {
            routes += checkedRoutes;
            dateRoutes[date.id] = (dateRoutes[date.id] ?? 0) + checkedRoutes;
          }
        }
      }
    });
  }

  progression.stages.forEach((stage, index) => {
    if (
      stage.stage !== index + 1 ||
      (index > 0 &&
        (stage.minAffection < progression.stages[index - 1].minAffection ||
          stage.minTrust < progression.stages[index - 1].minTrust ||
          stage.minSpark < progression.stages[index - 1].minSpark ||
          stage.minCompletedDates < progression.stages[index - 1].minCompletedDates))
    )
      throw new Error("Stages must be ordered with nondecreasing thresholds");
  });
  unique(
    progression.memoryCallbacks.map((callback) => callback.memoryId),
    "memory callback",
  );
  for (const callback of progression.memoryCallbacks) {
    if (!presentation.memories[callback.memoryId])
      throw new Error(`Unknown callback memory: ${callback.memoryId}`);
  }
  // Example quizzes (*.example.json) are validated but never played. Production quizzes are discovered by data alone.
  const quizzes: Record<string, QuizDefinition> = {};
  const productionQuestionIds: string[] = [];
  for (const { file, example: isExample, data } of sources.quizFiles) {
    const quiz = isExample
      ? parseSourceFile(quizExampleSchema, file, data)
      : parseSourceFile(quizSchema, file, data);
    languageNotes.push(...dataLanguageWarnings(isExample ? quizExampleSchema : quizSchema, data, displayPath(root, file)));
    if (!isExample) {
      if (quizzes[quiz.id]) throw new Error(`Duplicate quizId: ${quiz.id}`);
      quizzes[quiz.id] = quiz as QuizDefinition;
      productionQuestionIds.push(
        ...quiz.questions.map((question) => question.id),
      );
      // A question's reveal (revealRegion) needs its battle's landmark photo.
      const reveal = revealRegionProblem(quiz as QuizDefinition, tourism, displayPath(root, file));
      if (reveal) throw new Error(reveal);
    }
    if ("scope" in quiz && quiz.scope === "city_finale") {
      if (!cities.some((item) => item.id === quiz.cityId))
        throw new Error(`Unknown quiz city: ${quiz.id}`);
    } else if (
      quiz.landmarkId === null ||
      !cities.some((item) => item.landmarkIdsPlanned.includes(quiz.landmarkId!))
    )
      throw new Error(`Unknown landmark: ${quiz.landmarkId}`);
    try {
      validateQuizEntries(quiz);
    } catch (error) {
      throw new Error(
        `Invalid quiz in ${file}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
  unique(productionQuestionIds, "production quiz question ID");
  let battleScenarios = 0;
  for (const battle of battles) {
    const quiz = quizzes[battle.quizId];
    if (!quiz) throw new Error(`Unknown battle quizId: ${battle.quizId}`);
    if (battle.scope === "city_finale") {
      if (
        !cities.some((item) => item.id === battle.cityId) ||
        quiz.scope !== "city_finale" ||
        quiz.cityId !== battle.cityId
      )
        throw new Error(`City finale quiz mismatch: ${battle.id}`);
    } else if (
      battle.landmarkId === null ||
      !cities.some((item) => item.landmarkIdsPlanned.includes(battle.landmarkId!)) ||
      battle.landmarkId !== quiz.landmarkId ||
      quiz.scope
    )
      throw new Error(`Battle landmark mismatch: ${battle.id}`);
    const battleAddress = splitStoryAddress(battle.storyId);
    if (!stories[battleAddress.storyId] || (battleAddress.path !== undefined && !placeEntries.some((scene) => scene.main && "battle" in scene.main && scene.main.battle === battle.id)))
      throw new Error(`Unknown battle storyId: ${battle.storyId}`);
    if (!presentation.backgrounds[battle.backgroundId])
      throw new Error(`Unknown battle background: ${battle.backgroundId}`);
    // The battle's Ink runs from its start and calls -> quiz(n) -> and -> reasoning -> (modules.ink).
    const label = `${storyLabel(battleAddress.storyId)}${battleAddress.path ? ` (${battleAddress.path})` : ""} (battle ${battle.id})`;
    if (battleAddress.path === undefined && !includesModules(storySources[battle.storyId]))
      throw new Error(`A battle calls the game's -> quiz(n) -> and -> reasoning ->: ` +
        `${label} starts with INCLUDE modules.ink in place of its VAR lines (or is a knot of a place file)`);
    const knotName = battleAddress.path ?? battleAddress.storyId.split("/").at(-1)!;
    const named = (JSON.parse(stories[battleAddress.storyId]) as { root: unknown[] }).root.at(-1) as Record<string, unknown>;
    if (battle.reasoning && !Object.hasOwn(named, `${knotName}_claim`))
      throw new Error(`The claim of the special battle ${battle.id} is the helper knot ${knotName}_claim (=== ${knotName}_claim === … ->->), ` +
        `which the flow calls before -> reasoning -> and the clue book reads on its own: ${label} has none`);
    // The clue book reads the claim (and the press) on their own, as the game does: a choice they reach (their own, or one in a
    // knot they call, a quiz's or the reasoning's call included) has no one to choose it, and an error stops the battle's screen.
    for (const helper of battle.reasoning ? [`${knotName}_claim`, `${knotName}_press`] : [])
      if (Object.hasOwn(named, helper))
        withContext(label, () => checkHelperKnot(stories[battleAddress.storyId], helper, storyConditionTexts[battleAddress.storyId] ?? [],
          { memoryIds: Object.keys(presentation.memories), itemIds: encounterCatalog.items.map((item) => item.id) }));
    const scene = taggedScenes.find((item) => item.main && "battle" in item.main && item.main.battle === battle.id);
    battleScenarios += withContext(label, () => walkScene({
      compiled: stories[battleAddress.storyId], ...(battleAddress.path ? { start: battleAddress.path } : {}), label, context,
      conds: scene?.conds ?? storyConditionTexts[battleAddress.storyId] ?? [], options: scene?.options ?? [], headThen: !!scene?.then, done: scene?.done,
      itemIds: encounterCatalog.items.map((item) => item.id), memoryIds: Object.keys(presentation.memories), observe: observeForStory(battleAddress.storyId),
      variables: { call_arg: 0, quiz_correct: false, answer_correct: false, battle_score: 0, reasoning_action: "", evidence_result: "" },
      battle: { quizzes: quiz.questions.length, ...(battle.reasoning ? { reasoning: { kind: battle.reasoning.kind, roundIndex: battle.reasoning.roundIndex } } : {}) },
      onWarning: sceneWarn,
    }));
  }
  const learning = parseCatalog(learningCatalogSchema, "learning/translations.json");
  validateLearning(learning, quizzes, [
    ...new Set(battles.map((battle) => battle.quizId)),
  ]);
  const wordMeanings = parseCatalog(wordMeaningsSchema, "learning/word-meanings.json");
  for (const battle of battles)
    for (const question of quizzes[battle.quizId].questions) {
      const texts = [
        question.questionEn,
        ...question.options.map((option) => option.textEn),
      ];
      for (const text of texts)
        for (const word of text.match(wordPattern) ?? []) {
          if (!wordMeanings.words[normalizeWord(word)])
            throw new Error(`Missing word meaning in ${question.id}: ${word}`);
        }
    }
  validateLearningDetails(learningDetails, quizzes);
  for (const detail of Object.values(learningDetails.questions)) {
    const learningStory = stories[detail.storyId];
    if (!learningStory)
      throw new Error(`Unknown learning story: ${detail.storyId}`);
    for (const topic of detail.topics) validateLearningTopic(learningStory, context, topic.id);
  }
  let tourismGuides = 0;
  // Every tourism image is served (checkTourismImages decodes them after this validation).
  const assetFiles = sources.catalogs["tourism/catalog.json"]?.provenance.items.assets ?? [];
  tourism.assets.forEach((asset, index) => requireServedFile(publicFiles, asset.path, journeyFolderOf(assetFiles[index])));
  // Every served image is a credited tourism image or listed as artwork made for Dreamscape (image-rights.ts).
  checkImageRights(sources, tourism.assets);
  for (const current of cities) {
    const landmarks = tourism.landmarks.filter((landmark) => landmark.cityId === current.id);
    const ids = new Set(landmarks.map((landmark) => landmark.id));
    tourismGuides += validateTourism({
      ...tourism,
      landmarks,
      assets: tourism.assets,
      clues: tourism.clues.filter((clue) => ids.has(clue.landmarkId)),
    }, current.id, current.landmarkIdsPlanned, battles, quizzes, stories, context, observeForStory, storyLabel, (guide) => walkedGuides.has(guide));
  }
  for (const validateDate of deferredDateValidation) validateDate();
  for (const effect of effects) {
    // These shared, memoryless effects let ordinary dates use the existing
    // response profiles without inventing a memory for every choice. Their
    // location-specific counterparts remain available when a scene needs one.
    const commonChoice = commonDateEffect.exec(effect.id);
    if (commonChoice) {
      if (effect.memoryId || effect.outcome ||
          effect.affectionDelta !== 0 || (effect.trustDelta ?? 0) !== 0 || (effect.sparkDelta ?? 0) !== 0 ||
          effect.responseProfileId !== commonChoice[2])
        throw new Error(`Invalid common date effect: ${effect.id}`);
      const users = effectDates.get(effect.id);
      if (users && [...users].some((dateId) => dates.find((date) => date.id === dateId)?.kind !== "normal"))
        throw new Error(`Common date effect outside a normal date: ${effect.id}`);
      continue;
    }
    if (effect.memoryId || effect.outcome) continue;
    const users = effectDates.get(effect.id);
    if (!users?.size || [...users].some((dateId) => !dates.find((date) => date.id === dateId)?.recovery))
      throw new Error(`Effect has neither memory nor outcome outside recovery: ${effect.id}`);
  }
  for (const battle of battles) validateBattleEvidence(battle, tourism.clues);
  for (const storyId of encounterStoryIds) {
    if (dates.some((date) => date.storyId === storyId) ||
        battles.some((battle) => battle.storyId === storyId) ||
        tourism.landmarks.some((landmark) => landmark.guideStoryId === storyId) ||
        journey.episodes.some((episode) => episode.epilogueStoryId === storyId) ||
        cities.some((city) => city.arrivalStoryId === storyId) || learningStoryIds.has(storyId))
      throw new Error(`Encounter story is used by another system: ${storyId}`);
    if (stories[storyId]) validateNoInkRandom(stories[storyId]);
  }
  const battleCity = (id: string): string | undefined => {
    const battle = battles.find((item) => item.id === id);
    return battle?.cityId ?? tourism.landmarks.find((item) => item.id === battle?.landmarkId)?.cityId;
  };
  if (journey.episodes.some((episode) => !cities.some((item) => item.id === episode.cityId)) ||
      journey.storyBattles.some((battle) => !cities.some((item) => item.id === battleCity(battle.battleId))))
    throw new Error("Unknown journey city");
  if (journey.rewards.some((reward) => reward.episodeId !== undefined && !journey.episodes.some((episode) => episode.id === reward.episodeId)))
    throw new Error("Unknown reward episode");
  if (journey.rewards.some((reward) => reward.battleId !== undefined && !journey.storyBattles.some((battle) => battle.battleId === reward.battleId)))
    throw new Error("Unknown reward story battle");
  // Conditions of dates and encounter entry rules (scripts/condition-validation.ts): names that exist, readable where checked.
  const runtimeEncounters = [...encounterCatalog.encounters, ...insertedEncounters.map((item) => item.encounter)];
  const runtimeEntryRules = [...encounterEntryRules.entries, ...insertedEncounters.map((item) => item.rule)];
  const conditionContent: ConditionContent = {
    journeys: journeyCatalog.journeys, cities, episodes: journey.episodes, battles, landmarks: tourism.landmarks,
    encounters: runtimeEncounters, items: encounterCatalog.items, dates,
    flags: storyStateCatalog.flags.map((flag) => flag.id), people: storyStateCatalog.people, namedConditions: storyStateCatalog.conditions,
    returningScenes: new Set(placeEntries.filter((scene) => scene.at.some((moment) => !("visit" in moment) &&
      (!("place" in moment) || datesAtPlace(moment.place).length > 0 || finalesAtPlace(moment.place).length > 0))).map((scene) => scene.id)),
  };
  // Scenes' cond("…") (unified event design stage 2a): read in the city where the scene is played, checked like the other conditions.
  const sceneCity = (storyId: string): string | undefined =>
    placeEntries.find((scene) => scene.story.storyId === storyId)?.cityId ??
    encounterCatalog.encounters.find((event) => event.storyId === storyId ||
      (event.quiz && [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId].includes(storyId)))?.cityId ??
    dates.find((date) => date.storyId === storyId)?.chapterId ??
    battleCity(battles.find((battle) => battle.storyId === storyId)?.id ?? "") ??
    tourism.landmarks.find((landmark) => landmark.guideStoryId === storyId)?.cityId ??
    journey.episodes.find((episode) => episode.epilogueStoryId === storyId)?.cityId ??
    cities.find((city) => city.arrivalStoryId === storyId)?.id;
  const sceneConditions: { conditions: Record<string, Condition>; stories: Record<string, string[]> } = { conditions: {}, stories: {} };
  const sceneConditionOwners: ConditionOwner[] = [];
  for (const [storyId, texts] of Object.entries(storyConditionTexts)) {
    if (!texts.length) continue;
    // English-note explanations refused cond above (ink-validation.ts).
    const cityId = sceneCity(storyId);
    if (!cityId) continue; // A story of no scene: "Story lacks validation contract" below.
    const parsed = withContext(storyLabel(storyId), () => parseSceneConditions(texts));
    Object.assign(sceneConditions.conditions, parsed);
    sceneConditions.stories[storyId] = texts;
    sceneConditionOwners.push({ label: `the scene ${storyId}`, cityId, conditions: texts.map((text) => ({ field: `cond("${text}")`, condition: parsed[text] })) });
  }
  const conditionOwners = [...dateConditionOwners(conditionContent), ...entryRuleConditionOwners(conditionContent, runtimeEntryRules),
    // The tagged scenes' # requires: (their # when: is an entry rule above, or a main part's map condition).
    ...taggedScenes.map((scene) => ({ label: `the scene ${scene.id}`, cityId: scene.cityId, conditions: sceneConditionsOf(scene).filter((item) => item.field !== "when") })),
    // Named conditions are checked where they are declared, in no particular city (their parts must exist).
    ...Object.entries(storyStateCatalog.conditions).map(([name, condition]) => ({ label: `the named condition ${name}`, cityId: "", conditions: [{ field: name, condition }] }))];
  // The map conditions of episodes and special battles (stage 2b): read like the others, in their city.
  const mapOwners = mapConditionOwners(conditionContent, journey);
  // The tours' and their offers' conditions (tour stage 2a), read in the tour's city.
  const tourOwners: ConditionOwner[] = tourFiles.map(({ tour }) => ({ label: `the tour ${tour.id}`, cityId: tour.cityId, conditions: [
    ...(tour.when ? [{ field: "when", condition: tour.when }] : []),
    ...tour.offers.flatMap((offer) => offer.when ? [{ field: `offers.${offer.id}.when`, condition: offer.when }] : [])] }))
    .filter((owner) => owner.conditions.length);
  // The places' heroine lines (heroineLinesJa, 2026-11-11): each `{ textJa, when }` read in its place's city.
  const placeLineOwners: ConditionOwner[] = travels.flatMap(({ travel }) => travel.places.map((place) => ({
    label: `the heroine lines of place ${place.id}`, cityId: travel.cityId,
    conditions: (place.heroineLinesJa ?? []).flatMap((line, index) => (typeof line === "string" ? [] : [{ field: `heroineLinesJa[${index}].when`, condition: line.when }])),
  }))).filter((owner) => owner.conditions.length);
  checkConditions(conditionContent, [...conditionOwners, ...sceneConditionOwners, ...mapOwners, ...tourOwners, ...placeLineOwners]);
  const conditionNotes: ContentWarning[] = [...conditionWarnings(conditionContent, runtimeEntryRules, [...sceneConditionOwners, ...mapOwners, ...placeLineOwners])];
  // The tours against their cities (tour stage 2a; tour-validation.ts): before the progression check, which reads them.
  const tourNotes = validateTours({ root, tours: tourFiles,
    cities: travels.map(({ city: current, travel, settings }) => ({ id: current.id, travel, hotelPlaceId: settings.hotelPlaceId,
      journeyId: journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === current.id))?.id,
      prototype: current.productionStatus === "prototype" })),
    episodes: journey.episodes, storyBattleIds: journey.storyBattles.map((battle) => battle.battleId), battles,
    publishedJourneyIds: new Set(journeyCatalog.journeys.filter((item) => item.status === "available" && item.id !== SAMPLE_JOURNEY_ID).map((item) => item.id)),
    scenes: generatedScenes.scenes });
  // What each main event's parts pay when first finished (their # on_done: money -X), for the money warning (unified design 3.3).
  const mainPayments = mainPaymentsOf(generatedScenes.scenes, { episodes: journey.episodes, storyBattles: journey.storyBattles, battles });
  // Check 9 (stage 2b): every city has a way to clear it; its warnings name probable dead ends (progression-check.ts).
  const progressionContent: ProgressionContent = {
    journeys: journeyCatalog.journeys, episodes: journey.episodes, storyBattles: journey.storyBattles, battles, landmarks: tourism.landmarks,
    encounters: runtimeEncounters, items: encounterCatalog.items, dates, rewards: getAllRewardRules(journey, generatedScenes.rewards), romance: progression,
    travel: travels.map(({ city: current, travel, settings }) => ({ cityId: current.id, hotelPlaceId: settings.hotelPlaceId, initialBudget: settings.initialBudget,
      events: travel.events, routes: travel.routes, tourOnlyPlaceIds: travel.places.filter((place) => isTourOnlyPlace(place)).map((place) => place.id) })),
    tours: tourFiles.map(({ tour }) => tourProgression(tour)), mainPayments,
    // The scenes whose then: epilogue starts their city's epilogue (3.9 (d)): at their visits, or a battle's head.
    epilogueStarters: generatedScenes.scenes.filter((scene) => (scene.then && "epilogue" in scene.then) ||
      scene.options.some((option) => option.then && "epilogue" in option.then)).map((scene) => {
      const cityTravel = travels.find(({ city: item }) => item.id === scene.cityId);
      // Stage 4: a moment that comes whenever the player rests, travels or enters, by its real opening rule (2.3, 4.2): the hotel's
      // on every rest; a trip's only on a route of its mode between two places it names; a ticket counter's only with an admission there.
      const comesAgain = (moment: SceneEntry["at"][number]) => "hotel" in moment ||
        ("trip" in moment && !!cityTravel?.travel.routes.some((route) => route.fromPlaceId !== route.toPlaceId && route.mode === moment.trip &&
          (!moment.from || route.fromPlaceId === moment.from) && (!moment.to || route.toPlaceId === moment.to))) ||
        ("ticket" in moment && eventsAtPlace(moment.ticket).some((event) => (event.admissionCost ?? 0) > 0));
      const dateIds = [...(scene.main && "date" in scene.main ? [scene.main.date] : []),
        ...scene.at.flatMap((moment) => "date" in moment ? [moment.date] : "place" in moment ? datesAtPlace(moment.place).map((event) => event.id) : [])];
      return { sceneId: scene.id, cityId: scene.cityId,
        ...(scene.main && "battle" in scene.main ? { battleId: scene.main.battle } : {}),
        ...(dateIds.length ? { dateIds } : {}),
        ...(scene.at.length ? { landmarkIds: scene.at.flatMap((moment) => momentLandmarks(moment, scene.cityId)) } : {}),
        ...(scene.main && "guide" in scene.main ? { landmarkIds: [scene.main.guide] } : {}),
        // An arrival's own then: (decision 36): the arrival runs whenever the city is reached.
        ...(scene.main && "arrival" in scene.main ? { always: true } : {}),
        // Stage 4: at the finale (its result reached), at an arrival (once, as the city starts; only a city with an arrival), or
        // at a moment that comes again.
        ...(scene.at.some((moment) => "finale" in moment || ("place" in moment && finalesAtPlace(moment.place).length)) ? { atFinale: true } : {}),
        ...(scene.at.some((moment) => "arrive" in moment && !!cities.find((item) => item.id === moment.arrive)?.arrivalStoryId) ? { atArrival: true } : {}),
        ...(scene.at.some(comesAgain) ? { anytime: true } : {}),
        ...(scene.when ? { when: scene.when } : {}) };
    }),
    // The scenes' items (stage 3 tags): what they give, give away or use (the item design §2.5 7–9).
    sceneItems: sceneItemsOf(generatedScenes.scenes),
    // The tags' AP (stage 3): once-only scenes' gains (their scene_tag rules) and the main parts' spends.
    sceneAp: generatedScenes.scenes.filter((scene) => scene.repeat === "once").map((scene) => ({ cityId: scene.cityId,
      gained: generatedScenes.rewards.filter((rule) => rule.sceneId === scene.id && !scene.options.some((option) => option.later && `${scene.id}__${option.id}` === rule.id))
        .reduce((sum, rule) => sum + rule.ap, 0),
      spent: scene.main ? Math.max(0, -(scene.done.ap ?? 0)) : 0 })),
  };
  const progressionProblems = progressionErrors(progressionContent);
  if (progressionProblems.length) throw new Error(progressionProblems.join("\n"));
  const clueUses = [
    ...tourism.clues.flatMap((clue) => clue.relatedQuestionIds.map((questionId) => ({ clueId: clue.id, usedBy: `question ${questionId}` }))),
    ...battles.flatMap((battle) => (battle.reasoning?.correctClueIds ?? []).map((clueId) => ({ clueId, usedBy: `special battle ${battle.id}` }))),
  ];
  conditionNotes.push(...progressionWarnings(progressionContent, clueUses,
    tourism.landmarks.map((landmark) => ({ landmarkId: landmark.id, clueIds: landmark.clueIds }))));
  unique([...productionQuestionIds, ...encounterCatalog.encounters.flatMap((event) => event.quiz ? [event.quiz.question.id] : [])], "production quiz question ID");
  const transitReviews = new Map<string, CityTransitReview[]>();
  // Walks and route sources a city with a ledger lacks: warnings, not errors (transport-validation.ts).
  const transitWarnings: ContentWarning[] = [];
  for (const { city: current, travel, travelFile, settingsFile, transit, transitFile, settings } of travels) {
    const episodes = journey.episodes.filter((episode) => episode.cityId === current.id);
    const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === current.id));
    // The travel file's Japanese fields (a place's description, the sources' claims) without Japanese.
    languageNotes.push(...dataLanguageWarnings(travelCatalogSchema, travel, travelFile));
    // checkContentOwnership keeps every city file in the folder of the journey that lists it.
    if (owner) {
      const transport = { journey: owner, manifestFile: manifestFiles.get(owner.id) };
      checkRouteModes(travel, travelFile, transport);
      checkCityRentals(travel, settings.rentals, settingsFile, transport);
      const review = checkCityTransit({ travel, transit, transitFile, travelFile }, transport);
      if (transit !== undefined) languageNotes.push(...dataLanguageWarnings(transitLedgerSchema, transit, transitFile));
      if (review) {
        transitReviews.set(owner.id, [...(transitReviews.get(owner.id) ?? []), review]);
        transitWarnings.push(...cityTransitWarnings(review, { travel, transitFile, travelFile }));
      }
    }
    // A journey may publish its first city while keeping later, pre-registered
    // cities unfinished. The city status controls the deferred content gate.
    const isUnpublished = current.productionStatus === "prototype";
    if (!episodes.length && !isUnpublished) throw new Error(`City has no episodes: ${current.id}`);
    const plan = owner?.cityPlan;
    if (plan && episodes.length) {
      const finale = episodes.find((episode) => episode.kind === "city_finale");
      const episodeIds = new Set(episodes.map((episode) => episode.id));
      const clearRewards = journey.rewards.filter((rule) => rule.episodeId !== undefined && episodeIds.has(rule.episodeId) && rule.trigger === "city_clear");
      if (!finale || clearRewards.length !== 1 || clearRewards[0].episodeId !== finale.id || clearRewards[0].ap !== plan.cityClearAp)
        throw new Error(`City clear reward does not match journey plan: ${current.id}`);
    }
    const episodeIds = new Set(episodes.map((episode) => episode.id));
    const cityJourney = { ...journey, episodes, storyBattles: journey.storyBattles.filter((battle) => battleCity(battle.battleId) === current.id),
      rewards: journey.rewards.filter((rule) => rule.episodeId !== undefined
        ? episodeIds.has(rule.episodeId)
        : rule.battleId !== undefined && battleCity(rule.battleId) === current.id) };
    const cityLandmarks = tourism.landmarks.filter((landmark) => landmark.cityId === current.id);
    const cityDates = dates.filter((date) => date.chapterId === current.id);
    const cityDestinations = destinations.filter((destination) => destination.cityId === current.id);
    // A pending prototype may defer only its own unwritten story; it may not
    // reuse an actual event belonging to another city.
    for (const event of travel.events) {
      const foreignEpisode = journey.episodes.find((item) => item.id === event.id && item.cityId !== current.id);
      const foreignDate = dates.find((item) => item.id === event.id && item.chapterId !== current.id);
      const foreignBattle = battles.find((item) => item.id === event.id && battleCity(item.id) !== current.id);
      if (foreignEpisode || foreignDate || foreignBattle) throw new Error(`Travel event belongs to another city: ${event.id}`);
    }
    validateEncounterContent({
      catalog: { ...encounterCatalog, items: encounterCatalog.items.filter((item) => item.cityId === current.id),
        encounters: encounterCatalog.encounters.filter((event) => event.cityId === current.id) },
      cityId: current.id,
      landmarks: cityLandmarks, journey: cityJourney, stories, quizzes,
      responseProfileIds: responseProfiles.map((profile) => profile.id), memoryIds: Object.keys(presentation.memories), context,
      validateQuiz: validateQuizEntries,
      onWarning: (warning) => languageNotes.push(warning),
      carriedItems: encounterCatalog.items.filter((item) => carriedInto(item.id, current.id)),
      hasNextCity: !!current.nextCityId,
      sceneItems: {
        uses: taggedScenes.flatMap((scene) => [...scene.options.flatMap((option) => [option.give?.item, option.use]), ...(scene.done.use ?? [])])
          .filter((item): item is string => !!item),
        sources: taggedScenes.flatMap((scene) => scene.done.items ?? []),
      },
    });
    if (episodes.length) validateJourney(cityJourney, current, balance.apCap, cityLandmarks, battles, quizzes);
    else if (cityJourney.storyBattles.length) throw new Error(`Prototype battle has no city episodes: ${current.id}`);
    validateTravelContent(travel, settings, current.id, cityJourney, cityDates, battles,
      cityLandmarks.map((landmark) => landmark.id), cityDestinations.map((destination) => destination.id), presentation.backgrounds,
      { allowPendingContent: isUnpublished, plannedLandmarkIds: current.landmarkIdsPlanned,
        rentalModeIds: owner?.transportModes.filter((mode) => mode.rental).map((mode) => mode.id) });
  }
  let epilogueScenarios = 0;
  unique(cities.flatMap((city) => city.arrivalStoryId ? [city.arrivalStoryId] : []), "city arrival story ID");
  for (const current of cities) {
    const storyId = current.arrivalStoryId;
    if (!storyId) continue;
    if (!journey.episodes.some((episode) => episode.cityId === current.id && episode.kind === "city_finale"))
      throw new Error(`Arrival city has no finale: ${current.id}`);
    if (journey.episodes.some((episode) => episode.epilogueStoryId === storyId) ||
        dates.some((date) => date.storyId === storyId) || battles.some((battle) => battle.storyId === storyId) ||
        tourism.landmarks.some((landmark) => landmark.guideStoryId === storyId))
      throw new Error(`Arrival story is used by another system: ${storyId}`);
    const compiled = stories[storyFileOf(storyId)];
    if (!compiled) throw new Error(`Unknown arrival story: ${storyId}`);
    validateNoInkRandom(compiled);
    // A place file's arrival knot was walked as a scene above (8 contexts).
    if (storyId !== storyFileOf(storyId)) {
      if (!placeEntries.some((scene) => scene.kind === "arrival" && `${scene.story.storyId}.${scene.story.knot}` === storyId))
        throw new Error(`Unknown arrival knot: ${storyId} (give it the head tag # scene: arrival)`);
      epilogueScenarios += 8;
      continue;
    }
    if (fileChoiceStories.has(storyId)) { epilogueScenarios += 8; continue; } // walked as a scene above (choices, stage 3a)
    epilogueScenarios += withContext(storyLabel(storyId), () => validateEpilogue(compiled, context, observeForStory(storyId)));
  }
  for (const episode of journey.episodes) {
    if (!episode.epilogueStoryId) continue;
    const compiled = stories[storyFileOf(episode.epilogueStoryId)];
    if (!compiled)
      throw new Error(`Unknown epilogue story: ${episode.epilogueStoryId}`);
    // A place file's epilogue knot was walked as a scene above (8 contexts).
    if (episode.epilogueStoryId !== storyFileOf(episode.epilogueStoryId)) {
      if (!placeEntries.some((scene) => scene.kind === "epilogue" && `${scene.story.storyId}.${scene.story.knot}` === episode.epilogueStoryId))
        throw new Error(`Unknown epilogue knot: ${episode.epilogueStoryId} (give it the head tag # scene: epilogue)`);
      epilogueScenarios += 8;
      continue;
    }
    if (fileChoiceStories.has(episode.epilogueStoryId)) { epilogueScenarios += 8; continue; } // walked as a scene above (choices, stage 3a)
    epilogueScenarios += withContext(
      storyLabel(episode.epilogueStoryId),
      () => validateEpilogue(compiled, context, observeForStory(episode.epilogueStoryId!)),
    );
  }
  for (const storyId of Object.keys(stories)) {
    if (
      !placeFiles.has(storyId) &&
      !learningStoryIds.has(storyId) &&
      !dates.some((date) => date.storyId === storyId) &&
      !battles.some((battle) => battle.storyId === storyId) &&
      !encounterStoryIds.includes(storyId) &&
      !cities.some((city) => city.arrivalStoryId === storyId) &&
      !journey.episodes.some(
        (episode) => episode.epilogueStoryId === storyId,
      ) &&
      !tourism.landmarks.some((landmark) => landmark.guideStoryId === storyId)
    )
      throw new Error(`Story lacks validation contract: ${storyId}`);
  }
  expressionValidator.finish();
  reactionValidator.finish();
  return {
    stories,
    /** Every scene's cond("…") texts and their JSON conditions (src/domain/scene-conditions.ts reads them). */
    sceneConditions,
    routes,
    dateRoutes,
    placeDateWalks,
    dates,
    destinations,
    effects,
    battles,
    quizzes,
    /** Every journey's tours (generated/tours.json; tour design stage 2a). */
    tours: tourFiles.map((item) => item.tour),
    battleScenarios,
    reasoningBattles: battles.filter((battle) => battle.reasoning).length,
    tourism,
    tourismGuides,
    epilogueScenarios,
    journey,
    /** The album's illustrations of every journey (generated/album-images.json; src/content/album-images.ts). */
    albumImages,
    /** Every registered sound's volume (generated/sound-volumes.json; src/audio/sound-effects.ts). */
    soundVolumes: soundVolumesOf(sounds),
    /** The tracks and where each journey plays them (generated/music.json; src/audio/bgm.ts, the credits list). */
    music: musicDataOf(music, sources.manifests.map((manifest) => manifest.id)),
    /** The ambience tracks and each journey's places' own (generated/ambience.json; src/audio/ambience.ts, the credits list). */
    ambience: ambienceDataOf(ambience, sources.manifests.map((manifest) => manifest.id)),
    /** Which layer gives each sound, track and ambience track, and each journey's voices (generated/audio-layers.json; Debug's 音と演出の見本). */
    audioLayers: audioLayersOf(sources.layers, { sounds, music: music.tracks, ambience: ambience.tracks, voices: voiceFiles }),
    /** Each scene's voiced lines and # bgm: tracks (generated/scene-audio.json; the music room, 2026-11-13). */
    sceneAudio: sceneAudioOf(sources.storyFiles.map(({ id, source }) => ({ id, source }))),
    /** Images whose files checkContentImages decodes. */
    images: { characters: characterImages, tourismAssets: tourism.assets },
    /** What chooses the free-time photos (src/content/photo-choice.ts), for their derived copies (scripts/derived-images.ts). */
    photoContent: {
      cities: travels.map(({ city, travel, settings }) => ({ city, places: travel.places, hotelPlaceId: settings.hotelPlaceId })),
      backgrounds: presentation.backgrounds,
    },
    /** The generated mirror's catalogs that differ from the merged sources (the encounters' head tags, the place scenes, the knots' map conditions). */
    catalogOverrides: {
      ...catalogOverrides,
      ...(insertedEncounters.length ? {
        "encounters/catalog.json": { ...((catalogOverrides["encounters/catalog.json"] ?? sources.catalogs["encounters/catalog.json"]?.value) as object),
          encounters: [...((catalogOverrides["encounters/catalog.json"] as { encounters?: unknown[] } | undefined)?.encounters ??
            (sources.catalogs["encounters/catalog.json"]?.value as { encounters: unknown[] }).encounters), ...insertedEncounters.map((item) => item.encounter)] },
        "encounters/entry-rules.json": { schemaVersion: 2, entries: runtimeEntryRules },
      } : {}),
      ...knotWhenOverrides,
    } as Partial<Record<CatalogKind, unknown>>,
    /** The scene list and the tags' AP rules (generated/scenes.json). */
    scenes: generatedScenes,
    /** Probable mistakes that do not stop the build (content-report.ts). */
    warnings: [...contentWarnings(sources), ...soundWarnings(sources, sounds), ...musicWarnings(sources, music), ...ambienceWarnings(sources, ambience), ...transitWarnings, ...conditionNotes, ...languageNotes, ...sceneNotes, ...tourNotes],
    /** What each journey folder provides, for the build report. */
    journeyContents: journeyContents(sources),
    /** Each journey's in-city transport (modes and transit ledger counts), for the build report. */
    transport: journeyCatalog.journeys.map((item) => transportSummary({ journey: item }, transitReviews.get(item.id) ?? [])),
    /** Word meanings no English text uses, for the build report. */
    unusedWordMeanings: unusedWordMeanings(sources),
  };
}
