import { REACTION_MARKS, type DialogueReaction, type ReactionTarget } from "./dialogue-reactions";

export interface TagContext {
  effectIds: string[];
  backgroundIds: string[];
  emotionIds: string[];
  /** The album images a line's `# photo:` and `# recall:` may name (album-images.ts); absent: none. */
  photoIds?: readonly string[];
  /** The word IDs of learning/local-words.json, for `# local_word:`; absent: a tool that only reads the lines (not checked). */
  localWordIds?: readonly string[];
  /** The people of progression/story.json, for `# speaker: <person ID>`; absent: a tool that only reads the lines (not checked). */
  personIds?: readonly string[];
}

/** The speakers every line may name; any other `# speaker:` names a person of progression/story.json people (2026-11-11). */
export const RESERVED_SPEAKERS = ["narrator", "heroine", "player", "enemy"] as const;

export interface StoryTags {
  /** "person": `# speaker: <person ID>`, the person in speakerPersonId. */
  speaker?: (typeof RESERVED_SPEAKERS)[number] | "person";
  speakerPersonId?: string;
  background?: string;
  emotion?: string;
  reactions?: Partial<Record<ReactionTarget, DialogueReaction>>;
  optionId?: string;
  translationJa?: string;
  /** `# local_word: <id>`: the words of the country the line teaches (learned when it is shown in normal play). */
  localWordIds?: string[];
  /** `# call: quiz` / `# call: reasoning`: the one choice of modules.ink's battle calls (stage 5). */
  call?: StoryCall;
  /** `# pause:`, `# shake:` and `# size:`: how the line is shown (presentation only). */
  delivery?: LineDelivery;
  /** `# photo:` with its `# photo_caption:`: the photo the line puts in the album (2026-11-11). */
  photo?: StoryPhoto;
  /** `# recall: <imageId>`: an album image shown faintly behind the line (scene tags, 2026-11-11; not put in the album). */
  recall?: string;
  /** `# phone: received` / `# phone: sent`: the line as a message on a phone's screen. */
  phone?: PhoneSide;
  /** `# letter: <kind>`: the line written on a sheet of paper. */
  letter?: LetterKind;
  /** `# quiet: scene` / `# quiet: line`: a quiet scene from this line on, or this line only. */
  quiet?: QuietSpan;
  /** `# stand: <position>`: where the heroine stands from this line on (the writer's staging only). */
  stand?: StandPosition;
  /** `# cutin: name`: the speaker's name plate over the scene for a moment (the line it is written on only). */
  cutin?: CutInKind;
  effects: string[];
}

/**
 * The scene tags (2026-11-11 user decision), presentation only, each a small closed set but `# recall:`:
 * a message on a phone's screen (received on the left with the speaker's name, sent on the right),
 * a sheet of paper (a letter, a note, a card), a quiet scene or line, and where the heroine stands.
 */
export const PHONE_SIDES = ["received", "sent"] as const;
export type PhoneSide = (typeof PHONE_SIDES)[number];
export const LETTER_KINDS = ["letter", "note", "card"] as const;
export type LetterKind = (typeof LETTER_KINDS)[number];
export const QUIET_SPANS = ["scene", "line"] as const;
export type QuietSpan = (typeof QUIET_SPANS)[number];
/** `near` is where she stands without the tag (today's place); `apart` a little away, `close` right beside. */
export const STAND_POSITIONS = ["apart", "near", "close"] as const;
export type StandPosition = (typeof STAND_POSITIONS)[number];
/**
 * `# cutin: name` (2026-11-11 user decision): where a name comes out, the speaker's name plate (their role and name) shows
 * over the scene for a moment. The line's own `# speaker:` says whose: `enemy` (the one opposite on that screen) or a person.
 */
export const CUTIN_KINDS = ["name"] as const;
export type CutInKind = (typeof CUTIN_KINDS)[number];

type SceneTagKey = "phone" | "letter" | "quiet" | "stand" | "cutin";
const SCENE_TAG_VALUES: Record<SceneTagKey, readonly string[]> = {
  phone: PHONE_SIDES, letter: LETTER_KINDS, quiet: QUIET_SPANS, stand: STAND_POSITIONS, cutin: CUTIN_KINDS,
};
const isSceneTagKey = (key: string): key is SceneTagKey => Object.hasOwn(SCENE_TAG_VALUES, key);

