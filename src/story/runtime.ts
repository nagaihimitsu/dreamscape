import { Story } from "inkjs";
import { z } from "zod";
import { presentation, scenes, stories, tagContext } from "../content";
import { splitStoryAddress, storyFileOf } from "../content/story-address";
import { fnvHash } from "../content/fingerprint";
import { CUTIN_KINDS, LETTER_KINDS, LINE_PAUSE_MS, parseStoryTags, PHONE_SIDES, QUIET_SPANS, STAND_POSITIONS, STORY_CALLS, type StoryCall } from "../content/tags";
import { readStoryFrame, STACK_MAX, storyChoicesOf, type Speaker, type StoryStep } from "./frame-reader";
import { DEFAULT_BACKGROUND_ID } from "../content/default-background";
import { bindMemoryReader } from "./memory";
import { bindItemReader, type ItemStatus } from "./items";
import { encounters } from "../content/encounters";
import { REACTION_MARKS } from "../content/dialogue-reactions";
import { ALBUM_IMAGE_ID } from "../content/album-images";

export type { Speaker, StoryFrame } from "./frame-reader";
import type { StoryFrame } from "./frame-reader";
const speakerSchema = z.enum(["narrator", "heroine", "player", "enemy", "person"]);
const imageIdSchema = z.string().regex(/^[a-z][a-z0-9_]*$/u);
/** A line's album image (`# photo:`, `# recall:`): its file name, which may start with a digit (src/content/album-images.ts). */
const albumImageIdSchema = z.string().regex(ALBUM_IMAGE_ID);
export const storyFrameSchema = z
  .object({
    text: z.string(),
    speaker: speakerSchema,
    speakerPersonId: z.string().regex(/^[a-z][a-z0-9_]*$/u).optional(),
    background: z.string(),
    emotion: z.string(),
    emotionExplicit: z.literal(true).optional(),
    reactions: z.object({
      heroine: z.object({ expression: z.string().optional(), mark: z.enum(REACTION_MARKS).optional() }).strict().optional(),
      enemy: z.object({ expression: z.string().optional(), mark: z.enum(REACTION_MARKS).optional() }).strict().optional(),
    }).strict().optional(),
    delivery: z.object({
      pauseMs: z.number().int().min(LINE_PAUSE_MS.min).max(LINE_PAUSE_MS.max).optional(),
      shake: z.literal(true).optional(),
      large: z.literal(true).optional(),
    }).strict().optional(),
    photo: z.object({
      imageId: albumImageIdSchema,
      caption: z.string().min(1).optional(),
    }).strict().optional(),
    localWordIds: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/u)).min(1).optional(),
    // The scene tags (frame-reader.ts stageFrame): presentation only.
    recall: albumImageIdSchema.optional(),
    phone: z.object({
      side: z.enum(PHONE_SIDES),
      earlier: z.array(z.object({ side: z.enum(PHONE_SIDES), speaker: speakerSchema, personId: imageIdSchema.optional(), text: z.string().min(1) }).strict()).min(1).max(STACK_MAX).optional(),
    }).strict().optional(),
    letter: z.object({
      kind: z.enum(LETTER_KINDS),
      earlier: z.array(z.string().min(1)).min(1).max(STACK_MAX).optional(),
    }).strict().optional(),
    quiet: z.enum(QUIET_SPANS).optional(),
    stand: z.enum(STAND_POSITIONS).optional(),
    cutin: z.enum(CUTIN_KINDS).optional(),
    choices: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            text: z.string().min(1),
            optionId: z.string().regex(/^[a-z][a-z0-9_]*$/u).optional(),
            translationJa: z.string().min(1).optional(),
            call: z.enum(STORY_CALLS).optional(),
          })
          .strict(),
      ),
    ended: z.boolean(),
  })
  .strict();
export type { StoryStep } from "./frame-reader";
export { frameCall } from "./frame-reader";

/**
 * Detect incompatible in-progress saves instead of loading old pointers into edited Ink. A story
 * file's fingerprint is its compiled text's; a place file's knot has the scene's own (the file's
 * declarations, the scene's knots and data, content:build scene-table.ts), so editing another
 * scene of the file keeps a save inside this one.
 */
