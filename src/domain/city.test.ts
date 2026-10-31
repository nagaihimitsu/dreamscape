import { describe, expect, it } from "vitest";
import {
  battles,
  battleQuizzes,
  dates,
  episodes,
  rewardRules,
  type EpisodeDefinition,
} from "../content";
import {
  createGame,
  validateGameState,
  startDate,
  advanceDate,
  chooseDate,
  finishDate,
  getMilestoneAvailability,
  type GameState,
} from "./game";
import {
  advanceBattle,
  answerBattle,
  startBattle,
  getBattleAvailability,
  getBattleOutcome,
  leaveBattle,
  selectReasoningClue,
  submitBattleEvidence,
} from "./battle";
import {
  getNextEpisode,
  getNextStoryBattle,
  getEpisodeAvailability,
  startEpisode,
  enterFreeTime,
} from "./chapter";
import {
  skipTourismGuide,
  startTourismBattle,
  openTourism,
  getTourismAvailability,
} from "./tourism";
import { startCityEpilogue, advanceCityEpilogue } from "./epilogue";
import phase6 from "../../tests/fixtures/phase6-saves.json";
const restore = (state: GameState) => {
  const next = validateGameState(JSON.parse(JSON.stringify(state)));
  expect(next).toEqual(state);
  return next;
};
const totalAp = (state: GameState) =>
  state.ap +
  state.pendingApRewards.reduce((sum, item) => sum + item.remainingAp, 0);
