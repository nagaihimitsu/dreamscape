import {
  commonDateEffect,
  compileInk,
  validateNoInkRandom,
  validateRelationshipToneSource,
  validateStory,
  validateReasoningIntroduction,
  validateLearningTopic,
} from "./ink-validation";
import { unique, withContext } from "./content-validation-utils";
import { resolvePublicFile } from "./public-assets";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { mirrorDirectory, type CatalogKind } from "./content-layout";
import { displayPath, loadContentSources, parseCatalog as parseSourceCatalog, requireJourneyManifests, writeContentMirror } from "./content-sources";
import { authoringProfileOf } from "./journey-authoring";
import { checkContentOwnership } from "./content-ownership";
import { characterCatalogSchema } from "../src/content/character-assets";
import { encounterCatalogInputSchema, normalizeEncounterCatalog } from "../src/content/encounter-schemas";
import { encounterEntryRulesSchema, validateEncounterEntryRules } from "../src/content/encounter-entry-rules";
import { validateEncounterContent } from "./encounter-validation";
import { validateBackgroundAssets, validateCharacters } from "./presentation-validation";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { dialogueReactionCatalogSchema } from "../src/content/dialogue-reactions";
import { createDialogueReactionValidator } from "./dialogue-reaction-validation";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { reasoningIntroCatalogSchema } from "../src/content/reasoning-intros";
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
  quizSampleSchema,
  progressionSchema,
  type DateDefinition,
} from "../src/content/schemas";
import type { TagContext } from "../src/content/tags";
import {
  reasoningScenes,
  validateBattleEvidence,
  validateBattleStory,
} from "./battle-validation";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { validateTourism } from "./tourism-validation";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { validateTravelContent } from "./travel-validation";
import { journeySchema } from "../src/content/journey-schemas";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { validateJourney } from "./journey-validation";
import { validateEpilogue } from "./epilogue-validation";
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

// Preserve the authoring API used by the inspector and validation tests.
export { compileInk, validateNoInkRandom, validateRelationshipToneSource, validateStory } from "./ink-validation";

async function json(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${file}`, { cause: error });
  }
}

async function parseFile<T>(
  schema: { parse(value: unknown): T },
  file: string,
): Promise<T> {
  const data = await json(file);
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(
      `Invalid content in ${file}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/** Check facts contained within one quiz; cross-file references are checked by buildContent. */
export function validateQuizEntries(quiz: {
  questions: {
    id: string;
    options: { id: string; textEn: string }[];
    correctOptionId: string;
  }[];
}): void {
  unique(
    quiz.questions.map((question) => question.id),
    "quiz question ID",
  );
  for (const question of quiz.questions) {
    unique(
      question.options.map((option) => option.id),
      "quiz option ID",
    );
    unique(
      question.options.map((option) => option.textEn.toLowerCase()),
      "quiz option text",
    );
    if (
      question.options.filter(
        (option) => option.id === question.correctOptionId,
      ).length !== 1
    ) {
      throw new Error(`Invalid correct option: ${question.id}`);
    }
  }
}

/** Validate authored city links separately from content completion. */
export function validateCityLinks(cities: Array<ReturnType<typeof citySchema.parse>>, journeyCatalog: ReturnType<typeof journeyCatalogSchema.parse>) {
  for (const current of cities) {
    const seen = new Set<string>();
    let next: typeof current | undefined = current;
    while (next) {
      if (seen.has(next.id)) throw new Error(`Cyclic city route: ${next.id}`);
      seen.add(next.id);
      if (!next.nextCityId) break;
      const following = cities.find((item) => item.id === next!.nextCityId);
      const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === next!.id));
      const index = owner?.cities.findIndex((planned) => planned.id === next!.id) ?? -1;
      const plannedNext = following?.productionStatus === "prototype" && owner?.cities[index + 1]?.id === following.id;
      if (!following || (following.productionStatus !== "complete" && !plannedNext)) throw new Error(`Unknown or incomplete next city: ${next.nextCityId}`);
      next = following;
    }
  }
  for (const current of cities) {
    const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === current.id));
    if (!owner) throw new Error(`City has no journey: ${current.id}`);
    if (current.nextCityId) {
      const index = owner.cities.findIndex((planned) => planned.id === current.id);
      if (owner.cities[index + 1]?.id !== current.nextCityId)
        throw new Error(`Next city is outside the journey order: ${current.id}/${current.nextCityId}`);
    }
  }
}

