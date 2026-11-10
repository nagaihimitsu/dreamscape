// The action list the exploration tests walk (listPlayerActions) and the screen rules it is built
// from: the list is built from the same rule functions the screens call, and each offered action
// changes the game.
import { describe, expect, it } from "vitest";
import { battles, episodes, getCityContent, journeyConfig } from "../content";
import { defaultJourneyId, journeys } from "../content/journeys";
import {
  cityStart, clearCity, completedCity, correctAnswer, departFromClearedCity, newJourney, openBattleScene, openEpilogueScene, readEpilogue, wrongAnswer,
  type AnswerPicker,
} from "../dev/scenario-builders";
import { getActiveBattleContent, getBattleOutcome } from "./battle";
import { battleCityId, storyBattlesForCity } from "./chapter";
import { isJourneyComplete } from "./city-travel";
import { isAuthoredEpilogueCity, startCityArrival } from "./epilogue";
import { createGame, type GameState } from "./game";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "./player-action";
import { canClaimPendingRewards } from "./rewards";
import { getTravelWaitOptions } from "./travel-destinations";
import { installTourTestCity, testTour } from "../dev/test-tours";
import { DAY_END } from "./travel";

const roll = () => 0;
const kinds = (actions: PlayerAction[]) => actions.map((action) => action.kind);
const apply = (state: GameState, action: PlayerAction) => applyPlayerAction(state, playerActionChange(action, roll));
/** Play the open battle on (next, or the right answer) until `done` holds. */
function until(initial: GameState, done: (state: GameState) => boolean): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, "the battle did not get there").toBeLessThan(200);
    const active = state.activeBattle!;
    const right = active.phase === "question" ? getActiveBattleContent(active).quiz.questions[active.roundIndex].correctOptionId : null;
    const action = listPlayerActions(state).find((item) => item.kind === "battle_next" || (item.kind === "battle_answer" && item.optionId === right));
    expect(action, `nothing moves the battle on in phase ${active.phase}`).toBeDefined();
    state = apply(state, action!);
  }
  return state;
}
const playable = journeys.filter((journey) => journey.status === "available");
const startCity = (journeyId: string) => playable.find((journey) => journey.id === journeyId)!.cities[0].id;

