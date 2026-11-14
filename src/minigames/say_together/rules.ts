import type { MiniGameRating, MiniGameRules } from "../contract";
import { rhythmTapEnd, rhythmTapFairness, type RhythmTapRecord, type RhythmTapTuning } from "../engines/rhythm_tap/engine";

// Saying it together (docs/13 2.4): a rhythm_tap skin. She counts 「せー」「の」 on a steady beat and says the four words
// on the next four, one a beat (ヤートリーガン、クリプヤー、ディヤーン、デーン！); the player says each with a tap on its
// beat. The story takes the first word, as before the four words (group2 S4, 2026-11-14): on her beat the two voices
// overlap (together); before it, the player's voice comes alone first (early, from 「せー」 on); after it, hers comes
// alone first (late, until the play ends); no tap at all: she says them alone (silent). The result card's ★ and score
// count the words said together: one tap inside a word's window (a second tap on the same word is no longer together;
// the first word together is the story's together). Timing only (2026-11-13 user decision: 「大きさじゃなくてタイミング
// を合わせる」); nothing is random. Pure. Every number to tune is in SAY_NUMBERS (E1; Debug's room edits them).

export type SayTogetherOutcome = "together" | "early" | "late" | "silent";
/** The game has no keys of its own. */
export type SayTogetherParams = object;
export type SayRecord = RhythmTapRecord;

/** Her count before the words (「せー」「の」), and the words (one a beat). */
export const SAY_COUNT_BEATS = 2;
export const SAY_WORD_COUNT = 4;

/**
 * Saying it together's numbers. Her breath (a tap in it is no tap), one beat (her count's and the words'), each word's
 * window (two voices starting this close sound as one; wider after her beat: a phone's touch and screen land a tap late,
 * group2's playtest of 2026-11-13: −110/+170), and how long after the last word the play ends at the latest.
 */
export const SAY_NUMBERS = {
  settleMs: 1000,
  beatMs: 650,
  cleanEarlyMs: 110,
  cleanLateMs: 170,
  endAfterMs: 400,
} as const;
export type SayNumbers = { readonly [Key in keyof typeof SAY_NUMBERS]: number };

/** A word as the player said it so far: on her beat (together), off it, or not yet (null). */
export type SayWord = "together" | "off" | null;

/** What a record did as of a moment. */
export interface SayJudgement {
  /** The story's outcome from the first word (silent while there is no tap yet). */
  outcome: SayTogetherOutcome;
  /** The first tap that counts (from 「せー」 on), or null. */
  firstMs: number | null;
  /** Each word as the player said it, in her order. */
  words: readonly SayWord[];
  /** The words said together. */
  together: number;
}

/** A game of saying it together built from its numbers: her moments, the engine's beats, the judge and the rules. */
export interface SayGame {
  numbers: SayNumbers;
  /** When she says 「せー」 and 「の」 (the first: her breath's end; a tap before it is no tap). */
  countAt: readonly number[];
  /** When she says each word (on the beat after 「の」, then one a beat). */
  wordsAt: readonly number[];
  /** The play's end at the latest (after the last word's window). */
  endMs: number;
  /** The rhythm_tap tuning the play runs on (the lane's marks, the count-in's crosses). */
  tuning: RhythmTapTuning;
  /** Whether a tap is in a word's window. */
  inWindow(ms: number, word: number): boolean;
  judge(record: SayRecord, now?: number): SayJudgement;
  /** Why these numbers would be unfair on a phone (none: fair). */
  fairness(): string[];
  rules: MiniGameRules<SayTogetherParams, SayTogetherOutcome, SayRecord>;
}

const isTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** The game from its numbers (the story's: SAY_NUMBERS; Debug's room's edited ones). */
export function sayGame(numbers: SayNumbers = SAY_NUMBERS): SayGame {
  const beat = Math.max(1, Math.round(numbers.beatMs));
  const countAt = Array.from({ length: SAY_COUNT_BEATS }, (_, index) => Math.round(numbers.settleMs) + beat * index);
  const wordsAt = Array.from({ length: SAY_WORD_COUNT }, (_, index) => countAt[0] + beat * (SAY_COUNT_BEATS + index));
  const tuning: RhythmTapTuning = {
    beats: wordsAt,
    earlyMs: Math.round(numbers.cleanEarlyMs),
    lateMs: Math.round(numbers.cleanLateMs),
    endAfterMs: Math.round(numbers.endAfterMs),
  };
  const endMs = rhythmTapEnd(tuning);
  const inWindow = (ms: number, word: number) => ms >= wordsAt[word] - numbers.cleanEarlyMs && ms <= wordsAt[word] + numbers.cleanLateMs;
  /** Each word's own time: from halfway after the word before to halfway before the next (the first from 「せー」, the last to the end). */
  const wordOf = (ms: number) => {
    let word = 0;
    while (word + 1 < SAY_WORD_COUNT && ms >= wordsAt[word] + beat / 2) word += 1;
    return word;
  };
  const judge = (record: SayRecord, now = Number.POSITIVE_INFINITY): SayJudgement => {
    const taps = (Array.isArray(record?.taps) ? record.taps : []).filter((ms) => isTime(ms) && ms >= countAt[0] && ms <= Math.min(now, endMs))
      .sort((a, b) => a - b);
    const firstMs = taps[0] ?? null;
    const off = firstMs === null ? null : firstMs - wordsAt[0];
    const outcome: SayTogetherOutcome = off === null ? "silent" : off < -numbers.cleanEarlyMs ? "early" : off > numbers.cleanLateMs ? "late" : "together";
    const per = Array.from({ length: SAY_WORD_COUNT }, () => [] as number[]);
    for (const ms of taps) per[wordOf(ms)].push(ms);
    // The first word is the story's: together exactly when the outcome is. Another word is together with one tap, in its window.
    const words = per.map((list, word): SayWord => {
      if (!list.length) return null;
      if (word === 0) return outcome === "together" ? "together" : "off";
      return list.length === 1 && inWindow(list[0], word) ? "together" : "off";
    });
    return { outcome, firstMs, words, together: words.filter((word) => word === "together").length };
  };
  /**
   * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: together ★3 with
   * all four words together, else ★2; early or late ★2 with two or more of the others together, else ★1; silent none.
   */
  const rate = (record: SayRecord): MiniGameRating | null => {
    const { outcome, together } = judge(record);
    if (outcome === "silent") return null;
    const stars = outcome === "together" ? (together === SAY_WORD_COUNT ? 3 : 2) : together >= 2 ? 2 : 1;
    return { stars, scoreJa: `${together}語そろった（${SAY_WORD_COUNT}語中）` };
  };
  /** 「おまかせ」: the first word as the outcome asks (half way into its side), the others on her beat; silent says none. */
  const autoRecord = (outcome: SayTogetherOutcome): SayRecord => {
    if (outcome === "silent") return { taps: [], stopMs: null };
    const first = outcome === "together" ? wordsAt[0]
      : outcome === "early" ? Math.max(countAt[0], wordsAt[0] - (numbers.cleanEarlyMs + beat / 2) / 2)
      : wordsAt[0] + (numbers.cleanLateMs + beat / 2) / 2;
    return { taps: [Math.round(first), ...wordsAt.slice(1)], stopMs: null };
  };
  const fairness = () => {
    const problems = rhythmTapFairness(tuning);
    if (numbers.settleMs < 450) problems.push(`settleMs ${numbers.settleMs} ends her breath inside the start's double-tap guard (450 ms)`);
    if (numbers.cleanEarlyMs >= beat / 2 || numbers.cleanLateMs >= beat / 2)
      problems.push(`a word's window (−${numbers.cleanEarlyMs}/+${numbers.cleanLateMs}) reaches past half a beat (${beat / 2} ms): a tap could say two words`);
    if (numbers.cleanLateMs < numbers.cleanEarlyMs + 30) problems.push(`cleanLateMs ${numbers.cleanLateMs} is not 30 ms wider than cleanEarlyMs (a phone lands a tap late)`);
    return problems;
  };
  return {
    numbers, countAt, wordsAt, endMs, tuning, inWindow, judge, fairness,
    rules: { outcomeOf: (record) => judge(record).outcome, autoRecord, rate },
  };
}

/** The story's game. */
export const SAY_GAME = sayGame();
/** When she says 「せー」 (taps before it are no tap), her first word (the story's beat), and the play's end at the latest. */
export const SAY_COUNT_MS = SAY_GAME.countAt[0];
export const SAY_WORDS_MS = SAY_GAME.wordsAt[0];
export const SAY_END_MS = SAY_GAME.endMs;
export const sayTogetherRules = SAY_GAME.rules;

/** How far off the first word was, for the card's second line (practice shows where to move); none for silence. */
export function sayFirstDetail(judgement: SayJudgement, game: SayGame = SAY_GAME): string | undefined {
  if (judgement.firstMs === null) return undefined;
  const off = judgement.firstMs - game.wordsAt[0];
  const seconds = (Math.abs(off) / 1000).toFixed(2);
  return judgement.outcome === "together" ? `出だし ${seconds}秒差` : `出だし ${seconds}秒${off < 0 ? "早い" : "遅い"}`;
}