export async function buildContent(root: string, writeOutput = true) {
  // Every content layer, merged; the merged catalogs are validated below exactly
  // as the former single files were.
  const sources = loadContentSources(root);
  requireJourneyManifests(sources.manifests);
  // Only the authoring tools read these profiles; a broken one still fails the build early.
  for (const manifest of sources.manifests) authoringProfileOf(manifest.data, manifest.file);
  // Each journey folder keeps to its own cities and content (and the core layer to core content).
  checkContentOwnership(sources);
  const parseCatalog = <T>(schema: { parse(value: unknown): T }, kind: CatalogKind): T => parseSourceCatalog(sources, schema, kind);
  // Messages name the real Ink file of a story, whichever layer it is in.
  const storyFiles = new Map(sources.storyFiles.map((story) => [story.id, displayPath(root, story.file)]));
  const storyLabel = (storyId: string) => storyFiles.get(storyId) ?? `${storyId}.ink`;
  const journey = parseCatalog(journeySchema, "progression/journey.json");
  const tourism = parseCatalog(tourismCatalogSchema, "tourism/catalog.json");
  const encounterInput = parseCatalog(encounterCatalogInputSchema, "encounters/catalog.json");
  const encounterCatalog = normalizeEncounterCatalog(encounterInput, tourism.landmarks);
  const encounterEntryRules = parseCatalog(encounterEntryRulesSchema, "encounters/entry-rules.json");
  validateEncounterEntryRules(encounterEntryRules, encounterCatalog.encounters, journey);
  const encounterStoryIds = [...new Set(encounterCatalog.encounters.flatMap((event) => [
    event.storyId,
    ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : []),
  ]))];
  const battles = parseCatalog(battleCatalogSchema, "battles/catalog.json").battles;
  unique(
    battles.map((battle) => battle.id),
    "battleId",
  );
  const dates = parseCatalog(dateCatalogSchema, "romance/date_catalog.json").dates;
  const destinations = parseCatalog(dateDestinationsSchema, "romance/date_destinations.json").destinations;
  const effects = parseCatalog(effectCatalogSchema, "romance/effect_catalog.json").effects;
  const responseProfiles = parseCatalog(responseProfileCatalogSchema, "romance/response_profiles.json").profiles;
  unique(responseProfiles.map((profile) => profile.id), "response profile ID");
  const cities = await Promise.all(sources.cities.map(async ({ file }) => {
    const city = await parseFile(citySchema, file);
    if (path.basename(file) !== `${city.id}.json`) throw new Error(`City file ID mismatch: ${file}/${city.id}`);
    return city;
  }));
  unique(cities.map((city) => city.id), "city ID");
  const journeyCatalog = parseCatalog(journeyCatalogSchema, "journeys/catalog.json");
  // The first available journey (manifest order) opens the title screen, a new
  // game and Debug; each available journey's starting city is checked below.
  if (!journeyCatalog.journeys.some((item) => item.status === "available"))
    throw new Error('No available journey: at least one content/journeys/<journeyId>/manifest.json needs "status": "available"');
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
  const travels = await Promise.all(cities.map(async (item, index) => ({ city: item,
    travel: await parseFile(travelCatalogSchema, sources.cities[index].travelFile),
    settings: await parseFile(travelSettingsSchema, sources.cities[index].settingsFile),
  })));
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
    if (!presentation.backgrounds[destination.backgroundAssetId])
      throw new Error(`Unknown date destination background: ${destination.id}/${destination.backgroundAssetId}`);
  }
  const characters = parseCatalog(characterCatalogSchema, "presentation/characters.json");
  await validateBackgroundAssets(root, presentation.backgrounds, tourism.assets);
  const wardrobeSceneIds = new Set([
    ...dates.map((date) => date.id),
    ...battles.map((battle) => battle.id),
    ...tourism.landmarks.map((landmark) => landmark.id),
    ...journey.episodes.filter((episode) => episode.epilogueStoryId).map((episode) => episode.id),
  ]);
  await validateCharacters(root, characters, {
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
  for (const item of encounterCatalog.items)
    if (item.iconPath) withContext(`encounter item ${item.id}`, () => resolvePublicFile(root, item.iconPath!, sources.publicRoots));
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
  if (
    balance.defaultPlayerName.length > balance.maxNameLength ||
    balance.defaultHeroineName.length > balance.maxNameLength
  ) {
    throw new Error("Default name exceeds maxNameLength");
  }
  if (cities.some((item) => item.firstClearReward.ap > balance.apCap))
    throw new Error("First clear reward exceeds AP cap");
  const context: TagContext = {
    effectIds: effects.map((effect) => effect.id),
    backgroundIds: Object.keys(presentation.backgrounds),
    emotionIds: Object.keys(presentation.emotions),
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
  let routes = 0;
  for (const { id, file } of sources.storyFiles) {
    const source = await readFile(file, "utf8");
    storyMemoryReferences[id] = withContext(file, () => validateMemoryReferences(source, Object.keys(presentation.memories)));
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
    const compiled = compileInk(source, file);
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
  const reactionCatalog = parseCatalog(dialogueReactionCatalogSchema, "presentation/dialogue-reactions.json");
  const reactionValidator = createDialogueReactionValidator(
    reactionCatalog, storySources, Object.keys(stories),
    context.emotionIds.filter((id) => characters.expressionIds?.includes(id) ?? true),
    characters.characters.map((character) => character.id),
    [learningDetails.storyId],
  );
  const observeForStory = (storyId: string): DialogueObserver =>
    (text, speaker, explicitEmotion) => {
      expressionValidator.observe(storyId, text, speaker, explicitEmotion);
      reactionValidator.observe(storyId, text, speaker);
    };
  const effectDates = new Map<string, Set<string>>();
  const deferredDateValidation: Array<() => void> = [];
  for (const date of dates) {
    if (!Object.hasOwn(stories, date.storyId))
      throw new Error(`Unknown storyId: ${date.storyId}`);
    if (date.kind !== "confession" && date.choiceCount > 0)
      withContext(`${storyLabel(date.storyId)} (date ${date.id})`, () => {
        validateNoInkRandom(stories[date.storyId]);
        validateRelationshipToneSource(storySources[date.storyId]);
      });
    if (date.destinationId) {
      const destination = destinations.find((item) => item.id === date.destinationId);
      if (!destination)
        throw new Error(`Unknown date destination: ${date.id}/${date.destinationId}`);
      if (destination.cityId !== date.chapterId)
        throw new Error(`Date destination city mismatch: ${date.id}/${date.destinationId}`);
      if (destination.backgroundAssetId !== date.backgroundAssetId)
        throw new Error(`Date destination background mismatch: ${date.id}/${date.destinationId}`);
    }
    if (
      !cities.some((item) => item.id === date.chapterId) ||
      date.requiredCompletedChapters.some((id) => !cities.some((item) => item.id === id)) ||
      date.requiredCompletedCityIds?.some((id) => !cities.some((item) => item.id === id))
    ) {
      throw new Error(`Unknown chapter reference: ${date.id}`);
    }
    if (!presentation.backgrounds[date.backgroundAssetId])
      throw new Error(`Unknown background: ${date.backgroundAssetId}`);
    if (date.apCost > balance.apCap)
      throw new Error(`Date cost exceeds AP cap: ${date.id}`);
    unique(date.requiredPlayedDateIds, "required date ID");
    unique(date.requiredCompletedCityIds ?? [], "required city ID");
    unique(date.requiredCompletedEpisodeIds ?? [], "required episode ID");
    unique(date.forbiddenCompletedEpisodeIds ?? [], "forbidden episode ID");
    if ((date.forbiddenCompletedEpisodeIds ?? []).some((id) => date.requiredCompletedEpisodeIds?.includes(id)))
      throw new Error(`Episode cannot be both required and forbidden: ${date.id}`);
    for (const episodeId of [...(date.requiredCompletedEpisodeIds ?? []), ...(date.forbiddenCompletedEpisodeIds ?? [])]) {
      const episode = journey.episodes.find((item) => item.id === episodeId);
      if (!episode || episode.cityId !== date.chapterId)
        throw new Error(`Unknown date prerequisite episode: ${date.id}/${episodeId}`);
    }
    if (
      date.allowAfterEnding && date.kind !== "normal"
    )
      throw new Error(`After-ending date must be normal: ${date.id}`);
    if (
      date.requiredPlayedDateIds.some(
        (id) => !dates.some((other) => other.id === id),
      )
    )
      throw new Error(`Unknown prerequisite date: ${date.id}`);
    if (date.kind === "normal" && date.requiredPlayedDateIds.length)
      throw new Error(`Normal dates cannot require other dates: ${date.id}`);
    if (date.kind !== "normal" && date.apCost !== 0)
      throw new Error(`Special events must be free: ${date.id}`);
    if (date.recovery && (date.kind !== "special" || !date.repeatable || date.rewardOnlyOnce ||
      date.apCost !== 0 || date.choiceCount !== 1 || date.effectCount !== 1))
      throw new Error(`Recovery event must be a free, repeatable special with one choice and effect: ${date.id}`);
    if (
      (date.kind === "normal" || date.kind === "special" || date.kind === "reassurance") &&
      date.repeatable && !date.recovery
    )
      throw new Error(`One-time event is repeatable: ${date.id}`);
    if (date.kind === "normal" && date.choiceCount !== 2)
      throw new Error(`Normal date must have two choice moments: ${date.id}`);
    if (
      date.kind === "confession" &&
      (!date.validationContexts.some((c) => c.confessionReady) ||
        !date.validationContexts.some((c) => !c.confessionReady))
    )
      throw new Error("Confession validation needs both readiness states");
    if (date.kind === "confession" && ["accepted", "deferred", "rejected"].some((result) =>
      !date.validationContexts.some((context) => context.confessionResult === result)))
      throw new Error("Confession validation needs accepted, deferred and rejected contexts");
    // Traverse the complete Ink tree after inexpensive cross-content checks.
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
              validateStory(
                stories[storyId],
                context,
                date,
                {
                  player_address: `検証主人公${suffix}`,
                  romance_stage: seed.romanceStage,
                  memory_callback: memory,
                  confession_ready: seed.confessionReady,
                  confession_result: seed.confessionResult ?? (seed.confessionReady ? "accepted" : "deferred"),
                  ending_reached: seed.endingReached ?? false,
                },
                effects,
                observeForStory(storyId),
                { available: seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : []), known: Object.keys(presentation.memories) },
                randomReactions,
                (effectId) => {
                  const users = effectDates.get(effectId) ?? new Set<string>();
                  users.add(date.id);
                  effectDates.set(effectId, users);
                },
                randomReactions ? RELATIONSHIP_TONES[seedIndex % RELATIONSHIP_TONES.length] : undefined,
              ),
          );
          if (storyId === date.storyId && seedIndex < date.validationContexts.length) routes += checkedRoutes;
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
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitPrerequisites = (date: DateDefinition) => {
    if (visiting.has(date.id)) throw new Error("Cyclic date prerequisites");
    if (visited.has(date.id)) return;
    visiting.add(date.id);
    for (const id of date.requiredPlayedDateIds)
      visitPrerequisites(dates.find((other) => other.id === id)!);
    visiting.delete(date.id);
    visited.add(date.id);
  };
  dates.forEach(visitPrerequisites);
  // Samples remain validated but excluded from gameplay. Production quizzes are discovered by data alone.
  const quizzes: Record<string, QuizDefinition> = {};
  const productionQuestionIds: string[] = [];
  for (const { file, sample: isSample } of sources.quizFiles) {
    const quiz = isSample
      ? await parseFile(quizSampleSchema, file)
      : await parseFile(quizSchema, file);
    if (!isSample) {
      if (quizzes[quiz.id]) throw new Error(`Duplicate quizId: ${quiz.id}`);
      quizzes[quiz.id] = quiz as QuizDefinition;
      productionQuestionIds.push(
        ...quiz.questions.map((question) => question.id),
      );
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
    if (battle.scenes.afterRounds.length !== quiz.questions.length - 1)
      throw new Error(`Battle intermediate scene count mismatch: ${battle.id}`);
    if (!stories[battle.storyId])
      throw new Error(`Unknown battle storyId: ${battle.storyId}`);
    if (!presentation.backgrounds[battle.backgroundAssetId])
      throw new Error(`Unknown battle background: ${battle.backgroundAssetId}`);
    unique(
      [
        battle.scenes.intro,
        ...battle.scenes.afterRounds,
        battle.scenes.outro,
        ...reasoningScenes(battle),
      ],
      "battle scene",
    );
    battleScenarios += withContext(
      `${storyLabel(battle.storyId)} (battle ${battle.id})`,
      () => validateBattleStory(stories[battle.storyId], battle, context, observeForStory(battle.storyId)),
    );
  }
  // Dialogue leading into a proof is presentation-only: it is deliberately
  // kept outside the battle definition and its save-data fingerprint.
  const reasoningIntros = parseCatalog(reasoningIntroCatalogSchema, "presentation/reasoning-intros.json");
  for (const { battleId, storyId } of reasoningIntros.entries) {
    const battle = battles.find((item) => item.id === battleId);
    if (!battle?.reasoning) throw new Error(`Unknown special battle introduction: ${battleId}`);
    if (!stories[storyId]) throw new Error(`Unknown reasoning introduction story: ${battleId}/${storyId}`);
    withContext(`${storyLabel(storyId)} (reasoning introduction ${battleId})`, () => {
      validateReasoningIntroduction(stories[storyId], context, observeForStory(storyId));
    });
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
  if (!stories[learningDetails.storyId])
    throw new Error(`Unknown learning story: ${learningDetails.storyId}`);
  for (const detail of Object.values(learningDetails.questions))
    for (const topic of detail.topics) {
      validateLearningTopic(stories[learningDetails.storyId], context, topic.id);
    }
  let tourismGuides = 0;
  for (const current of cities) {
    const landmarks = tourism.landmarks.filter((landmark) => landmark.cityId === current.id);
    const ids = new Set(landmarks.map((landmark) => landmark.id));
    tourismGuides += await validateTourism(root, {
      ...tourism,
      landmarks,
      assets: tourism.assets,
      clues: tourism.clues.filter((clue) => ids.has(clue.landmarkId)),
    }, current.id, current.landmarkIdsPlanned, battles, quizzes, stories, context, observeForStory, storyLabel);
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
        cities.some((city) => city.arrivalStoryId === storyId) ||
        reasoningIntros.entries.some((entry) => entry.storyId === storyId) || storyId === learningDetails.storyId)
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
  for (const rule of encounterEntryRules.entries) {
    const encounter = encounterCatalog.encounters.find((item) => item.id === rule.encounterId)!;
    const prerequisiteCity = rule.completedEpisodeId
      ? journey.episodes.find((episode) => episode.id === rule.completedEpisodeId)?.cityId
      : rule.completedStoryBattleId ? battleCity(rule.completedStoryBattleId) : undefined;
    if (prerequisiteCity !== encounter.cityId)
      throw new Error(`Encounter entry city mismatch: ${encounter.id}`);
  }
  unique([...productionQuestionIds, ...encounterCatalog.encounters.flatMap((event) => event.quiz ? [event.quiz.question.id] : [])], "production quiz question ID");
  for (const { city: current, travel, settings } of travels) {
    const episodes = journey.episodes.filter((episode) => episode.cityId === current.id);
    const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === current.id));
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
      cityId: current.id, currencyCode: journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === current.id))!.currency.code,
      landmarks: cityLandmarks, journey: cityJourney, stories, quizzes,
      responseProfileIds: responseProfiles.map((profile) => profile.id), memoryIds: Object.keys(presentation.memories), context,
      validateQuiz: validateQuizEntries,
    });
    if (episodes.length) validateJourney(cityJourney, current, balance.apCap, cityLandmarks, battles, quizzes);
    else if (cityJourney.storyBattles.length) throw new Error(`Prototype battle has no city episodes: ${current.id}`);
    validateTravelContent(travel, settings, current.id, cityJourney, cityDates, battles,
      cityLandmarks.map((landmark) => landmark.id), cityDestinations.map((destination) => destination.id), presentation.backgrounds,
      { allowPendingContent: isUnpublished, plannedLandmarkIds: current.landmarkIdsPlanned });
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
    const compiled = stories[storyId];
    if (!compiled) throw new Error(`Unknown arrival story: ${storyId}`);
    validateNoInkRandom(compiled);
    const backgrounds = travels.find(({ city }) => city.id === current.id)!.travel.places.map((place) => place.backgroundAssetId);
    epilogueScenarios += withContext(storyLabel(storyId), () =>
      validateEpilogue(compiled, { ...context, backgroundIds: backgrounds }, (text, speaker, explicitEmotion) => {
        if (!["heroine", "narrator"].includes(speaker)) throw new Error("City arrival cannot speak for the player");
        observeForStory(storyId)(text, speaker, explicitEmotion);
      }));
  }
  for (const episode of journey.episodes) {
    if (!episode.epilogueStoryId) continue;
    const compiled = stories[episode.epilogueStoryId];
    if (!compiled)
      throw new Error(`Unknown epilogue story: ${episode.epilogueStoryId}`);
    epilogueScenarios += withContext(
      storyLabel(episode.epilogueStoryId),
      () => validateEpilogue(compiled, context, observeForStory(episode.epilogueStoryId!)),
    );
  }
  for (const storyId of Object.keys(stories)) {
    if (
      storyId !== learningDetails.storyId &&
      !dates.some((date) => date.storyId === storyId) &&
      !battles.some((battle) => battle.storyId === storyId) &&
      !encounterStoryIds.includes(storyId) &&
      !reasoningIntros.entries.some((entry) => entry.storyId === storyId) &&
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
  if (writeOutput) {
    const directory = path.join(root, "src/content/generated");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "quizzes.json"),
      `${JSON.stringify(quizzes, null, 2)}\n`,
    );
    await writeFile(
      path.join(directory, "stories.json"),
      `${JSON.stringify(stories, null, 2)}\n`,
    );
    // The game imports the validated, merged catalogs only from this mirror.
    writeContentMirror(sources, mirrorDirectory(root));
  }
  return {
    stories,
    routes,
    dates,
    destinations,
    effects,
    battles,
    quizzes,
    battleScenarios,
    reasoningBattles: battles.filter((battle) => battle.reasoning).length,
    tourism,
    tourismGuides,
    epilogueScenarios,
    journey,
  };
}
