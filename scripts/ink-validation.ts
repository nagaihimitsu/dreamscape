import { Compiler, CompilerOptions, JsonFileHandler } from "inkjs/compiler/Compiler";
import { Story } from "inkjs";
import { bindMemoryReader } from "../src/story/memory";
import { RELATIONSHIP_TONES, type RelationshipTone } from "../src/domain/romance-tone";
import type { DateDefinition, EffectDefinition } from "../src/content/schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import type { DialogueObserver } from "./dialogue-expression-validation";
import { unique } from "./content-validation-utils";
import { compiledConditionTexts, forEachCondAssignment } from "./scene-conditions";

export const commonDateEffect = /^common_date_(first|second)_(attentive|playful|honest|bold|provocative)$/;

/**
 * The one length check of a scene's Ink (decision 38): a path that reads more than this many
 * lines without reaching a choice or its end stops the build (it loops without end). Scenes
 * have no length limit by kind; the runtime's own guard (src/story/runtime.ts) is separate.
 */
export const MAX_LINES_WITHOUT_CHOICE = 1000;
/** Call with the count of lines read since the last choice (or the start); throws past the limit. */
export function checkLinesWithoutChoice(count: number): void {
  if (count > MAX_LINES_WITHOUT_CHOICE)
    throw new Error(`Story reads more than ${MAX_LINES_WITHOUT_CHOICE} lines without a choice or an end (an endless loop?)`);
}

