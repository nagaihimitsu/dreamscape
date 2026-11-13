import { REACTION_MARKS, type DialogueReaction, type ReactionTarget } from "./dialogue-reactions";
import { VOICE_ID } from "./voice-files";
import { SOUND_ID } from "./sounds";
import { parseMiniGameTag, type MiniGameTag } from "../minigames/tag";

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
  /**
   * Whether a line may start a mini-game (`# minigame:`; docs/13 1.3): content:build's full-branch walk (scene-walk.ts)
   * says true, every other reading false, a confession date "confession" (refused, docs/13 1.4); absent: allowed (the
   * game reads only what content:build passed).
   */
  miniGames?: boolean | "confession";
  /**
   * The mini-game pictures a `# minigame:`'s `art.<slot>` may name (ID → served path; src/minigames/art.ts): content:build
   * gives a scene its journey's and the root's; absent: not checked.
   */
  miniGameArt?: Readonly<Record<string, string>>;
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
  /** `# pause:`, `# shake:`, `# size:`, `# em:` and `# em_shake:`: how the line is shown (presentation only). */
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
  /** `# voice: <ID>`: the recording of the line, a journey's public/assets/voice/<ID>.mp3 (the line it is written on only). */
  voiceId?: string;
  /** `# se: <ID>`: a sound effect played as the line starts, a registered public/assets/se/<ID>.mp3 (the line it is written on only). */
  seId?: string;
  /**
   * `# bgm: <ID>` / `# bgm: stop` / `# bgm: default`: the scene's music from this line on (a registered track, silence,
   * or the scene's usual track again; frame-reader.ts keeps it to the scene's end).
   */
  bgm?: string;
  /** `# item_show: <item ID>`: the item's card over the scene while the line is on screen (the line it is written on only). */
  itemShow?: string;
  /** `# weather: <kind>` / `# weather: stop`: the scene's weather from this line on (frame-reader.ts keeps it to the scene's end). */
  weather?: WeatherKind | typeof WEATHER_STOP;
  /** `# tint: off` / `# tint: on`: the colour of the time of day over the scene's picture, off or back on from this line. */
  tint?: TintSwitch;
  /** `# ambience: <ID>` / `# ambience: stop` / `# ambience: default`: the scene's ambience from this line on (as `# bgm:`). */
  ambience?: string;
  /** `# minigame: <game> [auto <outcome>] [prefix <word>] [bg …] [art.<slot> …] [<key> <value>]…`: the choice set right after the line is played (src/minigames/tag.ts). */
  minigame?: MiniGameTag;
  effects: string[];
}

/**
 * The scene's atmosphere tags (2026-11-13 user decision), presentation only, each from its line to the scene's end
 * (frame-reader.ts): `# weather:` a light layer of rain, drifting dust, floating colour powder or falling petals over the
 * scene's picture (`stop` ends it), `# tint:` the colour of the time of day over the picture (`off` for a picture that
 * already shows its own evening or night, `on` again), `# ambience:` the sound of the place under the music
 * (src/content/ambience.ts; `stop` silence, `default` the place's own again).
 */
