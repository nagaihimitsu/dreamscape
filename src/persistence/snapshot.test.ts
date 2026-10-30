import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { describe, expect, it } from "vitest";
import { createGame, startDate, type GameState } from "../domain";
import { parseGameState } from "./index";

function started(): GameState {
  return startDate(seedLegacyChapter(createGame("晴", "灯")), "milano_cafe_01");
}

describe("saved story consistency", () => {
  it("rejects altered names without rewriting the story snapshot", () => {
    const state = started();
    expect(() =>
      parseGameState(JSON.stringify({ ...state, heroineName: "別の名前" })),
    ).toThrow();
    expect(() =>
      parseGameState(JSON.stringify({ ...state, playerName: "別の名前" })),
    ).toThrow();
  });

  it.each(["background", "emotion"] as const)(
    "rejects an undefined %s in the persisted frame",
    (property) => {
      const state = started();
      const frame = { ...state.activeDate!.frame, [property]: "unregistered" };
      expect(() =>
        parseGameState(
          JSON.stringify({
            ...state,
            activeDate: { ...state.activeDate, frame },
          }),
        ),
      ).toThrow();
    },
  );

  it("rejects a saved choice counter that disagrees with the Ink turn", () => {
    const state = started();
    expect(() =>
      parseGameState(
        JSON.stringify({
          ...state,
          activeDate: { ...state.activeDate, choiceCount: 1 },
        }),
      ),
    ).toThrow();
  });

  it("keeps unmodified snapshots loadable", () => {
    const state = started();
    expect(parseGameState(JSON.stringify(state))).toEqual(state);
  });
});
