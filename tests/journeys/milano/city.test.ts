import { describe, expect, it } from "vitest";
import {
  battles,
  battleQuizzes,
  dates,
  episodes as allEpisodes,
  rewardRules,
  allRewardRules,
  type EpisodeDefinition,
} from "../../../src/content";
import {
  createGame,
  validateGameState,
  startDate,
  advanceDate,
  chooseDate,
  finishDate,
  type GameState,
} from "../../../src/domain/game";
import {
  advanceBattle,
  answerBattle,
  startBattle,
  getBattleAvailability,
  getBattleOutcome,
  leaveBattle,
  selectReasoningClue,
  submitBattleEvidence,
} from "../../../src/domain/battle";
import {
  getNextEpisode,
  getNextStoryBattle,
  getEpisodeAvailability,
  startEpisode,
  enterFreeTime,
  leaveBattleResult,
} from "../../../src/domain/chapter";
import {
  skipTourismGuide,
  startTourismBattle,
  openTourism,
  getTourismAvailability,
  closeTourism,
} from "../../../src/domain/tourism";
import { startCityEpilogue, advanceCityEpilogue } from "../../../src/domain/epilogue";
import { chooseEncounter, advanceEncounter, encounterCanFinish, finishEncounter } from "../../../src/domain/encounter";
import { meetEncounter } from "../../fixtures/encounter-moment";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
const episodes = allEpisodes.filter((episode) => episode.cityId === "milano");
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
    const earned = allRewardRules.filter((rule) => rule.battleId === special.battleId &&
      (rule.trigger === "battle_complete" || rule.trigger === "episode_clear"));
    expect(totalAp(state)).toBe(totalAp(before) + earned.reduce((sum, rule) => sum + rule.ap, 0));
    expect(state.claimedRewardIds).toEqual([...before.claimedRewardIds, ...earned.map((rule) => rule.id)]);
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
  let state = startDate(initial, id, stableRolls());
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

function collectPick(initial: GameState): GameState {
  let state = meetEncounter(initial, "duomo_string");
  expect(state.activeEncounter?.encounterId).toBe("duomo_string");
  for (let count = 0; state.activeEncounter && count < 100; count++) {
    const active = state.activeEncounter;
    state = active.frame.choices.length
      ? chooseEncounter(state, 0, state.revision)
      : encounterCanFinish(state)
        ? finishEncounter(state, state.revision)
        : advanceEncounter(state, state.revision);
  }
  expect(state.activeEncounter).toBeNull();
  expect(state.inventory.blue_pick).toBe("held");
  // The encounter returned to the Duomo's observation; leave it for free time.
  expect(state.activeTourism?.landmarkId).toBe("duomo_milano");
  return restore(closeTourism(state, state.revision));
}

/** Build an accepted relationship through current dates and confession. */
function inRelationship(initial: GameState): GameState {
  let state = restore({ ...initial, affection: 20, trust: 20, spark: 20 });
  for (const id of ["milano_cafe_01", "milano_walk_01", "milano_night_01", "milano_confession_01"])
    state = playDate(state, id);
  expect(state.confessionStatus).toBe("accepted");
  return state;
}

function persisted(state: GameState): GameState {
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  expect(saveGame(storage, state)).toEqual({ ok: true });
  const loaded = loadGame(storage);
  expect(loaded.status).toBe("loaded");
  if (loaded.status !== "loaded") throw new Error("save unavailable");
  expect(loaded.state).toEqual(state);
  return loaded.state;
}

