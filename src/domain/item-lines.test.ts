import { describe, expect, it } from "vitest";
import { createGame } from "./game";
import { itemLines } from "./item-lines";

describe("itemLines (the lines written on an item)", () => {
  const lines = ["一行目。", { textJa: "書き足した行", when: { epilogueViewed: "c1" } }];

  it("shows plain lines always and a conditional line only while its condition holds", () => {
    const state = createGame();
    expect(itemLines(state, lines)).toEqual(["一行目。"]);
    expect(itemLines({ ...state, viewedEpilogueCityIds: ["c1"] }, lines)).toEqual(["一行目。", "書き足した行"]);
  });

  it("gives nothing when no line shows or the item has none", () => {
    const state = createGame();
    expect(itemLines(state, undefined)).toBeUndefined();
    expect(itemLines(state, [{ textJa: "まだない行", when: { epilogueViewed: "c1" } }])).toBeUndefined();
  });
});
