// Integration route through the whole Milan journey with the game's real Ink and domain functions
// (formerly qa/full-route.ts), each scene started the way a player starts it: from the title
// (newJourney), every sightseeing stop, special battle and the finale from the map
// (getTravelDestinations → beginTravelEvent, as TravelMenu → travelToEvent), the guide, observation,
// place encounters and battle like TourismScreen, EncounterScreen and BattleScreen, every action applied
// with applyPlayerAction as GameApp's commit applies it. Waiting or resting at the hotel (TravelActions)
// is only a fallback for a route that cannot start its next event: today every start fits on day 1.
// Two routes: skipped guides and wrong answers; read guides and correct answers, then the epilogue,
// every standard date and the three confession outcomes (the dates start directly with startDate).
// The special battles B and C open their guide on the first visit, so the read route also earns their
// guide rewards.
import { describe, expect, it } from "vitest";
import { battles, dates, episodes, getCityContent, journeyConfig, rewardRules } from "../../../src/content";
import { newJourney } from "../../../src/dev/scenario-builders";
import { advanceBattle, answerBattle, getActiveBattleContent, getReasoningContext, selectReasoningClue, submitBattleEvidence } from "../../../src/domain/battle";
import { leaveBattleResult } from "../../../src/domain/chapter";
import {
  advanceEncounter, answerEncounterQuiz, chooseEncounter, continueTourismEncounters, encounterStoryCanFinish,
  finishEncounter, getActiveEncounterDefinition, getEncounterOptionAvailability, proceedFromTourism,
} from "../../../src/domain/encounter";
import { advanceCityEpilogue, startCityEpilogue } from "../../../src/domain/epilogue";
import { advanceDate, chooseDate, confessionResult, finishDate, startDate, validateGameState, type GameState } from "../../../src/domain/game";
import { claimPendingRewards } from "../../../src/domain/rewards";
import { advanceTourismGuide, skipTourismGuide } from "../../../src/domain/tourism";
import { getNextTravelWaitTime, getTravelDestinations } from "../../../src/domain/travel-destinations";
import { applyPlayerAction } from "../../../src/domain/player-action";
import { beginTravelEvent, getTravelEventAvailability, getTravelSleepOptions, sleepAtHotel, waitForTravel } from "../../../src/domain/travel-game";

const CITY = "milano";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
const roll = () => 0;

const mainEvents = getCityContent(CITY).travel.events.filter((event) => event.category === "main").map((event) => event.id);
const specialBattles = mainEvents.filter((id) => journeyConfig.storyBattles.some((battle) => battle.battleId === id));
// The special battles B and C first (they are open from the start), then the stops and the finale.
const route = [...specialBattles, ...episodes.filter((episode) => episode.cityId === CITY).map((episode) => episode.id)];
const guideRewards = (battleId: string) => rewardRules.filter((rule) => rule.trigger === "guide_read" && rule.battleId === battleId).map((rule) => rule.id);

/** Apply one player action as GameApp's commit does (applyPlayerAction), then save and restore. */
function act(state: GameState, change: (current: GameState) => GameState): GameState {
  const next = applyPlayerAction(state, change);
  expect(next, "the action changed nothing").not.toBe(state);
  return restore(next);
}

/** In free time: start the next event of the route from the map; when none can start, wait or rest at the hotel. */
function nextFromMap(s: GameState): GameState {
  const { candidates } = getTravelDestinations(s);
  for (const id of route) {
    const event = candidates.find((candidate) => candidate.id === id && candidate.available);
    const mode = event?.routes.find((item) => getTravelEventAvailability(s, id, item.mode).available)?.mode;
    if (mode) return act(s, (current) => beginTravelEvent(current, id, mode, current.revision, roll));
  }
  const next = getNextTravelWaitTime(s);
  if (next !== null && waitForTravel(s, next - s.travel.minute, s.revision) !== s)
    return act(s, (current) => waitForTravel(current, next - current.travel.minute, current.revision));
  const night = getTravelSleepOptions(s).find((option) => option.plan.ok);
  expect(night, "no way to start an event, wait or rest").toBeDefined();
  return act(s, (current) => sleepAtHotel(current, night!.route.mode, current.revision, night!.route.viaPlaceId ?? null));
}

