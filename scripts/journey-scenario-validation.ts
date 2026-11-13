import { readFileSync, readdirSync } from "node:fs";
import { parseSceneConditions, readSceneConditions } from "./scene-conditions";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { balanceSchema, presentationSchema } from "../src/content/schemas";
import { splitStoryAddress } from "../src/content/story-address";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import type { SceneKind } from "../src/content/scene-schemas";
import type { TagContext } from "../src/content/tags";
import { RELATIONSHIP_TONES } from "../src/domain/romance-tone";
import { validateMemoryReferences } from "../src/story/memory";
import { displayPath, journeyLayer, loadContentSources, parseCatalog, type ContentSources } from "./content-sources";
import { unique, withContext } from "./content-validation-utils";
import { albumImagesOf } from "./album-images";
import { checkVoiceTags, voiceFilesOf, voiceFolderPath } from "./voice-files";
import { checkSoundTags, soundRegistry } from "./sound-files";
import { checkBgmTags, musicRegistry } from "./music-files";
import { ambienceRegistry, checkAmbienceTags } from "./ambience-files";
import { catalogItemJourneys, checkSceneEffectTags } from "./scene-effect-tags";
import { checkEmphasisTags } from "./line-emphasis";
import { compileInk, validateNoInkRandom, validateRelationshipToneSource } from "./ink-validation";
import { choiceOption, readHead, readPlaceFile, reachableKnots, type PlaceFile } from "./place-files";
import { walkScene } from "./scene-walk";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { buildJourneyFragments, journeyNarrativeSchema, journeyRequirements, loadJourneyScaffold, narrativeFinalePlaces } from "./journey-scaffold";
import { validateTourism } from "./tourism-validation";
import { checkTourismImages } from "./content-images";

/** The Ink files of a draft folder (a copy of the game's modules.ink beside place files is for Inky's preview only). */
function inkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? inkFiles(file) : entry.name.endsWith(".ink") && entry.name !== MODULES_FILE ? [file] : [];
  });
}

/** A scene journeyRequirements plans: a knot of a place file, drafted in the scenario folder or already published. */
type PlannedScene = { cityId: string; address: string; storyId: string; knot: string; kind: Extract<SceneKind, "guide" | "battle" | "date" | "epilogue">;
  draftFile: string; published: boolean };

/** Whether the journey already publishes the knot of a place-file address (its place file in the content has that knot). */
function publishedKnot(sources: ContentSources, storyId: string, knot: string): boolean {
  const source = sources.storyFiles.find((story) => story.id === storyId)?.source;
  return source !== undefined && readPlaceFile(storyId, source).knots.some((item) => item.name === knot);
}

/** Check authored scripts with the production contracts, without inventing quizzes
 * or writing generated content/release markers. This is not a release gate.
 * The planned scenes (journeyRequirements) are knots of place files: a draft is
 * `<directory>/<city>/stories/places/<file>.ink` and holds the knots of its place,
 * each walked as content:build walks a place file's scene. `warnings` lists what is
 * reported without stopping (a protagonist line outside the date choices: decision 36).
 * A scene the journey already publishes (its place file in the content has the
 * knot) counts as published (`placeKnots`) and is not checked again here:
 * content:build walks it. */
