import { beforeAll, describe, expect, it } from "vitest";
import { battles, battleQuizzes, dates, effects, episodes, progression, trialMilestones } from "../content";
import {
  advanceDate, chooseDate, createGame, finishDate, getDateAvailability,
  isEventVisible, startDate, validateGameState, type GameState,
} from "./game";
import { enterFreeTime, getNextStoryBattle, startEpisode } from "./chapter";
import { advanceBattle, answerBattle, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";
import { skipTourismGuide, startTourismBattle } from "./tourism";

const ids = ["milano_la_scala_date_01", "milano_brera_date_01", "milano_navigli_date_01", "milano_san_satiro_date_01", "milano_starbucks_roastery_date_01", "milano_fondazione_prada_date_01", "milano_love_date_01"] as const;
const milestones = ["milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode", "milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_duomo_episode"] as const;
const effectPrefixes = ["milano_la_scala", "milano_brera", "milano_navigli", "milano_san_satiro", "milano_starbucks_roastery", "milano_fondazione_prada", "milano_love"] as const;

/** Exercise the real A/B/C route rather than inventing episode save flags. */
function finishBattle(initial: GameState): GameState {
  let state = initial;
  for (let step = 0; state.activeBattle?.phase !== "result" && step < 200; step++) {
    const active = state.activeBattle!;
    const battle = battles.find((entry) => entry.id === active.battleId)!;
    if (active.phase === "reasoning") {
      for (const clue of battle.reasoning!.correctClueIds)
        state = selectReasoningClue(state, clue, state.revision);
      state = submitBattleEvidence(state, state.revision);
    } else if (active.phase === "question") {
      const question = battleQuizzes[battle.quizId].questions[active.roundIndex];
      state = answerBattle(state, question.options.find((item) => item.id !== question.correctOptionId)!.id, state.revision);
    } else state = advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  expect(state.activeBattle?.score).toBe(0);
  return validateGameState(JSON.parse(JSON.stringify(state)));
}

function continueStoryBattles(initial: GameState): GameState {
  let state = initial;
  while (getNextStoryBattle(state)) {
    const before = state;
    state = finishBattle(startBattle(state, getNextStoryBattle(state)!.battleId));
    expect(state.ap).toBe(before.ap);
    state = leaveBattle(state, state.revision);
  }
  return state;
}

function clearEpisode(initial: GameState, episodeId: string): GameState {
  let state = continueStoryBattles(initial);
  state = startEpisode(state, episodeId);
  expect(state.activeTourism || state.activeBattle).toBeTruthy();
  if (state.activeTourism) {
    state = skipTourismGuide(state, state.revision);
    state = startTourismBattle(state, state.revision);
  }
  state = finishBattle(state);
  state = enterFreeTime(state, state.revision);
  expect(state.completedEpisodeIds).toContain(episodeId);
  return validateGameState(JSON.parse(JSON.stringify(state)));
}

function playDate(initial: GameState, dateId: string, selections: number[], transcript: string[] = [], resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = []): GameState {
  let state = startDate(initial, dateId, stableRolls());
  expect(state.activeDate?.dateId).toBe(dateId);
  for (let count = 0; state.activeDate && count < 100; count++) {
    const restored = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(restored).toEqual(state);
    const active = restored.activeDate!;
    transcript.push(active.frame.text);
    if (active.frame.ended) {
      state = finishDate(restored, restored.revision);
    } else if (active.frame.choices.length) {
      expect(active.frame.choices).toHaveLength(3);
      const revision = restored.revision;
      state = chooseDate(restored, selections[active.choiceCount], revision);
      if (state.activeDate!.resolutionMode === "random_v1") resolutions.push(state.activeDate!.resolvedChoices.at(-1)!);
      expect(chooseDate(state, selections[active.choiceCount], revision)).toBe(state);
    } else state = advanceDate(restored, restored.revision);
  }
  expect(state.activeDate).toBeNull();
  return validateGameState(JSON.parse(JSON.stringify(state)));
}

let checkpoints: GameState[];
beforeAll(() => {
  checkpoints = [createGame("晴", "灯")];
  for (const episode of episodes) checkpoints.push(clearEpisode(checkpoints.at(-1)!, episode.id));
}, 60000);

describe("real-place optional dates", () => {
  it("unlocks each date only after the configured sightseeing episode", () => {
    for (const [index, id] of ids.entries()) {
      const date = dates.find((item) => item.id === id)!;
      const episodeIndex = episodes.findIndex((episode) => episode.id === milestones[index]);
      expect(date.requiredCompletedEpisodeIds).toContain(milestones[index]);
      expect(date.requiredCompletedChapters).toEqual([]);
      for (const state of checkpoints.slice(0, episodeIndex + 1)) {
        expect(isEventVisible(state, id)).toBe(false);
        expect(getDateAvailability(state, id).available).toBe(false);
        expect(startDate(state, id)).toBe(state);
      }
      expect(isEventVisible(checkpoints[episodeIndex + 1], id)).toBe(true);
      expect(getDateAvailability(checkpoints[episodeIndex + 1], id).available).toBe(true);
    }
  });

  it.each(ids)("%s refuses insufficient AP and a second completion", (id) => {
    const date = dates.find((item) => item.id === id)!;
    const state = checkpoints[episodes.findIndex((item) => item.id === date.requiredCompletedEpisodeIds![0]) + 1];
    const poor = { ...state, ap: date.apCost - 1 };
    expect(getDateAvailability(poor, id).available).toBe(false);
    expect(startDate(poor, id)).toBe(poor);
    const started = startDate(state, id);
    expect(started.ap).toBe(state.ap - date.apCost);
    expect(startDate(started, id)).toBe(started);
    expect(validateGameState(JSON.parse(JSON.stringify(started)))).toEqual(started);
    const completed = playDate(state, id, [0, 1]);
    expect(completed.memories).toHaveLength(state.memories.length + 2);
    expect(isEventVisible(completed, id)).toBe(false);
    expect(startDate(completed, id)).toBe(completed);
  });

  for (const [index, id] of ids.entries()) for (let first = 0; first < 3; first++) for (let second = 0; second < 3; second++) {
    it(`${id} completes the ${first + 1}/${second + 1} route with two distinct effects`, () => {
      const episodeIndex = episodes.findIndex((episode) => episode.id === milestones[index]);
      const before = checkpoints[episodeIndex + 1];
      const resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [];
      const after = playDate(before, id, [first, second], [], resolutions);
      const memories = after.memories.filter((memory) => !before.memories.includes(memory));
      const prefix = effectPrefixes[index];
      const approach = index < 3 ? ["joke", "listen", "honest"] : ["a", "b", "c"];
      const chosenEffects = [
        effects.find((effect) => effect.id === `${prefix}_first_${approach[first]}`)!,
        effects.find((effect) => effect.id === `${prefix}_second_${approach[second]}`)!,
      ];
      expect(memories).toHaveLength(2);
      expect(new Set(memories).size).toBe(2);
      expect(memories).toEqual(chosenEffects.map((effect) => effect.memoryId));
      expect(after.playedDateIds).toContain(id);
      expect(resolutions.map((entry) => entry.effectId)).toEqual(chosenEffects.map((effect) => effect.id));
      expect(after.affection).toBe(before.affection + resolutions.reduce((sum, entry) => sum + entry.deltas.affection, 0));
      expect(after.trust).toBe(before.trust + resolutions.reduce((sum, entry) => sum + entry.deltas.trust, 0));
      expect(after.spark).toBe(before.spark + resolutions.reduce((sum, entry) => sum + entry.deltas.spark, 0));
      expect(after.romanceStage).toBeGreaterThanOrEqual(before.romanceStage);
      expect(after.romanceStage).toBeLessThanOrEqual(2); // One date cannot satisfy a two-date stage.
    });
  }

  it("does not add these optional dates to stage, confession, existing events or legacy trial requirements", () => {
    const forbidden = new Set<string>(ids);
    for (const stage of progression.stages)
      expect(stage).not.toHaveProperty("requiredPlayedDateIds");
    expect(progression.confession).not.toHaveProperty("requiredPlayedDateIds");
    for (const milestone of trialMilestones)
      expect(milestone.requiredPlayedDateIds.some((id) => forbidden.has(id))).toBe(false);
    for (const event of dates.filter((date) => !forbidden.has(date.id)))
      expect(event.requiredPlayedDateIds.some((id) => forbidden.has(id))).toBe(false);
  });

  it("advances from a destination date without the old cafe, walk or invitation", () => {
    const before = checkpoints[2];
    const after = playDate(before, "milano_love_date_01", [2, 0]);
    expect(after.romanceStage).toBe(2);
    expect(after.playedDateIds).toEqual(["milano_love_date_01"]);
    expect(getDateAvailability(after, "milano_cafe_01").available).toBe(true);
  });

  it("changes the Navigli callback only when the cafe was actually experienced", () => {
    const afterCastle = checkpoints[4];
    const firstTime: string[] = [];
    playDate(afterCastle, ids[2], [0, 0], firstTime);
    expect(firstTime.join("\n")).not.toContain("前にも運河の近くで話しましたね");
    const afterCafe = playDate(afterCastle, "milano_cafe_01", [0, 0]);
    const returning: string[] = [];
    playDate(afterCafe, ids[2], [0, 0], returning);
    expect(returning.join("\n")).toContain("前にも運河の近くで話しましたね");
  });

  it("recalls the Brera detail at Prada only after that exact memory was made", () => {
    const before = checkpoints[3];
    const firstVisit: string[] = [];
    const afterPrada = playDate(before, "milano_fondazione_prada_date_01", [0, 0], firstVisit);
    expect(firstVisit.join("\n")).not.toContain("ブレラの絵でも");
    const pradaThenBrera = playDate(afterPrada, "milano_brera_date_01", [1, 0]);
    expect(pradaThenBrera.playedDateIds).toEqual(["milano_fondazione_prada_date_01", "milano_brera_date_01"]);

    const afterBrera = playDate(before, "milano_brera_date_01", [1, 0]);
    expect(afterBrera.memories).toContain("milano_brera_first_listen");
    const returning: string[] = [];
    playDate(afterBrera, "milano_fondazione_prada_date_01", [0, 0], returning);
    expect(returning.join("\n")).toContain("ブレラの絵でも");
  });

  it("makes the same approach feel different after the relationship has developed", () => {
    const firstTime: string[] = [];
    const early = playDate(checkpoints[1], "milano_san_satiro_date_01", [2, 0], firstTime);
    expect(firstTime.join("\n")).toContain("まずはこの距離で");
    expect(early.trust).toBe(checkpoints[1].trust + 4); // Both saved positive rolls apply their configured ranges.

    let closer = playDate(checkpoints[3], "milano_la_scala_date_01", [0, 0]);
    closer = playDate(closer, "milano_brera_date_01", [0, 0]);
    expect(closer.romanceStage).toBeGreaterThanOrEqual(3);
    const laterLines: string[] = [];
    const later = playDate(closer, "milano_san_satiro_date_01", [2, 0], laterLines);
    expect(laterLines.join("\n")).toContain("絵のほうも見てくださいね");
    expect(later.trust).toBe(closer.trust + 4);
  });

  it("can visit all seven places once with finite zero-score travel rewards", () => {
    // This checkpoint was reached through every real episode and A/B/C battle,
    // with every guide skipped and every quiz answered incorrectly.
    let state = checkpoints.at(-1)!;
    const totalAp = (game: GameState) => game.ap +
      game.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
    expect(state.completedEpisodeIds).toEqual(episodes.map((episode) => episode.id));
    expect(state.completedCityIds).toContain("milano");
    expect(state.completedGuideIds).toEqual([]);
    expect(state.playedDateIds).toEqual([]);
    expect(state.battleRecords.every((record) => record.firstScore === 0)).toBe(true);
    expect(state.legacyTrialAvailable).toBe(false);
    const initialAp = totalAp(state);
    expect(initialAp).toBe(15);

    const route: readonly [string, [number, number]][] = [
      ["milano_love_date_01", [2, 0]],
      ["milano_fondazione_prada_date_01", [1, 0]],
      ["milano_la_scala_date_01", [0, 2]],
      ["milano_san_satiro_date_01", [2, 1]],
      ["milano_navigli_date_01", [1, 2]],
      ["milano_starbucks_roastery_date_01", [0, 1]],
      ["milano_brera_date_01", [1, 0]],
    ];
    let spent = 0;
    for (const [id, choices] of route) {
      const date = dates.find((item) => item.id === id)!;
      expect(getDateAvailability(state, id).available).toBe(true);
      state = playDate(state, id, choices);
      spent += date.apCost;
      expect(totalAp(state)).toBe(initialAp - spent);
      expect(state.ap).toBeGreaterThanOrEqual(0);
      expect(state.ap).toBeLessThanOrEqual(12);
      expect(state.pendingApRewards.every((reward) => reward.remainingAp > 0)).toBe(true);
      expect(state.playedDateIds.filter((played) => played === id)).toHaveLength(1);
      expect(startDate(state, id)).toBe(state);
    }
    expect(spent).toBe(13);
    expect(totalAp(state)).toBe(2);
    expect(state.pendingApRewards).toEqual([]);
    expect(state.playedDateIds).toEqual(route.map(([id]) => id));
    expect(state.memories).toHaveLength(14);
    expect(new Set(state.memories).size).toBe(14);
    expect(state.endingReached).toBe(false); // No confession is needed to complete the journey.
  }, 60000);

  it("can reach a relationship via three freely chosen destinations with zero quiz points", () => {
    let state = createGame();
    state = clearEpisode(state, "milano_duomo_episode");
    state = clearEpisode(state, "milano_galleria_episode");
    state = playDate(state, ids[0], [0, 0]);
    state = clearEpisode(state, "milano_last_supper_episode");
    state = playDate(state, ids[1], [0, 0]);
    state = clearEpisode(state, "milano_castello_episode");
    state = playDate(state, ids[2], [1, 0]);
    state = clearEpisode(state, "milano_finale");
    expect(state.playedDateIds).toEqual([...ids.slice(0, 3)]);
    expect(state.ap).toBeGreaterThanOrEqual(0);
    expect(state.legacyTrialAvailable).toBe(false);
    expect(getDateAvailability(state, "milano_confession_01").available).toBe(true);
    // The honest confession is free and succeeds once the existing history and affection qualify.
    state = playDate(state, "milano_confession_01", [2]);
    expect(state.endingReached).toBe(true);
    expect(state.confessionStatus).toBe("accepted");
  }, 60000);
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