/** One step of the active place encounter: the first usable choice, the quiz answer, or go on. */
function encounterStep(s: GameState, allCorrect: boolean): GameState {
  const active = s.activeEncounter!;
  const event = getActiveEncounterDefinition(active);
  if (active.phase === "quiz") {
    const question = event.quiz!.question;
    const answer = allCorrect ? question.correctOptionId : question.options.find((option) => option.id !== question.correctOptionId)!.id;
    return act(s, (current) => answerEncounterQuiz(current, answer, current.revision));
  }
  if (active.frame.choices.length) {
    const choice = active.frame.choices.find((item) => getEncounterOptionAvailability(s, item.index).available);
    expect(choice, `${event.id}: no usable choice`).toBeDefined();
    return act(s, (current) => chooseEncounter(current, choice!.index, current.revision));
  }
  const finish = active.frame.ended && (active.phase === "outcome" || encounterStoryCanFinish(s));
  return act(s, (current) => continueTourismEncounters(current, finish ? finishEncounter(current, current.revision) : advanceEncounter(current, current.revision), roll));
}

/** One step of the active battle: the evidence, an answer, or go on. */
function battleStep(s: GameState, allCorrect: boolean): GameState {
  const active = s.activeBattle!;
  const { battle, quiz } = getActiveBattleContent(active);
  if (active.phase === "reasoning") {
    // Evidence works without observing anything first.
    expect(getReasoningContext(s)!.claimText.length).toBeGreaterThan(0);
    let next = s;
    for (const id of [...battle.reasoning!.correctClueIds].reverse()) next = act(next, (current) => selectReasoningClue(current, id, current.revision));
    return act(next, (current) => submitBattleEvidence(current, current.revision));
  }
  if (active.phase === "question") {
    const question = quiz.questions[active.roundIndex];
    const answer = allCorrect ? question.correctOptionId : question.options.find((option) => option.id !== question.correctOptionId)!.id;
    return act(s, (current) => answerBattle(current, answer, current.revision));
  }
  return act(s, (current) => advanceBattle(current, current.revision));
}

