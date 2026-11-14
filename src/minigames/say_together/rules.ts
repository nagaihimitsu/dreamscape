import type { MiniGameRating, MiniGameRules } from "../contract";
import { rhythmTapEnd, rhythmTapFairness, type RhythmTapRecord, type RhythmTapTuning } from "../engines/rhythm_tap/engine";

// Saying it together (docs/13 2.4): a rhythm_tap skin. She counts 「せー」「の」 on a steady beat and says the four words
// after it (ヤートリーガン、クリプヤー、ディヤーン、デーン！) the way the phrase is said (round 3, 2026-11-14): the first on
// the beat after 「の」, then her own rhythm: she stretches the long first word (the second comes a little late), catches
// up (the third a little quick), holds its long syllable and takes a breath before the last. The player says each with a
// tap on her word. The story takes the first word, as before the four words (group2 S4, 2026-11-14): on her beat the two
// voices overlap (together); before it, the player's voice comes alone first (early, from 「せー」 on); after it, hers
// comes alone first (late, until the play ends); no tap at all: she says them alone (silent). The result card's ★ and
// score count the words said together: one tap inside a word's window (a second tap on the same word is no longer
// together; the first word together is the story's together). Timing only (2026-11-13 user decision: 「大きさじゃなくて
// タイミングを合わせる」); nothing is random. Pure. Every number to tune is in SAY_NUMBERS (E1; Debug's room edits them).

export type SayTogetherOutcome = "together" | "early" | "late" | "silent";
/** The game has no keys of its own. */
export type SayTogetherParams = object;
export type SayRecord = RhythmTapRecord;

/** Her count before the words (「せー」「の」), and the words. */
export const SAY_COUNT_BEATS = 2;
export const SAY_WORD_COUNT = 4;

/**
 * Saying it together's numbers. Her breath before the count (a tap in it is no tap), her count's beat (the first word
 * comes on the beat after 「の」), her phrasing after it: the second word this much later than a beat (she stretches
 * ヤートリーガン), the third this much sooner (she catches up), and before the last her held syllable (ディヤーーン) and
 * a breath, each this much on top of a beat; each word's window (two voices starting this close sound as one; wider
 * after her word: a phone's touch and screen land a tap late, group2's playtest of 2026-11-13: −110/+170 for the first
 * word, the story's), the later words' late side (the ★ only: +200, so a slow phone is not marked down on them;
 * 2026-11-14), and how long after the last word the play ends at the latest. Her words come 0.87, 0.52 and 1.25 s apart
 * after a 0.65 s count. Round 3's bots (rules.test.ts): the first word as before; all four together for about four in
 * five average players and a third of careless ones (a sweet moment, not a test: 2026-11-14).
 */
export const SAY_NUMBERS = {
  settleMs: 1000,
  beatMs: 650,
  stretchMs: 220,
  catchUpMs: 130,
  holdMs: 380,
  breathMs: 220,
  cleanEarlyMs: 110,
  cleanLateMs: 170,
  laterLateMs: 200,
  endAfterMs: 400,
} as const;
export type SayNumbers = { readonly [Key in keyof typeof SAY_NUMBERS]: number };

