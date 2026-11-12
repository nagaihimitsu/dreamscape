import { readFileSync, readdirSync } from "node:fs";
import { parseSceneConditions, readSceneConditions } from "./scene-conditions";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { journeySchema } from "../src/content/journey-schemas";
import { balanceSchema, battleCatalogSchema, dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { isPlaceStory, storyFileOf } from "../src/content/story-address";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import type { TagContext } from "../src/content/tags";
import { RELATIONSHIP_TONES } from "../src/domain/romance-tone";
import { validateMemoryReferences } from "../src/story/memory";
import { displayPath, journeyLayer, loadContentSources, parseCatalog, storyFile, type ContentSources } from "./content-sources";
import { withContext } from "./content-validation-utils";
import { albumImagesOf } from "./album-images";
import { checkVoiceTags, voiceFilesOf, voiceFolderPath } from "./voice-files";
import { checkSoundTags, soundRegistry } from "./sound-files";
import { checkBgmTags, musicRegistry } from "./music-files";
import { validateEpilogue } from "./epilogue-validation";
import { compileInk, validateNoInkRandom, validateRelationshipToneSource } from "./ink-validation";
import { choiceOption, includesModules, readFileChoices, readMainFileHead } from "./place-files";
import { walkScene } from "./scene-walk";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { buildJourneyFragments, journeyNarrativeSchema, journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";
import { validateTourism } from "./tourism-validation";
import { checkTourismImages } from "./content-images";
import { chooseStoryCache, validateStoryCached, type StoryValidationCache } from "./story-validation-cache";

function inkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? inkFiles(file) : entry.name.endsWith(".ink") ? [file] : [];
  });
}

/**
 * The planned stories (journeyRequirements' one-scene story IDs) that the journey already publishes as a knot of a
 * place file (stories/places/…): the catalogs' address of that knot, by planned story ID.
 */
function publishedPlaceKnots(sources: ContentSources, requirements: ReturnType<typeof journeyRequirements>): Map<string, string> {
  const { landmarks } = parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json");
  const { battles } = parseCatalog(sources, battleCatalogSchema, "battles/catalog.json");
  const { dates } = parseCatalog(sources, dateCatalogSchema, "romance/date_catalog.json");
  const { episodes } = parseCatalog(sources, journeySchema, "progression/journey.json");
  const addresses = requirements.flatMap((city) => [
    ...city.main.flatMap((main) => [[main.guideStoryId, landmarks.find((item) => item.id === main.landmarkId)?.guideStoryId],
      [main.battleStoryId, battles.find((item) => item.id === main.battleId)?.storyId]]),
    ...city.dates.map((date) => [date.storyId, dates.find((item) => item.id === date.eventId)?.storyId]),
    [city.finale.battleStoryId, battles.find((item) => item.id === city.finale.battleId)?.storyId],
    [city.finale.epilogueStoryId, episodes.find((item) => item.id === city.finale.eventId)?.epilogueStoryId],
  ]);
  return new Map(addresses.filter((entry): entry is [string, string] => !!entry[1] && isPlaceStory(entry[1])));
}

/** Check authored scripts with the production contracts, without inventing quizzes
 * or writing generated content/release markers. This is not a release gate.
 * The date routes use the Ink validation cache like content:build (storyCache
 * null: without it). `warnings` lists what is reported without stopping (a
 * protagonist line outside the date choices: decision 36). A scene the journey already publishes as a knot of a
 * place file counts as published and is not checked again here: content:build walks it (`placeKnots`). */