function playMilano(allCorrect: boolean): GameState {
  let s = newJourney("milano", ["ユウ", "ミオ"]);
  const battlesSeen: string[] = [];
  const guidesOpened: string[] = [];
  /** Rewards credited by the step that ended each guide. */
  const guideEndRewards = new Map<string, string[]>();
  for (let step = 0; !s.completedCityIds.includes(CITY); step++) {
    expect(step, "route stuck").toBeLessThan(4000);
    if (s.activeTourism?.phase === "guide") {
      const { landmarkId } = s.activeTourism;
      if (!guidesOpened.includes(landmarkId)) guidesOpened.push(landmarkId);
      const before = s;
      s = act(s, (current) => allCorrect ? advanceTourismGuide(current, current.revision) : skipTourismGuide(current, current.revision));
      if (s.activeTourism?.phase !== "guide") guideEndRewards.set(landmarkId, s.claimedRewardIds.filter((id) => !before.claimedRewardIds.includes(id)));
    } else if (s.activeEncounter) s = encounterStep(s, allCorrect);
    else if (s.activeTourism) s = act(s, (current) => proceedFromTourism(current, current.revision, roll));
    else if (s.activeBattle?.phase === "result") {
      // The result screen's 戻る: a special battle returns to its place, the others to free time.
      s = act(s, (current) => leaveBattleResult(current, current.revision));
    } else if (s.activeBattle) {
      if (!battlesSeen.includes(s.activeBattle.battleId)) battlesSeen.push(s.activeBattle.battleId);
      s = battleStep(s, allCorrect);
    } else s = nextFromMap(s);
  }
  // Every battle of the city, the special battles B and C among them, started from the map.
  expect(battlesSeen).toHaveLength(7);
  expect(battlesSeen.slice(0, specialBattles.length)).toEqual(specialBattles);
  for (const battleId of specialBattles) {
    const landmarkId = battles.find((battle) => battle.id === battleId)!.landmarkId!;
    // The first visit opens the special battle's guide like any sightseeing stop; reading it to the end
    // credits its reward at once (skipping does not), and the reward is kept through the city.
    expect(guidesOpened).toContain(landmarkId);
    expect(guideRewards(battleId)).toHaveLength(1);
    expect(guideEndRewards.get(landmarkId)).toEqual(allCorrect ? guideRewards(battleId) : []);
    for (const rewardId of guideRewards(battleId))
      expect(s.claimedRewardIds.includes(rewardId), rewardId).toBe(allCorrect);
    expect(s.completedGuideIds.includes(landmarkId)).toBe(allCorrect);
  }
  // The Galleria's observation runs its fortune-teller encounter before the battle; finishing it earns
  // the Galleria's first-win reward even after wrong answers (one shared reward ID, never twice).
  expect(s.completedEncounterIds).toContain("galleria_fortune");
  expect(s.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
  expect(new Set(s.claimedRewardIds).size).toBe(s.claimedRewardIds.length);
  // Every battle pays its first completion and first clear (Last Supper +4 chapter, finale +3 city clear);
  // read guides (the four stops and the special battles B and C) and first wins add 1 each.
  expect(totalAp(s)).toBe(allCorrect ? 32 : 20);
  s = act(s, (current) => startCityEpilogue(current, CITY, current.revision));
  while (s.activeEpilogue) s = act(s, (current) => advanceCityEpilogue(current, current.revision));
  expect(s.viewedEpilogueCityIds).toContain(CITY);
  expect(s.playedDateIds).toHaveLength(0);
  return s;
}

function playDate(initial: GameState, id: string, amount = 9999, picks = [0, 0]): GameState {
  let n = 0;
  let s = startDate(initial, id, () => (n++ % 4 === 0 ? 0 : amount));
  expect(s.activeDate?.dateId).toBe(id);
  for (let tick = 0; s.activeDate; tick++) {
    expect(tick, `${id} stuck`).toBeLessThan(100);
    const frame = s.activeDate.frame;
    if (frame.choices.length) s = chooseDate(s, frame.choices[picks[s.activeDate.choiceCount] ?? 0].index, s.revision);
    else if (frame.ended) s = finishDate(s, s.revision);
    else s = advanceDate(s, s.revision);
  }
  return restore(s);
}

describe("full Milan route", () => {
  it("clears all seven battles from the map with skipped guides and wrong answers", () => {
    playMilano(false);
  });

  it("clears the city from the map with read guides, plays every standard date and reaches each confession outcome", () => {
    let s = playMilano(true);
    const early = playDate(s, "milano_cafe_01", 5000);
    expect(confessionResult(early)).toBe("deferred");
    const postponed = playDate(early, "milano_confession_01");
    expect(postponed.confessionStatus).toBe("deferred");
    expect(playDate(postponed, "milano_reassurance_01").endingReached).toBe(false);
    const rejectedSeed = playDate(s, "milano_san_satiro_date_01", 0, [0, 2]);
    expect(confessionResult(rejectedSeed)).toBe("rejected");
    expect(playDate(rejectedSeed, "milano_confession_01").confessionStatus).toBe("rejected");

    const normal = dates.filter((date) => date.kind === "normal" && date.chapterId === "milano");
    expect(normal).toHaveLength(12);
    expect(normal.reduce((sum, date) => sum + date.apCost, 0)).toBe(24);
    for (const date of [...normal].reverse()) {
      s = claimPendingRewards(s, s.revision);
      s = playDate(s, date.id);
    }
    expect(totalAp(s)).toBe(32 - 24);
    expect(confessionResult(s)).toBe("accepted");
    s = playDate(s, "milano_confession_01");
    expect(s.endingReached).toBe(true);
  });
});
