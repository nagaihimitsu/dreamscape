import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { characterCatalogSchema } from "../src/content/character-assets";
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
): number {
  const initial = new Story(compiled);
  initial.onError = (message) => {
    throw new Error(message);
  };
  for (const required of ["player_name", "heroine_name"]) {
    if (!initial.variablesState.GlobalVariableExistsWithName(required))
      throw new Error(`Missing required Ink variable: ${required}`);
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
      result.push(effect);
    }
    return result;
  };
  const visit = (
    saved: string,
    choiceCount: number,
    previousEffects: string[],
  ) => {
    const story = new Story(compiled);
    story.onError = (message) => {
      throw new Error(message);
    };
    story.state.LoadJson(saved);
    let seenEffects = [...previousEffects];
    let lineCount = 0;
    while (story.canContinue) {
      if (++lineCount > 200)
        throw new Error("Story contains a loop or too many lines");
      story.Continue();
      const tags = parseStoryTags(story.currentTags ?? [], context);
      seenEffects = appendEffects(seenEffects, tags.effects);
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
      const branch = new Story(compiled);
      branch.state.LoadJson(checkpoint);
      branch.ChooseChoiceIndex(choice.index);
      visit(
        branch.state.ToJson(),
        choiceCount + 1,
        appendEffects(seenEffects, tags.effects),
      );
    }
  };
  visit(initial.state.ToJson(), 0, []);
  const expectedRoutes = 3 ** contract.choiceCount;
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
  const effects = (
    await parseFile(
      effectCatalogSchema,
      path.join(content, "romance/effect_catalog.json"),
    )
  ).effects;
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
  const characters = await parseFile(
    characterCatalogSchema,
    path.join(content, "presentation/characters.json"),
  );
  for (const battleId of Object.keys(characters.battleCharacters ?? {})) {
    if (!battles.some((battle) => battle.id === battleId))
      throw new Error(`Unknown battle ID in character assignment: ${battleId}`);
  }
  for (const required of ["heroine", "enemy"]) {
    if (!characters.characters.some((character) => character.id === required))
      throw new Error(`Unknown required character ID: ${required}`);
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
    if (effect.outcome && effect.affectionDelta !== 0)
      throw new Error("Confession outcome cannot award affection");
    if (!effect.memoryId && !effect.outcome)
      throw new Error(`Effect has neither memory nor outcome: ${effect.id}`);
    if (effect.memoryId && !presentation.memories[effect.memoryId])
      throw new Error(`Unknown memory: ${effect.memoryId}`);
  }
  const stories: Record<string, string> = {};
  let routes = 0;
  const storyDirectory = path.join(content, "stories");
  for (const file of await filesIn(storyDirectory)) {
    if (!file.endsWith(".ink")) continue;
    const id = path
      .relative(storyDirectory, file)
      .replaceAll(path.sep, "/")
      .slice(0, -4);
    const compiled = compileInk(await readFile(file, "utf8"), file);
    stories[id] = compiled;
  }
  for (const date of dates) {
    if (!Object.hasOwn(stories, date.storyId))
      throw new Error(`Unknown storyId: ${date.storyId}`);
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
    if (
      date.allowAfterEnding &&
      (date.kind !== "normal" || !date.requiredCompletedCityIds?.length)
    )
      throw new Error(`After-ending date needs a completed city: ${date.id}`);
    if (
      date.requiredPlayedDateIds.some(
        (id) => !dates.some((other) => other.id === id),
      )
    )
      throw new Error(`Unknown prerequisite date: ${date.id}`);
    if (date.kind !== "normal" && date.apCost !== 0)
      throw new Error(`Special events must be free: ${date.id}`);
    if (
      (date.kind === "special" || date.kind === "reassurance") &&
      date.repeatable
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
    for (const seed of date.validationContexts) {
      if (seed.memoryId && !presentation.memories[seed.memoryId])
        throw new Error(`Unknown validation memory: ${seed.memoryId}`);
      const suffix = progression.stages.find(
        (stage) => stage.stage === seed.romanceStage,
      )!.playerSuffix;
      const memory =
        progression.memoryCallbacks.find(
          (callback) => callback.memoryId === seed.memoryId,
        )?.textJa ?? progression.fallbackMemoryCallbackJa;
      routes += withContext(
        `content/stories/${date.storyId}.ink (date ${date.id})`,
        () =>
          validateStory(
            stories[date.storyId],
            context,
            date,
            {
              player_address: `検証主人公${suffix}`,
              romance_stage: seed.romanceStage,
              memory_callback: memory,
              confession_ready: seed.confessionReady,
              ending_reached: seed.endingReached ?? false,
              has_cafe_memory: seed.hasCafeMemory ?? false,
            },
            effects,
          ),
      );
    }
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
        stage.minAffection < progression.stages[index - 1].minAffection)
    )
      throw new Error("Stages must be ordered with nondecreasing thresholds");
    verifyDateReferences(stage.requiredPlayedDateIds, "stage prerequisite");
  });
  verifyDateReferences(
    progression.confession.requiredPlayedDateIds,
    "confession prerequisite",
  );
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
      () => validateBattleStory(stories[battle.storyId], battle, context),
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
  );
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
      () => validateEpilogue(compiled, context),
    );
  }
  for (const storyId of Object.keys(stories)) {
    if (
      storyId !== learningDetails.storyId &&
      !dates.some((date) => date.storyId === storyId) &&
      !battles.some((battle) => battle.storyId === storyId) &&
      !journey.episodes.some(
        (episode) => episode.epilogueStoryId === storyId,
      ) &&
      !tourism.landmarks.some((landmark) => landmark.guideStoryId === storyId)
    )
      throw new Error(`Story lacks validation contract: ${storyId}`);
  }
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
