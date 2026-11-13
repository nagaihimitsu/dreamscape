import { describe, expect, it } from "vitest";
import { cueTapFairness } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { sayTogether } from "./definition";
import { SAY_COUNT_MS, SAY_END_MS, SAY_FIELD, SAY_TUNING, SAY_WORDS_MS, sayTogetherRules } from "./rules";

describeMiniGameRules(sayTogether, sayTogetherRules, { records: [null, 0, SAY_COUNT_MS, SAY_WORDS_MS, SAY_END_MS, SAY_END_MS + 1, Number.NaN] });

describe("saying it together's timing", () => {
  const { cleanMs, nearMs } = SAY_TUNING;
  const outcome = (ms: number | null) => sayTogetherRules.outcomeOf(ms, {});

  it("is together on her beat, the player first before it and she first after it however far off, silent without a tap", () => {
    expect(outcome(SAY_WORDS_MS)).toBe("together");
    expect(outcome(SAY_WORDS_MS - cleanMs)).toBe("together");
    expect(outcome(SAY_WORDS_MS + cleanMs)).toBe("together");
    expect(outcome(SAY_WORDS_MS - cleanMs - 1)).toBe("early");
    expect(outcome(SAY_WORDS_MS - nearMs - 1)).toBe("early");
    // On 「の」, on 「せー」, or before she counts at all: the player's voice comes alone first.
    expect(outcome(SAY_WORDS_MS - SAY_FIELD.beatMs)).toBe("early");
    expect(outcome(SAY_COUNT_MS)).toBe("early");
    expect(outcome(0)).toBe("early");
    expect(outcome(SAY_WORDS_MS + cleanMs + 1)).toBe("late");
    // While she says them, or just after her last word: hers comes alone first.
    expect(outcome(SAY_WORDS_MS + SAY_FIELD.wordsMs)).toBe("late");
    expect(outcome(SAY_END_MS)).toBe("late");
    expect(outcome(null)).toBe("silent");
    expect(outcome(SAY_END_MS + 1)).toBe("silent");
  });

  it("is fair on a phone, counts two even beats before the words, and lets her finish before a silent end", () => {
    expect(cueTapFairness(SAY_TUNING)).toEqual([]);
    expect(SAY_WORDS_MS).toBe(SAY_COUNT_MS + SAY_FIELD.beatMs * SAY_FIELD.countBeats);
    expect(SAY_END_MS).toBeGreaterThan(SAY_WORDS_MS + SAY_FIELD.wordsMs);
    expect(SAY_FIELD.wordsAtMs.every((at) => at < SAY_FIELD.wordsMs)).toBe(true);
    // A beat is wider than the near window: a tap on 「の」 is never together.
    expect(SAY_FIELD.beatMs).toBeGreaterThan(nearMs);
  });
});
