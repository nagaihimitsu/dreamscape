import { describe, expect, it } from "vitest";
import { fieldPoint, miniGameSeed, seededRandom } from "./seed";

describe("the host's seed and field points", () => {
  it("gives a play the same seed from the same save, another for another play", () => {
    expect(miniGameSeed(12, "cricket_batting")).toBe(miniGameSeed(12, "cricket_batting"));
    expect(miniGameSeed(12, "cricket_batting")).not.toBe(miniGameSeed(13, "cricket_batting"));
    expect(miniGameSeed(12, "cricket_batting", "again")).not.toBe(miniGameSeed(12, "cricket_batting"));
  });

  it("draws the same numbers in [0, 1) from the same seed", () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    const numbers = Array.from({ length: 50 }, () => first());
    expect(numbers).toEqual(Array.from({ length: 50 }, () => second()));
    for (const value of numbers) expect(value >= 0 && value < 1).toBe(true);
    expect(new Set(numbers).size).toBeGreaterThan(40);
  });

  it("puts a pointer on the field from 0 to 1, clamped to its box", () => {
    const field = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }) };
    expect(fieldPoint({ clientX: 110, clientY: 70 }, field)).toEqual({ x: 0.5, y: 0.5 });
    expect(fieldPoint({ clientX: -50, clientY: 500 }, field)).toEqual({ x: 0, y: 1 });
  });
});