export function storyFingerprint(address: string): string {
  const { storyId, path } = splitStoryAddress(address);
  const source = stories[storyId];
  if (!source) throw new Error("シナリオが見つかりません。");
  if (path !== undefined) {
    const knot = path.split(".")[0];
    const scene = scenes.find((item) => item.story.storyId === storyId && item.story.knot === knot);
    if (!scene) throw new Error("シナリオが見つかりません。");
    return scene.fingerprint;
  }
  return fnvHash(source);
}

/**
 * A scene's `cond("…")`: whether the condition written as text holds now (src/domain/scene-conditions.ts
 * judges it; Ink gets true or false only). A scene that calls cond without a reader stops: content:build
 * refuses cond in the stories that are not scenes (English-note explanations).
 */
export type StoryConditionReader = (text: string) => boolean;
const noConditions: StoryConditionReader = (text) => { throw new Error(`この会話では条件を読めません: ${text}`); };

function runtime(address: string, saved?: string, memoryIds: readonly string[] = [], inventory: Readonly<Record<string, ItemStatus>> = {},
  conditions: StoryConditionReader = noConditions): Story {
  const compiled = stories[storyFileOf(address)];
  if (!compiled) throw new Error("シナリオが見つかりません。");
  const story = new Story(compiled);
  bindMemoryReader(story, memoryIds, Object.keys(presentation.memories));
  bindItemReader(story, inventory, encounters.items.map((item) => item.id));
  // Read-only and the same for the same state, so Ink may read it ahead (like has_memory).
  story.BindExternalFunction("cond", (text: unknown) => {
    if (typeof text !== "string") throw new Error("条件の書き方が正しくありません。");
    return conditions(text);
  }, true);
  story.onError = (message) => {
    throw new Error(message);
  };
  if (saved) {
    try {
      story.state.LoadJson(saved);
    } catch (error) {
      // inkjs reports a broken snapshot in English ("ink save format incorrect").
      throw new Error("保存された会話の途中データを読み込めません。", { cause: error });
    }
  }
  return story;
}

const readFrame = (story: Story, previous?: StoryFrame, choiceTags: readonly string[] = [], initialBackground = DEFAULT_BACKGROUND_ID,
  originKnot?: string): StoryStep => readStoryFrame(story, tagContext, previous, choiceTags, initialBackground, originKnot);
const storyChoices = (story: Story) => storyChoicesOf(story, tagContext);

export function beginStory(
  storyId: string,
  playerName: string,
  heroineName: string,
  variables: Record<string, string | number | boolean> = {},
  memoryIds: readonly string[] = [],
  inventory: Readonly<Record<string, ItemStatus>> = {},
  initialBackground = DEFAULT_BACKGROUND_ID,
  conditions?: StoryConditionReader,
  /** Say whether the first line came from inside this knot (a flow battle's claim). */
  originKnot?: string,
): StoryStep {
  const story = runtime(storyId, undefined, memoryIds, inventory, conditions);
  story.variablesState.$("player_name", playerName);
  story.variablesState.$("heroine_name", heroineName);
  for (const [name, value] of Object.entries(variables)) {
    // Old cafe saves/scripts do not declare Phase 2 variables. Never rewrite them.
    if (story.variablesState.GlobalVariableExistsWithName(name))
      story.variablesState.$(name, value);
  }
  // A place file's scene starts at its knot; its file's top runs nothing.
  const path = splitStoryAddress(storyId).path;
  if (path !== undefined) story.ChoosePathString(path);
  return readFrame(story, undefined, [], initialBackground, originKnot);
}

export function continueStory(
  storyId: string,
  saved: string,
  previous: StoryFrame,
  memoryIds: readonly string[] = [],
  optionalVariables: Record<string, string | number | boolean> = {},
  inventory: Readonly<Record<string, ItemStatus>> = {},
  conditions?: StoryConditionReader,
  originKnot?: string,
): StoryStep {
  const story = runtime(storyId, saved, memoryIds, inventory, conditions);
  setOptionalVariables(story, optionalVariables);
  if (!story.canContinue) throw new Error("会話を進められません。");
  return readFrame(story, previous, [], undefined, originKnot);
}

