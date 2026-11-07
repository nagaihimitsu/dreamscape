import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { describe, expect, it } from "vitest";
import { advanceDate, chooseDate, createGame, finishDate, startDate, type GameState } from "../domain";
import { parseGameState } from "./index";

function started(): GameState {
  return startDate(seedCurrentFreeTime(createGame("晴", "灯")), "milano_cafe_01");
}

/** Read the open date on (the first option at each choice) until it ends or `stop` holds. */
function readDate(initial: GameState, stop: (state: GameState) => boolean = () => false): GameState {
  let state = initial;
  for (let step = 0; state.activeDate && !stop(state); step++) {
    expect(step, "the date did not get there").toBeLessThan(200);
    const active = state.activeDate;
    state = active.frame.ended ? finishDate(state, state.revision)
      : active.frame.choices.length ? chooseDate(state, 0, state.revision)
        : advanceDate(state, state.revision);
  }
  return state;
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

  it("rejects a saved choice counter that disagrees with the conversation's Ink turn", () => {
    // A confession keeps no resolved romance choices (legacy_fixed), so only the Ink turn can tell.
    // The cafe date's reactions use a fixed middle ticket, with which it reaches romance stage 2 and opens the confession.
    const afterCafe = readDate(startDate(seedCurrentFreeTime(createGame("晴", "灯")), "milano_cafe_01", () => 5000));
    expect(afterCafe.romanceStage).toBe(2);
    const confession = readDate(startDate(afterCafe, "milano_confession_01"), (state) => state.activeDate!.frame.choices.length > 0);
    expect(confession.activeDate).toMatchObject({ dateId: "milano_confession_01", resolutionMode: "legacy_fixed", choiceCount: 0, resolvedChoices: [] });
    expect(parseGameState(JSON.stringify(confession))).toEqual(confession);
    expect(() =>
      parseGameState(
        JSON.stringify({
          ...confession,
          activeDate: { ...confession.activeDate, choiceCount: 1 },
        }),
      ),
    ).toThrow("保存された選択回数が一致しません。");
  });

  it("keeps unmodified snapshots loadable", () => {
    const state = started();
    expect(parseGameState(JSON.stringify(state))).toEqual(state);
  });
});
