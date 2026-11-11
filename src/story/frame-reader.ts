import type { Story } from "inkjs";
import { DEFAULT_BACKGROUND_ID } from "../content/default-background";
import type { DialogueReaction, ReactionTarget } from "../content/dialogue-reactions";
import { parseStoryTags, type LineDelivery, type StoryCall, type StoryPhoto, type TagContext } from "../content/tags";

// How a story's next line becomes the frame on screen (runtime.ts), in a light module (no content loading).

export type Speaker = "narrator" | "heroine" | "player" | "enemy";
export interface StoryFrame {
  text: string;
  speaker: Speaker;
  background: string;
  emotion: string;
  /** Optional because frames saved before inline presentation have no flag. */
  emotionExplicit?: true;
  reactions?: Partial<Record<ReactionTarget, DialogueReaction>>;
  /** The line's `# pause:`, `# shake:` and `# size:` (how its text is shown; only the line it is written on). */
  delivery?: LineDelivery;
  /** The line's `# photo:` (and `# photo_caption:`): the photo it puts in the album when shown (only the line it is written on). */
  photo?: StoryPhoto;
  /** A battle's call (`# call:`, stage 5) is a choice the game takes itself: its screen shows no choice. */
  choices: { index: number; text: string; optionId?: string; translationJa?: string; call?: StoryCall }[];
  ended: boolean;
}
export interface StoryStep {
  storyState: string;
  frame: StoryFrame;
  effects: string[];
  /** Whether a new line was read (else the frame keeps the previous text: the story stopped at a choice, a call or its end first). */
  lineRead: boolean;
  /** Read with an origin knot: whether the line's text came from inside that knot (a special battle's claim, stage 5). */
  inKnot?: boolean;
}

/**
 * Run `read` and say whether the first text it outputs comes from inside `knot` (on the call stack as Ink outputs it).
 * The saved state after a line cannot tell: when a choice follows the line, Ink has already read on past the knot's end.
 * A special battle's claim (its helper knot) is told from the lines around it this way.
 */
function withLineOrigin<T>(story: Story, knot: string | undefined, read: () => T): { result: T; inKnot?: boolean } {
  if (!knot) return { result: read() };
  type Host = { Step: () => void; state: { inExpressionEvaluation: boolean; currentPointer: { Resolve(): unknown };
    callStack: { elements: { currentPointer: { path: { toString(): string } | null } }[] } } };
  const host = story as unknown as Host;
  const step = host.Step;
  let inKnot: boolean | undefined;
  host.Step = function () {
    if (inKnot === undefined && !host.state.inExpressionEvaluation) {
      const content = host.state.currentPointer.Resolve() as { value?: unknown } | null;
      if (content && typeof content.value === "string" && "isNewline" in content && content.value.trim())
        inKnot = host.state.callStack.elements.some((element) => {
          const path = element.currentPointer.path?.toString();
          return path === knot || !!path?.startsWith(`${knot}.`);
        });
    }
    step.call(host);
  };
  try { return { result: read(), inKnot }; } finally { host.Step = step; }
}

/** The battle call the frame stops at (its only choice), if any (stage 5). */
export const frameCall = (frame: Pick<StoryFrame, "choices"> | null | undefined): StoryCall | undefined =>
  frame?.choices.length === 1 ? frame.choices[0].call : undefined;

function readTags(
  tags: readonly string[],
  frame: StoryFrame,
  events: string[],
  context: TagContext,
) {
  const parsed = parseStoryTags(tags, context);
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
  if (parsed.delivery) frame.delivery = { ...frame.delivery, ...parsed.delivery };
  if (parsed.photo) frame.photo = parsed.photo;
  events.push(...parsed.effects);
}

/** Read the story to its next line (the frame keeps the previous frame's text, speaker and background). */
export function readStoryFrame(
  story: Story,
  context: TagContext,
  previous?: StoryFrame,
  choiceTags: readonly string[] = [],
  initialBackground = DEFAULT_BACKGROUND_ID,
  /** Say whether the line came from inside this knot (StoryStep.inKnot). */
  originKnot?: string,
): StoryStep {
  const frame: StoryFrame = {
    text: previous?.text ?? "",
    speaker: previous?.speaker ?? "narrator",
    background: previous?.background ?? initialBackground,
    emotion: "neutral",
    choices: [],
    ended: false,
  };
  const events: string[] = [];
  readTags(choiceTags, frame, events, context);
  // Ink may emit metadata-only lines. Read those without adding an empty UI step.
  let iterations = 0;
  let lineRead = false;
  let inKnot: boolean | undefined;
  while (story.canContinue) {
    if (++iterations > 200)
      throw new Error("シナリオの進行を確認してください。");
    const read = withLineOrigin(story, originKnot, () => story.Continue()?.trim() ?? "");
    const text = read.result;
    readTags(story.currentTags ?? [], frame, events, context);
    if (text) {
      frame.text = text;
      lineRead = true;
      inKnot = read.inKnot;
      break;
    }
  }
  frame.choices = storyChoicesOf(story, context);
  if (frame.choices.some((choice) => choice.call) && frame.choices.length !== 1)
    throw new Error("バトルの呼び口は、ほかの選択肢と一緒に出せません。");
  frame.ended = !story.canContinue && frame.choices.length === 0;
  return { storyState: story.state.ToJson(), frame, effects: events, lineRead, ...(originKnot ? { inKnot: inKnot ?? false } : {}) };
}

/** Choice tags are presentation/identity metadata. Old choices keep their original shape. */
export function storyChoicesOf(story: Story, context: TagContext): StoryFrame["choices"] {
  return story.currentChoices.map(({ index, text, tags }) => {
    const parsed = parseStoryTags(tags ?? [], context);
    return {
      index,
      text: text.trim(),
      ...(parsed.optionId ? { optionId: parsed.optionId } : {}),
      ...(parsed.translationJa ? { translationJa: parsed.translationJa } : {}),
      ...(parsed.call ? { call: parsed.call } : {}),
    };
  });
}
