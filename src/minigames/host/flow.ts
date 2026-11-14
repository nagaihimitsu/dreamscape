import type { MiniGameFinishTone, MiniGameRating, MiniGameReaction } from "../contract";
import type { VibrationKind } from "../../audio/vibration";
import { seededRandom } from "./seed";
import { MINI_GAME_COUNT_STEP_MS, MINI_GAME_FINISH_MS, MINI_GAME_GO_MS, MINI_GAME_START_GUARD_MS, MINI_GAME_VIBRATE_GAP_MS } from "./timing";

// The host's flow as pure functions (docs/13 2.6): the count before a play, the finish's strength, the result card's
// buttons and its counted score, the heroine's line and face. MiniGameHost.tsx draws them; the tests read them here.

/** What the host's count shows: 3, 2, 1 through the lead, 「スタート！」 for a moment after it, then nothing. */
export type CountPhase = "3" | "2" | "1" | "go" | null;

/** The count's phase from what is left of the lead and the play's time. */
export function countPhase(leadLeft: number, playMs: number): CountPhase {
  if (leadLeft > 2 * MINI_GAME_COUNT_STEP_MS) return "3";
  if (leadLeft > MINI_GAME_COUNT_STEP_MS) return "2";
  if (leadLeft > 0) return "1";
  return playMs < MINI_GAME_GO_MS ? "go" : null;
}

/**
 * The finish's tone: the outcome's own (`finishTone`), else by the play's ★ when it is rated (3: great, 2: good, 1:
 * plain), plain when it is not.
 */
export type FinishLevel = MiniGameFinishTone;
export const finishLevel = (rating: MiniGameRating | null | undefined, tone?: MiniGameFinishTone): FinishLevel =>
  tone ?? (rating?.stars === 3 ? "great" : rating?.stars === 2 ? "good" : "plain");

/**
 * The finish of each tone (group3 6.4): its stop, its flashes, its sound (content/presentation/sounds.json) and its
 * vibration. great and good ring the success chime; plain the end whistle (a near miss, a funny shape, time up); oops a
 * thud (a hole, a stumble).
 */
export const FINISH: Readonly<Record<FinishLevel, { stopMs: number; flashes: number; sound: string; vibration: VibrationKind }>> = {
  great: { stopMs: 120, flashes: 2, sound: "quiz_correct", vibration: "success" },
  good: { stopMs: 90, flashes: 1, sound: "quiz_correct", vibration: "success" },
  plain: { stopMs: 60, flashes: 1, sound: "whistle", vibration: "fail" },
  oops: { stopMs: 80, flashes: 1, sound: "impact_thud", vibration: "fail" },
};

/** Every sound the host's finish and result card may ring (preloaded as the instruction card shows: group2 N16). */
export const HOST_SOUNDS: readonly string[] = [...new Set([...Object.values(FINISH).map((finish) => finish.sound), "ui_tap", "ui_denied", "quiz_perfect", "applause"])];

/**
 * Whether a vibration now would double one just felt (group2 N11): the host's finish does not vibrate when the play
 * vibrated within MINI_GAME_VIBRATE_GAP_MS, nor the play just after the finish did.
 */
export const vibrationDoubles = (lastAt: number, now: number): boolean => now - lastAt < MINI_GAME_VIBRATE_GAP_MS;

/** The finish word: the outcome's own, 「そこまで！」 when it has none, nothing when it says null. */
export const finishWord = (finishJa: string | null | undefined): string | null => (finishJa === null ? null : finishJa ?? "そこまで！");

/** When the result card comes after `end`: after the finish word, or after the field's hold when that is longer. */
export const resultCardDelay = (holdMs: number | undefined): number => Math.max(MINI_GAME_FINISH_MS, holdMs && holdMs > 0 ? holdMs : 0);

/** A hit-stop's length: 40–150 ms, 90 when the game names none. */
export const hitStopMs = (ms: number | undefined): number => Math.min(150, Math.max(40, ms === undefined || !Number.isFinite(ms) ? 90 : ms));

/** A span on the screen, top to bottom (client pixels). */
export interface ScreenSpan { top: number; bottom: number }
/** The result card goes compact when it would cover more than this much of the play's field (its key picture)… */
export const RESULT_CARD_MAX_COVER = 0.45;
/** …or the play's layer is this short or shorter (a short phone: 320 × 568, 360 × 640, 375 × 667). */
export const RESULT_CARD_SHORT_PX = 700;

/**
 * Whether the result card is compact (★ beside its label, a small face beside the score and her line, tighter, buttons
 * still 44 px): on a short layer, or when the full card would cover more than RESULT_CARD_MAX_COVER of the field.
 */
