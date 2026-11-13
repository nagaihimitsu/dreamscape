import { z } from "zod";
import type { TagContext } from "../content/tags";
import type { AnyMiniGameDefinition } from "./contract";
import { MINI_GAMES, miniGameDefinition } from "./registry";
import { MINI_GAME_ART_SPRITE_EXTENSIONS } from "./art";

// A line's `# minigame:` (docs/13 3.1), one form for every game:
//   # minigame: <gameId> [auto <outcome>] [prefix <word>] [bg <backgroundId>] [art.<slot> <imageId>] [<key> <value>]…
// auto, prefix, bg and art.<slot> are the host's keys; every other key is the game's own, read by its zod (definition
// `params`). The game takes the place of the choice set right after the line: it takes the choice whose `# option:` is
// its outcome (or `<prefix>_<outcome>`). Light module: src/content/tags.ts, the story reader and content:build read it.

/** A line's `# minigame:` as the frame keeps it (and the save): the words as written, the game's keys as strings. */
export interface MiniGameTag {
  id: string;
  /** 「おまかせ」's outcome: the tag's `auto`, else the game's defaultAuto. */
  auto: string;
  /** `prefix again`: the choice set's option IDs are `again_<outcome>`. */
  prefix?: string;
  /** `bg <backgroundId>`: the picture behind the play (a background `# background:` may name); else the scene's own. */
  bg?: string;
  /**
   * `art.<slot> <imageId>`: the skin's pictures from the journey: a mini-game picture (public/assets/minigames/<imageId>.*),
   * or in a backdrop slot a tourism photo (its catalog asset ID; miniGameArtPath).
   */
  art?: Readonly<Record<string, string>>;
  /** The game's own keys, as written. */
  params?: Readonly<Record<string, string>>;
}

/** A tag's prefix: lowercase letters and digits (the option IDs are `<prefix>_<outcome>`). */
export const MINI_GAME_PREFIX = /^[a-z][a-z0-9]*$/u;
/** A game's own key (and an art slot's ID): lowercase letters, digits and `_`. */
export const MINI_GAME_KEY = /^[a-z][a-z0-9_]*$/u;
/** The host's keys, never a game's own. */
export const MINI_GAME_HOST_KEYS = ["auto", "prefix", "bg"] as const;
/** The host's key of an art slot: `art.<slot>`. */
const ART_KEY = /^art\.([a-z][a-z0-9_]*)$/u;
const FORM = "# minigame: <game> [auto <outcome>] [prefix <word>] [bg <background>] [art.<slot> <image>] [<key> <value>]…";


/** The game's own keys and their descriptions (its zod object's shape), for messages and Debug's room. */
export function miniGameParamKeys(definition: AnyMiniGameDefinition, context: TagContext): { key: string; descriptionJa: string }[] {
  const schema = definition.params(context);
  if (!(schema instanceof z.ZodObject)) return [];
  return Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, value]) => ({ key, descriptionJa: value.description ?? "" }));
}

/** The outcome IDs of a game, in its order. */
export function miniGameOutcomeIds(id: string): string[] {
  return miniGameDefinition(id)?.outcomes.map((outcome) => outcome.id) ?? [];
}

/** The `# option:` ID of an outcome's choice: the outcome, after the tag's prefix and `_` when it has one. */
export const miniGameOptionId = (tag: Pick<MiniGameTag, "prefix">, outcome: string): string => (tag.prefix ? `${tag.prefix}_${outcome}` : outcome);

/**
 * The choice an outcome takes: the frame's choice whose option ID is the outcome's (miniGameOptionId); undefined when the
 * choice set has none (content:build stops such a set).
 */
export function miniGameChoice<T extends { index: number; optionId?: string }>(choices: readonly T[], tag: Pick<MiniGameTag, "prefix">, outcome: string): T | undefined {
  const optionId = miniGameOptionId(tag, outcome);
  return choices.find((choice) => choice.optionId === optionId);
}

/**
 * The served path of the picture an art slot names (`art.<slot> <imageId>`): the mini-game picture of that ID, else the
 * tourism photo (a backdrop slot's; parseMiniGameTag checks which slot may take which); undefined when neither has it.
 */
export function miniGameArtPath(context: Pick<TagContext, "miniGameArt" | "miniGamePhotos">, imageId: string): string | undefined {
  return context.miniGameArt?.[imageId] ?? context.miniGamePhotos?.[imageId];
}

/**
 * Read a `# minigame:` value. Throws (the message says how to write it) for an unknown game, a key without a value, a
 * repeated key, an unknown key (with the game's keys), an `auto` that is not an outcome, a prefix that is not lowercase
 * letters and digits, a `bg` the context's backgrounds lack, an art slot the game lacks, an image neither the context's
 * mini-game art nor its tourism photos have (a sprite must be a mini-game picture, webp or png; a photo fills a backdrop
 * slot only), and the game's keys its zod refuses. Lists absent from the context are not checked. `games`: the registry
 * (a test passes its own).
 */