/** A word as the player said it so far: on her word (together), off it, or not yet (null). */
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
  /** When she says each word (the first on the beat after 「の」, then in her own rhythm). */
  wordsAt: readonly number[];
  /** Her held syllable (ディヤーーン) from its word to the breath, and the breath before the last word. */
  holdAt: { from: number; to: number };
  breathAt: { from: number; to: number };
  /** The play's end at the latest (after the last word's window). */
  endMs: number;
  /** The rhythm_tap tuning the play runs on (the lane's marks, the count-in's crosses). */
  tuning: RhythmTapTuning;
  /** A word's window after her word: the first word's (the story's), or the later words' (the ★ only). */
  lateOf(word: number): number;
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
  // Her phrasing: the first word on the beat, then the gaps of how she says it (never under 1 ms: Debug's room's numbers).
  const gaps = [beat + numbers.stretchMs, beat - numbers.catchUpMs, beat + numbers.holdMs + numbers.breathMs].map((gap) => Math.max(1, Math.round(gap)));
  const wordsAt = [countAt[SAY_COUNT_BEATS - 1] + beat];
  for (const gap of gaps) wordsAt.push(wordsAt[wordsAt.length - 1] + gap);
  const breathAt = { from: wordsAt[3] - Math.round(numbers.breathMs), to: wordsAt[3] };
  const holdAt = { from: wordsAt[2], to: breathAt.from };
  // The engine's lane lights each word's window as the judge reads it: the first word's, then the later words' (its
  // `peak`, here wider than the first: the later words count for the ★ only).
  const tuning: RhythmTapTuning = {
    beats: wordsAt,
    earlyMs: Math.round(numbers.cleanEarlyMs),
    lateMs: Math.round(numbers.cleanLateMs),
    peak: { from: 1, earlyMs: Math.round(numbers.cleanEarlyMs), lateMs: Math.round(numbers.laterLateMs) },
    endAfterMs: Math.round(numbers.endAfterMs),
  };
  const endMs = rhythmTapEnd(tuning);
  const lateOf = (word: number) => (word === 0 ? numbers.cleanLateMs : numbers.laterLateMs);
  const inWindow = (ms: number, word: number) => ms >= wordsAt[word] - numbers.cleanEarlyMs && ms <= wordsAt[word] + lateOf(word);
  /** Each word's own time: from halfway after the word before to halfway before the next (the first from 「せー」, the last to the end). */
  const wordOf = (ms: number) => {
    let word = 0;
    while (word + 1 < SAY_WORD_COUNT && ms >= (wordsAt[word] + wordsAt[word + 1]) / 2) word += 1;
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
  /** 「おまかせ」: the first word as the outcome asks (half way into its side), the others on her words; silent says none. */
  const autoRecord = (outcome: SayTogetherOutcome): SayRecord => {
    if (outcome === "silent") return { taps: [], stopMs: null };
    const first = outcome === "together" ? wordsAt[0]
      : outcome === "early" ? Math.max(countAt[0], wordsAt[0] - (numbers.cleanEarlyMs + beat / 2) / 2)
      : wordsAt[0] + (numbers.cleanLateMs + (wordsAt[1] - wordsAt[0]) / 2) / 2;
    return { taps: [Math.round(first), ...wordsAt.slice(1)], stopMs: null };
  };
  const fairness = () => {
    const problems = rhythmTapFairness(tuning);
    if (numbers.settleMs < 450) problems.push(`settleMs ${numbers.settleMs} ends her breath inside the start's double-tap guard (450 ms)`);
    // Each word's window inside its own time (halfway to the word before, or to 「の」, and to the word after).
    for (let word = 0; word < SAY_WORD_COUNT; word += 1) {
      const before = (wordsAt[word] - (word === 0 ? countAt[SAY_COUNT_BEATS - 1] : wordsAt[word - 1])) / 2;
      const after = word + 1 < SAY_WORD_COUNT ? (wordsAt[word + 1] - wordsAt[word]) / 2 : Number.POSITIVE_INFINITY;
      if (numbers.cleanEarlyMs >= before || lateOf(word) >= after)
        problems.push(`word ${word + 1}'s window (−${numbers.cleanEarlyMs}/+${lateOf(word)}) reaches past halfway to the next or the one before: a tap could say two words`);
    }
    if (numbers.laterLateMs < numbers.cleanLateMs) problems.push(`laterLateMs ${numbers.laterLateMs} is narrower than the first word's cleanLateMs ${numbers.cleanLateMs}`);
    if (numbers.cleanLateMs < numbers.cleanEarlyMs + 30) problems.push(`cleanLateMs ${numbers.cleanLateMs} is not 30 ms wider than cleanEarlyMs (a phone lands a tap late)`);
    if (numbers.holdMs < 0 || numbers.breathMs < 0) problems.push("holdMs and breathMs cannot be negative (the last word would come before her breath)");
    return problems;
  };
  return {
    numbers, countAt, wordsAt, holdAt, breathAt, endMs, tuning, lateOf, inWindow, judge, fairness,
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
