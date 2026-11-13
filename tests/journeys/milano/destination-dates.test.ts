import { beforeAll, describe, expect, it } from "vitest";
import { allRewardRules, dates, episodes as allEpisodes, progression } from "../../../src/content";
import { conditionLeaves } from "../../../src/content/condition-schemas";
import { nextMorning, playBattleToResult, withAp, withRelationship, wrongAnswer } from "../../../src/dev/scenario-builders";
import {
  advanceDate, chooseDate, createGame, evaluateProgression, finishDate, getDateAvailability,
  isEventVisible, startDate, taggedDateScene, validateGameState, type GameState,
} from "../../../src/domain/game";
import { beginTravelEvent, getTravelEventAvailability, isCompletedTravelEvent } from "../../../src/domain/travel-game";
import { closeRomanceEnding } from "../../../src/domain/occasion";
import { applyPlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { enterFreeTime, getNextStoryBattle, startEpisode } from "../../../src/domain/chapter";
import { leaveBattle, startBattle } from "../../../src/domain/battle";
import { skipTourismGuide, startTourismBattle } from "../../../src/domain/tourism";

const episodes = allEpisodes.filter((episode) => episode.cityId === "milano");
const ids = ["milano_la_scala_date_01", "milano_brera_date_01", "milano_navigli_date_01", "milano_san_satiro_date_01", "milano_starbucks_roastery_date_01", "milano_fondazione_prada_date_01", "milano_novecento_date_01"] as const;
const milestones = ["milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode", "milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_duomo_episode"] as const;
const firstProfiles = [
  ["attentive", "playful", "honest"], ["bold", "attentive", "honest"],
  ["attentive", "playful", "honest"], ["playful", "honest", "attentive"],
  ["playful", "bold", "attentive"], ["playful", "attentive", "bold"],
  ["attentive", "playful", "bold"],
] as const;

/** Exercise the real A/B/C route rather than inventing episode save flags (correct evidence, wrong answers). */
function finishBattle(initial: GameState): GameState {
  const state = playBattleToResult(initial, { answer: wrongAnswer });
  expect(state.activeBattle?.score).toBe(0);
  return validateGameState(JSON.parse(JSON.stringify(state)));
}

function continueStoryBattles(initial: GameState): GameState {
  let state = initial;
  while (getNextStoryBattle(state)) {
    const before = state;
    const special = getNextStoryBattle(state)!;
    state = finishBattle(startBattle(state, special.battleId));
    const total = (game: GameState) => game.ap + game.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
    const rewardAp = allRewardRules.filter((rule) => rule.battleId === special.battleId &&
      (rule.trigger === "battle_complete" || rule.trigger === "episode_clear")).reduce((sum, rule) => sum + rule.ap, 0);
    expect(total(state)).toBe(total(before) + rewardAp);
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

/** Milan's reassurance is offered at night (2026-11-13: her answer follows on a later day). */
const atNight = (state: GameState): GameState => validateGameState({ ...state, travel: { ...state.travel, minute: 19 * 60 } });
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
      expect(date.when).toEqual({ episodeCompleted: milestones[index] });
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
    const milestone = (date.when as { episodeCompleted: string }).episodeCompleted;
    const state = checkpoints[episodes.findIndex((item) => item.id === milestone) + 1];
    const poor = { ...state, ap: date.apCost - 1 };
    expect(getDateAvailability(poor, id).available).toBe(false);
    expect(startDate(poor, id)).toBe(poor);
    const started = startDate(state, id);
    const total = (game: GameState) => game.ap + game.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
    expect(total(started)).toBe(total(state) - date.apCost);
    expect(startDate(started, id)).toBe(started);
    expect(validateGameState(JSON.parse(JSON.stringify(started)))).toEqual(started);
    const completed = playDate(state, id, [0, 1]);
    expect(completed.memories).toHaveLength(state.memories.length + 1);
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
      // The date's choices as its knot writes them (# option:, # profile:, # memory:): the first moment's three, then the second's.
      const options = taggedDateScene(id)!.options;
      const chosen = [options.find((option) => option.id === `first_${firstProfiles[index][first]}`)!, options[3 + second]];
      expect(chosen.every(Boolean)).toBe(true);
      expect(chosen[1].id.startsWith("second_")).toBe(true);
      // Each destination date records one shared memory, after the second choice.
      expect(chosen[0].memory).toBeUndefined();
      expect(memories).toEqual(chosen[1].memory);
      expect(after.playedDateIds).toContain(id);
      expect(resolutions.map((entry) => entry.optionId)).toEqual(chosen.map((option) => option.id));
      expect(after.affection).toBe(before.affection + resolutions.reduce((sum, entry) => sum + entry.deltas.affection, 0));
      expect(after.trust).toBe(before.trust + resolutions.reduce((sum, entry) => sum + entry.deltas.trust, 0));
      expect(after.spark).toBe(before.spark + resolutions.reduce((sum, entry) => sum + entry.deltas.spark, 0));
      expect(after.romanceStage).toBeGreaterThanOrEqual(before.romanceStage);
      expect(after.romanceStage).toBeLessThanOrEqual(2); // One date cannot satisfy a two-date stage.
    });
  }

  it("does not add these optional dates to stage, confession or existing event requirements", () => {
    const forbidden = new Set<string>(ids);
    for (const stage of progression.stages)
      expect(stage).not.toHaveProperty("when");
    expect(progression.confession).not.toHaveProperty("when");
    const readDates = (date: (typeof dates)[number]) => [date.when, date.until].flatMap((condition) => (condition ? conditionLeaves(condition) : []))
      .flatMap((leaf) => ("datePlayed" in leaf ? [leaf.datePlayed] : []));
    for (const event of dates.filter((date) => !forbidden.has(date.id)))
      expect(readDates(event).some((id) => forbidden.has(id))).toBe(false);
  });

  it("raises the romance stage with a destination date alone, before any cafe, walk or invitation date, and leaves the cafe date available", () => {
    const before = checkpoints[2];
    const after = playDate(before, "milano_novecento_date_01", [2, 0]);
    expect(after.romanceStage).toBe(2);
    expect(after.playedDateIds).toEqual(["milano_novecento_date_01"]);
    expect(getDateAvailability(after, "milano_cafe_01").available).toBe(true);
  });

  it("visits Navigli before and after the cafe date with the same laundry detail and no line about an earlier canal talk", () => {
    const afterCastle = checkpoints[4];
    const firstTime: string[] = [];
    playDate(afterCastle, ids[2], [0, 0], firstTime);
    expect(firstTime.join("\n")).toContain("洗濯");
    expect(firstTime.join("\n")).not.toContain("前にも運河の近くで話しましたね");
    const afterCafe = playDate(afterCastle, "milano_cafe_01", [0, 0]);
    const returning: string[] = [];
    const afterBoth = playDate(afterCafe, ids[2], [0, 0], returning);
    expect(returning.join("\n")).toContain("洗濯");
    expect(returning.join("\n")).not.toContain("前にも運河の近くで話しましたね");
    expect(afterBoth.playedDateIds).toContain("milano_cafe_01");
    expect(afterBoth.playedDateIds).toContain(ids[2]);
    expect(afterBoth.memories).toEqual(expect.arrayContaining(afterCafe.memories));
  });

  it("allows Prada and Brera in either order without losing history", () => {
    const before = checkpoints[3];
    const afterPrada = playDate(before, "milano_fondazione_prada_date_01", [0, 0]);
    const pradaThenBrera = playDate(afterPrada, "milano_brera_date_01", [1, 0]);
    expect(pradaThenBrera.playedDateIds).toEqual(["milano_fondazione_prada_date_01", "milano_brera_date_01"]);
    const afterBrera = playDate(before, "milano_brera_date_01", [1, 0]);
    const breraThenPrada = playDate(afterBrera, "milano_fondazione_prada_date_01", [0, 0]);
    expect(breraThenPrada.playedDateIds).toEqual(["milano_brera_date_01", "milano_fondazione_prada_date_01"]);
    expect(breraThenPrada.memories).toEqual(expect.arrayContaining(afterBrera.memories));
  });

  it("makes the same approach feel different after the relationship has developed", () => {
    const firstTime: string[] = [];
    const early = playDate(checkpoints[1], "milano_san_satiro_date_01", [2, 0], firstTime);
    expect(firstTime.join("\n")).toContain("彼女は目だけで、こちらがどこを見たか確かめた。");
    expect(early.trust).toBeGreaterThan(checkpoints[1].trust);

    let closer = playDate(checkpoints[3], "milano_la_scala_date_01", [0, 0]);
    closer = playDate(closer, "milano_brera_date_01", [0, 0]);
    expect(closer.romanceStage).toBeGreaterThanOrEqual(3);
    const laterLines: string[] = [];
    const later = playDate(closer, "milano_san_satiro_date_01", [2, 0], laterLines);
    expect(laterLines.join("\n")).toContain("彼女は反対側から身を寄せて、同じ見え方になる位置を探った。");
    expect(later.trust).toBeGreaterThan(closer.trust);
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
    const initialAp = totalAp(state);
    expect(initialAp).toBe(19);

    const route: readonly [string, [number, number]][] = [
      ["milano_novecento_date_01", [2, 0]],
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
    expect(totalAp(state)).toBe(6);
    expect(state.pendingApRewards).toEqual([]);
    expect(state.playedDateIds).toEqual(route.map(([id]) => id));
    expect(state.memories).toHaveLength(7);
    expect(new Set(state.memories).size).toBe(7);
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
    expect(getDateAvailability(state, "milano_confession_01").available).toBe(true);
    // The honest confession is free and succeeds once the existing history and affection qualify.
    state = playDate(state, "milano_confession_01", [2]);
    expect(state.endingReached).toBe(true);
    expect(state.confessionStatus).toBe("accepted");
  }, 60000);
});

