import { Story } from "inkjs";
import { stories, tagContext } from "../content";
import { parseStoryTags } from "../content/tags";

export type Speaker = "narrator" | "heroine" | "player";
export interface StoryFrame {
  text: string;
  speaker: Speaker;
  background: string;
  emotion: string;
  choices: { index: number; text: string }[];
  ended: boolean;
}
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

function runtime(storyId: string, saved?: string): Story {
  const compiled = stories[storyId];
  if (!compiled) throw new Error("シナリオが見つかりません。");
  const story = new Story(compiled);
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
  if (parsed.emotion) frame.emotion = parsed.emotion;
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
  frame.choices = story.currentChoices.map(({ index, text }) => ({
    index,
    text: text.trim(),
  }));
  frame.ended = !story.canContinue && frame.choices.length === 0;
  return { storyState: story.state.ToJson(), frame, effects: events };
}

export function beginStory(
  storyId: string,
  playerName: string,
  heroineName: string,
  variables: Record<string, string | number | boolean> = {},
): StoryStep {
  const story = runtime(storyId);
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
): StoryStep {
  const story = runtime(storyId, saved);
  if (!story.canContinue) throw new Error("会話を進められません。");
  return readFrame(story, previous);
}

export function selectStoryChoice(
  storyId: string,
  saved: string,
  previous: StoryFrame,
  index: number,
): StoryStep {
  const story = runtime(storyId, saved);
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
  expected: { playerName: string; heroineName: string; choiceCount: number },
): void {
  const story = runtime(storyId, saved);
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
  // Ink starts at turn -1 and increments once for each ChooseChoiceIndex call.
  if (story.state.currentTurnIndex + 1 !== expected.choiceCount)
    throw new Error("保存された選択回数が一致しません。");
  const choices = story.currentChoices.map(({ index, text }) => ({
    index,
    text: text.trim(),
  }));
  if (JSON.stringify(choices) !== JSON.stringify(frame.choices))
    throw new Error("保存された選択肢が一致しません。");
  if (frame.ended !== (!story.canContinue && choices.length === 0))
    throw new Error("保存された会話位置が一致しません。");
  const currentText = story.currentText?.trim();
  if (currentText && currentText !== frame.text)
    throw new Error("保存された本文が一致しません。");
}
