import { describe, expect, it } from "vitest";
import { admitsSe, SE_MAX_PLAYING, SE_REPEAT_MS, seLevel } from "./se-rules";

// When a sound effect may start (2026-11-12): once for the same sound within 80 ms, and at most four at once.
describe("the sound effects' start rules", () => {
  it("plays a sound once when it is asked for again within 80 ms, and again after that", () => {
    expect(admitsSe(undefined, 0, 1000)).toBe(true);
    expect(admitsSe(1000, 0, 1000)).toBe(false);
    expect(admitsSe(1000, 0, 1000 + SE_REPEAT_MS - 1)).toBe(false);
    expect(admitsSe(1000, 0, 1000 + SE_REPEAT_MS)).toBe(true);
    expect(SE_REPEAT_MS).toBe(80);
  });

  it("lets sounds overlap up to four, and drops a new one beyond them", () => {
    expect(admitsSe(undefined, SE_MAX_PLAYING - 1, 0)).toBe(true);
    expect(admitsSe(undefined, SE_MAX_PLAYING, 0)).toBe(false);
    expect(admitsSe(0, SE_MAX_PLAYING, 500)).toBe(false);
    expect(SE_MAX_PLAYING).toBe(4);
  });
});

describe("a sound's own level for one play", () => {
  it("plays at a share of its registered volume and at a rate, each kept in range", () => {
    expect(seLevel(0.8)).toEqual({ gain: 0.8, rate: 1 });
    expect(seLevel(0.8, { volume: 0.5, rate: 0.85 })).toEqual({ gain: 0.4, rate: 0.85 });
    expect(seLevel(0.8, { volume: 3, rate: 9 })).toEqual({ gain: 0.8, rate: 2 });
    expect(seLevel(0.8, { volume: -1, rate: 0.1 })).toEqual({ gain: 0, rate: 0.5 });
    expect(seLevel(0.8, { volume: Number.NaN, rate: Number.NaN })).toEqual({ gain: 0.8, rate: 1 });
  });
});