describe("Milan's confession, played once like every date (2026-11-13)", () => {
  const confession = "milano_confession_01";
  const closed = { available: false, reason: "このひとときは、もう思い出になりました。" };
  /** After the Duomo and three dates, at stage 2 or more (the confession's minRomanceStage); made once. */
  let threeDates: GameState | undefined;
  const afterThreeDates = () => threeDates ??= (() => {
    let state = clearEpisode(createGame(), "milano_duomo_episode");
    for (const id of ["milano_cafe_01", "milano_walk_01", "milano_night_01"]) state = playDate(withAp(state, 12), id, [0, 0]);
    state = evaluateProgression(withRelationship(state, { affection: 2, trust: 1, spark: 0 }));
    expect(state.romanceStage).toBeGreaterThanOrEqual(2);
    return state;
  })();

  it.each([
    ["accepted", { affection: 8, trust: 4, spark: 4 }],
    ["deferred", { affection: 4, trust: 2, spark: 0 }],
    ["rejected", { affection: 0, trust: 0, spark: 0 }],
  ] as const)("after %s, the confession date is not offered again", (outcome, values) => {
    const before = evaluateProgression(withRelationship(afterThreeDates(), values));
    expect(getDateAvailability(before, confession)).toEqual({ available: true, reason: "" });
    expect(isCompletedTravelEvent(before, confession)).toBe(false);
    let state = playDate(before, confession, [0]);
    expect(state.confessionStatus).toBe(outcome);
    // After an acceptance, the ending is the reason it gives first.
    expect(getDateAvailability(state, confession)).toEqual(outcome === "accepted"
      ? { available: false, reason: "ふたりの物語は、交際エンディングを迎えました。" } : closed);
    expect(isCompletedTravelEvent(state, confession)).toBe(true);
    expect(startDate(state, confession)).toBe(state);
    // Nor after what would let a repeatable one be played again: the reassurance after a deferral, a new date after a rejection.
    if (outcome === "accepted") return;
    state = outcome === "deferred" ? playDate(atNight(state), "milano_reassurance_01", [0])
      : playDate(withAp(state, 12), "milano_san_satiro_date_01", [0, 0]);
    expect(getDateAvailability(state, confession)).toEqual(closed);
  }, 60000);

  /**
   * Her answer (2026-11-13): Milan is a one-city journey, so after the deferral no later confession can follow; she gives
   * her answer herself at the Darsena, by day after the reassurance's night (the day she said 「今日は返事をしない」 never
   * has it). The answer is the relationship state's when it starts (deferralAnswer): yes, or a final "not now".
   */
  describe("her answer after the deferral (2026-11-13)", () => {
    const answer = "milano_answer_01";
    const reassurance = "milano_reassurance_01";
    /** Deferred at the confession after three dates; made once. */
    let deferral: GameState | undefined;
    const deferred = () => deferral ??= (() => {
      const transcript: string[] = [];
      const state = playDate(evaluateProgression(withRelationship(afterThreeDates(), { affection: 4, trust: 2, spark: 0 })), confession, [0], transcript);
      expect(transcript).toContain("うれしい。だからこそ、その勢いで「うん」って言うのを待って。わたしはもう少し、自分の言葉で考えたい");
      expect(state.confessionStatus).toBe("deferred");
      return state;
    })();
    /** The reassurance on a night after the deferral, then a night at the hotel; the next morning with the given values. */
    const morningAfterReassurance = (values: Pick<GameState, "affection" | "trust" | "spark">): GameState =>
      evaluateProgression(withRelationship(nextMorning(playDate(atNight(deferred()), reassurance, [1])), values));

    it("waits for the reassurance's night and a later day", () => {
      expect(getDateAvailability(deferred(), answer).available).toBe(false);
      expect(getDateAvailability(atNight(deferred()), answer).available).toBe(false);
      const reassured = playDate(atNight(deferred()), reassurance, [1]);
      // Not on the night she said 「今日は返事をしない」.
      expect(getDateAvailability(reassured, answer).available).toBe(false);
      const morning = nextMorning(reassured);
      expect(morning.travel.minute).toBe(9 * 60);
      expect(isEventVisible(morning, answer)).toBe(true);
      expect(getDateAvailability(morning, answer)).toEqual({ available: true, reason: "" });
    }, 60000);

    it("says not now when the confession's condition is not met: a final rejection", () => {
      const morning = morningAfterReassurance({ affection: 4, trust: 2, spark: 0 });
      expect(startDate(morning, answer).activeDate).toMatchObject({ pendingOutcome: "rejected", resolutionMode: "fixed", randomPlan: [] });
      const transcript: string[] = [];
      const state = playDate(morning, answer, [2], transcript);
      expect(transcript).toContain("ガッレリアで、今日は返事をしないって言った。だから、今日はする。わたしから");
      expect(transcript).toContain("待っててくれたのに、ごめんなさい。これが、わたしの答え。遠回しにはしない");
      expect(transcript).toContain("うん。それは、橋の上で答えたときから変わってない。普通に会いたい");
      expect(transcript).not.toContain("付き合いたい。恋人として、帰ってからも会いたい");
      expect(state).toMatchObject({ confessionStatus: "rejected", endingReached: false });
      expect(state.memories).not.toContain("milano_answer_memory");
      expect(getDateAvailability(state, answer)).toEqual(closed);
      expect(isEventVisible(atNight(state), reassurance)).toBe(false);
    }, 60000);

    it("says yes when it is met: the couple ending, its memory and the 「交際開始」 screen, from the map", () => {
      const morning = morningAfterReassurance({ affection: 8, trust: 4, spark: 4 });
      const mode = ["walk", "tram", "taxi"].find((item) => getTravelEventAvailability(morning, answer, item).available)!;
      let state = applyPlayerAction(morning, (current) => beginTravelEvent(current, answer, mode, current.revision, () => 0), () => 0);
      expect(state.occasion).toMatchObject({ kind: "date", parts: ["date", "ending"] });
      const transcript: string[] = [];
      for (let step = 0; state.activeDate; step++) {
        expect(step).toBeLessThan(200);
        state = validateGameState(JSON.parse(JSON.stringify(state)));
        const active = state.activeDate!;
        transcript.push(active.frame.text);
        const change = active.frame.ended ? (current: GameState) => finishDate(current, current.revision)
          : active.frame.choices.length ? (current: GameState) => chooseDate(current, active.frame.choices[0].index, current.revision)
            : (current: GameState) => advanceDate(current, current.revision);
        state = applyPlayerAction(state, change, () => 0);
      }
      expect(transcript).toContain("付き合いたい。恋人として、帰ってからも会いたい");
      expect(state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
      expect(state.memories).toContain("milano_answer_memory");
      expect(state.occasion).toMatchObject({ at: "main:ending", romanceEnding: true });
      expect(screenFor(validateGameState(JSON.parse(JSON.stringify(state))))).toBe("romance_ending");
      const free = validateGameState(JSON.parse(JSON.stringify(closeRomanceEnding(state, state.revision, () => 0))));
      expect(free.occasion).toBeNull();
      expect(getDateAvailability(free, answer)).toEqual({ available: false, reason: "ふたりの物語は、交際エンディングを迎えました。" });
    }, 60000);
  });
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
