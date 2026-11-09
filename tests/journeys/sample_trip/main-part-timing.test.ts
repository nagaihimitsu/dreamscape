// When the map condition of a sample landmark is read (unified event design stage 2b, decision 21):
// once, on departing from the map. The clock tower's stall (priority -1, before the main part) gives
// an item, or here also costs money; a `when` written only in this test (in memory, not in the
// sample's files) turns false during it, and the visit's main part still opens.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { episodes } from "../../../src/content";
import { encounters } from "../../../src/content/encounters";
import { getJourney } from "../../../src/content/journeys";
import { meets, spendableMoney } from "../../../src/domain/conditions";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter } from "../../../src/domain/encounter";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability } from "../../../src/domain/travel-game";

const EPISODE = "smp_mihon_main_clock_tower";
const STALL = "smp_mihon_bookmark_stall";
const BOOKMARK = "smp_mihon_three_bookmark";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const act = (state: GameState, next: (current: GameState) => GameState) => {
  const result = finishTravelEventIfComplete(state, next(state));
  expect(result, "the action changed nothing").not.toBe(state);
  return restore(result);
};
/** Play the open encounter with `optionId`, then on (its moment's main part opens in the same action). */
function playStall(state: GameState, optionId: string): GameState {
  let s = state;
  for (let step = 0; s.activeEncounter; step++) {
    expect(step, "encounter stuck").toBeLessThan(60);
    const choice = s.activeEncounter.frame.choices.find((item) => item.optionId === optionId);
    s = s.activeEncounter.frame.choices.length
      ? act(s, (current) => chooseEncounter(current, choice!.index, current.revision))
      : act(s, (current) => continueTourismEncounters(current, encounterCanFinish(current)
        ? finishEncounter(current, current.revision) : advanceEncounter(current, current.revision), () => 0));
  }
  return s;
}

describe("the sample clock tower's map condition is read once, on departing", () => {
  const episode = () => episodes.find((item) => item.id === EPISODE)!;
  const stall = () => encounters.encounters.find((item) => item.id === STALL)!;
  const costs = new Map<string, number | undefined>();
  beforeAll(() => {
    if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
    for (const option of stall().options) costs.set(option.id, option.cost);
  });
  afterEach(() => {
    delete episode().when;
    for (const option of stall().options) option.cost = costs.get(option.id);
  });

  it("opens the guide after the stall gave the item the when reads as not obtained", () => {
    episode().when = { not: { item: { id: BOOKMARK, is: "obtained" } } };
    const start = restore(createGame("ユウ", "ミオ", { journeyId: "sample_trip" }));
    expect(getTravelEventAvailability(start, EPISODE, "walk").available).toBe(true);
    const trip = act(start, (current) => beginTravelEvent(current, EPISODE, "walk", current.revision, () => 0));
    expect(trip.activeEncounter).toMatchObject({ encounterId: STALL, trip: { eventId: EPISODE } });
    const visit = playStall(trip, "ask");
    expect(visit.inventory[BOOKMARK]).toBe("held");
    expect(meets(visit, episode().when)).toBe(false);
    expect(visit.activeTourism).toMatchObject({ landmarkId: "mihon_clock_tower", phase: "guide" });
  });

  it("opens the guide after the stall spent the money the when needs", () => {
    stall().options.find((option) => option.id === "ask")!.cost = 30;
    const start = restore(createGame("ユウ", "ミオ", { journeyId: "sample_trip" }));
    const trip = act(start, (current) => beginTravelEvent(current, EPISODE, "walk", current.revision, () => 0));
    // The condition holds on departing (after the fare), and the stall's 30 makes it false.
    episode().when = { money: { atLeast: spendableMoney(trip) } };
    expect(getTravelEventAvailability(start, EPISODE, "walk").available).toBe(true);
    const visit = playStall(trip, "ask");
    expect(spendableMoney(visit)).toBe(spendableMoney(trip) - 30);
    expect(meets(visit, episode().when)).toBe(false);
    expect(visit.activeTourism).toMatchObject({ landmarkId: "mihon_clock_tower", phase: "guide" });
  });
});