export function parseMiniGameTag(value: string, context: Partial<TagContext> = {},
  games: Readonly<Record<string, AnyMiniGameDefinition>> = MINI_GAMES): MiniGameTag {
  const [id, ...words] = value.trim().split(/\s+/u);
  const definition = id && Object.hasOwn(games, id) ? games[id] : undefined;
  if (!id || !definition)
    throw new Error(`Unknown minigame: ${id ?? ""} (write ${FORM}; games: ${Object.values(games).map((game) => `${game.id}（${game.titleJa}）`).join(", ")})`);
  const fullContext = { effectIds: [], backgroundIds: [], emotionIds: [], ...context } as TagContext;
  const keys = miniGameParamKeys(definition, fullContext);
  const keyHelp = () => [
    ...keys.map((item) => `${item.key}: ${item.descriptionJa}`),
    ...definition.artSlots.map((slot) => `art.${slot.id}: ${slot.labelJa}`),
    "auto, prefix, bg",
  ].join("; ");
  const outcomes = definition.outcomes.map((outcome) => outcome.id);
  const tag: MiniGameTag = { id, auto: definition.defaultAuto };
  const art: Record<string, string> = {};
  const params: Record<string, string> = {};
  const seen = new Set<string>();
  for (let index = 0; index < words.length; index += 2) {
    const key = words[index];
    const word = words[index + 1];
    if (word === undefined) throw new Error(`# minigame: ${id}: the key ${key} has no value (write ${FORM})`);
    if (seen.has(key)) throw new Error(`# minigame: ${id}: the key ${key} is written twice (each key once)`);
    seen.add(key);
    const slot = ART_KEY.exec(key)?.[1];
    if (key === "auto") {
      if (!outcomes.includes(word)) throw new Error(`Unknown outcome of the minigame ${id}: auto ${word} (its outcomes: ${outcomes.join(", ")})`);
      tag.auto = word;
    } else if (key === "prefix") {
      if (!MINI_GAME_PREFIX.test(word)) throw new Error(`Invalid minigame prefix: ${word} (lowercase letters and digits, like prefix again: the option IDs are again_<outcome>)`);
      tag.prefix = word;
    } else if (key === "bg") {
      if (context.backgroundIds && !context.backgroundIds.includes(word))
        throw new Error(`Unknown background of the minigame ${id}: bg ${word} (a background the scene's # background: may name)`);
      tag.bg = word;
    } else if (slot !== undefined) {
      const declared = definition.artSlots.find((item) => item.id === slot);
      if (!declared) throw new Error(`Unknown art slot of the minigame ${id}: ${key} (${definition.artSlots.length
        ? `its slots: ${definition.artSlots.map((item) => `art.${item.id}: ${item.labelJa}`).join("; ")}` : "it has no art slots"})`);
      const path = context.miniGameArt?.[word];
      const photo = path === undefined ? context.miniGamePhotos?.[word] : undefined;
      if ((context.miniGameArt || context.miniGamePhotos) && path === undefined && photo === undefined)
        throw new Error(`Unknown minigame art: ${key} ${word} (an image public/assets/minigames/${word}.<webp|png|jpg|jpeg> of the scene's journey, ` +
          `listed in its presentation/own-artwork.json; a backdrop slot may also name a photo of its tourism/catalog.json assets)`);
      if (photo !== undefined && declared.kind === "sprite")
        throw new Error(`The minigame art ${word} of ${key} is a tourism photo: art.${slot} is a figure on the field, so a webp or png with a ` +
          `transparent background in public/assets/minigames/ (a photo fills a backdrop slot only)`);
      if (path !== undefined && declared.kind === "sprite" && !MINI_GAME_ART_SPRITE_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(`.${extension}`)))
        throw new Error(`The minigame art ${word} of ${key} is ${path}: art.${slot} is a figure on the field, so a webp or png with a transparent background`);
      art[slot] = word;
    } else if (MINI_GAME_KEY.test(key) && keys.some((item) => item.key === key)) {
      params[key] = word;
    } else {
      throw new Error(`Unknown key of the minigame ${id}: ${key} (its keys: ${keyHelp()})`);
    }
  }
  if (Object.keys(params).length || keys.length) {
    const read = definition.params(fullContext).safeParse(params);
    if (!read.success) {
      const issue = read.error.issues[0];
      const key = String(issue.path[0] ?? "");
      const help = keys.find((item) => item.key === key)?.descriptionJa;
      throw new Error(`Invalid ${key ? `${key} ` : ""}of the minigame ${id}: ${issue.message}${help ? ` (${key}: ${help})` : ""}`);
    }
  }
  if (Object.keys(art).length) tag.art = art;
  if (Object.keys(params).length) tag.params = params;
  return tag;
}

/** A tag written back as its value (keys in a fixed order), the inverse of parseMiniGameTag. */
export function miniGameTagText(tag: MiniGameTag): string {
  const sorted = (record: Readonly<Record<string, string>> | undefined) => Object.entries(record ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return [tag.id, "auto", tag.auto, ...(tag.prefix ? ["prefix", tag.prefix] : []), ...(tag.bg ? ["bg", tag.bg] : []),
    ...sorted(tag.art).flatMap(([slot, image]) => [`art.${slot}`, image]), ...sorted(tag.params).flat()].join(" ");
}

/** Whether a saved frame's tag is one the tag reader gives now (a registered game, its keys valid in the context). */
export function isValidMiniGameTag(tag: MiniGameTag, context: Partial<TagContext> = {}): boolean {
  try {
    return miniGameTagText(parseMiniGameTag(miniGameTagText(tag), context)) === miniGameTagText(tag);
  } catch {
    return false;
  }
}

/** The tag's game keys read by the game's zod (what the play is given); throws when they no longer read. */
export function miniGameParams(tag: MiniGameTag, context: TagContext): unknown {
  const definition = miniGameDefinition(tag.id);
  if (!definition) throw new Error(`Unknown minigame: ${tag.id}`);
  return definition.params(context).parse(tag.params ?? {});
}

