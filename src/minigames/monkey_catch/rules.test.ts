import { describe, expect, it } from "vitest";
import { cueTapFairness } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { monkeyCatch } from "./definition";
import { MONKEY_END_MS, MONKEY_FIELD, MONKEY_HANDS_MS, MONKEY_RELEASE_MS, MONKEY_TUNING, monkeyCatchRules } from "./rules";

describeMiniGameRules(monkeyCatch, monkeyCatchRules, { records: [null, 0, MONKEY_RELEASE_MS, MONKEY_END_MS, MONKEY_END_MS + 1, Number.NaN] });

describe("the catch's timing", () => {
  const { cleanMs, nearMs } = MONKEY_TUNING;
  const outcome = (ms: number | null) => monkeyCatchRules.outcomeOf(ms, {});

  it("catches it right as it reaches the hands, lets it bounce off a little early or late, misses it further off", () => {
    expect(outcome(MONKEY_HANDS_MS)).toBe("caught");
    expect(outcome(MONKEY_HANDS_MS - cleanMs)).toBe("caught");
    expect(outcome(MONKEY_HANDS_MS + cleanMs)).toBe("caught");
    expect(outcome(MONKEY_HANDS_MS - cleanMs - 1)).toBe("fumbled");
    expect(outcome(MONKEY_HANDS_MS + nearMs)).toBe("fumbled");
    expect(outcome(MONKEY_HANDS_MS - nearMs - 1)).toBe("missed");
    expect(outcome(MONKEY_HANDS_MS + nearMs + 1)).toBe("missed");
    // Hands closed while the monkey still holds it close on nothing; no tap in time lets it fall past.
    expect(outcome(0)).toBe("missed");
    expect(outcome(null)).toBe("missed");
  });

  it("is fair on a phone, and a bottle not caught is gone below the hands before the play ends", () => {
    expect(cueTapFairness(MONKEY_TUNING)).toEqual([]);
    expect(MONKEY_TUNING.leadMs).toBe(MONKEY_FIELD.holdMs);
    expect(MONKEY_FIELD.goneMs).toBeGreaterThan(nearMs);
    expect(MONKEY_TUNING.noneAfterMs).toBeGreaterThan(MONKEY_FIELD.goneMs);
  });
});