describe("Milan's four episodes and distinct city finale", () => {
  it("keeps a held local item, memories and funds through city completion and a save and reload", () => {
    let state = collectPick(playDate(tour(), "milano_cafe_01"));
    expect(state.memories.length).toBeGreaterThan(0);
    state = restore({ ...state, ap: 12 });
    const before = persisted(state);
    state = finishEpisode(before, finale(), 5);
    expect(state.completedCityIds).toContain("milano");
    expect(state.inventory).toEqual(before.inventory);
    expect(state.travelBudget).toBe(before.travelBudget);
    expect(state.memories).toEqual(before.memories);
    expect(state.ap).toBe(12);
    expect(state.pendingApRewards.length).toBeGreaterThan(0);
    const loaded = persisted(state);
    expect(loaded.schemaVersion).toBe(state.schemaVersion);
    expect(loaded.inventory.blue_pick).toBe("held");
    expect(loaded.pendingApRewards).toEqual(state.pendingApRewards);
  });

  it("retains an unused local item and the existing relationship ending after save and load", () => {
    const ending = inRelationship(tour());
    const state = collectPick(ending);
    const loaded = persisted(state);
    expect(loaded.schemaVersion).toBe(state.schemaVersion);
    expect(loaded.endingReached).toBe(true);
    expect(loaded.confessionStatus).toBe(ending.confessionStatus);
    expect(loaded.inventory.blue_pick).toBe("held");
    expect(loaded.memories).toEqual(ending.memories);
    expect(loaded.ap).toBe(ending.ap);
    expect(loaded.pendingApRewards).toEqual(ending.pendingApRewards);
    expect(loaded.travelBudget).toBe(ending.travelBudget);
  });
  it("allows sightseeing in any order while keeping the city finale locked", () => {
    const state = createGame();
    expect(getNextEpisode(state)?.landmarkId).toBe("duomo_milano");
    for (const episode of episodes.filter((item) => item.kind !== "city_finale")) {
      expect(getEpisodeAvailability(state, episode.id).available).toBe(true);
      expect(getBattleAvailability(state, episode.battleId).available).toBe(true);
      if (episode.landmarkId) {
        expect(
          getTourismAvailability(state, episode.landmarkId).available,
        ).toBe(true);
      }
    }
    expect(getEpisodeAvailability(state, finale().id).available).toBe(false);
    expect(startEpisode(state, finale().id)).toBe(state);
    expect(getBattleAvailability(state, finale().battleId).available).toBe(false);
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
    for (const currentPlaceId of ["p_hotel", "p_galleria", "p_prada"]) {
      const elsewhere = { ...initial, travel: { ...initial.travel, currentPlaceId } };
      const started = startCityEpilogue(elsewhere, "milano", elsewhere.revision);
      expect(started.activeEpilogue).not.toBeNull();
      expect(restore(started).travel).toEqual(elsewhere.travel);
    }
    const text: string[] = [];
    state = startCityEpilogue(state, "milano", state.revision);
    expect(startCityEpilogue(state, "milano", initial.revision)).toBe(state);
    // A save from different story content must never resume at an unrelated Ink position.
    const altered = structuredClone(state);
    altered.activeEpilogue!.contentHash = "unrecognized";
    expect(() => validateGameState(altered)).toThrow("都市エピローグの途中データを確認できません。元のデータは保管されています。");
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
  it("pays the two-choice date that opens after the Milan clear once and keeps a pre-existing relationship ending", () => {
    const date = dates.find((item) =>
      item.requiredCompletedCityIds?.includes("milano"),
    )!;
    let state = tour();
    // All four sightseeing episodes alone do not satisfy the city-date gate.
    expect(state.completedCityIds).toEqual([]);
    expect(startDate(state, date.id)).toBe(state);
    state = finishEpisode(state, finale(), 0);
    state = leaveBattleResult(state, state.revision);
    expect(startDate(createGame(), date.id).activeDate).toBeNull();
    const before = totalAp(state);
    state = playDate(state, date.id, [1, 2]);
    expect(totalAp(state)).toBe(before - date.apCost);
    expect(state.playedDateIds).toContain(date.id);
    expect(state.endingReached).toBe(false);
    let ended = inRelationship(tour());
    ended = finishEpisode(ended, finale(), 0);
    ended = leaveBattleResult(ended, ended.revision);
    const beforeEnding = totalAp(ended);
    ended = playDate(ended, date.id, [2, 1]);
    expect(totalAp(ended)).toBe(beforeEnding - date.apCost);
    expect(ended.endingReached).toBe(true);
    expect(ended.confessionStatus).toBe("accepted");
    expect(startDate(ended, date.id)).toBe(ended);
  });
  it("funds optional dates and a deferred-then-accepted confession from zero-score city play", () => {
    let state = finishEpisode(tour(), finale(), 0);
    state = enterFreeTime(state, state.revision);
    expect(totalAp(state)).toBe(19);
    state = playDate(state, "milano_cafe_01", [0, 0]);
    state = playDate(state, "milano_walk_01", [0, 1]);
    state = playDate(state, "milano_invitation_01", [0]);
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.confessionStatus).toBe("deferred");
    // Respecting her request for time raises trust; a second confession can
    // then succeed without changing the battle rewards.
    state = playDate(state, "milano_reassurance_01", [1]);
    state = playDate(state, "milano_night_01", [0, 1]);
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.endingReached).toBe(true);
    expect(totalAp(state)).toBe(11);
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
    // The revised epilogue has four intentional contexts: distant, stage 2,
    // stage 3+, and dating. Inspect those states directly so random date
    // outcomes do not make this presentation test depend on their scores.
    read({ ...state, romanceStage: 1 });
    read({ ...state, romanceStage: 2 });
    read({ ...state, romanceStage: 3 });
    read({ ...state, romanceStage: 4, endingReached: true,
      confessionStatus: "accepted", playedDateIds: [...state.playedDateIds, "milano_confession_01"] });
    expect(new Set(texts).size).toBe(4);
  });
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
