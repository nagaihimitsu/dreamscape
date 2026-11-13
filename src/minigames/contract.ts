import type { ComponentType, ReactNode } from "react";
import type { z } from "zod";
import type { TagContext } from "../content/tags";
import type { VibrationKind } from "../audio/vibration";

// The contract of a mini-game (docs/13 2.3–2.5): what a game's folder (src/minigames/<gameId>/) gives the shared host
// and the build. A light module (types and one identity function): the definitions that use it are part of the title
// page's load; a game's play, rules, CSS and art come later through `load()`.

/** A game's ID, its folder's name and the first word of `# minigame:`; saved with the frame, so never changed once published. */
export const MINI_GAME_ID = /^[a-z][a-z0-9_]*$/u;
/** An outcome's ID: the `# option:` of its choice (or `<prefix>_<outcome>`). */
export const MINI_GAME_OUTCOME_ID = /^[a-z][a-z0-9_]*$/u;

/** One way a game can end: the choice it takes, and the words the result shows, is read out with and Debug's button names. */
export interface MiniGameOutcomeDefinition<Outcome extends string = string> {
  id: Outcome;
  labelJa: string;
  /** For writers: when this happens (Debug's 「ミニゲームの見本」 shows it). */
  noteJa?: string;
}

/**
 * A picture of a skin that a use may take from its journey (`art.<slot> <imageId>`; 2026-11-13 user decision: 「背景はあった方が
 * 盛り上がる」): a file of the journey's public/assets/minigames/, listed in its own-artwork.json. Without it, the skin draws
 * its CSS look. `backdrop`: a picture behind the field (any image type); `sprite`: a figure on the field (webp or png,
 * transparent around it).
 */
export interface MiniGameArtSlot {
  id: string;
  kind: "backdrop" | "sprite";
  /** What the picture shows, for writers and the illustrator (Debug's room and the build's messages show it). */
  labelJa: string;
}

/** A tag's words for the game's own keys, as written (`level easy`): strings; the game's zod reads them. */
export type MiniGameRawParams = Readonly<Record<string, string>>;

/** What a game's play is given, through its whole play (docs/13 2.5). */
export interface MiniGamePlayProps<Params = unknown, Outcome extends string = string> {
  /** The tag's own keys, read by the game's zod. */
  params: Params;
  /** 「おまかせ」: play to this outcome with rules.autoRecord's record, by itself. */
  auto: Outcome | null;
  /** Less motion (「演出を短縮する」 or the device's setting): no flourishes; what the play needs still moves (drawn from the clock). */
  still: boolean;
  /** For looks only (seededRandom): never in the rules. Fixed by the save, so a reload looks the same. */
  seed: number;
  clock: PlayClock;
  /** Who is on the scene's stage: the heroine's figure, and the person speaking (if any). */
  cast: MiniGameCast;
  /** The names as written (draw them as React text only). */
  names: { player: string; heroine: string };
  /** The served URLs of the art slots the use fills (`art.<slot>`); a slot left out draws its CSS look. */
  art: Readonly<Record<string, string>>;
  /** Plays one of the definition's `sounds` (the settings' sound switch and volume apply). */
  sound(id: string): void;
  vibrate(kind: VibrationKind): void;
  /** A short text in the host's top band (「2/3」「のこり8秒」), read out politely. */
  status(textJa: string): void;
  /** The play is over: the host shows the outcome's label (and `detailJa` under it), then takes its choice. */
  end(outcome: Outcome, detailJa?: string): void;
}

export interface MiniGameCast {
  heroine: ReactNode;
  person?: ReactNode;
}

/**
 * The host's clock (docs/13 2.7): the play's time in milliseconds, stopped while the page is hidden (and while 「続ける」
 * waits). A game reads time only here, never performance.now() or setTimeout.
 */
export interface PlayClock {
  /** Milliseconds since the play started, the stopped time left out. */
  now(): number;
  /** An input event's time (event.timeStamp) on the same measure. */
  at(timeStamp: number): number;
  /** Calls `callback(now)` once a frame while the clock runs; returns the unsubscribe. */
  onFrame(callback: (ms: number) => void): () => void;
  /** Calls `callback` once the clock has run `ms` more milliseconds; returns the cancel. */
  after(ms: number, callback: () => void): () => void;
}

/** A game's rules (docs/13 2.4): pure functions of a play's record and the tag's params. */
export interface MiniGameRules<Params, Outcome extends string, PlayRecord> {
  /** The outcome of a play: one of the definition's outcomes for every record. */
  outcomeOf(record: PlayRecord, params: Params): Outcome;
  /** 「おまかせ」: a record whose outcome is `outcome` (outcomeOf(autoRecord(o, p), p) === o). */
  autoRecord(outcome: Outcome, params: Params): PlayRecord;
}

/** What a game's `load()` gives: its play and its rules, in a file of their own. */
export interface MiniGameModule<Params = unknown, Outcome extends string = string> {
  Play: ComponentType<MiniGamePlayProps<Params, Outcome>>;
  // The record's type is the game's own: the host only passes it between the play and the rules.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules: MiniGameRules<Params, Outcome, any>;
}

/** A game's definition (docs/13 2.3): light, in the title page's load. */
export interface MiniGameDefinition<Params = unknown, Outcome extends string = string> {
  id: string;
  /** The engine it is a skin of (src/minigames/engines/<engine>/). */
  engine: string;
  titleJa: string;
  /** How it is played, in a sentence (Debug's room, the build's game list). */
  howToJa: string;
  /** Two or more; their IDs are the `# option:` of the choices it takes. */
  outcomes: readonly MiniGameOutcomeDefinition<Outcome>[];
  /** 「おまかせ」's outcome when the tag names none. */
  defaultAuto: Outcome;
  /**
   * The tag's own keys: a strict zod object, each key `.describe()`d in Japanese, values read from words (z.coerce.number()
   * for a number). The build's context lists what IDs may be named; at run time only what the game knows is checked.
   * Never the host's keys (auto, prefix, bg, art.<slot>).
   */
  params: (context: TagContext) => z.ZodType<Params>;
  /** Params to show and test it with (Debug's room, the rules template); `{}` first when it needs none. */
  examples: readonly MiniGameRawParams[];
  /** The start button, where the choices would be. */
  startJa: string;
  /** How to play, in a few words, over the start button. */
  hintJa: string;
  /** Played against time: a hidden page pauses it with 「続ける」. */
  timed: boolean;
  /** How to play with keys; null: not by keys (the host says ⚙設定's おまかせ is there). */
  keysJa: string | null;
  /** The shared sounds (content/presentation/sounds.json) its play rings. */
  sounds: readonly string[];
  /** Lower the scene's music and ambience while it plays (a rhythm game). */
  quietScene: boolean;
  /** Its own art files in the root public/ (served paths, listed in content/presentation/own-artwork.json); most draw with CSS and SVG. */
  art: readonly string[];
  /** The pictures a use may give it from its journey (`art.<slot>`); none: the skin's CSS look only. */
  artSlots: readonly MiniGameArtSlot[];
  load: () => Promise<MiniGameModule<Params, Outcome>>;
}

/** A definition of any game, as the registry holds them (its params and outcomes are the game's own). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiniGameDefinition = MiniGameDefinition<any, any>;

/** Writes a game's definition (the identity: it gives the outcome IDs their type). */
export function defineMiniGame<Params, const Outcome extends string>(definition: MiniGameDefinition<Params, Outcome>): MiniGameDefinition<Params, Outcome> {
  return definition;
}