function finishBattle(initial: GameState, score: number): GameState {
  let state = initial;
  const battle = battles.find(
    (item) => item.id === state.activeBattle!.battleId,
  )!;
  const quiz = battleQuizzes[battle.quizId];
  for (
    let count = 0;
    state.activeBattle!.phase !== "result" && count < 200;
    count++
  ) {
    state = restore(state);
    const active = state.activeBattle!;
    if (active.phase === "reasoning") {
      for (const id of battle.reasoning!.correctClueIds)
        state = selectReasoningClue(state, id, state.revision);
      state = submitBattleEvidence(state, state.revision);
    } else if (active.phase === "question") {
      const question = quiz.questions[active.roundIndex];
      // Every option is independently graded from a valid boundary, including the fifth round.
      for (const option of question.options) {
        const answer = answerBattle(state, option.id, state.revision);
        expect(answer.activeBattle!.answers.at(-1)?.correct).toBe(
          option.id === question.correctOptionId,
        );
        expect(answer.activeBattle!.score).toBe(
          active.score + Number(option.id === question.correctOptionId),
        );
        expect(answerBattle(answer, option.id, state.revision)).toBe(answer);
      }
      state = answerBattle(
        state,
        active.roundIndex < score
          ? question.correctOptionId
          : question.options.find(
              (option) => option.id !== question.correctOptionId,
            )!.id,
        state.revision,
      );
    } else state = advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return restore(state);
}

/** Continue the route through B/C, with no discovery or correct-answer requirement. */
function finishPendingStory(initial: GameState): GameState {
  let state = initial;
  for (let count = 0; getNextStoryBattle(state) && count < 2; count++) {
    const special = getNextStoryBattle(state)!;
    const before = state;
    state = finishBattle(startBattle(state, special.battleId), 0);
    expect(state.battleRecords.find((record) => record.battleId === special.battleId)?.attempts).toBe(1);
    expect(state.ap).toBe(before.ap);
    expect(state.pendingApRewards).toEqual(before.pendingApRewards);
    expect(state.claimedRewardIds).toEqual(before.claimedRewardIds);
    expect(state.affection).toBe(before.affection);
    expect(state.discoveredClueIds).toEqual(before.discoveredClueIds);
    expect(state.completedEpisodeIds).toEqual(before.completedEpisodeIds);
    expect(state.completedCityIds).toEqual(before.completedCityIds);
    state = leaveBattle(state, state.revision);
    state = restore(state);
  }
  expect(getNextStoryBattle(state)).toBeNull();
  return state;
}
function finishEpisode(
  initial: GameState,
  episode: EpisodeDefinition,
  score = 0,
): GameState {
  let state = startEpisode(initial, episode.id);
  if (episode.kind !== "city_finale") {
    expect(state.activeTourism?.landmarkId).toBe(episode.landmarkId);
    state = skipTourismGuide(state, state.revision);
    state = startTourismBattle(state, state.revision);
  }
  return finishBattle(state, score);
}
function tour(initial = createGame()): GameState {
  let state = initial;
  for (const episode of episodes.filter(
    (item) => item.kind !== "city_finale",
  )) {
    if (state.completedEpisodeIds.includes(episode.id)) continue;
    state = finishEpisode(state, episode);
    state = enterFreeTime(state, state.revision);
    state = finishPendingStory(state);
  }
  return state;
}
function playDate(initial: GameState, id: string, choices = [0, 0]): GameState {
  let state = startDate(initial, id);
  expect(state.activeDate?.dateId).toBe(id);
  for (let count = 0; state.activeDate && count < 100; count++) {
    state = restore(state);
    const active = state.activeDate!;
    state = active.frame.ended
      ? finishDate(state, state.revision)
      : active.frame.choices.length
        ? chooseDate(state, choices[active.choiceCount], state.revision)
        : advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return restore(state);
}
const finale = () => episodes.find((item) => item.kind === "city_finale")!;

describe("Milan's four episodes and distinct city finale", () => {
  it("starts at Duomo and blocks every future direct tourism and battle shortcut", () => {
    const state = createGame();
    expect(getNextEpisode(state)?.landmarkId).toBe("duomo_milano");
    expect(state.legacyTrialAvailable).toBe(false);
    for (const episode of episodes.slice(1)) {
      expect(getEpisodeAvailability(state, episode.id).available).toBe(false);
      expect(startEpisode(state, episode.id)).toBe(state);
      expect(getBattleAvailability(state, episode.battleId).available).toBe(
        false,
      );
      expect(startBattle(state, episode.battleId)).toBe(state);
      if (episode.landmarkId) {
        expect(
          getTourismAvailability(state, episode.landmarkId).available,
        ).toBe(false);
        expect(openTourism(state, episode.landmarkId)).toBe(state);
      }
    }
    expect(getMilestoneAvailability(state, "trial_after_cafe").available).toBe(
      false,
    );
  });
  it("plays every sightseeing episode in order with zero discoveries or correct answers and no duplicate rewards", () => {
    let state = createGame();
    const ids: string[] = [];
    for (const episode of episodes.filter(
      (item) => item.kind !== "city_finale",
    )) {
      expect(getNextEpisode(state)?.id).toBe(episode.id);
      state = finishEpisode(state, episode);
      ids.push(episode.landmarkId!);
      expect(state.completedEpisodeIds).toContain(episode.id);
      expect(state.completedCityIds).toEqual([]);
      expect(state.affection).toBe(0);
      expect(state.discoveredClueIds).toEqual([]);
      const finished = state;
      expect(advanceBattle(state, state.revision)).toBe(state);
      state = finishBattle(startBattle(state, episode.battleId), 0);
      expect(totalAp(state)).toBe(totalAp(finished));
      state = enterFreeTime(state, state.revision);
      if (episode.landmarkId === "last_supper")
        expect(getNextStoryBattle(state)?.battleId).toBe("milano_last_supper_b01");
      if (episode.landmarkId === "castello_sforzesco")
        expect(getNextStoryBattle(state)?.battleId).toBe("milano_last_supper_c01");
      state = finishPendingStory(state);
    }
    expect(ids).toEqual([
      "duomo_milano",
      "galleria_vittorio_emanuele_ii",
      "last_supper",
      "castello_sforzesco",
    ]);
    expect(getNextEpisode(state)?.kind).toBe("city_finale");
    expect(getEpisodeAvailability(state, finale().id).available).toBe(true);
  });
  it("does not interpret the old chapter token as all sightseeing or city completion", () => {
    const state = validateGameState(phase6.ending);
    expect(state.completedChapters).toContain("milano");
    expect(state.completedEpisodeIds).toEqual([]);
    expect(state.completedCityIds).toEqual([]);
    expect(getNextEpisode(state)?.landmarkId).toBe("duomo_milano");
    expect(getEpisodeAvailability(state, finale().id).available).toBe(false);
  });
  it("keeps the old Last Supper completion and skips it after the two newly available episodes", () => {
    let state = validateGameState(phase6.result);
    const oldRewardCount = state.claimedRewardIds.filter(
      (id) => id === "chapter_milano_first_clear",
    ).length;
    state = enterFreeTime(state, state.revision);
    for (const landmarkId of [
      "duomo_milano",
      "galleria_vittorio_emanuele_ii",
    ]) {
      expect(getNextEpisode(state)?.landmarkId).toBe(landmarkId);
      state = finishEpisode(state, getNextEpisode(state)!);
      state = enterFreeTime(state, state.revision);
    }
    expect(getNextStoryBattle(state)?.battleId).toBe("milano_last_supper_b01");
    state = finishPendingStory(state);
    expect(getNextEpisode(state)?.landmarkId).toBe("castello_sforzesco");
    expect(
      state.claimedRewardIds.filter(
        (id) => id === "chapter_milano_first_clear",
      ),
    ).toHaveLength(oldRewardCount);
    expect(state.completedCityIds).toEqual([]);
  });
  it.each([0, 1, 2, 3, 4, 5])(
    "finishes the five-round boss with %i correct, stores one city clear and preserves AP at the cap",
    (score) => {
      let state = tour();
      const before = totalAp(state);
      const boss = finale();
      expect(boss.landmarkId).toBeNull();
      state = finishEpisode(state, boss, score);
      expect(state.activeBattle!.answers).toHaveLength(5);
      expect(state.activeBattle!.score).toBe(score);
      expect(getBattleOutcome(score, 5)).toBe(
        score === 5 ? "perfect" : score >= 3 ? "victory" : "defeat",
      );
      expect(state.completedCityIds).toEqual(["milano"]);
      expect(state.endingReached).toBe(false);
      const earned = rewardRules
        .filter(
          (rule) =>
            rule.episodeId === boss.id &&
            (rule.trigger !== "battle_score" || score >= rule.minScore!),
        )
        .reduce((sum, rule) => sum + rule.ap, 0);
      expect(totalAp(state)).toBe(before + earned);
      expect(state.ap).toBeLessThanOrEqual(12);
      const completed = state;
      state = finishBattle(startBattle(state, boss.battleId), score);
      expect(totalAp(state)).toBe(totalAp(completed));
      expect(state.completedCityIds).toEqual(["milano"]);
      expect(
        state.battleRecords.find((record) => record.battleId === boss.battleId)
          ?.attempts,
      ).toBe(2);
      expect(getNextEpisode(state)).toBeNull();
    },
  );
  it("finishes the city without automatically starting romance and saves each epilogue boundary", () => {
    let state = finishEpisode(tour(), finale(), 0);
    const initial = state;
    const text: string[] = [];
    state = startCityEpilogue(state, "milano", state.revision);
    expect(startCityEpilogue(state, "milano", initial.revision)).toBe(state);
    while (state.activeEpilogue) {
      state = restore(state);
      text.push(state.activeEpilogue!.frame.text);
      expect(startBattle(state, battles[0].id)).toBe(state);
      expect(startDate(state, "milano_cafe_01")).toBe(state);
      expect(openTourism(state, "duomo_milano")).toBe(state);
      state = advanceCityEpilogue(state, state.revision);
    }
    expect(text.join(" ")).toMatch(/[\p{Script=Han}]/u);
    expect(state.viewedEpilogueCityIds).toEqual(["milano"]);
    expect(state.endingReached).toBe(false);
    expect(state.affection).toBe(initial.affection);
    expect(totalAp(state)).toBe(totalAp(initial));
    expect(advanceCityEpilogue(state, state.revision)).toBe(state);
  });
  it("pays the new two-choice city date once and keeps a pre-existing relationship ending", () => {
    const date = dates.find((item) =>
      item.requiredCompletedCityIds?.includes("milano"),
    )!;
    let state = finishEpisode(tour(), finale(), 0);
    state = leaveBattle(state, state.revision);
    expect(startDate(createGame(), date.id).activeDate).toBeNull();
    const before = totalAp(state);
    state = playDate(state, date.id, [1, 2]);
    expect(totalAp(state)).toBe(before - date.apCost);
    expect(state.playedDateIds).toContain(date.id);
    expect(state.endingReached).toBe(false);
    let ended = validateGameState(phase6.ending);
    ended = tour(ended);
    ended = finishEpisode(ended, finale(), 0);
    ended = leaveBattle(ended, ended.revision);
    const beforeEnding = totalAp(ended);
    ended = playDate(ended, date.id, [2, 1]);
    expect(totalAp(ended)).toBe(beforeEnding - date.apCost);
    expect(ended.endingReached).toBe(true);
    expect(ended.confessionStatus).toBe("accepted");
    expect(startDate(ended, date.id)).toBe(ended);
  });
  it("funds the whole low-affection romance route from zero-score city play without trial AP", () => {
    let state = finishEpisode(tour(), finale(), 0);
    state = enterFreeTime(state, state.revision);
    expect(totalAp(state)).toBe(15);
    expect(state.legacyTrialAvailable).toBe(false);
    state = playDate(state, "milano_cafe_01", [0, 0]);
    state = playDate(state, "milano_walk_01", [0, 1]);
    state = playDate(state, "milano_invitation_01", [0]);
    state = playDate(state, "milano_night_01", [0, 1]);
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.confessionStatus).toBe("deferred");
    state = playDate(state, "milano_reassurance_01", [0]);
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.endingReached).toBe(true);
    expect(totalAp(state)).toBe(7);
    expect(state.claimedRewardIds.some((id) => id.startsWith("trial_"))).toBe(
      false,
    );
    expect(state.completedCityIds).toEqual(["milano"]);
  });
  it("changes the short city epilogue with the existing relationship, without advancing it", () => {
    let state = finishEpisode(tour(), finale(), 0);
    state = enterFreeTime(state, state.revision);
    const texts: string[] = [];
    const read = (before: GameState) => {
      let current = startCityEpilogue(before, "milano", before.revision);
      const lines: string[] = [];
      while (current.activeEpilogue) {
        current = restore(current);
        lines.push(current.activeEpilogue!.frame.text);
        current = advanceCityEpilogue(current, current.revision);
      }
      expect(current.affection).toBe(before.affection);
      expect(current.endingReached).toBe(before.endingReached);
      expect(totalAp(current)).toBe(totalAp(before));
      texts.push(lines.join(" "));
    };
    read(state);
    state = playDate(state, "milano_cafe_01", [1, 2]);
    read(state);
    state = playDate(state, "milano_walk_01", [1, 2]);
    read(state);
    state = playDate(state, "milano_invitation_01", [0]);
    state = playDate(state, "milano_night_01", [1, 2]);
    read(state);
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.endingReached).toBe(true);
    read(state);
    expect(new Set(texts).size).toBe(5);
  });
});
