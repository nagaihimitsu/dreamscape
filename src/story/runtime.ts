import { Story } from "inkjs";
import { z } from "zod";
import { presentation, stories, tagContext } from "../content";
import { parseStoryTags } from "../content/tags";
import { bindMemoryReader } from "./memory";
import { bindItemReader, type ItemStatus } from "./items";
import { encounters } from "../content/encounters";
import { REACTION_MARKS, type DialogueReaction, type ReactionTarget } from "../content/dialogue-reactions";

export type Speaker = "narrator" | "heroine" | "player" | "enemy";
export interface StoryFrame {
  text: string;
  speaker: Speaker;
  background: string;
  emotion: string;
  /** Optional because frames saved before inline presentation have no flag. */
  emotionExplicit?: true;
  reactions?: Partial<Record<ReactionTarget, DialogueReaction>>;
  choices: { index: number; text: string; optionId?: string; translationJa?: string }[];
  ended: boolean;
}
export const storyFrameSchema = z
  .object({
    text: z.string(),
    speaker: z.enum(["narrator", "heroine", "player", "enemy"]),
    background: z.string(),
    emotion: z.string(),
    emotionExplicit: z.literal(true).optional(),
    reactions: z.object({
      heroine: z.object({ expression: z.string().optional(), mark: z.enum(REACTION_MARKS).optional() }).strict().optional(),
      enemy: z.object({ expression: z.string().optional(), mark: z.enum(REACTION_MARKS).optional() }).strict().optional(),
    }).strict().optional(),
    choices: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            text: z.string().min(1),
            optionId: z.string().regex(/^[a-z][a-z0-9_]*$/u).optional(),
            translationJa: z.string().min(1).optional(),
          })
          .strict(),
      )
      .max(3),
    ended: z.boolean(),
  })
  .strict();
export interface StoryStep {
  storyState: string;
  frame: StoryFrame;
  effects: string[];
}

// Detect incompatible in-progress saves instead of loading old pointers into edited Ink.
export function storyFingerprint(storyId: string): string {
  const source = stories[storyId];
  if (!source) throw new Error("シナリオが見つかりません。");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16);
}

function runtime(storyId: string, saved?: string, memoryIds: readonly string[] = [], inventory: Readonly<Record<string, ItemStatus>> = {}): Story {
  const compiled = stories[storyId];
  if (!compiled) throw new Error("シナリオが見つかりません。");
  const story = new Story(compiled);
  bindMemoryReader(story, memoryIds, Object.keys(presentation.memories));
  bindItemReader(story, inventory, encounters.items.map((item) => item.id));
  story.onError = (message) => {
    throw new Error(message);
  };
  if (saved) story.state.LoadJson(saved);
  return story;
}

function readTags(
  tags: readonly string[],
  frame: StoryFrame,
  events: string[],
) {
  const parsed = parseStoryTags(tags, tagContext);
  if (parsed.speaker) frame.speaker = parsed.speaker;
  if (parsed.background) frame.background = parsed.background;
  if (parsed.emotion) {
    frame.emotion = parsed.emotion;
    frame.emotionExplicit = true;
  }
  if (parsed.reactions) {
    for (const target of ["heroine", "enemy"] as const) {
      if (parsed.reactions[target] && frame.reactions?.[target]) throw new Error(`Duplicate reaction target: ${target}`);
    }
    frame.reactions = { ...frame.reactions, ...parsed.reactions };
  }
  events.push(...parsed.effects);
}

function readFrame(
  story: Story,
  previous?: StoryFrame,
  choiceTags: readonly string[] = [],
): StoryStep {
  const frame: StoryFrame = {
    text: previous?.text ?? "",
    speaker: previous?.speaker ?? "narrator",
    background: previous?.background ?? "milano_cafe",
    emotion: "neutral",
    choices: [],
    ended: false,
  };
  const events: string[] = [];
  readTags(choiceTags, frame, events);
  // Ink may emit metadata-only lines. Read those without adding an empty UI step.
  let iterations = 0;
  while (story.canContinue) {
    if (++iterations > 200)
      throw new Error("シナリオの進行を確認してください。");
    const text = story.Continue()?.trim() ?? "";
    readTags(story.currentTags ?? [], frame, events);
    if (text) {
      frame.text = text;
      break;
    }
  }
  frame.choices = storyChoices(story);
  frame.ended = !story.canContinue && frame.choices.length === 0;
  return { storyState: story.state.ToJson(), frame, effects: events };
}