/** Read a line's `# phone:`, `# letter:`, `# quiet:`, `# stand:` or `# cutin:`; throws for another value or a repeated tag. */
function readSceneTag(key: SceneTagKey, value: string, result: StoryTags): void {
  const values = SCENE_TAG_VALUES[key];
  if (!values.includes(value))
    throw new Error(`Invalid ${key} tag: ${value} (write ${values.map((item) => `# ${key}: ${item}`).join(", ")})`);
  if (result[key] !== undefined) throw new Error(`Duplicate ${key} tag`);
  // The value is one of the key's own (checked above).
  Object.assign(result, { [key]: value });
}

/**
 * The photo a line takes into the album when it is read (src/domain/album.ts): `# photo: <imageId>`, an album image
 * (the author's illustration at a journey's public/assets/album/<imageId>.<ext>, album-images.ts; never credited),
 * with an optional `# photo_caption: <text>` among the same line's tags.
 */
export interface StoryPhoto {
  imageId: string;
  caption?: string;
}

/**
 * How one line is shown, from its tags (presentation only; never the story or the game state):
 * `# pause: 600` waits that many milliseconds before its text starts (a tap shows it at once),
 * `# shake: window` shakes the dialogue window once, `# size: large` shows its text larger.
 */
export interface LineDelivery {
  pauseMs?: number;
  shake?: true;
  large?: true;
}
/** The pause a line may take before its text starts (milliseconds). */
export const LINE_PAUSE_MS = { min: 100, max: 3000 } as const;

/** Read a line's `# pause:`, `# shake:` or `# size:` into its delivery; throws for a malformed or repeated one. */
function readDelivery(key: "pause" | "shake" | "size", value: string, delivery: LineDelivery): LineDelivery {
  if (key === "pause") {
    const ms = /^\d+$/u.test(value) ? Number(value) : NaN;
    if (!(ms >= LINE_PAUSE_MS.min && ms <= LINE_PAUSE_MS.max))
      throw new Error(`Invalid pause tag: ${value} (milliseconds, ${LINE_PAUSE_MS.min} to ${LINE_PAUSE_MS.max})`);
    if (delivery.pauseMs !== undefined) throw new Error("Duplicate pause tag");
    return { ...delivery, pauseMs: ms };
  }
  if (key === "shake") {
    if (value !== "window") throw new Error(`Invalid shake tag: ${value} (write # shake: window)`);
    if (delivery.shake) throw new Error("Duplicate shake tag");
    return { ...delivery, shake: true };
  }
  if (value !== "large") throw new Error(`Invalid size tag: ${value} (write # size: large)`);
  if (delivery.large) throw new Error("Duplicate size tag");
  return { ...delivery, large: true };
}

/** What a battle's call choice asks the game for (modules.ink: `-> quiz(n) ->`, `-> reasoning ->`; stage 5). */
export const STORY_CALLS = ["quiz", "reasoning"] as const;
export type StoryCall = (typeof STORY_CALLS)[number];

/**
 * A choice's effect tags (the unified event design, stage 3a): content:build reads them from the Ink
 * source into the scene table, and the game applies them from the table before passing the choice to
 * Ink; on screen they are skipped like comments.
 */
export const EFFECT_TAG_KEYS: readonly string[] = ["requires", "give", "use", "rel", "profile", "memory", "set", "money", "ap", "then"];

/** Interpret Ink's official currentTags/choice.tags output, never Ink source. */
export function parseStoryTags(
  tags: readonly string[],
  context: TagContext,
): StoryTags {
  const result: StoryTags = { effects: [] };
  let caption: string | undefined;
  for (const tag of tags) {
    if (tag.trim() === "later") continue;
    const separator = tag.indexOf(":");
    const key = tag.slice(0, separator).trim();
    const value = tag.slice(separator + 1).trim();
    if (separator < 1 || !value) throw new Error(`Invalid story tag: ${tag}`);
    if (key === "effect") {
      if (!context.effectIds.includes(value))
        throw new Error(`Unknown effect: ${value}`);
      if (result.effects.includes(value))
        throw new Error(`Duplicate effect tag: ${value}`);
      result.effects.push(value);
    } else if (key === "speaker") {
      const reserved = (RESERVED_SPEAKERS as readonly string[]).includes(value);
      if (!reserved && (!/^[a-z][a-z0-9_]*$/u.test(value) || (context.personIds && !context.personIds.includes(value))))
        throw new Error(`Unknown speaker: ${value} (narrator, heroine, player, enemy, or a person of progression/story.json people)`);
      if (result.speaker) throw new Error("Duplicate speaker tag");
      if (reserved) result.speaker = value as (typeof RESERVED_SPEAKERS)[number];
      else {
        result.speaker = "person";
        result.speakerPersonId = value;
      }
    } else if (key === "background") {
      if (!context.backgroundIds.includes(value))
        throw new Error(`Unknown background: ${value}`);
      if (result.background) throw new Error("Duplicate background tag");
      result.background = value;
    } else if (key === "emotion") {
      if (!context.emotionIds.includes(value))
        throw new Error(`Unknown emotion: ${value}`);
      if (result.emotion) throw new Error("Duplicate emotion tag");
      result.emotion = value;
    } else if (key === "reaction") {
      // A mark may be used alone: `heroine,sweat`. Both properties can also
      // be provided: `heroine,exasperated,sigh`.
      const parts = value.split(",").map((part) => part.trim());
      const [target, first, second] = parts;
      if (parts.length < 2 || parts.length > 3 || !first || (parts.length === 3 && !second))
        throw new Error(`Invalid reaction tag: ${value}`);
      if (target !== "heroine" && target !== "enemy") throw new Error(`Unknown reaction target: ${target}`);
      let expression: string | undefined;
      let mark: DialogueReaction["mark"];
      if (parts.length === 2 && REACTION_MARKS.includes(first as NonNullable<DialogueReaction["mark"]>)) {
        mark = first as NonNullable<DialogueReaction["mark"]>;
      } else {
        if (!context.emotionIds.includes(first)) throw new Error(`Unknown reaction emotion: ${first}`);
        expression = first;
        if (second) {
          if (!REACTION_MARKS.includes(second as NonNullable<DialogueReaction["mark"]>)) throw new Error(`Unknown reaction mark: ${second}`);
          mark = second as NonNullable<DialogueReaction["mark"]>;
        }
      }
      result.reactions ??= {};
      if (result.reactions[target]) throw new Error(`Duplicate reaction target: ${target}`);
      result.reactions[target] = { ...(expression ? { expression } : {}), ...(mark ? { mark } : {}) };
    } else if (key === "option") {
      if (!/^[a-z][a-z0-9_]*$/u.test(value) || result.optionId) throw new Error(`Invalid or duplicate option tag: ${value}`);
      result.optionId = value;
    } else if (EFFECT_TAG_KEYS.includes(key)) {
      continue;
    } else if (key === "call") {
      if (!(STORY_CALLS as readonly string[]).includes(value) || result.call) throw new Error(`Invalid or duplicate call tag: ${value}`);
      result.call = value as StoryCall;
    } else if (key === "translation") {
      if (result.translationJa) throw new Error("Duplicate translation tag");
      result.translationJa = value;
    } else if (key === "local_word") {
      if (!/^[a-z][a-z0-9_]*$/u.test(value)) throw new Error(`Invalid local_word tag: ${value} (write # local_word: <word ID>)`);
      if (context.localWordIds && !context.localWordIds.includes(value))
        throw new Error(`Unknown local word: ${value} (not in learning/local-words.json)`);
      if (result.localWordIds?.includes(value)) throw new Error(`Duplicate local_word tag: ${value}`);
      result.localWordIds = [...(result.localWordIds ?? []), value];
    } else if (key === "pause" || key === "shake" || key === "size") {
      result.delivery = readDelivery(key, value, result.delivery ?? {});
    } else if (key === "photo") {
      if (!context.photoIds?.includes(value))
        throw new Error(`Unknown photo image: ${value} (name an album image: the file name of public/assets/album/<ID>.webp, .png, .jpg or .jpeg of the story's journey)`);
      if (result.photo) throw new Error("Duplicate photo tag");
      result.photo = { imageId: value };
    } else if (key === "photo_caption") {
      if (caption !== undefined) throw new Error("Duplicate photo caption tag");
      caption = value;
    } else if (key === "recall") {
      if (!context.photoIds?.includes(value))
        throw new Error(`Unknown recall image: ${value} (name an album image, as # photo: does: the file name of public/assets/album/<ID>.webp, .png, .jpg or .jpeg)`);
      if (result.recall) throw new Error("Duplicate recall tag");
      result.recall = value;
    } else if (isSceneTagKey(key)) {
      readSceneTag(key, value, result);
    } else {
      throw new Error(`Unknown story tag: ${key}`);
    }
  }
  if (caption !== undefined) {
    if (!result.photo) throw new Error(`Photo caption without a photo: write # photo_caption: on the line of its # photo: (${caption})`);
    result.photo = { ...result.photo, caption };
  }
  if (result.phone && result.letter)
    throw new Error(`A line is a phone message or a letter, not both: # phone: ${result.phone} and # letter: ${result.letter}`);
  if (result.cutin && (result.speaker !== "enemy" && result.speaker !== "person"))
    throw new Error("# cutin: name shows the speaker's name: write # speaker: enemy or # speaker: <person ID> on the same line");
  if (result.cutin && (result.phone || result.letter))
    throw new Error("# cutin: name is for a line said in the scene, not a phone message or a letter");
  return result;
}
