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

/** Explore every reachable branch with the official runtime. A bounded traversal also catches loops. */
export function validateStory(compiled: string, context: TagContext): number {
  const initial = new Story(compiled);
  initial.variablesState.$("player_name", "検証主人公");
  initial.variablesState.$("heroine_name", "検証ヒロイン");
  let routes = 0;
  const visit = (
    saved: string,
    choiceCount: number,
    previousEffects: string[],
  ) => {
    const story = new Story(compiled);
    story.state.LoadJson(saved);
    const seenEffects = [...previousEffects];
    let lineCount = 0;
    while (story.canContinue) {
      if (++lineCount > 200)
        throw new Error("Story contains a loop or too many lines");
      story.Continue();
      const tags = parseStoryTags(story.currentTags ?? [], context);
      for (const effect of tags.effects) {
        if (seenEffects.includes(effect))
          throw new Error(`Repeated effect in one route: ${effect}`);
        seenEffects.push(effect);
      }
    }
    const choices = story.currentChoices;
    if (choices.length === 0) {
      if (choiceCount !== 2)
        throw new Error(`Expected two choice moments; found ${choiceCount}`);
      if (seenEffects.length !== 2)
        throw new Error(
          `Expected two choice effects; found ${seenEffects.length}`,
        );
      routes += 1;
      return;
    }
    if (choices.length !== 3)
      throw new Error(`Expected three choices; found ${choices.length}`);
    if (choiceCount >= 2) throw new Error("Too many choice moments");
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
      visit(branch.state.ToJson(), choiceCount + 1, [
        ...seenEffects,
        ...tags.effects,
      ]);
    }
  };
  visit(initial.state.ToJson(), 0, []);
  if (routes !== 9) throw new Error(`Expected nine routes; found ${routes}`);
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
    if (!presentation.memories[effect.memoryId])
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
    routes += validateStory(compiled, context);
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
  }
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
