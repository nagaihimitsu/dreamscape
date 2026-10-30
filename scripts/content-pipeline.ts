import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Compiler,
  CompilerOptions,
  JsonFileHandler,
} from "inkjs/compiler/Compiler";
import { Story } from "inkjs";
import {
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

async function json(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${file}`, { cause: error });
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

export async function buildContent(root: string, writeOutput = true) {
  const content = path.join(root, "content");
  const dates = dateCatalogSchema.parse(
    await json(path.join(content, "romance/date_catalog.json")),
  ).dates;
  const effects = effectCatalogSchema.parse(
    await json(path.join(content, "romance/effect_catalog.json")),
  ).effects;
  const city = citySchema.parse(
    await json(path.join(content, "cities/milano.json")),
  );
  const balance = balanceSchema.parse(
    await json(path.join(content, "romance/balance.json")),
  );
  const presentation = presentationSchema.parse(
    await json(path.join(content, "romance/presentation.json")),
  );
  const progression = progressionSchema.parse(
    await json(path.join(content, "romance/progression.json")),
  );
  const milestones = trialProgressionSchema.parse(
    await json(path.join(content, "romance/trial_progression.json")),
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
      date.requiredCompletedChapters.some((id) => id !== city.id)
    ) {
      throw new Error(`Unknown chapter reference: ${date.id}`);
    }
    if (!presentation.backgrounds[date.backgroundAssetId])
      throw new Error(`Unknown background: ${date.backgroundAssetId}`);
    if (date.apCost > balance.apCap)
      throw new Error(`Date cost exceeds AP cap: ${date.id}`);
    unique(date.requiredPlayedDateIds, "required date ID");
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
      routes += validateStory(
        stories[date.storyId],
        context,
        date,
        {
          player_address: `検証主人公${suffix}`,
          romance_stage: seed.romanceStage,
          memory_callback: memory,
          confession_ready: seed.confessionReady,
        },
        effects,
      );
    }
  }
  for (const storyId of Object.keys(stories)) {
    if (!dates.some((date) => date.storyId === storyId))
      throw new Error(`Story lacks validation contract: ${storyId}`);
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
  // Existing future content stays out of the runtime bundle, but malformed JSON cannot pass the build.
  for (const file of await filesIn(path.join(content, "quizzes"))) {
    if (!file.endsWith(".json")) continue;
    const quiz = quizSampleSchema.parse(await json(file));
    if (!city.landmarkIdsPlanned.includes(quiz.landmarkId))
      throw new Error(`Unknown landmark: ${quiz.landmarkId}`);
    unique(
      quiz.questions.map((question) => question.id),
      "quiz question ID",
    );
    for (const question of quiz.questions) {
      unique(
        question.options.map((option) => option.id),
        "quiz option ID",
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
  if (writeOutput) {
    const directory = path.join(root, "src/content/generated");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "stories.json"),
      `${JSON.stringify(stories, null, 2)}\n`,
    );
  }
  return { stories, routes, dates, effects };
}
