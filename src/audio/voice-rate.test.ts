import { describe, expect, it } from "vitest";
import {
  VOICE_RATE_DEFAULT, VOICE_RATE_MAX, VOICE_RATE_MIN, VOICE_RATE_STEP, clampVoiceRate, effectiveVoiceMs, effectiveVoiceRate,
  parseVoiceRate, voiceRateJa,
} from "./voice-rate";

// Debug's speed of the lines' voices (2026-11-13 user request): 0.75× to 1.5× in 0.05 steps, 1× with Debug mode off.

describe("the voice rate's scale", () => {
  it("is 0.75× to 1.5× in steps of 0.05, from 1×", () => {
    expect([VOICE_RATE_MIN, VOICE_RATE_MAX, VOICE_RATE_STEP, VOICE_RATE_DEFAULT]).toEqual([0.75, 1.5, 0.05, 1]);
  });

  it("keeps every step as it is, with two decimals at most", () => {
    const steps = Array.from({ length: 16 }, (_, index) => (75 + index * 5) / 100);
    expect(steps.map(clampVoiceRate)).toEqual(steps);
    expect(clampVoiceRate(0.05 * 23)).toBe(1.15);
  });

  it("clamps to the ends and rounds to the nearest step", () => {
    expect(clampVoiceRate(0.5)).toBe(0.75);
    expect(clampVoiceRate(0)).toBe(0.75);
    expect(clampVoiceRate(-1)).toBe(0.75);
    expect(clampVoiceRate(2)).toBe(1.5);
    expect(clampVoiceRate(1.02)).toBe(1);
    expect(clampVoiceRate(1.03)).toBe(1.05);
    expect(clampVoiceRate(1.234)).toBe(1.25);
  });

  it("is 1 for anything but a finite number", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "1.2", null, undefined, {}, true])
      expect(clampVoiceRate(value), String(value)).toBe(1);
  });

  it("reads a stored text, 1 when nothing or no number is stored", () => {
    expect(parseVoiceRate(null)).toBe(1);
    expect(parseVoiceRate("1.2")).toBe(1.2);
    expect(parseVoiceRate("0.8")).toBe(0.8);
    expect(parseVoiceRate("9")).toBe(1.5);
    for (const text of ["", " ", "fast", "{\"rate\":1.2}"]) expect(parseVoiceRate(text), JSON.stringify(text)).toBe(1);
  });

  it("says a rate with two decimals", () => {
    expect(voiceRateJa(1)).toBe("1.00倍");
    expect(voiceRateJa(1.25)).toBe("1.25倍");
    expect(voiceRateJa(0.75)).toBe("0.75倍");
  });
});

describe("the rate the voices play at", () => {
  it("is the stored rate while Debug mode is on", () => {
    expect(effectiveVoiceRate(true, 1.25)).toBe(1.25);
    expect(effectiveVoiceRate(true, 0.8)).toBe(0.8);
    expect(effectiveVoiceRate(true, 3)).toBe(1.5);
    expect(effectiveVoiceRate(true, Number.NaN)).toBe(1);
  });

  it("is 1 with Debug mode off, whatever is stored", () => {
    for (const stored of [0.75, 1, 1.25, 1.5, 3, Number.NaN]) expect(effectiveVoiceRate(false, stored), String(stored)).toBe(1);
  });
});

describe("a voice's effective length", () => {
  it("is its length divided by the rate: shorter faster, longer slower", () => {
    expect(effectiveVoiceMs(3000, 1)).toBe(3000);
    expect(effectiveVoiceMs(3000, 1.5)).toBe(2000);
    expect(effectiveVoiceMs(3000, 1.25)).toBe(2400);
    expect(effectiveVoiceMs(3000, 0.75)).toBe(4000);
    expect(effectiveVoiceMs(0, 1.5)).toBe(0);
  });

  it("reads the rate on the scale (never divides by 0 or by a rate outside it)", () => {
    expect(effectiveVoiceMs(3000, 0)).toBe(4000);
    expect(effectiveVoiceMs(3000, 10)).toBe(2000);
    expect(effectiveVoiceMs(3000, Number.NaN)).toBe(3000);
  });
});
