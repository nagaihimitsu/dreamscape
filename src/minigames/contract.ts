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
  /**
   * The outcome a play that ends here takes instead when this one's choice cannot be taken now (a payment the player cannot
   * afford, or anything else that greys the choice), and that one's fallback in turn (fallback.ts). The build lets an
   * outcome whose choice is not always choosable only with fallbacks that reach one that is (docs/13 4.2).
   */
  fallback?: Outcome;
  /**
   * The finish word the host shows as the play ends (docs/13 2.6; 「そこまで！」 when left out): 「見つけた！」「アウト！」.
   * null: no word, flash or sound, only the short stop (a game that stands in for an attitude choice may want none).
   */
  finishJa?: string | null;
  /**
   * The heroine's reaction on the result card: her face (`kind`) and one of `linesJa` chosen by the play's seed
   * ({heroine_name} and {player_name} are filled in). Read the character bible first (AGENTS). None: no face on the card.
   */
  reaction?: { kind: MiniGameReaction; linesJa?: readonly string[] };
}

/** How a game is played, for the hand on the instruction card (host/HandDemo.tsx). */
export type MiniGameControl = "tap" | "tap-target" | "drag" | "timing" | "rhythm";

/**
 * The heroine's quick reactions (react, an outcome's `reaction`) and the face each shows (her standing art's emotion):
 * cheer → happy, surprise → surprised_big, laugh → teasing_big, tease → teasing, oops → surprised.
 */
export type MiniGameReaction = "cheer" | "surprise" | "laugh" | "tease" | "oops";

/** A game's music while it plays (docs/13 2.11): the scene's track, or a shared mini-game track (host/music.ts; a rhythm game keeps "scene": its beat is its music). */
export type MiniGameMusic = "scene" | "calm" | "bright";

/** Who starts the play's time: the host's 3・2・1・スタート, the game's own count in its field, or no count (a search). */
export type MiniGameCountdown = "host" | "own" | "none";

/**
 * How well a play went, for the result card only (rules.rate): one to three ★ and a score line whose first number
 * counts up from 0 (「13個食べた」「丸さ 82%」「0.04秒差」). Never saved, never passed to Ink (docs/13 4.1).
 */
export interface MiniGameRating {
  stars: 1 | 2 | 3;
  scoreJa?: string;
}

/** What `end` may say besides the outcome. */
export interface MiniGameEndOptions {
  /** The play's record (what rules.outcomeOf read): the host rates it with rules.rate for the result card's ★. */
  record?: unknown;
  /**
   * The field still shows what happened for this long (the ball flying, the bricks falling): the host's finish runs over
   * it and the result card comes after it (or after the finish, whichever is later). The clock runs on; input is over.
   */
  holdMs?: number;
}

/**
 * The host's juice toolkit (docs/13 2.6, group3 6.4): small moments of impact a game calls on contact, success or a miss.
 * With `still` (less motion) shake, flash, burst and squash do nothing, hitStop only stops time, denied only sounds.
 */
