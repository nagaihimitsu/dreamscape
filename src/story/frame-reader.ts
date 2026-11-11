import type { Story } from "inkjs";
import { DEFAULT_BACKGROUND_ID } from "../content/default-background";
import type { DialogueReaction, ReactionTarget } from "../content/dialogue-reactions";
import {
  parseStoryTags, type LetterKind, type LineDelivery, type PhoneSide, type QuietSpan, type StandPosition, type StoryCall, type StoryPhoto,
  type TagContext,
} from "../content/tags";

// How a story's next line becomes the frame on screen (runtime.ts), in a light module (no content loading).

/** "person": a person of progression/story.json people says the line (`# speaker: <person ID>`; 2026-11-11). */
export type Speaker = "narrator" | "heroine" | "player" | "enemy" | "person";
/** A message a phone's screen shows above the line on screen (an earlier line of the same run of `# phone:` lines). */
export interface PhoneMessage {
  side: PhoneSide;
  speaker: Speaker;
  /** With speaker "person": who wrote it (the person's ID). */
  personId?: string;
  text: string;
}
/** A line's `# phone:`: its side, below the earlier messages of the same run (oldest first). */
export interface PhoneLine {
  side: PhoneSide;
  earlier?: PhoneMessage[];
}
/** A line's `# letter:`: its paper, below the earlier lines written on the same sheet (oldest first). */
export interface LetterLine {
  kind: LetterKind;
  earlier?: string[];
}
/** The earlier messages or lines a phone's screen or a sheet keeps at most (the oldest go first; it bounds the saved frame). */
export const STACK_MAX = 40;
export interface StoryFrame {
  text: string;
  speaker: Speaker;
  /** With speaker "person": who says the line (the person's ID). */
  speakerPersonId?: string;
  background: string;
  emotion: string;
  /** Optional because frames saved before inline presentation have no flag. */
  emotionExplicit?: true;
  reactions?: Partial<Record<ReactionTarget, DialogueReaction>>;
  /** The line's `# pause:`, `# shake:` and `# size:` (how its text is shown; only the line it is written on). */
  delivery?: LineDelivery;
  /** The line's `# photo:` (and `# photo_caption:`): the photo it puts in the album when shown (only the line it is written on). */
  photo?: StoryPhoto;
  /** The line's `# local_word:` words (only the line it is written on): GameApp learns them as the line is shown. */
  localWordIds?: string[];
  /** The line's `# recall:` (only the line it is written on): the photo shown faintly behind it. */
  recall?: string;
  /** The line's `# phone:`: a message on a phone's screen, after the earlier ones of an unbroken run of phone lines. */
  phone?: PhoneLine;
  /** The line's `# letter:`: written on a sheet, after the earlier lines of the same kind right before it. */
  letter?: LetterLine;
  /** `# quiet:`: "line" for that line, "scene" from its line to the scene's end. */
  quiet?: QuietSpan;
  /** `# stand:`: where the heroine stands, from its line on until another `# stand:` or the scene's end. */
  stand?: StandPosition;
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
  if (parsed.speaker) {
    frame.speaker = parsed.speaker;
    if (parsed.speakerPersonId) frame.speakerPersonId = parsed.speakerPersonId;
    else delete frame.speakerPersonId;
  }
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
  if (parsed.recall) frame.recall = parsed.recall;
  // A line is a phone message or a letter (parseStoryTags refuses both on one line; the last read wins here).
  if (parsed.phone) {
    frame.phone = { side: parsed.phone };
    delete frame.letter;
  }
  if (parsed.letter) {
    frame.letter = { kind: parsed.letter };
    delete frame.phone;
  }
  if (parsed.quiet) frame.quiet = parsed.quiet;
  if (parsed.stand) frame.stand = parsed.stand;
  if (parsed.localWordIds) frame.localWordIds = [...new Set([...(frame.localWordIds ?? []), ...parsed.localWordIds])];
  events.push(...parsed.effects);
}

/** What the scene tags put on a frame. */
export type FrameStaging = Pick<StoryFrame, "recall" | "phone" | "letter" | "quiet" | "stand">;

/**
 * The staging of a frame from its own scene tags (`tagged`: what its tags read, a phone or a letter without earlier
 * lines) and the frame before it in the same scene (none at a scene's start, nor after a battle's call):
 * - `# stand:` lasts until the next one, `# quiet: scene` to the scene's end (`# quiet: line` then adds nothing);
 * - a phone message comes after the messages of the frame before it when that was one too (an unbroken run of phone
 *   lines: a line without `# phone:` ends it), a letter's line after the lines of the frame before it when that was
 *   written on the same kind of paper; the oldest go first beyond STACK_MAX;
 * - when no new line was read (the story stopped at a choice or its end first), the line on screen is the previous
 *   one: it keeps that line's recall, phone, letter and quiet.
 */
export function stageFrame(tagged: FrameStaging, previous: (FrameStaging & Pick<StoryFrame, "speaker" | "speakerPersonId" | "text">) | undefined,
  lineRead: boolean): FrameStaging {
  const stand = tagged.stand ?? previous?.stand;
  const shown = (staging: FrameStaging): FrameStaging => Object.fromEntries(Object.entries({ ...staging, stand })
    .filter(([, value]) => value !== undefined)) as FrameStaging;
  if (!lineRead && previous) return shown({ recall: previous.recall, phone: previous.phone, letter: previous.letter, quiet: previous.quiet });
  const before = previous?.text ? previous : undefined;
  const phoneEarlier = tagged.phone && before?.phone
    ? [...(before.phone.earlier ?? []), { side: before.phone.side, speaker: before.speaker,
      ...(before.speakerPersonId ? { personId: before.speakerPersonId } : {}), text: before.text }].slice(-STACK_MAX) : [];
  const letterEarlier = tagged.letter && before?.letter?.kind === tagged.letter.kind
    ? [...(before.letter.earlier ?? []), before.text].slice(-STACK_MAX) : [];
  return shown({
    recall: tagged.recall,
    phone: tagged.phone && { side: tagged.phone.side, ...(phoneEarlier.length ? { earlier: phoneEarlier } : {}) },
    letter: tagged.letter && { kind: tagged.letter.kind, ...(letterEarlier.length ? { earlier: letterEarlier } : {}) },
    quiet: previous?.quiet === "scene" ? "scene" : tagged.quiet,
  });
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
    ...(previous?.speakerPersonId ? { speakerPersonId: previous.speakerPersonId } : {}),
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
  const staging = stageFrame(frame, previous, lineRead);
  for (const key of ["recall", "phone", "letter", "quiet", "stand"] as const) delete frame[key];
  Object.assign(frame, staging);
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