export async function validateJourneyScenario(root: string, journeyId: string, directory: string, selectedCityId?: string,
  options: { storyCache?: StoryValidationCache | null } = {}) {
  const storyCache = chooseStoryCache(options.storyCache);
  const sources = loadContentSources(root);
  const input = loadJourneyScaffold(root, journeyId, sources);
  const requirements = journeyRequirements(input, selectedCityId ? [selectedCityId] : undefined);
  const base = path.resolve(root, directory);
  const json = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
  const narrative = journeyNarrativeSchema.parse(json(path.join(base, selectedCityId ?? "", "narrative.json")));
  const fragments = buildJourneyFragments(input, narrative, requirements.map((city) => city.cityId));
  const presentation = parseCatalog(sources, presentationSchema, "romance/presentation.json");
  const { apCap } = parseCatalog(sources, balanceSchema, "romance/balance.json");
  // Any background of the journey's own romance/presentation.json (dates and scenes away from the
  // map's places), besides the backgrounds of the city's places.
  const journeyDirectory = journeyLayer(sources, journeyId).directory + path.sep;
  const backgroundFiles = sources.catalogs["romance/presentation.json"]?.provenance.keys.backgrounds ?? {};
  const journeyBackgroundIds = Object.keys(presentation.backgrounds)
    .filter((id) => backgroundFiles[id]?.startsWith(journeyDirectory));
  const warnings: string[] = [];
  const tourism = parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json");
  // A line's # photo: and # recall: name an album image of this journey (its public/assets/album/; album-images.ts).
  const albumImageIds = albumImagesOf(sources).filter((image) => image.journeyId === journeyId).map((image) => image.id);
  // A line's # voice: names a recording of this journey (its public/assets/voice/; voice-files.ts).
  const voiceFiles = voiceFilesOf(sources);
  const voiceFolder = voiceFolderPath(sources, journeyLayer(sources, journeyId));
  // A line's # se: names a shared sound or one of this journey (presentation/sounds.json; sound-files.ts).
  const sounds = soundRegistry(sources);
  const soundLayerId = journeyLayer(sources, journeyId).id;
  // A line's # bgm: names a shared track or one of this journey, or stop or default (presentation/music.json; music-files.ts).
  const tracks = musicRegistry(sources).tracks;
  const placeKnots = publishedPlaceKnots(sources, requirements);
  const expected = requirements.flatMap((city) => [
    ...city.main.flatMap((event) => [event.guideStoryId, event.battleStoryId]),
    ...city.dates.map((event) => event.storyId), city.finale.battleStoryId, city.finale.epilogueStoryId,
  ].map((storyId) => ({ cityId: city.cityId, storyId,
    draftFile: path.join(base, city.cityId, "stories", `${storyId}.ink`),
    // A published scene: its one-scene file, or the place file of the knot the catalogs name.
    publishedFile: storyFile(sources, placeKnots.has(storyId) ? storyFileOf(placeKnots.get(storyId)!) : storyId) })));
  const actualFiles = new Set(inkFiles(path.join(base, selectedCityId ?? "")));
  const expectedFiles = new Set(expected.map((story) => story.draftFile));
  const duplicate = expected.filter((story) => actualFiles.has(story.draftFile) && story.publishedFile);
  if (duplicate.length) throw new Error(`下書きと公開済みの両方に同じ Ink があります: ${duplicate.map((story) => story.storyId).join(", ")}。どちらか1つにします。`);
  const missing = expected.filter((story) => !actualFiles.has(story.draftFile) && !story.publishedFile).map((story) => story.draftFile);
  const extra = [...actualFiles].filter((file) => !expectedFiles.has(file));
  if (missing.length || extra.length)
    throw new Error(`下書きの Ink ファイルが要るものと合いません。足りない: [${missing.map((file) => path.relative(base, file)).join(", ")}]、余分: [${extra.map((file) => path.relative(base, file)).join(", ")}]`);
  for (const city of requirements) {
    const own = journeyNarrativeSchema.parse(json(path.join(base, city.cityId, "narrative.json")));
    const subset = { main: Object.fromEntries(city.main.map((event) => [event.eventId, narrative.main[event.eventId]])),
      dates: Object.fromEntries(city.dates.map((event) => [event.eventId, narrative.dates[event.eventId]])),
      finales: { [city.cityId]: narrative.finales[city.cityId] } };
    if (!isDeepStrictEqual(own, subset)) throw new Error(`都市 ${city.cityId} の narrative.json が、まとめた脚本の情報と違います。`);
  }
  const stories: Record<string, string> = {};
  const inkSources: Record<string, string> = {};
  const storyFiles: Record<string, string> = {};
  for (const { storyId, draftFile, publishedFile } of expected) {
    if (placeKnots.has(storyId) && !actualFiles.has(draftFile)) continue; // a place file's knot: content:build walks it.
    const file = actualFiles.has(draftFile) ? draftFile : publishedFile!;
    storyFiles[storyId] = file;
    // A draft is read from the scenario folder; a published story comes from the loaded content.
    const authored = actualFiles.has(draftFile) ? readFileSync(draftFile, "utf8") : sources.storyFiles.find((story) => story.id === storyId)!.source;
    withContext(file, () => {
      // A main part's one-scene head (# on_done:, # then:; 3.1) is read and blanked, as content:build does.
      const source = readMainFileHead(authored).source;
      // A protagonist line (also in a currently unreachable branch) is reported, not refused (decision 36).
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (/#\s*speaker\s*:\s*player\b/.test(code))
        warnings.push(`${displayPath(root, file)}: the protagonist speaks outside the date choices (# speaker: player); usually the protagonist speaks through the choices (not stopped)`);
      validateMemoryReferences(source, Object.keys(fragments.memories));
      checkVoiceTags(source, journeyId, voiceFiles, voiceFolder);
      checkSoundTags(source, soundLayerId, sounds);
      checkBgmTags(source, soundLayerId, tracks);
      // A scene's cond("…") (stage 2a): declared, literal and written as a condition; content:build checks what it names.
      // A battle includes the game's modules.ink (its quiz and reasoning calls).
      const modules = includesModules(source);
      parseSceneConditions(readSceneConditions(source, modules));
      stories[storyId] = modules ? compileInk(source, file, { [MODULES_FILE]: MODULES_INK }) : compileInk(source, file);
      inkSources[storyId] = source;
    });
  }
  let guides = 0;
  let battleScenarios = 0;
  let dateRoutes = 0;
  let epilogueScenarios = 0;
  // Lines are only read here (the protagonist's lines were reported above; any language may be written).
  const observe = () => {};
  for (const city of requirements) {
    const travel = input.cities.find((item) => item.cityId === city.cityId)!;
    const context: TagContext = { effectIds: [], emotionIds: Object.keys(presentation.emotions),
      backgroundIds: [...new Set([...travel.places.map((place) => place.backgroundId), ...journeyBackgroundIds])],
      photoIds: albumImageIds };
    const ownLandmarks = fragments.landmarks.filter((landmark) => landmark.cityId === city.cityId);
    const ownClues = fragments.clues.filter((clue) => ownLandmarks.some((landmark) => landmark.id === clue.landmarkId));
    const ownAssets = tourism.assets.filter((asset) => ownLandmarks.some((landmark) => landmark.imageAssetId === asset.id));
    await checkTourismImages(sources.publicFiles, ownAssets);
    guides += validateTourism({ schemaVersion: 1, landmarks: ownLandmarks, clues: ownClues, assets: ownAssets },
    city.cityId, input.plannedLandmarks[city.cityId], fragments.battles, {}, stories, context, () => observe,
    (storyId) => storyFiles[storyId] ? displayPath(root, storyFiles[storyId]) : `${storyId}.ink`, (guideStoryId) => placeKnots.has(guideStoryId));
    for (const battle of fragments.battles.filter((battle) => battle.cityId === city.cityId || ownLandmarks.some((landmark) => landmark.battleId === battle.id)))
      // A place file's knot: content:build walks it. A battle's one flow is walked as content:build walks it, every quiz
      // right and wrong (A16).
      if (placeKnots.has(battle.storyId)) continue;
      else battleScenarios += withContext(storyFiles[battle.storyId] ?? battle.storyId, () => {
        const source = inkSources[battle.storyId];
        if (!includesModules(source))
          throw new Error(`A battle's script calls the game's quizzes (stage 5): start ${battle.storyId} with INCLUDE modules.ink in place of its VAR lines, ` +
            `and call the quiz with -> quiz(1) -> … (authoring/CONTENT_GUIDE.md「対決の会話を1本の流れで書く」)`);
        const options = readFileChoices(battle.storyId, source).flatMap((choice) => choiceOption(choice, apCap) ?? []);
        return walkScene({ compiled: stories[battle.storyId], label: battle.storyId, context, conds: readSceneConditions(source, true), options,
          itemIds: [], memoryIds: Object.keys(fragments.memories), observe,
          variables: { call_arg: 0, quiz_correct: false, answer_correct: false, battle_score: 0, reasoning_action: "", evidence_result: "" },
          battle: { quizzes: battle.scope === "city_finale" ? 5 : 3 } });
      });
    if (!placeKnots.has(city.finale.epilogueStoryId))
      epilogueScenarios += withContext(city.finale.epilogueStoryId, () => validateEpilogue(stories[city.finale.epilogueStoryId], context, observe));
    for (const date of fragments.dates.filter((date) => date.chapterId === city.cityId && !placeKnots.has(date.storyId))) {
      const source = inkSources[date.storyId];
      const compiled = stories[date.storyId];
      const effects = fragments.effects.filter((effect) => effect.id.startsWith(`${date.id}_`));
      const dateContext = { ...context, effectIds: effects.map((effect) => effect.id) };
      withContext(date.storyId, () => {
        validateNoInkRandom(compiled);
        validateRelationshipToneSource(source);
        const references = validateMemoryReferences(source, Object.keys(fragments.memories));
        for (const id of references) {
          const has = (seed: typeof date.validationContexts[number]) => (seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : [])).includes(id);
          if (!date.validationContexts.some(has) || !date.validationContexts.some((seed) => !has(seed)))
            throw new Error(`思い出 ${id} を読むデートには、その思い出がある場合とない場合の両方の検証の文脈（validationContexts）が要ります。`);
        }
        // The published runtime supplies all relationship stages and ending states.
        // Exercise them even when the generated minimum metadata has one seed.
        for (const romanceStage of [1, 2, 3, 4]) for (const endingReached of [false, true]) for (const tone of RELATIONSHIP_TONES)
          for (const seed of date.validationContexts) dateRoutes += validateStoryCached(storyCache, {
            compiled, context: dateContext,
            contract: { choiceCount: date.choiceCount, effectCount: date.effectCount, kind: date.kind },
            variables: {
              player_address: "検証主人公さん", romance_stage: romanceStage, ending_reached: endingReached,
              confession_ready: seed.confessionReady, confession_result: seed.confessionResult ?? "deferred",
              memory_callback: "旅の思い出",
            },
            effects,
            memories: { available: seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : []), known: Object.keys(fragments.memories) },
            randomReactions: true,
            tone,
          }, observe);
      });
    }
  }
  return { journeyId, cities: requirements.map((city) => city.cityId), stories: expected.length, placeKnots: placeKnots.size,
    guides, battleScenarios, dateRoutes, epilogueScenarios, warnings, readyForPublication: false as const };
}