export interface MiniGameJuice {
  /** Time stands still (40–150 ms, 90 by default); `target` (the thing hit) shivers ±3 px meanwhile. */
  hitStop(ms?: number, target?: Element | null): void;
  /** The play shakes: s (2 px, up and down), m (4 px), l (8 px), easing out. */
  shake(level?: "s" | "m" | "l"): void;
  /** A short two-tone flash, light then dark (never plain white); `big` twice. */
  flash(kind?: "hit" | "big"): void;
  /** A few particles (at most 6, a dark 2 px edge, gone in 400 ms) from an element's centre or a point of the stage (0–1). */
  burst(at: Element | { x: number; y: number } | null, kind?: "star" | "ring" | "dust" | "splash", size?: number): void;
  /** Squash and stretch: press (0.94), land or pop (1.18 × 0.85 → 0.92 × 1.08 → 1). */
  squash(target: Element | null, kind?: "press" | "land" | "pop"): void;
  /** A press that cannot act (no dead taps): a small refusal wiggle and its sound. */
  denied(target: Element | null): void;
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
  /** 「おまかせ」: play to this outcome with rules.autoRecord's record, by itself (an available one: the host follows its fallbacks). */
  auto: Outcome | null;
  /**
   * The outcomes whose choices can be taken now (every one unless something greys a choice, such as a payment the player
   * cannot afford). A play that ends on another takes its declared fallback (the host does it: availableOutcome in
   * fallback.ts); a skin may show it (a price the player cannot pay drawn as lowered).
   */
  available: readonly Outcome[];
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
  /**
   * Plays one of the definition's `sounds` (the settings' sound switch and volume apply), at a share of its volume and a
   * playback rate if asked (`{ volume: 0.35 }` a fading echo, `{ rate: 0.85 }` lower and longer).
   */
  sound(id: string, level?: { volume?: number; rate?: number }): void;
  vibrate(kind: VibrationKind): void;
  /** A short text in the host's top band (「2/3」「のこり8秒」), read out politely. */
  status(textJa: string): void;
  /**
   * The play is over: the host's finish (stop, flash, 「そこまで！」), then the result card (the outcome's label, `detailJa`
   * or the rating's score, ★ from rules.rate of `options.record`), then its choice. Call it at the moment the outcome is
   * decided, with `holdMs` for what the field still shows; input to the play is dropped from then on.
   */
  end(outcome: Outcome, detailJa?: string, options?: MiniGameEndOptions): void;
  /** 練習: the same play, labelled, whose outcome the story never takes. */
  practice: boolean;
  /** The host's juice toolkit (also from useMiniGameKit() deep in a skin's field). */
  juice: MiniGameJuice;
  /** The heroine reacts: her face (and `lineJa` in a bubble) for a moment, at most once in 1.5 s; her figure (cast) takes the face. */
  react(kind: MiniGameReaction, lineJa?: string): void;
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
  /**
   * How well a play went (optional; no rate: no ★): ★1–3 and a score line, or null for a record not rated. Pure, and in
   * step with outcomeOf (a better outcome never has fewer ★). A game that stands in for an attitude choice has none
   * (AGENTS: no right answer).
   */
  rate?(record: PlayRecord, params: Params): MiniGameRating | null;
}

/** A game's tuning (E1): its one named object of numbers (windows, times, thresholds), in its rules' code. */
export type MiniGameTuning = Readonly<Record<string, number>>;

/** What a game's `load()` gives: its play and its rules, in a file of their own. */
export interface MiniGameModule<Params = unknown, Outcome extends string = string> {
  Play: ComponentType<MiniGamePlayProps<Params, Outcome>>;
  // The record's type is the game's own: the host only passes it between the play and the rules.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules: MiniGameRules<Params, Outcome, any>;
  /** The game's tuning (optional): Debug's room shows each number and plays `retune` of the edited ones. */
  tuning?: MiniGameTuning;
  /** The same play and rules with another tuning (Debug's room only; never in a story). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retune?(tuning: any): Pick<MiniGameModule<Params, Outcome>, "Play" | "rules">;
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
  /** How to play, in a few words, over the start button (the instruction card's line when it has no `goalJa`). */
  hintJa: string;
  /**
   * The instruction card's one line: what to do and how (「扉を押して彼女を探す（呼んでも、待ってもいい）」); `hintJa`
   * when left out.
   */
  goalJa?: string;
  /** The hand on the instruction card (a small animated hand; still with less motion). None: no hand. */
  controls?: MiniGameControl;
  /** About how long a play takes (the card says 「約N秒」); none for a play without a length (a search). */
  durationSec?: number;
  /**
   * 「練習する」 before the real play (the same play, labelled 「練習」, its outcome never taken), with these keys over the
   * tag's own. false (the default): none — so for a game that stands in for an attitude choice.
   */
  practice?: false | { params?: MiniGameRawParams };
  /** Who counts the play in: "host" (3・2・1・スタート, the clock starts on スタート), "own" or "none" (the default). */
  countdown?: MiniGameCountdown;
  /** The music while it plays: the scene's (the default) or a shared mini-game track, crossfaded in at スタート. */
  music?: MiniGameMusic;
  /** The result card sits low (the default, over the controls) or high, to keep the field's key picture in view. */
  resultAnchor?: "top" | "bottom";
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
