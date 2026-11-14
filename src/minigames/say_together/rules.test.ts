import { describe, expect, it } from "vitest";
import { rhythmTapFairness } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { sayTogether } from "./definition";
import {
  SAY_COUNT_MS, SAY_END_MS, SAY_GAME, SAY_NUMBERS, SAY_WORD_COUNT, SAY_WORDS_MS, sayFirstDetail, sayGame, sayTogetherRules, type SayRecord,
} from "./rules";

const record = (taps: readonly number[]): SayRecord => ({ taps, stopMs: null });
const { wordsAt, countAt } = SAY_GAME;

describeMiniGameRules(sayTogether, sayTogetherRules, { records: [
  record([]), record([0]), record([SAY_COUNT_MS]), record(wordsAt), record([SAY_END_MS]), record([SAY_END_MS + 1]), record([Number.NaN]),
  { taps: "x", stopMs: null } as unknown as SayRecord,
] });

describe("saying it together's first word (the story's outcome, as before the four words)", () => {
  const { cleanEarlyMs, cleanLateMs } = SAY_NUMBERS;
  const outcome = (taps: readonly number[]) => sayTogetherRules.outcomeOf(record(taps), {});

  it("is together on her beat, the player first before it and she first after it however far off, silent without a tap", () => {
    expect(outcome([SAY_WORDS_MS])).toBe("together");
    expect(outcome([SAY_WORDS_MS - cleanEarlyMs])).toBe("together");
    expect(outcome([SAY_WORDS_MS + cleanLateMs])).toBe("together");
    expect(outcome([SAY_WORDS_MS - cleanEarlyMs - 1])).toBe("early");
    // On 「の」, or on 「せー」: the player's voice comes alone first.
    expect(outcome([countAt[1]])).toBe("early");
    expect(outcome([SAY_COUNT_MS])).toBe("early");
    expect(outcome([SAY_WORDS_MS + cleanLateMs + 1])).toBe("late");
    // While she says them, up to the play's end: hers comes alone first.
    expect(outcome([wordsAt[2]])).toBe("late");
    expect(outcome([SAY_END_MS])).toBe("late");
    expect(outcome([])).toBe("silent");
    expect(outcome([SAY_END_MS + 1])).toBe("silent");
    // A tap while she takes her breath, before 「せー」, is no tap: the player can still say it with her.
    expect(outcome([SAY_COUNT_MS - 1])).toBe("silent");
    expect(outcome([0, SAY_WORDS_MS])).toBe("together");
  });

  it("is decided by the first word only: whatever comes after keeps it", () => {
    expect(outcome([SAY_WORDS_MS, SAY_WORDS_MS + 100, SAY_WORDS_MS + 300])).toBe("together");
    expect(outcome([countAt[1], SAY_WORDS_MS, ...wordsAt.slice(1)])).toBe("early");
    expect(outcome([SAY_WORDS_MS + 260, ...wordsAt.slice(1)])).toBe("late");
  });
});