/** Choice tags are presentation/identity metadata. Old choices keep their original shape. */
function storyChoices(story: Story): StoryFrame["choices"] {
  return story.currentChoices.map(({ index, text, tags }) => {
    const parsed = parseStoryTags(tags ?? [], tagContext);
    return {
      index,
      text: text.trim(),
      ...(parsed.optionId ? { optionId: parsed.optionId } : {}),
      ...(parsed.translationJa ? { translationJa: parsed.translationJa } : {}),
    };
  });
}

export function beginStory(
  storyId: string,
  playerName: string,
  heroineName: string,
  variables: Record<string, string | number | boolean> = {},
  memoryIds: readonly string[] = [],
  inventory: Readonly<Record<string, ItemStatus>> = {},
): StoryStep {
  const story = runtime(storyId, undefined, memoryIds, inventory);
  story.variablesState.$("player_name", playerName);
  story.variablesState.$("heroine_name", heroineName);
  for (const [name, value] of Object.entries(variables)) {
    // Old cafe saves/scripts do not declare Phase 2 variables. Never rewrite them.
    if (story.variablesState.GlobalVariableExistsWithName(name))
      story.variablesState.$(name, value);
  }
  return readFrame(story);
}

export function continueStory(
  storyId: string,
  saved: string,
  previous: StoryFrame,
  memoryIds: readonly string[] = [],
  optionalVariables: Record<string, string | number | boolean> = {},
  inventory: Readonly<Record<string, ItemStatus>> = {},
): StoryStep {
  const story = runtime(storyId, saved, memoryIds, inventory);
  setOptionalVariables(story, optionalVariables);
  if (!story.canContinue) throw new Error("会話を進められません。");
  return readFrame(story, previous);
}

// Optional presentation context was not present in earlier published Ink.
function setOptionalVariables(story: Story, variables: Record<string, string | number | boolean>): void {
  for (const [name, value] of Object.entries(variables)) {
    if (story.variablesState.GlobalVariableExistsWithName(name))
      story.variablesState.$(name, value);
  }
}

export function selectStoryChoice(
  storyId: string,
  saved: string,
  previous: StoryFrame,
  index: number,
  memoryIds: readonly string[] = [],
  variables: Record<string, string | number | boolean> = {},
  optionalVariables: Record<string, string | number | boolean> = {},
  inventory: Readonly<Record<string, ItemStatus>> = {},
): StoryStep {
  const story = runtime(storyId, saved, memoryIds, inventory);
  for (const [name, value] of Object.entries(variables)) {
    if (!story.variablesState.GlobalVariableExistsWithName(name))
      throw new Error(`シナリオの変数が見つかりません: ${name}`);
    story.variablesState.$(name, value);
  }
  setOptionalVariables(story, optionalVariables);
  const choice = story.currentChoices.find((item) => item.index === index);
  if (!choice) throw new Error("選択肢が見つかりません。");
  const tags = choice.tags ?? [];
  story.ChooseChoiceIndex(index);
  return readFrame(story, previous, tags);
}

export function validateStorySnapshot(
  storyId: string,
  saved: string,
  frame: StoryFrame,
  expected: {
    playerName: string;
    heroineName: string;
    choiceCount: number;
    variables?: Record<string, string | number | boolean>;
  },
  memoryIds: readonly string[] = [],
  inventory: Readonly<Record<string, ItemStatus>> = {},
): void {
  const story = runtime(storyId, saved, memoryIds, inventory);
  if (
    !tagContext.backgroundIds.includes(frame.background) ||
    !tagContext.emotionIds.includes(frame.emotion)
  )
    throw new Error("保存された場面の情報が一致しません。");
  if (
    story.variablesState.$("player_name") !== expected.playerName ||
    story.variablesState.$("heroine_name") !== expected.heroineName
  )
    throw new Error("保存された名前が一致しません。");
  for (const [name, value] of Object.entries(expected.variables ?? {})) {
    if (story.variablesState.$(name) !== value)
      throw new Error("保存された会話の条件が一致しません。");
  }
  // Ink starts at turn -1 and increments once for each ChooseChoiceIndex call.
  if (story.state.currentTurnIndex + 1 !== expected.choiceCount)
    throw new Error("保存された選択回数が一致しません。");
  const choices = storyChoices(story);
  if (JSON.stringify(choices) !== JSON.stringify(frame.choices))
    throw new Error("保存された選択肢が一致しません。");
  if (frame.ended !== (!story.canContinue && choices.length === 0))
    throw new Error("保存された会話位置が一致しません。");
  const currentText = story.currentText?.trim();
  if (currentText && currentText !== frame.text)
    throw new Error("保存された本文が一致しません。");
}
