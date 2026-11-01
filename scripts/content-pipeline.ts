import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { characterCatalogSchema } from "../src/content/character-assets";
import { validateCharacterImage } from "./character-image-validation";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { bindMemoryReader, validateMemoryReferences } from "../src/story/memory";
import { createDialogueExpressionValidator, type DialogueObserver } from "./dialogue-expression-validation";
import {
  Compiler,
  CompilerOptions,
  JsonFileHandler,
} from "inkjs/compiler/Compiler";
import { Story } from "inkjs";
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
  trialProgressionSchema,
  type DateDefinition,
  type EffectDefinition,
} from "../src/content/schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import {
  reasoningScenes,
  validateBattleEvidence,
  validateBattleStory,
} from "./battle-validation";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { validateTourism } from "./tourism-validation";
import { journeySchema } from "../src/content/journey-schemas";
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

function withContext<T>(label: string, action: () => T): T {
  try {
    return action();
  } catch (error) {
    throw new Error(
      `${label}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function unique(values: string[], kind: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${kind}`);
}

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const location = path.join(directory, entry.name);
        return entry.isDirectory() ? filesIn(location) : [location];
      }),
    )
  )
    .flat()
    .sort();
}

export function compileInk(source: string, filename = "story.ink"): string {
  const compiler = new Compiler(
    source,
    new CompilerOptions(
      filename,
      [],
      false,
      null,
      new JsonFileHandler({ [filename]: source }),
    ),
  );
  try {
    const compiled = compiler.Compile();
    if (compiler.errors.length) throw new Error(compiler.errors.join("\n"));
    const output = compiled.ToJson();
    if (typeof output !== "string")
      throw new Error("Ink compiler returned no JSON");
    return output;
  } catch (error) {
    throw new Error(
      `Ink compilation failed: ${filename}\n${compiler.errors.join("\n")}`,
      { cause: error },
    );
  }
}

/** Reject Ink's own randomness; player-visible reaction rolls belong to the saved game.
 * Inspect compiled instructions, not raw text: Ink removes comments and encodes
 * dialogue/string literals separately, so mentioning RANDOM in prose is safe. */
export function validateNoInkRandom(compiled: string): void {
  const forbidden = new Map([["rnd", "RANDOM"], ["srnd", "SEED_RANDOM"], ["lrnd", "LIST_RANDOM"]]);
  const inspect = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const command = typeof item === "string" ? forbidden.get(item) : undefined;
        if (command)
          throw new Error(`Ink randomness is forbidden in romance reactions: ${command}`);
        inspect(item);
      }
    } else if (value !== null && typeof value === "object") {
      for (const child of Object.values(value)) inspect(child);
    }
  };
  inspect(JSON.parse(compiled));
}