describe("saying it together's four words (the result card)", () => {
  const judge = (taps: readonly number[]) => SAY_GAME.judge(record(taps));
  const rate = (taps: readonly number[]) => sayTogetherRules.rate!(record(taps), {});

  it("says the four words on her beat, one a beat after 「せー」「の」", () => {
    expect(wordsAt).toHaveLength(SAY_WORD_COUNT);
    expect(countAt).toEqual([SAY_NUMBERS.settleMs, SAY_NUMBERS.settleMs + SAY_NUMBERS.beatMs]);
    for (const [index, at] of wordsAt.entries()) expect(at).toBe(SAY_NUMBERS.settleMs + SAY_NUMBERS.beatMs * (index + 2));
    expect(SAY_END_MS).toBe(wordsAt[3] + SAY_NUMBERS.endAfterMs);
  });

  it("counts a word together with one tap in its window; a second tap on the same word, or a tap off it, is not", () => {
    expect(judge(wordsAt)).toMatchObject({ outcome: "together", together: 4, words: ["together", "together", "together", "together"] });
    expect(judge([wordsAt[0], wordsAt[1] + 40, wordsAt[2] + 250]).words).toEqual(["together", "together", "off", null]);
    // A double tap on the second word: it is no longer together; the first word together stays (the story's).
    expect(judge([wordsAt[0], wordsAt[0] + 150, wordsAt[1], wordsAt[1] + 150]).words).toEqual(["together", "off", null, null]);
    // Mashing says nothing together.
    expect(judge(Array.from({ length: 30 }, (_, index) => SAY_COUNT_MS + index * 120)).together).toBe(0);
    expect(judge(Array.from({ length: 20 }, (_, index) => wordsAt[0] + index * 120)).together).toBe(1);
    // Early or late: the first word is off; the others count on their own.
    expect(judge([countAt[1], ...wordsAt.slice(1)])).toMatchObject({ outcome: "early", together: 3 });
    expect(judge(wordsAt.slice(1))).toMatchObject({ outcome: "late", together: 3, words: [null, "together", "together", "together"] });
    // As of a moment: taps not yet made do not count.
    expect(SAY_GAME.judge(record(wordsAt), wordsAt[1]).together).toBe(2);
  });

  it("rates in step with the outcome: together ★3 with all four, else ★2; early or late ★2 with two others, else ★1; silent none", () => {
    expect(rate(wordsAt)).toEqual({ stars: 3, scoreJa: "4語そろった（4語中）" });
    expect(rate([wordsAt[0], wordsAt[1] + 400])).toEqual({ stars: 2, scoreJa: "1語そろった（4語中）" });
    expect(rate([countAt[1], ...wordsAt.slice(1)])).toEqual({ stars: 2, scoreJa: "3語そろった（4語中）" });
    expect(rate([countAt[1], wordsAt[1]])).toEqual({ stars: 1, scoreJa: "1語そろった（4語中）" });
    expect(rate([wordsAt[3]])).toMatchObject({ stars: 1 });
    expect(rate([])).toBeNull();
    // Over many plays: together never has fewer ★ than early or late.
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    let lowestTogether = 3;
    let highestOther = 1;
    for (let play = 0; play < 500; play++) {
      const taps = wordsAt.map((at) => at + (random() - 0.45) * 600).filter(() => random() > 0.1);
      const stars = rate(taps)?.stars;
      if (stars === undefined) continue;
      if (sayTogetherRules.outcomeOf(record(taps), {}) === "together") lowestTogether = Math.min(lowestTogether, stars);
      else highestOther = Math.max(highestOther, stars);
    }
    expect(highestOther).toBeLessThanOrEqual(lowestTogether);
  });

  it("says how far off the first word was, for the card's second line", () => {
    expect(sayFirstDetail(judge([SAY_WORDS_MS + 30]))).toBe("出だし 0.03秒差");
    expect(sayFirstDetail(judge([SAY_WORDS_MS - 150]))).toBe("出だし 0.15秒早い");
    expect(sayFirstDetail(judge([SAY_WORDS_MS + 200]))).toBe("出だし 0.20秒遅い");
    expect(sayFirstDetail(judge([]))).toBeUndefined();
  });

  it("is fair on a phone (−110/+170 ms, wider after her beat; each window inside its word's half beat) and so is the room's edit, until it is not", () => {
    expect(SAY_GAME.fairness()).toEqual([]);
    expect(rhythmTapFairness(SAY_GAME.tuning)).toEqual([]);
    expect([SAY_NUMBERS.cleanEarlyMs, SAY_NUMBERS.cleanLateMs]).toEqual([110, 170]);
    expect(sayGame({ ...SAY_NUMBERS, beatMs: 500 }).fairness()).toEqual([]);
    expect(sayGame({ ...SAY_NUMBERS, cleanLateMs: 400 }).fairness().length).toBeGreaterThan(0);
    expect(sayGame({ ...SAY_NUMBERS, settleMs: 200 }).fairness().length).toBeGreaterThan(0);
    // The edited game counts her words on its own beat.
    expect(sayGame({ ...SAY_NUMBERS, beatMs: 500 }).wordsAt).toEqual([2000, 2500, 3000, 3500]);
  });
});
