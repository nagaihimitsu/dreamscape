import { describe, expect, it } from "vitest";
import { FLIGHT_STAGGER_MS, flightPaths, flightTokens, itemsChange, numberChange } from "./hud-cues";

describe("the header's value cues", () => {
  it("say whether the budget or the AP rose or fell", () => {
    expect(numberChange(100, 160)).toBe("up");
    expect(numberChange(100, 40)).toBe("down");
    expect(numberChange(3, 3)).toBeNull();
  });

  it("see an item the header has not shown before, not one that left", () => {
    expect(itemsChange("", "charm")).toBe("up");
    expect(itemsChange("charm", "charm\nnote")).toBe("up");
    expect(itemsChange("charm\nnote", "note")).toBeNull();
    expect(itemsChange("charm", "charm")).toBeNull();
    expect(itemsChange("charm", "")).toBeNull();
  });
});

describe("the tokens that fly into a rising value", () => {
  it("fly only for a rise", () => {
    expect(flightTokens("coin", 500, 500)).toBe(0);
    expect(flightTokens("coin", 500, 300)).toBe(0);
    expect(flightTokens("star", 2, 1)).toBe(0);
  });

  it("are 3 to 5 coins by the receipt's share of the budget it makes", () => {
    expect(flightTokens("coin", 900, 1000)).toBe(3);
    expect(flightTokens("coin", 800, 1000)).toBe(4);
    expect(flightTokens("coin", 400, 1000)).toBe(5);
    expect(flightTokens("coin", 0, 40)).toBe(5);
  });

  it("are 3 to 5 stars by the AP gained", () => {
    expect(flightTokens("star", 0, 1)).toBe(3);
    expect(flightTokens("star", 1, 3)).toBe(4);
    expect(flightTokens("star", 0, 3)).toBe(5);
    expect(flightTokens("star", 0, 9)).toBe(5);
  });

  it("start around the screen's centre and end at the target's centre, one after another", () => {
    const paths = flightPaths(3, { width: 400, height: 800 }, { left: 0, top: 0 }, { left: 300, top: 10, width: 60, height: 20 });
    expect(paths).toHaveLength(3);
    for (const [index, path] of paths.entries()) {
      expect(Math.abs(path.x - 200)).toBeLessThanOrEqual(50);
      expect(Math.abs(path.y - 400)).toBeLessThanOrEqual(50);
      expect(path.x + path.dx).toBe(330);
      expect(path.y + path.dy).toBe(20);
      expect(path.delayMs).toBe(index * FLIGHT_STAGGER_MS);
    }
  });

  it("are placed relative to the layer that draws them, at most 5", () => {
    const [first] = flightPaths(1, { width: 400, height: 800 }, { left: 10, top: 50 }, { left: 300, top: 60, width: 20, height: 20 });
    expect(first.x + first.dx).toBe(300);
    expect(first.y + first.dy).toBe(20);
    expect(flightPaths(9, { width: 400, height: 800 }, { left: 0, top: 0 }, { left: 0, top: 0, width: 0, height: 0 })).toHaveLength(5);
  });
});