export const WEATHER_KINDS = ["rain", "dust", "colors", "petals"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];
export const WEATHER_STOP = "stop";
export const TINT_SWITCHES = ["off", "on"] as const;
export type TintSwitch = (typeof TINT_SWITCHES)[number];
/** An item's ID as `# item_show:` names it (content:build checks that the item exists in the story's journey). */
export const ITEM_ID = /^[a-z][a-z0-9_]*$/u;

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
 * with an optional `# photo_caption: <text>` among the same line's tags. `# photo_show: large` (2026-11-12) shows the
 * picture large over the scene while the line is on screen (LineStage's PhotoShowLayer), as the writer's staging of a
 * high point; without it the photo goes into the album with the small card only.
 */
export interface StoryPhoto {
  imageId: string;
  caption?: string;
  show?: "large";
}

/**
 * How one line is shown, from its tags (presentation only; never the story or the game state):
 * `# pause: 600` waits that many milliseconds before its text starts (a tap shows it at once),
 * `# shake: window` shakes the dialogue window once, `# shake` (or `# shake: small`, `# shake: large`) the scene itself
 * once (its picture and its people; 2026-11-13), `# size: large` shows its text larger, `# em: <語>` shows the first <語>
 * of its text emphasised and `# em_shake: <語>` makes the first <語> tremble (2026-11-13; content:build checks that the
 * line's text has the word: scripts/line-emphasis.ts).
 */
export interface LineDelivery {
  pauseMs?: number;
  shake?: true;
  sceneShake?: SceneShakeSize;
  large?: true;
  em?: string;
  emShake?: string;
}
/** How hard a line's scene shake is: `# shake: small`, `# shake` alone (`normal`), `# shake: large`. */
export const SCENE_SHAKE_SIZES = ["small", "normal", "large"] as const;
export type SceneShakeSize = (typeof SCENE_SHAKE_SIZES)[number];
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
    // `# shake: window` shakes the dialogue window; `# shake` alone (value "") and its sizes the scene. One line may have both.
    if (value === "window") {
      if (delivery.shake) throw new Error("Duplicate shake tag");
      return { ...delivery, shake: true };
    }
    const size = value === "" ? "normal" : value === "small" || value === "large" ? value : undefined;
    if (!size) throw new Error(`Invalid shake tag: ${value} (write # shake, # shake: small, # shake: large or # shake: window)`);
    if (delivery.sceneShake) throw new Error("Duplicate shake tag");
    return { ...delivery, sceneShake: size };
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
  let show: "large" | undefined;
  for (const tag of tags) {
    const bare = tag.trim();
    if (bare === "later") continue;
    // `# shake` alone: the scene's shake (2026-11-13).
    if (bare === "shake") {
      result.delivery = readDelivery("shake", "", result.delivery ?? {});
      continue;
    }
    const separator = tag.indexOf(":");
    const key = separator < 0 ? bare : tag.slice(0, separator).trim();
    const value = separator < 0 ? "" : tag.slice(separator + 1).trim();
    if (key === "item_show" && !value)
      throw new Error("Invalid item_show tag: name the item (write # item_show: <item ID>, an item of encounters/catalog.json)");
    if ((key === "em" || key === "em_shake") && !value)
      throw new Error(`Invalid ${key} tag: name the word (write # ${key}: <a word of the line>)`);
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
    } else if (key === "photo_show") {
      if (value !== "large") throw new Error(`Invalid photo_show tag: ${value} (write # photo_show: large)`);
      if (show !== undefined) throw new Error("Duplicate photo_show tag");
      show = value;
    } else if (key === "recall") {
      if (!context.photoIds?.includes(value))
        throw new Error(`Unknown recall image: ${value} (name an album image, as # photo: does: the file name of public/assets/album/<ID>.webp, .png, .jpg or .jpeg)`);
      if (result.recall) throw new Error("Duplicate recall tag");
      result.recall = value;
    } else if (key === "voice") {
      // The file is checked by content:build (scripts/voice-files.ts), which knows each journey's voices.
      if (!VOICE_ID.test(value))
        throw new Error(`Invalid voice tag: ${value} (write # voice: <ID>, the file name of public/assets/voice/<ID>.mp3: a-z, 0-9 and _)`);
      if (result.voiceId) throw new Error("Duplicate voice tag");
      result.voiceId = value;
    } else if (key === "se") {
      // The sound is checked by content:build (scripts/sound-files.ts), which knows the registered sounds.
      if (!SOUND_ID.test(value))
        throw new Error(`Invalid se tag: ${value} (write # se: <ID>, a sound of presentation/sounds.json, the file name of public/assets/se/<ID>.mp3: a-z, 0-9 and _)`);
      if (result.seId) throw new Error("Duplicate se tag");
      result.seId = value;
    } else if (key === "bgm") {
      // The track is checked by content:build (scripts/music-files.ts), which knows the registered tracks; `stop` and
      // `default` have the same form.
      if (!SOUND_ID.test(value))
        throw new Error(`Invalid bgm tag: ${value} (write # bgm: <ID>, a track of presentation/music.json, the file name of public/assets/bgm/<ID>.mp3; or # bgm: stop, # bgm: default)`);
      if (result.bgm) throw new Error("Duplicate bgm tag");
      result.bgm = value;
    } else if (key === "item_show") {
      // The item and its journey are checked by content:build (scripts/scene-effect-tags.ts), which knows each item's city.
      if (!ITEM_ID.test(value)) throw new Error(`Invalid item_show tag: ${value} (write # item_show: <item ID>, an item of encounters/catalog.json)`);
      if (result.itemShow) throw new Error("Duplicate item_show tag");
      result.itemShow = value;
    } else if (key === "weather") {
      if (!(WEATHER_KINDS as readonly string[]).includes(value) && value !== WEATHER_STOP)
        throw new Error(`Invalid weather tag: ${value} (write ${[...WEATHER_KINDS, WEATHER_STOP].map((item) => `# weather: ${item}`).join(", ")})`);
      if (result.weather) throw new Error("Duplicate weather tag");
      result.weather = value as WeatherKind | typeof WEATHER_STOP;
    } else if (key === "tint") {
      if (!(TINT_SWITCHES as readonly string[]).includes(value)) throw new Error(`Invalid tint tag: ${value} (write # tint: off or # tint: on)`);
      if (result.tint) throw new Error("Duplicate tint tag");
      result.tint = value as TintSwitch;
    } else if (key === "ambience") {
      // The track is checked by content:build (scripts/ambience-files.ts), which knows the registered tracks; `stop` and
      // `default` have the same form.
      if (!SOUND_ID.test(value))
        throw new Error(`Invalid ambience tag: ${value} (write # ambience: <ID>, a track of presentation/ambience.json, the file name of public/assets/ambience/<ID>.mp3; or # ambience: stop, # ambience: default)`);
      if (result.ambience) throw new Error("Duplicate ambience tag");
      result.ambience = value;
    } else if (key === "em" || key === "em_shake") {
      // The word is checked against the line's text by content:build (scripts/line-emphasis.ts), which reads the source.
      if ((key === "em" ? result.delivery?.em : result.delivery?.emShake) !== undefined) throw new Error(`Duplicate ${key} tag`);
      result.delivery = key === "em" ? { ...result.delivery, em: value } : { ...result.delivery, emShake: value };
    } else if (isSceneTagKey(key)) {
      readSceneTag(key, value, result);
    } else if (key === "minigame") {
      // Where it may run and what follows it (a choice set of its outcomes) are content:build's (scripts/scene-walk.ts).
      if (context.miniGames === "confession")
        throw new Error(`# minigame: ${value}: no mini-game in a confession date: her answer must never look decided by skill or luck ` +
          "(docs/13 1.4); write it in a scene before or after it (# at: date <the confession>)");
      if (context.miniGames === false)
        throw new Error(`# minigame: ${value}: a mini-game runs at a choice set of a scene written in a place file (stories/places/: a date, ` +
          "a talk or encounter, a guide, an arrival, an epilogue, a tour leg or a battle's talk, in its knot or a helper knot it calls), " +
          "not in a catalog encounter, a one-scene date, a scene without choices or a quiz's or reasoning's call (docs/13 1.3)");
      if (result.minigame) throw new Error("Duplicate minigame tag");
      result.minigame = parseMiniGameTag(value, context);
    } else {
      throw new Error(`Unknown story tag: ${key}`);
    }
  }
  if (caption !== undefined) {
    if (!result.photo) throw new Error(`Photo caption without a photo: write # photo_caption: on the line of its # photo: (${caption})`);
    result.photo = { ...result.photo, caption };
  }
  if (show !== undefined) {
    if (!result.photo) throw new Error("Photo show without a photo: write # photo_show: large on the line of its # photo:");
    result.photo = { ...result.photo, show };
  }
  if (result.phone && result.letter)
    throw new Error(`A line is a phone message or a letter, not both: # phone: ${result.phone} and # letter: ${result.letter}`);
  if (result.cutin && (result.speaker !== "enemy" && result.speaker !== "person"))
    throw new Error("# cutin: name shows the speaker's name: write # speaker: enemy or # speaker: <person ID> on the same line");
  if (result.cutin && (result.phone || result.letter))
    throw new Error("# cutin: name is for a line said in the scene, not a phone message or a letter");
  return result;
}
