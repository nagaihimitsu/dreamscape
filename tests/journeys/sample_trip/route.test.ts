// The sample journey (authoring/templates/sample_trip, development and tests
// only) played from the title to the city epilogue with the game's real Ink
// and domain functions, the way the map screen starts each scene: tourism
// guide → normal battle → date → (optional) encounters and special battles
// B/C → city finale → epilogue. Every step is restored from JSON and checked
// with validateGameState; AP is checked where it is earned and spent, and the
// normal battle is repeated the ways a reload or a re-clear repeats it.
import { beforeAll, describe, expect, it } from "vitest";
import { getJourney } from "../../../src/content/journeys";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "../../../src/domain/battle";
import { leaveBattleResult } from "../../../src/domain/chapter";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter, proceedFromTourism } from "../../../src/domain/encounter";
import { advanceCityEpilogue, startCityEpilogue } from "../../../src/domain/epilogue";
import { advanceDate, chooseDate, createGame, finishDate, validateGameState, type GameState } from "../../../src/domain/game";
import { advanceTourismGuide, discoverClue } from "../../../src/domain/tourism";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability } from "../../../src/domain/travel-game";

const JOURNEY = "sample_trip";
const CITY = "mihon";
const TOWER = "mihon_clock_tower";
const EPISODE = "smp_mihon_main_clock_tower";
const BATTLE = "smp_mihon_main_clock_tower_battle";
const DATE = "smp_mihon_date_tower_square";
const FINALE = "smp_mihon_finale";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);

/** Apply one player action like GameApp: settle the map event, then save and restore. */
function act(state: GameState, next: (current: GameState) => GameState): GameState {
  const result = finishTravelEventIfComplete(state, next(state));
  expect(result, "the action changed nothing").not.toBe(state);
  return restore(result);
}

/** Read the guide and open the observation point; then go on (the place's encounters first, then the battle). */
function sightsee(state: GameState, clueId?: string): GameState {
  let s = state;
  for (let step = 0; s.activeTourism?.phase === "guide"; step++) {
    expect(step, "guide stuck").toBeLessThan(60);
    s = act(s, (current) => advanceTourismGuide(current, current.revision));
  }
  expect(s.activeTourism?.phase).toBe("exploring");
  if (clueId) s = act(s, (current) => discoverClue(current, clueId, current.revision));
  return act(s, (current) => proceedFromTourism(current, current.revision, () => 0));
}

/** One player step of the active battle: the correct answer or evidence, else go on. */
function battleStep(state: GameState): GameState {
  const active = state.activeBattle!;
  const { battle, quiz } = getActiveBattleContent(active);
  if (active.phase === "reasoning") {
    let s = state;
    for (const id of battle.reasoning!.correctClueIds) s = act(s, (current) => selectReasoningClue(current, id, current.revision));
    return act(s, (current) => submitBattleEvidence(current, current.revision));
  }
  if (active.phase === "question")
    return act(state, (current) => answerBattle(current, quiz.questions[active.roundIndex].correctOptionId, current.revision));
  return act(state, (current) => advanceBattle(current, current.revision));
}

/** Play the active battle to its result, or with `untilLastSave` to the last saved state before the result. */
function playBattle(state: GameState, untilLastSave = false): GameState {
  let s = state;
  for (let step = 0; s.activeBattle?.phase !== "result"; step++) {
    expect(step, "battle stuck").toBeLessThan(200);
    const next = battleStep(s);
    if (untilLastSave && next.activeBattle?.phase === "result") return s;
    s = next;
  }
  return s;
}

/** Play the active encounter and the ones that follow at the same place, choosing `optionIds` in turn. */
function playEncounter(state: GameState, ...optionIds: string[]): GameState {
  let s = state;
  const choices = [...optionIds];
  for (let step = 0; s.activeEncounter; step++) {
    expect(step, "encounter stuck").toBeLessThan(60);
    const frame = s.activeEncounter.frame;
    const before = s;
    if (frame.choices.length) {
      const optionId = choices.shift();
      const choice = frame.choices.find((item) => item.optionId === optionId);
      expect(choice, `option ${optionId}`).toBeDefined();
      s = act(s, (current) => chooseEncounter(current, choice!.index, current.revision));
    } else if (encounterCanFinish(s)) s = act(s, (current) => finishEncounter(current, current.revision));
    else s = act(s, (current) => advanceEncounter(current, current.revision));
    // Like GameApp: when a place encounter ends, the next eligible one at the same place starts.
    if (!s.activeEncounter) s = restore(continueTourismEncounters(before, s, () => 0));
  }
  return s;
}

/** Play the active date, always taking the first choice. */
function playDate(state: GameState): GameState {
  let s = state;
  for (let step = 0; s.activeDate; step++) {
    expect(step, "date stuck").toBeLessThan(60);
    const frame = s.activeDate.frame;
    if (frame.choices.length) s = act(s, (current) => chooseDate(current, frame.choices[0].index, current.revision));
    else if (frame.ended) s = act(s, (current) => finishDate(current, current.revision));
    else s = act(s, (current) => advanceDate(current, current.revision));
  }
  return s;
}

const begin = (state: GameState, eventId: string) => act(state, (current) => beginTravelEvent(current, eventId, "walk", current.revision, () => 0));

beforeAll(() => {
  // The game reads the generated content; the unit tests build it with the sample journey.
  if (!getJourney(JOURNEY))
    throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してから、もう一度テストしてください。");
});

