import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { describe, expect, it } from "vitest";
import { startBattle } from "./battle";
import { playBattleToResult } from "../dev/scenario-builders";
import { zodIssues } from "../../tests/fixtures/zod-issues";
import { balance, dates, episodes } from "../content";
import { beginStory, continueStory } from "../story/runtime";
import {
  advanceDate,
  chooseDate,
  createGame,
  finishDate,
  getDateAvailability,
  isEventVisible,
  setNames,
  startDate,
  validateGameState,
  type GameState,
} from "./game";

const dateId = dates[0].id;
function freshDate() {
  return startDate(seedCurrentFreeTime(createGame()), dateId, stableRolls());
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
    expect(() => createGame(" ", "名前")).toThrow(zodIssues({ code: "too_small", path: [], minimum: 1 }));
    expect(() => createGame("あ".repeat(balance.maxNameLength + 1))).toThrow(zodIssues({ code: "too_big", path: [], maximum: balance.maxNameLength }));
    const state = createGame();
    expect(setNames(state, " ", "名前")).toBe(state);
    expect(setNames(state, "青", "花")).toMatchObject({
      playerName: "青",
      heroineName: "花",
    });
  });
  it("refuses an episode completion without battle evidence and never repeats its rewards", () => {
    const initial = createGame();
    const episode = episodes.find((item) => item.id === "milano_duomo_episode")!;
    expect(() => validateGameState({ ...initial, completedEpisodeIds: [episode.id] }))
      .toThrow("観光エピソードのクリア記録が一致しません。");
    const state = seedCurrentFreeTime(initial);
    expect(state.ap).toBe(4);
    expect(state.completedEpisodeIds).toEqual([episode.id]);
    // Loading pays nothing, and playing the finished battle again records nothing new.
    expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const replay = playBattleToResult(startBattle(state, episode.battleId));
    expect(replay.ap).toBe(state.ap);
    expect(replay.claimedRewardIds).toEqual(state.claimedRewardIds);
    expect(replay.completedEpisodeIds).toEqual(state.completedEpisodeIds);
  });
  it("carries unused AP after a date", () => {
    expect(play(freshDate()).ap).toBe(4 - dates[0].apCost);
  });
  it("blocks locked, unknown, insufficient AP and repeated starts without mutations", () => {
    const locked = createGame();
    expect(startDate(locked, dateId)).toBe(locked);
    expect(startDate(locked, "unknown")).toBe(locked);
    const poor = { ...seedCurrentFreeTime(locked), ap: dates[0].apCost - 1 };
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
  it("hides and refuses a completed normal date without consuming AP", () => {
    const first = play(freshDate(), [0, 0]);
    expect(first.ap).toBe(2);
    expect(isEventVisible(first, dateId)).toBe(false);
    expect(getDateAvailability(first, dateId).available).toBe(false);
    expect(startDate(first, dateId)).toBe(first);
    const restored = validateGameState(JSON.parse(JSON.stringify(first)));
    expect(startDate(restored, dateId)).toBe(restored);
    expect(restored).toEqual(first);
  });
});

describe("Ink choices and reload boundaries", () => {
  const firstEffects = ["common_date_first_playful", "common_date_first_attentive", "common_date_first_honest"];
  for (let first = 0; first < 3; first++) {
    for (let second = 0; second < 3; second++) {
      it(`plays route ${first + 1}/${second + 1}, round-tripping every line and choice`, () => {
        let state = startDate(
          seedCurrentFreeTime(createGame("主人公試験", "ヒロイン試験")),
          dateId,
          stableRolls(),
        );
        const selected = [first, second];
        const transcript: string[] = [];
        const resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [];
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
            resolutions.push(state.activeDate!.resolvedChoices.at(-1)!);
          } else state = advanceDate(state, state.revision);
        }
        expect(state.ap).toBe(2);
        expect(state.playedDateIds).toEqual([dateId]);
        expect(state.memories).toEqual(["sound_memory_cafe_01"]);
        expect(resolutions.map((entry) => entry.effectId)).toEqual([
          firstEffects[first], `sound_cafe_01_2_${second + 1}`,
        ]);
        expect(state.affection).toBe(
          resolutions.reduce((sum, resolution) => sum + resolution.deltas.affection, 0),
        );
        expect(transcript.join("\n")).not.toHaveLength(0);
      });
    }
  }
  it("keeps names as plain Ink text in the Duomo guide", () => {
    const storyId = "tourism/milano_duomo_guide";
    expect(beginStory(storyId, "旅人", "{heroine_name}").frame.text).toContain("{heroine_name}");
    expect(beginStory(storyId, "旅人", "<img src=x>").frame.text).toContain("<img src=x>");
  });
  it("rejects mismatched Ink pointers, content versions and choices", () => {
    const state = untilChoice(freshDate());
    expect(() =>
      validateGameState({
        ...state,
        activeDate: { ...state.activeDate, storyState: "{}" },
      }),
    ).toThrow("保存された会話の途中データを読み込めません。");
    expect(() =>
      validateGameState({
        ...state,
        activeDate: { ...state.activeDate, storyHash: "old" },
      }),
    ).toThrow("シナリオが更新されています。以前の途中データはそのまま保管されています。");
    expect(() =>
      validateGameState({
        ...state,
        activeDate: {
          ...state.activeDate,
          frame: { ...state.activeDate!.frame, choices: [] },
        },
      }),
    ).toThrow("保存された選択肢が一致しません。");
    // v14 derives a date's chapter from the episode records; the v13 field is not part of the format.
    expect(() =>
      validateGameState({ ...state, completedChapters: [state.currentCityId] }),
    ).toThrow(zodIssues({ code: "unrecognized_keys", path: [], keys: ["completedChapters"] }));
    expect(() =>
      validateGameState({ ...state, completedEpisodeIds: [] }),
    ).toThrow("完了したバトルと章の記録が一致しません。");
    expect(() => validateGameState({ ...state, ap: -1 })).toThrow(zodIssues({ code: "too_small", path: ["ap"] }));
  });
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
