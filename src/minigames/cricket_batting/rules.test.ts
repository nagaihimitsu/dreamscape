import { describe, expect, it } from "vitest";
import { cueTapFairness } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { cricketBatting } from "./definition";
import { CRICKET_CONTACT_MS, CRICKET_END_MS, CRICKET_FIELD, CRICKET_RELEASE_MS, CRICKET_TUNING, cricketRules } from "./rules";

describeMiniGameRules(cricketBatting, cricketRules, { records: [null, 0, CRICKET_RELEASE_MS, CRICKET_END_MS, CRICKET_END_MS + 1, Number.NaN] });

describe("the cricket's timing", () => {
  const { cleanMs, nearMs } = CRICKET_TUNING;
  const outcome = (ms: number | null) => cricketRules.outcomeOf(ms, {});

  it("hits clean around the ball's arrival, pulls it a little early, edges it a little late, misses further off", () => {
    expect(outcome(CRICKET_CONTACT_MS)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS - cleanMs)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS + cleanMs + 1)).toBe("edge");
    expect(outcome(CRICKET_CONTACT_MS - nearMs)).toBe("over_wall");
    expect(outcome(CRICKET_CONTACT_MS + nearMs + 1)).toBe("bowled");
    // A swing before the ball has left her hand is a swing too: it misses. No swing in time: no_swing.
    expect(outcome(0)).toBe("bowled");
    expect(outcome(null)).toBe("no_swing");
  });

  it("is fair on a phone, and the ball reaches the bricks after the near window, before the end", () => {
    expect(cueTapFairness(CRICKET_TUNING)).toEqual([]);
    expect(CRICKET_TUNING.leadMs).toBe(CRICKET_FIELD.settleMs + CRICKET_FIELD.runUpMs);
    expect(CRICKET_FIELD.bricksMs).toBeGreaterThan(nearMs);
    expect(CRICKET_TUNING.noneAfterMs).toBeGreaterThan(CRICKET_FIELD.bricksMs);
  });
});