export function resultCardCompact({ card, field, layerHeight }: { card: ScreenSpan; field?: ScreenSpan; layerHeight: number }): boolean {
  if (layerHeight > 0 && layerHeight <= RESULT_CARD_SHORT_PX) return true;
  if (!field || field.bottom <= field.top) return false;
  const overlap = Math.max(0, Math.min(card.bottom, field.bottom) - Math.max(card.top, field.top));
  return overlap / (field.bottom - field.top) > RESULT_CARD_MAX_COVER;
}

/** What the result card offers. */
export interface ResultButtons {
  /** 「次へ」: take the outcome's choice (never in practice). */
  next: boolean;
  /** 「もう一回」: play again at once. */
  retry: boolean;
  /** 「本番へ」: from practice to the real play. */
  toReal: boolean;
  /** The card takes 「次へ」 by itself after a moment: only when 「次へ」 is all it offers. */
  autoAdvance: boolean;
}

/**
 * The result card's buttons: practice offers 「もう一回」 and 「本番へ」; the real play 「次へ」, and 「もう一回」 too where
 * a retry is allowed (the tag's `retry`, Debug's room). It goes on by itself only when it offers nothing else.
 */
export function resultButtons({ practice, retry }: { practice: boolean; retry: boolean }): ResultButtons {
  if (practice) return { next: false, retry: true, toReal: true, autoAdvance: false };
  return { next: true, retry, toReal: false, autoAdvance: !retry };
}

const FIRST_NUMBER = /\d+(?:\.\d+)?/u;

/**
 * A score line with its first number counted up to `t` (0 to 1) of its value, in its own decimals: 「13個食べた」 at 0.5 is
 * 「7個食べた」, 「0.04秒差」 at 0.5 「0.02秒差」. A line without a number stays as it is.
 */
export function countedScore(scoreJa: string, t: number): string {
  const match = FIRST_NUMBER.exec(scoreJa);
  if (!match) return scoreJa;
  const decimals = match[0].split(".")[1]?.length ?? 0;
  const value = Number(match[0]) * Math.min(1, Math.max(0, t));
  const shown = decimals ? value.toFixed(decimals) : String(Math.round(value));
  return `${scoreJa.slice(0, match.index)}${shown}${scoreJa.slice(match.index + match[0].length)}`;
}

/** The face each reaction shows (the heroine's standing art's emotions). */
export const REACTION_EMOTION: Readonly<Record<MiniGameReaction, string>> = {
  cheer: "happy", surprise: "surprised_big", laugh: "teasing_big", tease: "teasing", oops: "surprised",
};

/** One of the lines, the same for the same seed (a reload looks the same; never Math.random). */
export function pickLine(lines: readonly string[] | undefined, seed: number): string | undefined {
  if (!lines?.length) return undefined;
  return lines[Math.floor(seededRandom(seed)() * lines.length)];
}

/** A text with `{heroine_name}` and `{player_name}` filled in (as React text; never HTML). */
export const fillNames = (text: string, names: { player: string; heroine: string }): string =>
  text.replaceAll("{heroine_name}", names.heroine).replaceAll("{player_name}", names.player);

/**
 * The directions of a burst's particles, in degrees: evenly round (360 / count, so none overlap), each moved a little
 * (±15°) by the seed.
 */
export function burstAngles(count: number, seed: number): number[] {
  const random = seededRandom(seed);
  const offset = random() * 360;
  return Array.from({ length: count }, (_, index) => offset + (360 / count) * index + (random() * 30 - 15));
}

/** A box on the screen (client pixels). */
export interface ScreenBox { left: number; top: number; right: number; bottom: number }
/** A press this close around the start button counts as on it (a second tap lands a little off the first). */
export const START_BUTTON_MARGIN_PX = 12;

/**
 * Whether a press this soon after a play started without the host's count is the start button's second tap (dropped):
 * any press within MINI_GAME_START_GUARD_MS; but in a drag game, whose first stroke may begin at once (group2 N10), only
 * one that lands on the start button (a key's press, which has no place, still by the time alone).
 */
export function startGuardDrops({ sinceMs, drag, point, startBox }: {
  sinceMs: number; drag: boolean; point?: { x: number; y: number } | null; startBox?: ScreenBox | null;
}): boolean {
  if (sinceMs >= MINI_GAME_START_GUARD_MS) return false;
  if (!drag || !point || !startBox) return true;
  const margin = START_BUTTON_MARGIN_PX;
  return point.x >= startBox.left - margin && point.x <= startBox.right + margin && point.y >= startBox.top - margin && point.y <= startBox.bottom + margin;
}