/** Traverse every branch for each declared input context with the official runtime. */
export function validateStory(
  compiled: string,
  context: TagContext,
  contract: Pick<DateDefinition, "choiceCount" | "effectCount" | "kind"> = {
    choiceCount: 2,
    effectCount: 2,
    kind: "normal",
  },
  variables: Record<string, string | number | boolean> = {},
  effects: EffectDefinition[] = [],
  observe?: DialogueObserver,
  memories: { available: readonly string[]; known: readonly string[] } = { available: [], known: [] },
  randomReactions = false,
  onEffect?: (effectId: string) => void,
): number {
  const initial = new Story(compiled);
  bindMemoryReader(initial, memories.available, memories.known);
  initial.onError = (message) => {
    throw new Error(message);
  };
  for (const required of ["player_name", "heroine_name"]) {
    if (!initial.variablesState.GlobalVariableExistsWithName(required))
      throw new Error(`Missing required Ink variable: ${required}`);
  }
  if (randomReactions) for (const required of ["romance_result", "affection_delta", "trust_delta", "spark_delta"]) {
    if (!initial.variablesState.GlobalVariableExistsWithName(required))
      throw new Error(`Missing required random reaction Ink variable: ${required}`);
  }
  const input = {
    player_name: "検証主人公",
    heroine_name: "検証ヒロイン",
    ...variables,
  };
  for (const [key, value] of Object.entries(input)) {
    if (initial.variablesState.GlobalVariableExistsWithName(key))
      initial.variablesState.$(key, value);
  }
  let routes = 0;
  const appendEffects = (previous: string[], added: string[]) => {
    const result = [...previous];
    for (const effect of added) {
      if (result.includes(effect))
        throw new Error(`Repeated effect in one route: ${effect}`);
      onEffect?.(effect);
      result.push(effect);
    }
    return result;
  };
  const visit = (
    saved: string,
    choiceCount: number,
    previousEffects: string[],
    previousSpeaker: string,
    choiceTags: readonly string[] = [],
  ) => {
    const story = new Story(compiled);
    bindMemoryReader(story, memories.available, memories.known);
    story.onError = (message) => {
      throw new Error(message);
    };
    story.state.LoadJson(saved);
    let seenEffects = [...previousEffects];
    const choiceMetadata = parseStoryTags(choiceTags, context);
    let speaker = choiceMetadata.speaker ?? previousSpeaker;
    let explicitEmotion = choiceMetadata.emotion !== undefined;
    let lineCount = 0;
    while (story.canContinue) {
      if (++lineCount > 200)
        throw new Error("Story contains a loop or too many lines");
      const text = story.Continue()?.trim() ?? "";
      const tags = parseStoryTags(story.currentTags ?? [], context);
      seenEffects = appendEffects(seenEffects, tags.effects);
      if (tags.speaker) speaker = tags.speaker;
      if (tags.emotion !== undefined) explicitEmotion = true;
      if (text) {
        observe?.(text, speaker, explicitEmotion);
        explicitEmotion = false;
      }
    }
    const choices = story.currentChoices;
    if (choices.length === 0) {
      if (choiceCount !== contract.choiceCount)
        throw new Error(
          `Expected ${contract.choiceCount} choice moments; found ${choiceCount}`,
        );
      if (seenEffects.length !== contract.effectCount)
        throw new Error(
          `Expected ${contract.effectCount} choice effects; found ${seenEffects.length}`,
        );
      const outcomes = seenEffects
        .map((id) => effects.find((effect) => effect.id === id)?.outcome)
        .filter(Boolean);
      if (contract.kind === "confession") {
        if (outcomes.length !== 1)
          throw new Error("Confession must resolve exactly one outcome");
        if (!variables.confession_ready && outcomes.includes("accepted"))
          throw new Error("Confession accepts before readiness");
      } else if (outcomes.length)
        throw new Error("Only confession can apply a confession outcome");
      routes += 1;
      return;
    }
    if (choices.length !== 3)
      throw new Error(`Expected three choices; found ${choices.length}`);
    if (choiceCount >= contract.choiceCount)
      throw new Error("Too many choice moments");
    unique(
      choices.map((choice) => choice.text),
      "choice text",
    );
    const checkpoint = story.state.ToJson();
    for (const choice of choices) {
      if (!choice.text.trim()) throw new Error("Empty choice text");
      const tags = parseStoryTags(choice.tags ?? [], context);
      let choiceEffect: string | undefined;
      let firstReaction: string | undefined;
      for (const result of randomReactions ? ["positive", "negative"] : [undefined]) {
        const branch = new Story(compiled);
        bindMemoryReader(branch, memories.available, memories.known);
        branch.onError = (message) => { throw new Error(message); };
        branch.state.LoadJson(checkpoint);
        if (result) branch.variablesState.$("romance_result", result);
        branch.ChooseChoiceIndex(choice.index);
        if (randomReactions) {
          // The game must identify exactly one effect before exposing its
          // first response, without relying on which result was rolled.
          const probe = new Story(compiled);
          bindMemoryReader(probe, memories.available, memories.known);
          probe.onError = (message) => { throw new Error(message); };
          probe.state.LoadJson(branch.state.ToJson());
          let immediate = [...tags.effects];
          let guard = 0;
          let response = "";
          while (probe.canContinue) {
            if (++guard > 200) throw new Error("Story contains a loop or too many lines");
            const line = probe.Continue()?.trim() ?? "";
            immediate = appendEffects(immediate, parseStoryTags(probe.currentTags ?? [], context).effects);
            if (line) { response = line; break; }
          }
          if (immediate.length !== 1)
            throw new Error("Random choice must expose exactly one effect before its first response");
          const effect = effects.find((item) => item.id === immediate[0]);
          if (!effect?.responseProfileId || effect.outcome)
            throw new Error(`Random choice effect needs a response profile: ${immediate[0]}`);
          if (choiceEffect && choiceEffect !== immediate[0])
            throw new Error("Random choice effect must not depend on its reaction result");
          if (!response || (firstReaction !== undefined && firstReaction === response))
            throw new Error("Random choice must produce different positive and negative reactions");
          firstReaction = response;
          choiceEffect = immediate[0];
        }
        visit(
          branch.state.ToJson(),
          choiceCount + 1,
          appendEffects(seenEffects, tags.effects),
          speaker,
          choice.tags ?? [],
        );
      }
    }
  };
  visit(initial.state.ToJson(), 0, [], "narrator");
  const expectedRoutes = (randomReactions ? 6 : 3) ** contract.choiceCount;
  if (routes !== expectedRoutes)
    throw new Error(`Expected ${expectedRoutes} routes; found ${routes}`);
  return routes;
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

export async function buildContent(root: string, writeOutput = true) {
  const content = path.join(root, "content");
  const journey = await parseFile(
    journeySchema,
    path.join(content, "progression/journey.json"),
  );
  const tourism = await parseFile(
    tourismCatalogSchema,
    path.join(content, "tourism/catalog.json"),
  );
  const battles = (
    await parseFile(
      battleCatalogSchema,
      path.join(content, "battles/catalog.json"),
    )
  ).battles;
  unique(
    battles.map((battle) => battle.id),
    "battleId",
  );
  const dates = (
    await parseFile(
      dateCatalogSchema,
      path.join(content, "romance/date_catalog.json"),
    )
  ).dates;
  const destinations = (
    await parseFile(
      dateDestinationsSchema,
      path.join(content, "romance/date_destinations.json"),
    )
  ).destinations;
  const effects = (
    await parseFile(
      effectCatalogSchema,
      path.join(content, "romance/effect_catalog.json"),
    )
  ).effects;
  const responseProfiles = (
    await parseFile(
      responseProfileCatalogSchema,
      path.join(content, "romance/response_profiles.json"),
    )
  ).profiles;
  unique(responseProfiles.map((profile) => profile.id), "response profile ID");
  const city = await parseFile(
    citySchema,
    path.join(content, "cities/milano.json"),
  );
  const balance = await parseFile(
    balanceSchema,
    path.join(content, "romance/balance.json"),
  );
  const presentation = await parseFile(
    presentationSchema,
    path.join(content, "romance/presentation.json"),
  );
  unique(destinations.map((destination) => destination.id), "date destination ID");
  for (const destination of destinations) {
    if (destination.cityId !== city.id)
      throw new Error(`Unknown date destination city: ${destination.id}/${destination.cityId}`);
    if (!presentation.backgrounds[destination.backgroundAssetId])
      throw new Error(`Unknown date destination background: ${destination.id}/${destination.backgroundAssetId}`);
  }
  const characters = await parseFile(
    characterCatalogSchema,
    path.join(content, "presentation/characters.json"),
  );
  for (const [backgroundId, background] of Object.entries(presentation.backgrounds)) {
    if (background.imagePath) {
      try { await access(path.join(root, "public", background.imagePath)); }
      catch { throw new Error(`Missing background image: ${backgroundId}/${background.imagePath}`); }
    }
    if (background.imageAssetId && !tourism.assets.some((asset) => asset.id === background.imageAssetId))
      throw new Error(`Unknown background image asset: ${backgroundId}/${background.imageAssetId}`);
    if (background.imagePath && background.imageAssetId)
      throw new Error(`Background cannot specify both imagePath and imageAssetId: ${backgroundId}`);
  }
  for (const battleId of Object.keys(characters.battleCharacters ?? {})) {
    if (!battles.some((battle) => battle.id === battleId))
      throw new Error(`Unknown battle ID in character assignment: ${battleId}`);
  }
  for (const required of ["heroine", "enemy"]) {
    if (!characters.characters.some((character) => character.id === required))
      throw new Error(`Unknown required character ID: ${required}`);
  }
  for (const [cityId, mapping] of Object.entries(characters.wardrobe?.cities ?? {})) {
    if (cityId !== city.id)
      throw new Error(`Unknown city in character wardrobe: ${cityId}`);
    if (mapping.country !== city.countryCode)
      throw new Error(`Character wardrobe country mismatch: ${cityId}/${mapping.country} (expected ${city.countryCode})`);
  }
  const wardrobeSceneIds = new Set([
    ...dates.map((date) => date.id),
    ...battles.map((battle) => battle.id),
    ...tourism.landmarks.map((landmark) => landmark.id),
    ...journey.episodes.filter((episode) => episode.epilogueStoryId).map((episode) => episode.id),
  ]);
  for (const sceneId of Object.keys(characters.wardrobe?.scenes ?? {})) {
    if (!wardrobeSceneIds.has(sceneId))
      throw new Error(`Unknown scene in character wardrobe: ${sceneId}`);
  }
  for (const character of characters.characters) {
    for (const variant of character.variants) {
      if (variant.emotion && !presentation.emotions[variant.emotion])
        throw new Error(`Unknown character emotion: ${character.id}/${variant.emotion}`);
    }
    for (const image of [character.imagePath, ...character.variants.map((variant) => variant.imagePath)]) {
      if (image) {
        try { await access(path.join(root, "public", image)); }
        catch { throw new Error(`Missing character image: ${character.id}/${image}`); }
      }
    }
    for (const costume of character.costumes ?? []) {
      for (const pose of costume.poses) {
        for (const [expression, image] of Object.entries(pose.expressions)) {
          await validateCharacterImage(root, image, pose.canvas, `${character.id}/${costume.id}/${pose.id}/${expression}`);
        }
      }
    }
  }
  const progression = await parseFile(
    progressionSchema,
    path.join(content, "romance/progression.json"),
  );
  const milestones = (
    await parseFile(
      trialProgressionSchema,
      path.join(content, "romance/trial_progression.json"),
    )
  ).milestones;
  unique(
    dates.map((date) => date.id),
    "dateId",
  );
  unique(
    effects.map((effect) => effect.id),
    "effectId",
  );
  unique(city.landmarkIdsPlanned, "landmarkId");
  if (
    balance.defaultPlayerName.length > balance.maxNameLength ||
    balance.defaultHeroineName.length > balance.maxNameLength
  ) {
    throw new Error("Default name exceeds maxNameLength");
  }
  if (city.firstClearReward.ap > balance.apCap)
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
    if (effect.outcome && (effect.affectionDelta !== 0 || (effect.trustDelta ?? 0) !== 0 || (effect.sparkDelta ?? 0) !== 0 || effect.stageDeltas))
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
  const storyDirectory = path.join(content, "stories");
  for (const file of await filesIn(storyDirectory)) {
    if (!file.endsWith(".ink")) continue;
    const id = path
      .relative(storyDirectory, file)
      .replaceAll(path.sep, "/")
      .slice(0, -4);
    const source = await readFile(file, "utf8");
    storyMemoryReferences[id] = withContext(file, () => validateMemoryReferences(source, Object.keys(presentation.memories)));
    const compiled = compileInk(source, file);
    stories[id] = compiled;
    storySources[id] = source;
  }
  const expressionCatalog = await parseFile(dialogueExpressionCatalogSchema, path.join(content, "presentation/dialogue-expressions.json"));
  const expressionValidator = createDialogueExpressionValidator(
    expressionCatalog,
    storySources,
    Object.keys(stories),
    context.emotionIds.filter((id) => characters.expressionIds?.includes(id) ?? true),
  );
  const observeForStory = (storyId: string): DialogueObserver =>
    (text, speaker, explicitEmotion) => expressionValidator.observe(storyId, text, speaker, explicitEmotion);
  const effectDates = new Map<string, Set<string>>();
  const deferredDateValidation: Array<() => void> = [];
  for (const date of dates) {
    if (!Object.hasOwn(stories, date.storyId))
      throw new Error(`Unknown storyId: ${date.storyId}`);
    if (date.kind !== "confession" && date.choiceCount > 0)
      withContext(`content/stories/${date.storyId}.ink (date ${date.id})`, () =>
        validateNoInkRandom(stories[date.storyId]));
    unique([date.storyId, ...(date.legacyStoryIds ?? [])], "date story ID");
    for (const storyId of date.legacyStoryIds ?? [])
      if (!Object.hasOwn(stories, storyId))
        throw new Error(`Unknown legacy storyId: ${date.id}/${storyId}`);
    if (date.destinationId) {
      const destination = destinations.find((item) => item.id === date.destinationId);
      if (!destination)
        throw new Error(`Unknown date destination: ${date.id}/${date.destinationId}`);
      if (destination.cityId !== date.chapterId)
        throw new Error(`Date destination city mismatch: ${date.id}/${date.destinationId}`);
      if (destination.backgroundAssetId !== date.backgroundAssetId)
        throw new Error(`Date destination background mismatch: ${date.id}/${date.destinationId}`);
    }
    if (date.legacyDestinationId) {
      if (!date.legacyStoryIds?.length)
        throw new Error(`Legacy date destination needs an earlier story: ${date.id}`);
      const destination = destinations.find((item) => item.id === date.legacyDestinationId);
      if (!destination)
        throw new Error(`Unknown legacy date destination: ${date.id}/${date.legacyDestinationId}`);
      if (destination.cityId !== date.chapterId)
        throw new Error(`Legacy date destination city mismatch: ${date.id}/${date.legacyDestinationId}`);
    }
    for (const [storyId, destinationId] of Object.entries(date.legacyStoryDestinationIds ?? {})) {
      if (!date.legacyStoryIds?.includes(storyId))
        throw new Error(`Legacy destination must reference a legacy story: ${date.id}/${storyId}`);
      const destination = destinations.find((item) => item.id === destinationId);
      if (!destination || destination.cityId !== date.chapterId)
        throw new Error(`Unknown or mismatched legacy story destination: ${date.id}/${storyId}/${destinationId}`);
    }
    if (
      date.chapterId !== city.id ||
      date.requiredCompletedChapters.some((id) => id !== city.id) ||
      date.requiredCompletedCityIds?.some((id) => id !== city.id)
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
      for (const storyId of [date.storyId, ...(date.legacyStoryIds ?? [])]) {
        for (const reference of storyMemoryReferences[storyId]) {
          const hasReference = (seed: (typeof date.validationContexts)[number]) =>
            (seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : [])).includes(reference);
          if (!date.validationContexts.some(hasReference) || !date.validationContexts.some((seed) => !hasReference(seed)))
            throw new Error(`Memory reference needs present and absent validation contexts: ${storyId}/${reference}`);
        }
        for (const seed of date.validationContexts) {
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
            `content/stories/${storyId}.ink (date ${date.id})`,
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
                  has_cafe_memory: seed.hasCafeMemory ?? false,
                },
                effects,
                observeForStory(storyId),
                { available: seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : []), known: Object.keys(presentation.memories) },
                storyId === date.storyId && date.kind !== "confession" && date.choiceCount > 0,
                (effectId) => {
                  const users = effectDates.get(effectId) ?? new Set<string>();
                  users.add(date.id);
                  effectDates.set(effectId, users);
                },
              ),
          );
          if (storyId === date.storyId) routes += checkedRoutes;
        }
      }
    });
  }

  const verifyDateReferences = (ids: string[], label: string) => {
    unique(ids, label);
    if (ids.some((id) => !dates.some((date) => date.id === id)))
      throw new Error(`Unknown ${label}`);
  };
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
  unique(
    milestones.map((item) => item.id),
    "trial milestone",
  );
  unique(
    [
      city.firstClearReward.rewardSourceId,
      ...milestones.map((item) => item.rewardSourceId),
    ],
    "reward source",
  );
  for (const milestone of milestones) {
    verifyDateReferences(milestone.requiredPlayedDateIds, "trial prerequisite");
    if (milestone.ap > balance.apCap)
      throw new Error("Trial reward exceeds AP cap");
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
  for (const file of await filesIn(path.join(content, "quizzes"))) {
    if (!file.endsWith(".json")) continue;
    const isSample = file.endsWith(".sample.json");
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
      if (quiz.cityId !== city.id)
        throw new Error(`Unknown quiz city: ${quiz.id}`);
    } else if (
      quiz.landmarkId === null ||
      !city.landmarkIdsPlanned.includes(quiz.landmarkId)
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
        battle.cityId !== city.id ||
        quiz.scope !== "city_finale" ||
        quiz.cityId !== battle.cityId
      )
        throw new Error(`City finale quiz mismatch: ${battle.id}`);
    } else if (
      battle.landmarkId === null ||
      !city.landmarkIdsPlanned.includes(battle.landmarkId) ||
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
      `content/stories/${battle.storyId}.ink (battle ${battle.id})`,
      () => validateBattleStory(stories[battle.storyId], battle, context, observeForStory(battle.storyId)),
    );
  }
  const learning = await parseFile(
    learningCatalogSchema,
    path.join(content, "learning/translations.json"),
  );
  validateLearning(learning, quizzes, [
    ...new Set(battles.map((battle) => battle.quizId)),
  ]);
  const wordMeanings = await parseFile(
    wordMeaningsSchema,
    path.join(content, "learning/word-meanings.json"),
  );
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
  const learningDetails = await parseFile(
    learningDetailsSchema,
    path.join(content, "learning/details.json"),
  );
  validateLearningDetails(learningDetails, quizzes);
  if (!stories[learningDetails.storyId])
    throw new Error(`Unknown learning story: ${learningDetails.storyId}`);
  for (const detail of Object.values(learningDetails.questions))
    for (const topic of detail.topics) {
      const story = new Story(stories[learningDetails.storyId]);
      story.variablesState.$("topic", topic.id);
      let lines = 0;
      while (story.canContinue) {
        const line = story.Continue()?.trim() ?? "";
        const tags = parseStoryTags(story.currentTags ?? [], context);
        if (tags.effects.length || (tags.speaker && tags.speaker !== "heroine"))
          throw new Error(`Invalid learning story tags: ${topic.id}`);
        if (line) lines++;
        if (lines > 4) throw new Error(`Learning story too long: ${topic.id}`);
      }
      if (lines < 2 || story.currentChoices.length)
        throw new Error(`Invalid learning story: ${topic.id}`);
    }
  const tourismGuides = await validateTourism(
    root,
    tourism,
    city.id,
    city.landmarkIdsPlanned,
    battles,
    quizzes,
    stories,
    context,
    observeForStory,
  );
  for (const validateDate of deferredDateValidation) validateDate();
  for (const effect of effects) {
    if (effect.memoryId || effect.outcome) continue;
    const users = effectDates.get(effect.id);
    if (!users?.size || [...users].some((dateId) => !dates.find((date) => date.id === dateId)?.recovery))
      throw new Error(`Effect has neither memory nor outcome outside recovery: ${effect.id}`);
  }
  for (const battle of battles) validateBattleEvidence(battle, tourism.clues);
  validateJourney(
    journey,
    city,
    balance.apCap,
    tourism.landmarks,
    battles,
    quizzes,
    milestones,
  );
  let epilogueScenarios = 0;
  for (const episode of journey.episodes) {
    if (!episode.epilogueStoryId) continue;
    const compiled = stories[episode.epilogueStoryId];
    if (!compiled)
      throw new Error(`Unknown epilogue story: ${episode.epilogueStoryId}`);
    epilogueScenarios += withContext(
      `content/stories/${episode.epilogueStoryId}.ink`,
      () => validateEpilogue(compiled, context, observeForStory(episode.epilogueStoryId!)),
    );
  }
  for (const storyId of Object.keys(stories)) {
    if (
      storyId !== learningDetails.storyId &&
      !dates.some((date) => date.storyId === storyId || date.legacyStoryIds?.includes(storyId)) &&
      !battles.some((battle) => battle.storyId === storyId) &&
      !journey.episodes.some(
        (episode) => episode.epilogueStoryId === storyId,
      ) &&
      !tourism.landmarks.some((landmark) => landmark.guideStoryId === storyId)
    )
      throw new Error(`Story lacks validation contract: ${storyId}`);
  }
  expressionValidator.finish();
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