/** The next line a saved story reads, without changing it: whether there is one before a choice or the end, and whether it comes from `knot`. */
export function peekStoryLine(storyId: string, saved: string, memoryIds: readonly string[], inventory: Readonly<Record<string, ItemStatus>>,
  conditions: StoryConditionReader | undefined, knot: string): { line: boolean; inKnot: boolean } {
  const story = runtime(storyId, saved, memoryIds, inventory, conditions);
  if (!story.canContinue) return { line: false, inKnot: false };
  const step = readFrame(story, undefined, [], undefined, knot);
  return { line: step.lineRead, inKnot: step.lineRead && !!step.inKnot };
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
  /** The frame the choice was made at; undefined starts a fresh one (a battle's call returns as a scene starts, stage 5). */
  previous: StoryFrame | undefined,
  index: number,
  memoryIds: readonly string[] = [],
  variables: Record<string, string | number | boolean> = {},
  optionalVariables: Record<string, string | number | boolean> = {},
  inventory: Readonly<Record<string, ItemStatus>> = {},
  /** Read on the state after the choice's effects, so the lines after the choice read the new values. */
  conditions?: StoryConditionReader,
  /** The background of a fresh frame (no `previous`). */
  initialBackground = DEFAULT_BACKGROUND_ID,
  originKnot?: string,
): StoryStep {
  const story = runtime(storyId, saved, memoryIds, inventory, conditions);
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
  return readFrame(story, previous, tags, initialBackground, originKnot);
}

/**
 * The lines of a helper knot read on their own (a special battle's claim and press for the clue
 * book; stage 5): from the knot to its `->->` (read alone it has nowhere to return to) or its end.
 */
export function readStoryKnotLines(
  address: string,
  variables: Record<string, string | number | boolean>,
  conditions?: StoryConditionReader,
  memoryIds: readonly string[] = [],
  inventory: Readonly<Record<string, ItemStatus>> = {},
): { text: string; speaker: Speaker }[] {
  const story = runtime(address, undefined, memoryIds, inventory, conditions);
  for (const [name, value] of Object.entries(variables))
    if (story.variablesState.GlobalVariableExistsWithName(name)) story.variablesState.$(name, value);
  let ended = false;
  story.onError = (message) => {
    if (!/tunnel onwards/u.test(message)) throw new Error(message);
    ended = true;
  };
  const path = splitStoryAddress(address).path;
  if (path === undefined) throw new Error("手伝いの knot の住所ではありません。");
  story.ChoosePathString(path);
  const lines: { text: string; speaker: Speaker }[] = [];
  let speaker: Speaker = "narrator";
  for (let count = 0; story.canContinue && !ended; count++) {
    if (count > 200) throw new Error("シナリオの進行を確認してください。");
    const text = story.Continue()?.trim() ?? "";
    const parsed = parseStoryTags(story.currentTags ?? [], tagContext);
    if (parsed.speaker) speaker = parsed.speaker;
    if (text && !ended) lines.push({ text, speaker });
  }
  // A choice it reaches (content:build stops such a knot) ends the read: what the screen shows never breaks it.
  return lines;
}

/** Where a saved story stops at a battle's call (stage 5): the call, its argument (call_arg) and Ink's turn; null when it does not. */
export function storyCallAt(address: string, saved: string): { call: StoryCall; arg: number; turn: number } | null {
  const story = runtime(address, saved);
  const choices = storyChoices(story);
  if (story.canContinue || choices.length !== 1 || !choices[0].call) return null;
  const arg = story.variablesState.$("call_arg");
  return { call: choices[0].call, arg: typeof arg === "number" ? arg : 0, turn: story.state.currentTurnIndex };
}

/** Story variables' saved values (undefined when not declared; stage 5: a flow battle's variables, checked on loading). */
export function storyVariables(address: string, saved: string, names: readonly string[]): Record<string, unknown> {
  const story = runtime(address, saved);
  return Object.fromEntries(names.map((name) => [name, story.variablesState.GlobalVariableExistsWithName(name) ? story.variablesState.$(name) : undefined]));
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
    !tagContext.emotionIds.includes(frame.emotion) ||
    (frame.photo && !tagContext.photoIds.includes(frame.photo.imageId)) ||
    (frame.recall && !tagContext.photoIds.includes(frame.recall)) ||
    // A person's line names a declared person (and only a person's line names one).
    (frame.speaker === "person") !== (frame.speakerPersonId !== undefined) ||
    (frame.speakerPersonId !== undefined && !tagContext.personIds.includes(frame.speakerPersonId))
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
  // Ink starts at turn -1 and increments once for each ChooseChoiceIndex call (and once for the knot a place file's scene starts at).
  const started = splitStoryAddress(storyId).path !== undefined ? 1 : 0;
  if (story.state.currentTurnIndex + 1 !== expected.choiceCount + started)
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
