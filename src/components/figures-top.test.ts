import { describe, expect, it } from "vitest";
import { keepsAboveHeads, stageRoom } from "./figures-top";

describe("stageRoom", () => {
  it("goes under the faces of two people when there is room enough there", () => {
    expect(stageRoom([{ top: 180, height: 700 }, { top: 190, height: 690 }], 580)).toEqual({ top: 342, bottom: 580 });
  });

  it("keeps above the heads when the room under the faces is small and the smaller", () => {
    expect(stageRoom([{ top: 300, height: 500 }, { top: 280, height: 520 }], 540)).toEqual({ bottom: 280 });
  });

  it("goes under the face when one person seen close has their head near the header", () => {
    expect(stageRoom([{ top: 50, height: 1100 }], 620)).toEqual({ top: 292, bottom: 620 });
  });

  it("has no room to keep with no one on stage", () => {
    expect(stageRoom([], 620)).toBeUndefined();
  });
});

describe("keepsAboveHeads", () => {
  it("keeps clear of the faces on a line someone says, not on the narration's", () => {
    expect(keepsAboveHeads("heroine")).toBe(true);
    expect(keepsAboveHeads("player")).toBe(true);
    expect(keepsAboveHeads("narrator")).toBe(false);
    expect(keepsAboveHeads(undefined)).toBe(false);
  });
});
