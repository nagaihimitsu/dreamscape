import { describe, expect, it } from "vitest";
import { RHYTHM_TAP_BOTS, rhythmTapBotRandom, rhythmTapBotTally, rhythmTapBotTaps } from "../engines/rhythm_tap/bot";
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

  it("says the first word on the beat after 「せー」「の」, then in her own rhythm: late, quick, held, a breath, the last", () => {
    const { beatMs, settleMs, stretchMs, catchUpMs, holdMs, breathMs } = SAY_NUMBERS;
    expect(wordsAt).toHaveLength(SAY_WORD_COUNT);
    expect(countAt).toEqual([settleMs, settleMs + beatMs]);
    expect(wordsAt[0]).toBe(settleMs + beatMs * 2);
    expect(wordsAt.slice(1).map((at, index) => at - wordsAt[index])).toEqual([beatMs + stretchMs, beatMs - catchUpMs, beatMs + holdMs + breathMs]);
    // No two gaps alike: the count's beat is not the words' rhythm.
    expect(new Set([beatMs, ...wordsAt.slice(1).map((at, index) => at - wordsAt[index])]).size).toBe(4);
    expect(SAY_GAME.holdAt).toEqual({ from: wordsAt[2], to: wordsAt[3] - breathMs });
    expect(SAY_GAME.breathAt).toEqual({ from: wordsAt[3] - breathMs, to: wordsAt[3] });
    expect(SAY_END_MS).toBe(wordsAt[3] + SAY_NUMBERS.endAfterMs);
    expect(SAY_END_MS).toBeLessThan(6000);
  });

  it("does not take the old beat for her held word: a tap where the count's beat would put the last word spoils it", () => {
    const oldBeat = wordsAt[2] + SAY_NUMBERS.beatMs;
    expect(oldBeat).toBeLessThan(wordsAt[3] - SAY_NUMBERS.cleanEarlyMs);
    expect(judge([...wordsAt.slice(0, 3), oldBeat]).words[3]).toBe("off");
    expect(judge([...wordsAt.slice(0, 3), oldBeat, wordsAt[3]]).words[3]).toBe("off");
    // On her rhythm all four are together; tapping on the count's beat, only the first is.
    expect(judge(wordsAt).together).toBe(4);
    const steady = Array.from({ length: SAY_WORD_COUNT }, (_, index) => wordsAt[0] + SAY_NUMBERS.beatMs * index);
    expect(judge(steady)).toMatchObject({ outcome: "together", together: 1 });
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
    // The later words (the ★ only) take a tap up to +200 ms; the first (the story's) up to +170 ms.
    expect(judge([wordsAt[0] + 185, wordsAt[1] + 185, wordsAt[2] + 200, wordsAt[3] + 201])).toMatchObject({
      outcome: "late", words: ["off", "together", "together", "off"],
    });
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
    expect([SAY_NUMBERS.cleanEarlyMs, SAY_NUMBERS.cleanLateMs, SAY_NUMBERS.laterLateMs]).toEqual([110, 170, 200]);
    expect(sayGame({ ...SAY_NUMBERS, laterLateMs: 150 }).fairness().length).toBeGreaterThan(0);
    expect(sayGame({ ...SAY_NUMBERS, beatMs: 560 }).fairness()).toEqual([]);
    expect(sayGame({ ...SAY_NUMBERS, cleanLateMs: 400 }).fairness().length).toBeGreaterThan(0);
    expect(sayGame({ ...SAY_NUMBERS, settleMs: 200 }).fairness().length).toBeGreaterThan(0);
    // Her quick third word too close for its window: the room says so.
    expect(sayGame({ ...SAY_NUMBERS, catchUpMs: 300 }).fairness().join()).toContain("word 2's window");
    // The edited game says her words on its own beat and rhythm.
    expect(sayGame({ ...SAY_NUMBERS, beatMs: 560 }).wordsAt).toEqual([2120, 2900, 3330, 4490]);
  });
});

// Round 3's seeded players (engines/rhythm_tap/bot.ts), 500 plays each. Her count keeps its beat in the thumb (the bot's
// pull), and while she holds her syllable the old beat may still tap (the count's next beat, a rest shown from the start).
// A sweet moment, not a test (2026-11-14): the first word as easy as before; all four together for most average players,
// fewer than before for the careless.
describe("saying it together, played by round 3's bots", () => {
  const play = (bot: (typeof RHYTHM_TAP_BOTS)[number], seed: number) => {
    const random = rhythmTapBotRandom(seed);
    const scene = { beats: wordsAt, rests: [{ at: wordsAt[2] + SAY_NUMBERS.beatMs }], leadGapMs: SAY_NUMBERS.beatMs };
    return rhythmTapBotTally(Array.from({ length: 500 }, () => {
      const played = record(rhythmTapBotTaps(scene, bot, random));
      return { outcome: sayTogetherRules.outcomeOf(played, {}), stars: sayTogetherRules.rate!(played, {})?.stars ?? null };
    }));
  };
  const [skilled, average, careless] = RHYTHM_TAP_BOTS;

  it("keeps the first word easy and all four together for most, the careless less often", () => {
    const tally = { skilled: play(skilled, 21), average: play(average, 22), careless: play(careless, 23) };
    expect(tally.average.outcomes.together).toBeGreaterThan(0.9);
    expect(tally.careless.outcomes.together).toBeGreaterThan(0.7);
    expect(tally.average.stars["★3"]).toBeGreaterThan(0.6);
    expect(tally.average.stars["★3"]).toBeLessThan(0.9);
    expect(tally.skilled.stars["★3"]).toBeGreaterThan(tally.average.stars["★3"]);
    expect(tally.careless.stars["★3"]).toBeLessThan(0.45);
    for (const id of ["together", "early", "late"]) expect(tally.careless.outcomes[id], id).toBeGreaterThan(0);
  });
});
