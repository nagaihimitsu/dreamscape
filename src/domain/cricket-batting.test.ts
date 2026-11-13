import { describe, expect, it } from "vitest";
import {
  CRICKET_CONTACT_MS, CRICKET_END_MS, CRICKET_RELEASE_MS, CRICKET_TIMING, cricketAutoSwing, cricketMeter, cricketMeterZones, cricketOutcome,
  type CricketOutcome,
} from "./cricket-batting";
import { miniGameOutcomeIds } from "../minigames/tag";

const { cleanMs, nearMs } = CRICKET_TIMING;

describe("the cricket batting timing", () => {
  it("hits clean around the ball's arrival, pulls it a little early, edges it a little late, misses further off", () => {
    expect(cricketOutcome(CRICKET_CONTACT_MS)).toBe("six");
    expect(cricketOutcome(CRICKET_CONTACT_MS - cleanMs)).toBe("six");
    expect(cricketOutcome(CRICKET_CONTACT_MS + cleanMs)).toBe("six");
    expect(cricketOutcome(CRICKET_CONTACT_MS - cleanMs - 1)).toBe("over_wall");
    expect(cricketOutcome(CRICKET_CONTACT_MS - nearMs)).toBe("over_wall");
    expect(cricketOutcome(CRICKET_CONTACT_MS + cleanMs + 1)).toBe("edge");
    expect(cricketOutcome(CRICKET_CONTACT_MS + nearMs)).toBe("edge");
    expect(cricketOutcome(CRICKET_CONTACT_MS - nearMs - 1)).toBe("bowled");
    expect(cricketOutcome(CRICKET_CONTACT_MS + nearMs + 1)).toBe("bowled");
    // A swing before the ball has left her hand is a swing too: it misses.
    expect(cricketOutcome(0)).toBe("bowled");
    expect(cricketOutcome(CRICKET_END_MS)).toBe("bowled");
  });

  it("reads no swing (or none in time) as no_swing", () => {
    expect(cricketOutcome(null)).toBe("no_swing");
    expect(cricketOutcome(CRICKET_END_MS + 1)).toBe("no_swing");
    expect(cricketOutcome(Number.NaN)).toBe("no_swing");
  });

  it("is generous: the clean window is wider than a phone's tap lag, the near ones wider still", () => {
    expect(cleanMs * 2).toBeGreaterThanOrEqual(150);
    expect(nearMs - cleanMs).toBeGreaterThanOrEqual(100);
    // The ball is not hit after it has knocked the bricks down.
    expect(CRICKET_TIMING.bricksMs).toBeGreaterThan(nearMs);
    expect(CRICKET_TIMING.noSwingMs).toBeGreaterThan(CRICKET_TIMING.bricksMs);
  });

  it("swings 「おまかせ」 at a time that gives each outcome of the game", () => {
    for (const outcome of miniGameOutcomeIds("cricket_batting") as CricketOutcome[])
      expect(cricketOutcome(cricketAutoSwing(outcome)), outcome).toBe(outcome);
  });

  it("moves the meter's needle from the ball's release to the end of a play, with the clean zone inside the near one", () => {
    expect(cricketMeter(0)).toBe(0);
    expect(cricketMeter(CRICKET_RELEASE_MS)).toBe(0);
    expect(cricketMeter(CRICKET_END_MS)).toBe(1);
    expect(cricketMeter(CRICKET_END_MS + 500)).toBe(1);
    const { near, clean } = cricketMeterZones();
    expect(near[0]).toBeLessThan(clean[0]);
    expect(clean[0]).toBeLessThan(cricketMeter(CRICKET_CONTACT_MS));
    expect(cricketMeter(CRICKET_CONTACT_MS)).toBeLessThan(clean[1]);
    expect(clean[1]).toBeLessThan(near[1]);
    expect(near[1]).toBeLessThan(1);
  });
});
