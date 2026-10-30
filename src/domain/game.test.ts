import { describe, expect, it } from "vitest";
import { balance, city, dates, effects } from "../content";
import {
  advanceDate,
  chooseDate,
  completeChapter,
  createGame,
  finishDate,
  getDateAvailability,
  grantRewardOnce,
  setNames,
  startDate,
  validateGameState,
  type GameState,
} from "./game";

const dateId = dates[0].id;
function freshDate() {
  return startDate(completeChapter(createGame()), dateId);
}
function untilChoice(state: GameState): GameState {
  let steps = 0;
  while (
    state.activeDate &&
    !state.activeDate.frame.ended &&
    state.activeDate.frame.choices.length === 0
  ) {
    if (++steps > 100) throw new Error("Story did not reach a choice");
    state = advanceDate(state, state.revision);
  }
  return state;
}
function play(state: GameState, selections = [0, 0]): GameState {
  for (const index of selections) {
    state = untilChoice(state);
    expect(state.activeDate?.frame.choices).toHaveLength(3);
    state = chooseDate(state, index, state.revision);
  }
  state = untilChoice(state);
  expect(state.activeDate?.frame.ended).toBe(true);
  return finishDate(state, state.revision);
}

describe("AP and date rules", () => {
  it("creates configured defaults, trims names and rejects blank/long names", () => {
    expect(createGame()).toMatchObject({
      playerName: balance.defaultPlayerName,
      heroineName: balance.defaultHeroineName,
      ap: 0,
    });
    expect(createGame("  旅人  ", "しずく")).toMatchObject({
      playerName: "旅人",
      heroineName: "しずく",
    });
    expect(() => createGame(" ", "名前")).toThrow();
    expect(() => createGame("あ".repeat(balance.maxNameLength + 1))).toThrow();
    const state = createGame();
    expect(setNames(state, " ", "名前")).toBe(state);
    expect(setNames(state, "青", "花")).toMatchObject({
      playerName: "青",
      heroineName: "花",
    });
  });
  it("grants first chapter reward exactly once across clicks and reload", () => {
    const state = completeChapter(createGame());
    expect(state.ap).toBe(city.firstClearReward.ap);
    expect(completeChapter(state)).toBe(state);
    expect(
      completeChapter(validateGameState(JSON.parse(JSON.stringify(state)))),
    ).toEqual(state);
    expect(
      grantRewardOnce(state, city.firstClearReward.rewardSourceId, 4),
    ).toBe(state);
  });
  it("caps AP, carries unused AP, rejects invalid reward values", () => {
    const initial = createGame();
    const capped = grantRewardOnce(initial, "test-cap", balance.apCap + 10);
    expect(capped.ap).toBe(balance.apCap);
    expect(grantRewardOnce(capped, "test-cap", 3)).toBe(capped);
    expect(grantRewardOnce(initial, "negative", -1)).toBe(initial);
    expect(grantRewardOnce(initial, "fraction", 0.5)).toBe(initial);
    expect(play(freshDate()).ap).toBe(
      city.firstClearReward.ap - dates[0].apCost,
    );
  });
  it("blocks locked, unknown, insufficient AP and repeated starts without mutations", () => {
    const locked = createGame();
    expect(startDate(locked, dateId)).toBe(locked);
    expect(startDate(locked, "unknown")).toBe(locked);
    const poor = { ...completeChapter(locked), ap: dates[0].apCost - 1 };
    expect(getDateAvailability(poor, dateId).available).toBe(false);
    expect(startDate(poor, dateId)).toBe(poor);
    const started = freshDate();
    expect(startDate(started, dateId)).toBe(started);
    expect(started.ap).toBe(2);
    expect(started.affection).toBe(0);
    expect(setNames(started, "変更", "変更")).toBe(started);
  });
  it("uses revision tokens to ignore stale double next/choice/finish clicks", () => {
    const initial = freshDate();
    const next = advanceDate(initial, initial.revision);
    expect(advanceDate(next, initial.revision)).toBe(next);
    const choice = untilChoice(next);
    const selected = chooseDate(choice, 0, choice.revision);
    expect(chooseDate(selected, 0, choice.revision)).toBe(selected);
    expect(chooseDate(choice, 99, choice.revision)).toBe(choice);
    const finished = play(initial);
    expect(finishDate(finished, finished.revision)).toBe(finished);
  });
  it("replay charges its opportunity once but cannot earn affection or new memories", () => {
    const first = play(freshDate(), [0, 0]);
    const replay = startDate(first, dateId);
    expect(replay.activeDate?.replay).toBe(true);
    expect(replay.ap).toBe(0);
    const second = play(replay, [2, 2]);
    expect(second.affection).toBe(first.affection);
    expect(second.memories).toEqual(first.memories);
    expect(second.playedDateIds).toEqual([dateId]);
    expect(startDate(second, dateId)).toBe(second);
  });
});

describe("Ink choices and reload boundaries", () => {
  for (let first = 0; first < 3; first++) {
    for (let second = 0; second < 3; second++) {
      it(`plays route ${first + 1}/${second + 1}, round-tripping every line and choice`, () => {
        let state = startDate(
          completeChapter(createGame("主人公試験", "ヒロイン試験")),
          dateId,
        );
        const selected = [first, second];
        const transcript: string[] = [];
        let steps = 0;
        while (state.activeDate) {
          if (++steps > 100) throw new Error("Story did not finish");
          const before = state;
          state = validateGameState(JSON.parse(JSON.stringify(state)));
          expect(state).toEqual(before);
          transcript.push(state.activeDate!.frame.text);
          const active = state.activeDate!;
          if (active.frame.ended) state = finishDate(state, state.revision);
          else if (active.frame.choices.length) {
            expect(active.frame.choices).toHaveLength(3);
            state = chooseDate(
              state,
              selected[active.choiceCount],
              state.revision,
            );
          } else state = advanceDate(state, state.revision);
        }
        expect(state.ap).toBe(2);
        expect(state.playedDateIds).toEqual([dateId]);
        expect(state.memories).toEqual([
          effects[first].memoryId,
          effects[3 + second].memoryId,
        ]);
        expect(state.affection).toBe(
          effects[first].affectionDelta + effects[3 + second].affectionDelta,
        );
        expect(transcript.join("\n")).toContain("主人公試験");
        expect(transcript.join("\n")).toContain("ヒロイン試験");
      });
    }
  }
  it("keeps malicious-looking player names as plain Ink text", () => {
    const state = startDate(
      completeChapter(createGame("<img src=x>", "{heroine_name}")),
      dateId,
    );
    const chosen = untilChoice(state);
    expect(chosen.activeDate?.frame.choices[1].text).toContain(
      "{heroine_name}",
    );
  });
  it("rejects mismatched Ink pointers, content versions and choices", () => {
    const state = untilChoice(freshDate());
    expect(() =>
      validateGameState({
        ...state,
        activeDate: { ...state.activeDate, storyState: "{}" },
      }),
    ).toThrow();
    expect(() =>
      validateGameState({
        ...state,
        activeDate: { ...state.activeDate, storyHash: "old" },
      }),
    ).toThrow();
    expect(() =>
      validateGameState({
        ...state,
        activeDate: {
          ...state.activeDate,
          frame: { ...state.activeDate!.frame, choices: [] },
        },
      }),
    ).toThrow();
    expect(() =>
      validateGameState({ ...state, completedChapters: [] }),
    ).toThrow();
    expect(() => validateGameState({ ...state, ap: -1 })).toThrow();
  });
});
