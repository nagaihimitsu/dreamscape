import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { describe, expect, it } from "vitest";
import { createGame, startDate, type GameState } from "../domain";
import { parseGameState } from "./index";

function started(): GameState {
  return startDate(seedCurrentFreeTime(createGame("晴", "灯")), "milano_cafe_01");
}

describe("saved story consistency", () => {
  it("rejects altered names without rewriting the story snapshot", () => {
    const state = started();
    expect(() =>
      parseGameState(JSON.stringify({ ...state, heroineName: "別の名前" })),
    ).toThrow("保存された名前が一致しません。");
    expect(() =>
      parseGameState(JSON.stringify({ ...state, playerName: "別の名前" })),
    ).toThrow("保存された名前が一致しません。");
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
      ).toThrow("保存された場面の情報が一致しません。");
    },
  );

  it("rejects a saved choice counter that disagrees with the resolved romance choices", () => {
    const state = started();
    expect(() =>
      parseGameState(
        JSON.stringify({
          ...state,
          activeDate: { ...state.activeDate, choiceCount: 1 },
        }),
      ),
    ).toThrow("恋愛リアクションの進行記録が一致しません。");
  });

  it("keeps unmodified snapshots loadable", () => {
    const state = started();
    expect(parseGameState(JSON.stringify(state))).toEqual(state);
  });
});