describe("sample journey route", () => {
  it("plays from the title to the city epilogue with every scene saved and restored", () => {
    let s = restore(createGame("ユウ", "ミオ", { journeyId: JOURNEY }));
    expect(s).toMatchObject({ currentCityId: CITY, ap: 0, travelBudget: 100 });
    expect(s.travel.currentPlaceId).toBe("mihon_hotel");

    // Before the first sightseeing stop the date is locked, and trying it spends nothing.
    expect(getTravelEventAvailability(s, DATE, "walk").available).toBe(false);
    expect(beginTravelEvent(s, DATE, "walk", s.revision, () => 0)).toBe(s);

    // 1. Clock tower: guide (+1) and observation.
    s = begin(s, EPISODE);
    expect(s.activeTourism?.landmarkId).toBe(TOWER);
    s = sightsee(s, "smp_obs_mihon_clock_tower_hands");
    expect(s.discoveredClueIds).toContain("smp_obs_mihon_clock_tower_hands");
    // (Optional part) Going on from the observation, the tower's encounters run first:
    // receive the bookmark, then the gift encounter (it needs the bookmark) follows.
    expect(s.activeEncounter?.encounterId).toBe("smp_mihon_bookmark_stall");
    s = playEncounter(s, "ask", "give");
    expect(s.inventory.smp_mihon_three_bookmark).toBe("gifted");
    expect(s.completedEncounterIds).toEqual(["smp_mihon_bookmark_stall", "smp_mihon_bookmark_gift"]);
    expect(s.seenEncounterIds).toEqual(["smp_mihon_bookmark_stall", "smp_mihon_bookmark_gift"]);
    expect(s.itemUses).toEqual({ smp_mihon_three_bookmark: { encounterId: "smp_mihon_bookmark_gift", optionId: "give" } });
    expect(s.activeTourism?.phase).toBe("exploring");
    // Battle (+1 complete, +1 for 2 or more correct).
    s = act(s, (current) => proceedFromTourism(current, current.revision, () => 0));
    expect(s.activeBattle?.battleId).toBe(BATTLE);
    const lastSave = playBattle(s, true);
    expect(totalAp(lastSave)).toBe(1);
    s = playBattle(lastSave);
    expect(s.completedEpisodeIds).toEqual([EPISODE]);
    expect(totalAp(s)).toBe(3);
    // What a reload can repeat pays nothing twice: the final answer again from the save made before the result ...
    expect(playBattle(restore(lastSave))).toEqual(s);
    // ... leaving the restored result, also with a second (stale) tap ...
    const left = act(restore(s), (current) => leaveBattleResult(current, current.revision));
    expect(leaveBattleResult(left, s.revision)).toBe(left);
    expect(totalAp(left)).toBe(3);
    expect(left.travel.activeEvent).toBeNull();
    // ... and clearing the battle again from the map (re-clear).
    const again = playBattle(act(left, (current) => startBattle(current, BATTLE)));
    expect(again.battleRewardReceipt?.entries ?? []).toEqual([]);
    const replayed = act(again, (current) => leaveBattleResult(current, current.revision));
    expect(replayed.battleRecords.find((record) => record.battleId === BATTLE)?.attempts).toBe(2);
    expect(totalAp(replayed)).toBe(3);
    expect(replayed.claimedRewardIds).toEqual(left.claimedRewardIds);
    s = left;

    // 2. Date at the tower square: 2 AP. With too little AP it does not start and spends nothing.
    const short = restore({ ...s, ap: 1 });
    expect(getTravelEventAvailability(short, DATE, "walk")).toMatchObject({ available: false, reason: "APが足りません。" });
    expect(beginTravelEvent(short, DATE, "walk", short.revision, () => 0)).toBe(short);
    // With enough AP it is spent once, although every step of the date is saved and restored.
    expect(getTravelEventAvailability(s, DATE, "walk").available).toBe(true);
    s = begin(s, DATE);
    expect(s.activeDate?.dateId).toBe(DATE);
    expect(totalAp(s)).toBe(1);
    s = playDate(s);
    expect(s.playedDateIds).toEqual([DATE]);
    expect(totalAp(s)).toBe(1);

    // (Optional part) Special battles B and C: first visit opens the place's guide, then the battle (+1 each).
    s = begin(s, "smp_mihon_special_b_market");
    s = sightsee(s);
    expect(s.activeBattle?.battleId).toBe("smp_mihon_special_b_market");
    s = playBattle(s);
    s = act(s, (current) => leaveBattle(current, current.revision));
    s = begin(s, "smp_mihon_special_c_library");
    s = sightsee(s);
    expect(s.activeBattle?.battleId).toBe("smp_mihon_special_c_library");
    s = playBattle(s);
    s = act(s, (current) => leaveBattle(current, current.revision));
    expect(totalAp(s)).toBe(3);

    // 3. City finale (+1 complete, +1 for 3 or more correct, +2 city clear).
    s = begin(s, FINALE);
    expect(s.activeBattle?.battleId).toBe("smp_mihon_finale_battle");
    s = playBattle(s);
    s = act(s, (current) => leaveBattleResult(current, current.revision));
    expect(s.completedCityIds).toEqual([CITY]);
    expect(totalAp(s)).toBe(7);

    // A normal save of the cleared city resumes as it was (same save version).
    const storage = journeyStorage(new MemoryStorage(), JOURNEY);
    expect(saveGame(storage, s).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: s });

    // 4. Epilogue.
    s = act(s, (current) => startCityEpilogue(current, CITY, current.revision));
    for (let step = 0; s.activeEpilogue; step++) {
      expect(step, "epilogue stuck").toBeLessThan(60);
      s = act(s, (current) => advanceCityEpilogue(current, current.revision));
    }
    expect(s.viewedEpilogueCityIds).toEqual([CITY]);
    expect(s.currentCityId).toBe(CITY);
    expect(totalAp(s)).toBe(7);
  });
});