describe("the actions a player can take now", () => {
  const withArrival = playable.find((journey) => getCityContent(journey.cities[0].id).city.arrivalStoryId);
  it.runIf(withArrival)("a new journey offers only its arrival: the logo first, then the lines", () => {
    const created = createGame("ユウ", "ミオ", { journeyId: withArrival!.id });
    const arrival = startCityArrival(created, created.revision);
    expect(listPlayerActions(arrival)).toEqual([{ kind: "arrival_logo" }]);
    expect(listPlayerActions(apply(arrival, { kind: "arrival_logo" }))).toEqual([{ kind: "epilogue_next" }]);
  });

  it("free time offers the map's destinations by their available modes and waiting, and each offered action changes the game", () => {
    const state = newJourney(defaultJourneyId);
    const actions = listPlayerActions(state);
    expect(kinds(actions)).toContain("travel");
    expect(kinds(actions)).toContain("wait");
    for (const action of actions) expect(apply(state, action), JSON.stringify(action)).not.toBe(state);
  });

  it("a battle question offers its three answers and the hint, and a landmark's battle the way back to its observation", () => {
    const cityId = startCity(defaultJourneyId);
    const episode = episodes.find((item) => item.cityId === cityId && item.kind !== "city_finale")!;
    const question = until(openBattleScene(newJourney(defaultJourneyId), episode.battleId), (state) => state.activeBattle!.phase === "question");
    const landmarkId = battles.find((battle) => battle.id === episode.battleId)!.landmarkId!;
    expect(listPlayerActions(question)).toEqual([
      { kind: "battle_answer", optionId: "A" }, { kind: "battle_answer", optionId: "B" }, { kind: "battle_answer", optionId: "C" },
      { kind: "battle_hint" }, { kind: "battle_observe", landmarkId },
    ]);
  });

  const storyBattle = (kind: "contradiction" | "connection") => journeyConfig.storyBattles
    .map((entry) => battles.find((battle) => battle.id === entry.battleId)!)
    .find((battle) => battle.reasoning?.kind === kind && battleCityId(battle.id) === startCity(defaultJourneyId));
  it.each(["contradiction", "connection"] as const)("special battle (%s): the clue book offers the clues the screen lets the player choose, and the evidence once enough are chosen", (kind) => {
    const battle = storyBattle(kind);
    expect(battle, `the default journey's first city has a ${kind} battle`).toBeDefined();
    const rule = battle!.reasoning!;
    let state = until(openBattleScene(newJourney(defaultJourneyId), battle!.id), (current) => current.activeBattle!.phase === "reasoning");
    const toggles = (current: GameState) => listPlayerActions(current).flatMap((action) => action.kind === "evidence_toggle" ? [action.clueId] : []);
    expect(toggles(state)).toEqual(rule.caseClueIds);
    expect(kinds(listPlayerActions(state))).not.toContain("evidence_submit");
    expect(kinds(listPlayerActions(state)).includes("battle_press")).toBe(kind === "contradiction");
    for (const clueId of rule.correctClueIds) state = apply(state, { kind: "evidence_toggle", clueId });
    // B replaces its one clue (every clue stays choosable); C takes no third clue, only puts one back.
    expect(toggles(state)).toEqual(kind === "contradiction" ? rule.caseClueIds : rule.correctClueIds.filter((id) => rule.caseClueIds.includes(id)).sort((a, b) => rule.caseClueIds.indexOf(a) - rule.caseClueIds.indexOf(b)));
    expect(kinds(listPlayerActions(state))).toContain("evidence_submit");
  });

  /** Each battle's result screen on the way through the journey, every city in turn (answers by `answer`). */
  function everyBattleResult(journeyId: string, answer: AnswerPicker): GameState[] {
    const results: GameState[] = [];
    const cities = playable.find((journey) => journey.id === journeyId)!.cities;
    let state = cityStart(cities[0].id);
    for (const [index, city] of cities.entries()) {
      expect(state.currentCityId).toBe(city.id);
      const cleared = clearCity(state, { answer, onResult: (result) => results.push(result) });
      if (index < cities.length - 1) state = departFromClearedCity(cleared);
    }
    return results;
  }
  /** Every episode, special battle and finale of the journey has a result, and each result a way out. */
  function expectWaysOut(journeyId: string, transition: string, results: GameState[]) {
    const cityIds = playable.find((journey) => journey.id === journeyId)!.cities.map((city) => city.id);
    const battleIds = [...episodes.filter((episode) => cityIds.includes(episode.cityId)).map((episode) => episode.battleId),
      ...cityIds.flatMap((cityId) => storyBattlesForCity(cityId).map((battle) => battle.battleId))];
    expect(new Set(results.map((result) => result.activeBattle!.battleId)), "every episode, special battle and finale").toEqual(new Set(battleIds));
    for (const result of results) {
      const { battle } = getActiveBattleContent(result.activeBattle!);
      const actions = kinds(listPlayerActions(result));
      if (battle.scope === "city_finale" && isAuthoredEpilogueCity(battleCityId(battle.id) ?? "")) {
        // A city whose author starts its epilogue (then: epilogue; the sample's 3.9 (d)): free time, no 「エピローグへ」.
        expect(actions, battle.id).toEqual(expect.arrayContaining(["battle_leave"]));
        expect(actions, battle.id).not.toContain("battle_epilogue");
      } else if (battle.scope === "city_finale") {
        expect(actions, battle.id).toContain("battle_epilogue");
        expect(actions.includes("battle_leave"), battle.id).toBe(transition !== "after_epilogue");
      } else {
        expect(actions, battle.id).toContain("battle_leave");
        expect(actions, battle.id).not.toContain("battle_epilogue");
      }
      // Each way out closes the result screen (to free time, the battle's place, or the epilogue).
      for (const kind of ["battle_leave", "battle_epilogue"] as const)
        if (actions.includes(kind)) expect(apply(result, { kind }).activeBattle, `${battle.id}: ${kind}`).toBeNull();
    }
  }
  const transitions = playable.map((journey) => [journey.id, journey.cityTransition ?? "manual"]);
  it.each(transitions)("%s: every battle's result has a way out: free time after each battle but a finale whatever the city transition (%s), and a finale its epilogue (free time too unless the journey moves on after it)", (journeyId, transition) => {
    expectWaysOut(journeyId, transition, everyBattleResult(journeyId, correctAnswer));
  });

  // docs/04: 「失敗しても各対決の完了は記録され、旅を続けられる」 — a lost finale clears its city too.
  it.each(transitions)("%s: a battle lost with every answer wrong (DEFEAT) still completes, and its result has the same ways out as a win (%s), so the journey goes on", (journeyId, transition) => {
    const results = everyBattleResult(journeyId, wrongAnswer);
    expectWaysOut(journeyId, transition, results);
    const finales = results.filter((result) => getActiveBattleContent(result.activeBattle!).battle.scope === "city_finale");
    expect(finales).toHaveLength(playable.find((journey) => journey.id === journeyId)!.cities.length);
    for (const finale of finales) {
      const active = finale.activeBattle!;
      const { battle, quiz } = getActiveBattleContent(active);
      expect(getBattleOutcome(active.score, quiz.questions.length), battle.id).toBe("defeat");
      expect(finale.completedCityIds, battle.id).toContain(battle.cityId);
    }
  });

  it.each(playable.map((journey) => journey.id))("%s: the journey ends once its last city is cleared and that city's epilogue is read", (journeyId) => {
    const last = playable.find((journey) => journey.id === journeyId)!.cities.at(-1)!.id;
    const cleared = completedCity(last);
    expect(isJourneyComplete(cleared)).toBe(false);
    expect(isJourneyComplete(readEpilogue(openEpilogueScene(cleared)))).toBe(true);
  });

  it("stored AP is offered for collection only while the wallet is below its cap", () => {
    const state = newJourney(defaultJourneyId);
    const stored = { ...state, pendingApRewards: [{ rewardId: "any", earnedAp: 2, remainingAp: 1 }] };
    expect(canClaimPendingRewards(state)).toBe(false);
    expect(canClaimPendingRewards(stored)).toBe(true);
    expect(canClaimPendingRewards({ ...stored, ap: 10_000 })).toBe(false);
  });

  it("free time offers each available tour offer and, once booked, its cancel instead; neither during a scene (tour stage 2a)", () => {
    const cleanup = installTourTestCity();
    try {
      const state = newJourney(testTour.journeyId);
      const bookings = listPlayerActions(state).filter((action) => action.kind === "book_tour");
      expect(bookings).toEqual([{ kind: "book_tour", tourId: testTour.tourId, offerId: "hotel_desk" }, { kind: "book_tour", tourId: testTour.tourId, offerId: "web" }]);
      for (const action of bookings) expect(apply(state, action)).not.toBe(state);
      const booked = apply(state, bookings[0]);
      expect(kinds(listPlayerActions(booked)).filter((kind) => kind === "book_tour" || kind === "cancel_tour")).toEqual(["cancel_tour"]);
      expect(kinds(listPlayerActions(openBattleScene(booked, "smp_mihon_special_b_market")))).not.toContain("cancel_tour");
      // Tight on money: the offers it does not cover are not listed.
      expect(listPlayerActions({ ...state, travelBudget: 11 }).filter((action) => action.kind === "book_tour")).toEqual([bookings[0]]);
    } finally { cleanup(); }
  });

  it("waiting offers 30 minutes and the next opening, each only while it still ends before the day does", () => {
    const morning = newJourney(defaultJourneyId);
    const [thirty, ...rest] = getTravelWaitOptions(morning);
    expect(thirty).toEqual({ minutes: 30, until: null, available: true });
    for (const option of rest) expect(option.minutes).toBe(option.until! - morning.travel.minute);
    const late = { ...morning, travel: { ...morning.travel, minute: DAY_END - 20 } };
    expect(getTravelWaitOptions(late)[0]).toEqual({ minutes: 30, until: null, available: false });
  });
});