/** Compile Ink; `includes` are the files an INCLUDE line may name (a place file's modules.ink). */
export function compileInk(source: string, filename = "story.ink", includes: Record<string, string> = {}): string {
  const compiler = new Compiler(
    source,
    new CompilerOptions(
      filename,
      [],
      false,
      null,
      new JsonFileHandler({ ...includes, [filename]: source }),
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

/** Ink may compare the derived tone, but its spelling and updates belong to TS. */
export function validateRelationshipToneSource(source: string): void {
  // Remove comments before inspecting code so explanatory examples do not
  // become requirements. Tone conditions use direct comparisons to literals.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const variable = "relationship_tone(?:_before|_after)?";
  const valid = new Set<string>(RELATIONSHIP_TONES);
  const comparison = new RegExp(`\\b${variable}\\s*(?:==|!=)\\s*"([^"]*)"`, "g");
  const reversed = new RegExp(`"([^"]*)"\\s*(?:==|!=)\\s*\\b${variable}\\b`, "g");
  const declaration = new RegExp(`^\\s*VAR\\s+${variable}\\s*=\\s*"([^"]*)"`, "gm");
  for (const pattern of [comparison, reversed, declaration]) {
    for (const match of code.matchAll(pattern))
      if (!valid.has(match[1])) throw new Error(`Unknown relationship tone: ${match[1]}`);
  }
  if (new RegExp(`^\\s*~\\s*${variable}\\s*=`, "m").test(code))
    throw new Error("Relationship tone is derived by the game and cannot be assigned in Ink");
  // Reject Ink's alternative switch form and dynamic comparisons: their
  // labels cannot be checked against the common list by the linter above.
  for (const line of code.split("\n")) {
    if (!new RegExp(`\\b${variable}\\b`).test(line)) continue;
    if (/^\s*VAR\s+/.test(line)) {
      if (!new RegExp(`^\\s*VAR\\s+${variable}\\s*=\\s*"[^"]*"\\s*$`).test(line))
        throw new Error("Relationship tone must be declared with a quoted allowed ID");
      continue;
    }
    const stripped = line.replace(new RegExp(comparison.source, "g"), "")
      .replace(new RegExp(reversed.source, "g"), "");
    if (new RegExp(`\\b${variable}\\b`).test(stripped))
      throw new Error("Compare relationship tone to a quoted allowed ID");
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
  observe?: DialogueObserver,
  memories: { available: readonly string[]; known: readonly string[] } = { available: [], known: [] },
  randomReactions = false,
  onEffect?: (effectId: string) => void,
  tone?: RelationshipTone,
  /** A probable mistake that does not stop the build (the two reactions of a choice read the same; decision 39). */
  onWarning?: (message: string) => void,
): number {
  // Set per walk: each assignment of the story's cond("…") texts (scene-conditions.ts).
  let bindConditions: (story: Story) => void = () => {};
  const createStory = () => {
    const story = new Story(compiled);
    bindMemoryReader(story, memories.available, memories.known);
    bindConditions(story);
    story.onError = (message) => { throw new Error(message); };
    return story;
  };
  const initial = createStory();
  for (const required of ["player_name", "heroine_name"]) {
    if (!initial.variablesState.GlobalVariableExistsWithName(required))
      throw new Error(`Missing required Ink variable: ${required}`);
  }
  if (randomReactions) for (const required of ["romance_result", "affection_delta", "trust_delta", "spark_delta"]) {
    if (!initial.variablesState.GlobalVariableExistsWithName(required))
      throw new Error(`Missing required random reaction Ink variable: ${required}`);
  }
  if (tone) for (const required of ["relationship_tone", "relationship_tone_before", "relationship_tone_after"]) {
    if (!initial.variablesState.GlobalVariableExistsWithName(required))
      throw new Error(`Missing required relationship tone Ink variable: ${required}`);
  }
  const input = {
    player_name: "検証主人公",
    heroine_name: "検証ヒロイン",
    ...variables,
    ...(tone ? { relationship_tone: tone, relationship_tone_before: tone, relationship_tone_after: tone } : {}),
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
    const story = createStory();
    story.state.LoadJson(saved);
    let seenEffects = [...previousEffects];
    const choiceMetadata = parseStoryTags(choiceTags, context);
    let speaker = choiceMetadata.speaker ?? previousSpeaker;
    let explicitEmotion = choiceMetadata.emotion !== undefined;
    let lineCount = 0;
    while (story.canContinue) {
      checkLinesWithoutChoice(++lineCount);
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
    // A choice moment offers at least one choice; how many is the author's (decision 41).
    // (With none, the route ends here and the count of choice moments above stops it.)
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
        const branch = createStory();
        branch.state.LoadJson(checkpoint);
        if (result) branch.variablesState.$("romance_result", result);
        if (tone) {
          // Walk through all tones as choices resolve. Running once for every
          // starting tone covers every tone at each decision, including a
          // change between the first and second choice, without 6^N branches.
          const before = RELATIONSHIP_TONES[(RELATIONSHIP_TONES.indexOf(tone) + choiceCount) % RELATIONSHIP_TONES.length];
          const after = RELATIONSHIP_TONES[(RELATIONSHIP_TONES.indexOf(tone) + choiceCount + 1) % RELATIONSHIP_TONES.length];
          branch.variablesState.$("relationship_tone_before", before);
          branch.variablesState.$("relationship_tone_after", after);
          branch.variablesState.$("relationship_tone", after);
        }
        branch.ChooseChoiceIndex(choice.index);
        if (randomReactions) {
          // The game must identify exactly one effect before exposing its
          // first response, without relying on which result was rolled.
          const probe = createStory();
          probe.state.LoadJson(branch.state.ToJson());
          let immediate = [...tags.effects];
          let guard = 0;
          let response = "";
          while (probe.canContinue) {
            checkLinesWithoutChoice(++guard);
            const line = probe.Continue()?.trim() ?? "";
            immediate = appendEffects(immediate, parseStoryTags(probe.currentTags ?? [], context).effects);
            if (line) { response = line; break; }
          }
          if (immediate.length !== 1)
            throw new Error("Random choice must expose exactly one effect before its first response");
          const commonChoice = commonDateEffect.exec(immediate[0]);
          if (commonChoice && (contract.kind !== "normal" || choiceCount !== (commonChoice[1] === "first" ? 0 : 1)))
            throw new Error(`Common date effect used at the wrong choice: ${immediate[0]}`);
          const effect = effects.find((item) => item.id === immediate[0]);
          if (!effect?.responseProfileId || effect.outcome)
            throw new Error(`Random choice effect needs a response profile: ${immediate[0]}`);
          if (choiceEffect && choiceEffect !== immediate[0])
            throw new Error("Random choice effect must not depend on its reaction result");
          if (!response) throw new Error("Random choice must produce a reaction");
          if (firstReaction !== undefined && firstReaction === response)
            onWarning?.(`A choice's positive and negative reactions read the same (not stopped): "${response}"`);
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
  forEachCondAssignment(compiled, (bind) => {
    bindConditions = bind;
    visit(initial.state.ToJson(), 0, [], "narrator");
  });
  // Every route was followed to its end above (each choice, with both reactions when random, for every cond assignment).
  return routes;
}

/** Check one learning topic without changing the shared story or game state. */
export function validateLearningTopic(compiled: string, context: TagContext, topicId: string): void {
  if (compiledConditionTexts(compiled).length)
    throw new Error(`cond("…") is not available in an English-note topic explanation (it is not a scene)`);
  const story = new Story(compiled);
  story.variablesState.$("topic", topicId);
  let lines = 0;
  while (story.canContinue) {
    const line = story.Continue()?.trim() ?? "";
    const tags = parseStoryTags(story.currentTags ?? [], context);
    if (tags.effects.length || (tags.speaker && tags.speaker !== "heroine"))
      throw new Error(`Invalid learning story tags: ${topicId}`);
    if (line) lines++;
    if (lines > 4) throw new Error(`Learning story too long: ${topicId}`);
  }
  if (lines < 2 || story.currentChoices.length)
    throw new Error(`Invalid learning story: ${topicId}`);
}