export async function validateJourneyScenario(root: string, journeyId: string, directory: string, selectedCityId?: string) {
  const sources = loadContentSources(root);
  const input = loadJourneyScaffold(root, journeyId, sources);
  const base = path.resolve(root, directory);
  const json = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
  const narrative = journeyNarrativeSchema.parse(json(path.join(base, selectedCityId ?? "", "narrative.json")));
  // The finale's knot is in the place file of its venue: the narrative's placeId.
  const requirements = journeyRequirements(input, selectedCityId ? [selectedCityId] : undefined, narrativeFinalePlaces(narrative));
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
  // A line's # ambience: names a shared ambience track or one of this journey, or stop or default (presentation/ambience.json;
  // ambience-files.ts), its # item_show: an item of this journey (scene-effect-tags.ts).
  const ambienceTracks = ambienceRegistry(sources).tracks;
  const items = catalogItemJourneys(sources);
  // The memories a date's # memory: may name: the scaffold's, and those the content already registers.
  const memoryIds = [...new Set([...Object.keys(fragments.memories), ...Object.keys(presentation.memories)])];

  const planned: PlannedScene[] = requirements.flatMap((city) => {
    if (!city.finale.battleStoryId) throw new Error(`journey:scaffold: 都市 ${city.cityId} のフィナーレの地点（narrative.json の placeId）がありません。`);
    const scene = (address: string, kind: PlannedScene["kind"]): PlannedScene => {
      const { storyId, path: knot } = splitStoryAddress(address);
      return { cityId: city.cityId, address, storyId, knot: knot!, kind, draftFile: path.join(base, city.cityId, "stories", `${storyId}.ink`),
        published: publishedKnot(sources, storyId, knot!) };
    };
    return [...city.main.flatMap((event) => [scene(event.guideStoryId, "guide"), scene(event.battleStoryId, "battle")]),
      ...city.dates.map((event) => scene(event.storyId, "date")), scene(city.finale.battleStoryId, "battle"), scene(city.finale.epilogueStoryId, "epilogue")];
  });
  const actualFiles = new Set(inkFiles(path.join(base, selectedCityId ?? "")));
  // A draft place file, read as content:build reads a place file (its heads blanked), once.
  const drafts = new Map<string, PlaceFile>();
  const draft = (scene: PlannedScene) => {
    if (!drafts.has(scene.draftFile)) drafts.set(scene.draftFile, withContext(displayPath(root, scene.draftFile),
      () => readPlaceFile(scene.storyId, readFileSync(scene.draftFile, "utf8"))));
    return drafts.get(scene.draftFile)!;
  };
  const hasDraft = (scene: PlannedScene) => actualFiles.has(scene.draftFile) && draft(scene).knots.some((knot) => knot.name === scene.knot);
  const duplicate = planned.filter((scene) => scene.published && hasDraft(scene));
  if (duplicate.length) throw new Error(`下書きと公開済みの両方に同じ Ink があります: ${duplicate.map((scene) => scene.address).join(", ")}。どちらか1つにします。`);
  const unpublished = planned.filter((scene) => !scene.published);
  const expectedFiles = new Set(unpublished.map((scene) => scene.draftFile));
  const missing = [...expectedFiles].filter((file) => !actualFiles.has(file));
  const extra = [...actualFiles].filter((file) => !expectedFiles.has(file));
  if (missing.length || extra.length)
    throw new Error(`下書きの Ink ファイルが要るものと合いません。足りない: [${missing.map((file) => path.relative(base, file)).join(", ")}]、余分: [${extra.map((file) => path.relative(base, file)).join(", ")}]`);
  const missingKnots = unpublished.filter((scene) => !hasDraft(scene));
  if (missingKnots.length)
    throw new Error(`下書きの場所のファイルに、場面の knot がありません: ${missingKnots.map((scene) => `${path.relative(base, scene.draftFile)} の ${scene.knot}`).join(", ")}`);
  for (const city of requirements) {
    const own = journeyNarrativeSchema.parse(json(path.join(base, city.cityId, "narrative.json")));
    const subset = { main: Object.fromEntries(city.main.map((event) => [event.eventId, narrative.main[event.eventId]])),
      dates: Object.fromEntries(city.dates.map((event) => [event.eventId, narrative.dates[event.eventId]])),
      finales: { [city.cityId]: narrative.finales[city.cityId] } };
    if (!isDeepStrictEqual(own, subset)) throw new Error(`都市 ${city.cityId} の narrative.json が、まとめた脚本の情報と違います。`);
  }
  // Each draft place file: the checks of its lines, then compiled with the game's modules.ink.
  const compiled = new Map<string, string>();
  for (const file of expectedFiles) withContext(displayPath(root, file), () => {
    const source = drafts.get(file)!.source;
    // A protagonist line (also in a currently unreachable branch) is reported, not refused (decision 36).
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (/#\s*speaker\s*:\s*player\b/.test(code))
      warnings.push(`${displayPath(root, file)}: the protagonist speaks outside the date choices (# speaker: player); usually the protagonist speaks through the choices (not stopped)`);
    validateMemoryReferences(source, memoryIds);
    checkVoiceTags(source, journeyId, voiceFiles, voiceFolder);
    checkSoundTags(source, soundLayerId, sounds);
    checkBgmTags(source, soundLayerId, tracks);
    checkAmbienceTags(source, soundLayerId, ambienceTracks);
    checkSceneEffectTags(source, soundLayerId, items);
    checkEmphasisTags(source);
    // A scene's cond("…") (stage 2a): declared, literal and written as a condition; content:build checks what it names.
    parseSceneConditions(readSceneConditions(source, true));
    compiled.set(file, compileInk(source, file, { [MODULES_FILE]: MODULES_INK }));
  });
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
      photoIds: albumImageIds, miniGames: false };
    const ownLandmarks = fragments.landmarks.filter((landmark) => landmark.cityId === city.cityId);
    const ownClues = fragments.clues.filter((clue) => ownLandmarks.some((landmark) => landmark.id === clue.landmarkId));
    const ownAssets = tourism.assets.filter((asset) => ownLandmarks.some((landmark) => landmark.imageAssetId === asset.id));
    await checkTourismImages(sources.publicFiles, ownAssets);
    // Every guide is a knot of a place file: walked below (a draft) or by content:build (published), counted here.
    guides += validateTourism({ schemaVersion: 1, landmarks: ownLandmarks, clues: ownClues, assets: ownAssets },
      city.cityId, input.plannedLandmarks[city.cityId], fragments.battles, {}, {}, context, () => observe, (storyId) => `${storyId}.ink`, () => true);
    for (const scene of unpublished.filter((item) => item.cityId === city.cityId)) {
      const file = drafts.get(scene.draftFile)!;
      const knot = file.knots.find((item) => item.name === scene.knot)!;
      const label = `${displayPath(root, scene.draftFile)} (${scene.knot})`;
      withContext(label, () => {
        // The main part's knot, as content:build reads it (A5): its kind in its head, no moment, position or repetition of its own.
        const head = readHead(knot, apCap);
        if (!head || head.kind !== scene.kind)
          throw new Error(`The knot ${scene.knot} is the ${scene.kind} the catalogs will point at: give it the head tag # scene: ${scene.kind}`);
        for (const key of ["at", "priority", "repeat"] as const) if (knot.head.some((tag) => tag.key === key))
          throw new Error(`A main part's knot takes no # ${key}: (the catalog points at it, its order and repetition are the game's; A5)`);
        // The choices of the knot and of the helper knots it calls, and the cond texts they read.
        const reached = reachableKnots(file, scene.knot);
        const options = reached.flatMap((item) => item.choices).flatMap((choice) => choiceOption(choice, apCap) ?? []);
        unique(options.map((option) => option.id), "option ID (# option:)");
        const conds = [...new Set(reached.flatMap((item) => item.conds))];
        const walk = { compiled: compiled.get(scene.draftFile)!, start: scene.knot, label, context, conds, options, done: head.done, headThen: !!head.then,
          itemIds: [], memoryIds, observe };
        if (scene.kind === "guide") walkScene({ ...walk, variables: { romance_stage: 1, ending_reached: false } });
        else if (scene.kind === "battle") {
          // A battle's one flow, walked as content:build walks it: every quiz right and wrong (A16).
          battleScenarios += walkScene({ ...walk,
            variables: { call_arg: 0, quiz_correct: false, answer_correct: false, battle_score: 0, reasoning_action: "", evidence_result: "" },
            battle: { quizzes: scene.address === city.finale.battleStoryId ? 5 : 3 } });
        } else if (scene.kind === "epilogue") {
          for (const romanceStage of [1, 2, 3, 4]) for (const endingReached of [false, true])
            walkScene({ ...walk, variables: { romance_stage: romanceStage, ending_reached: endingReached } });
          epilogueScenarios += 8;
        } else {
          const date = fragments.dates.find((item) => item.storyId === scene.address)!;
          validateNoInkRandom(walk.compiled);
          validateRelationshipToneSource(file.source);
          // A place file's date (A14, 3.5): its own knot's choices are the romance choices (# profile:, # memory:), a helper knot's are in-scene choices.
          for (const option of options) {
            if (option.effect) throw new Error(`A place file's date writes its choices with # profile: (and # memory:, # rel:) instead of # effect: (A14): the choice ${option.id}`);
            const own = option.knot === scene.knot;
            if (own && !option.profile) throw new Error(`A romance choice of the date ${date.id} needs # profile: (the choice ${option.id}); an in-scene choice goes in a helper knot`);
            if (!own && option.profile) throw new Error(`An in-scene choice of the date ${date.id} takes no # profile: (the choice ${option.id} in ${option.knot})`);
            for (const memory of option.memory ?? []) if (!memoryIds.includes(memory)) throw new Error(`Unknown memory in the choice ${option.id}: ${memory}`);
          }
          for (const id of validateMemoryReferences(file.source, memoryIds)) {
            const has = (seed: typeof date.validationContexts[number]) => (seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : [])).includes(id);
            if (!date.validationContexts.some(has) || !date.validationContexts.some((seed) => !has(seed)))
              throw new Error(`思い出 ${id} を読むデートには、その思い出がある場合とない場合の両方の検証の文脈（validationContexts）が要ります。`);
          }
          // The published runtime supplies all relationship stages and ending states: they are walked even when the
          // generated minimum metadata has one seed. Contexts that differ only in variables the file never reads walk the same paths.
          const walked = new Map<string, number>();
          for (const romanceStage of [1, 2, 3, 4]) for (const endingReached of [false, true]) for (const tone of RELATIONSHIP_TONES)
            for (const seed of date.validationContexts) {
              const variables = { player_address: "検証主人公さん", romance_stage: romanceStage, ending_reached: endingReached, memory_callback: "旅の思い出",
                confession_ready: seed.confessionReady, confession_result: seed.confessionResult ?? "deferred",
                relationship_tone: tone, relationship_tone_before: tone, relationship_tone_after: tone };
              const key = JSON.stringify(Object.entries(variables).filter(([name]) => walk.compiled.includes(`"VAR?":"${name}"`)));
              if (!walked.has(key)) walked.set(key, walkScene({ ...walk, context: { ...context, miniGames: true }, variables, romanceChoices: { knot: scene.knot, count: date.choiceCount } }));
              dateRoutes += walked.get(key)!;
            }
        }
      });
    }
  }
  return { journeyId, cities: requirements.map((city) => city.cityId), stories: planned.length, placeKnots: planned.length - unpublished.length,
    guides, battleScenarios, dateRoutes, epilogueScenarios, warnings, readyForPublication: false as const };
}
