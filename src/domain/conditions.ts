import { battles, episodes, landmarks } from "../content";
import { leafKind, type Condition, type Leaf, type LeafKind, type LeafValues } from "../content/condition-schemas";
import type { GameState } from "./game-state-schema";
import { getGameWeekday, getTimePeriod, NIGHT_START } from "./travel";

/**
 * The common condition system's judge: a condition is true or false for a game state,
 * read from the existing records only. It writes nothing and gives
 * no reason text (dates keep their own reason texts; Debug explains a condition,
 * src/dev/condition-explain.ts).
 */

/** A battle was played (any attempt, won or lost): the one place that reads battleRecords' attempts. */
export function battlePlayed(state: Readonly<GameState>, battleId: string): boolean {
  return state.battleRecords.some((record) => record.battleId === battleId && record.attempts > 0);
}

/** The money that can be spent now: the budget less the fare home kept back (as an encounter option's cost is checked). */
export const spendableMoney = (state: Readonly<GameState>) => state.travelBudget - state.travel.returnReserve;

const inRange = (value: number, range: { atLeast?: number; atMost?: number }) =>
  (range.atLeast === undefined || value >= range.atLeast) && (range.atMost === undefined || value <= range.atMost);

/** Every leaf's record (a leaf missing here is a type error). */
const LEAVES: { [K in LeafKind]: (state: Readonly<GameState>, value: LeafValues[K]) => boolean } = {
  episodeCompleted: (state, id) => state.completedEpisodeIds.includes(id),
  episodesCompleted: (state, { city, atLeast }) => state.completedEpisodeIds
    .filter((id) => episodes.some((episode) => episode.id === id && episode.cityId === city)).length >= atLeast,
  cityCompleted: (state, id) => state.completedCityIds.includes(id),
  battlePlayed,
  landmarkVisited: (state, id) => state.visitedLandmarkIds.includes(id),
  guideRead: (state, id) => state.completedGuideIds.includes(id),
  encounterCompleted: (state, id) => state.completedEncounterIds.includes(id),
  encounterSeen: (state, id) => state.seenEncounterIds.includes(id),
  datePlayed: (state, id) => state.playedDateIds.includes(id),
  epilogueViewed: (state, id) => state.viewedEpilogueCityIds.includes(id),
  item: (state, { id, is }) => (is === "obtained" ? id in state.inventory : state.inventory[id] === is),
  // Night lasts from 18:00 until sleeping sets the next morning (9:00): a rest at
  // 21:00 or a late return after it is still night, though getTimePeriod calls it closed.
  time: (state, period) => (period === "night" ? state.travel.minute >= NIGHT_START : getTimePeriod(state.travel.minute) === "day"),
  cityDay: (state, range) => inRange(state.travel.day, range),
  journeyDay: (state, range) => state.travel.calendar !== undefined && inRange(state.travel.calendar.journeyDay, range),
  weekday: (state, days) => {
    const weekday = getGameWeekday(state.travel.calendar);
    return weekday !== undefined && days.includes(weekday);
  },
  rides: (state, { mode, atLeast }) => (state.travel.rideCounts[mode] ?? 0) >= atLeast,
  rented: (state, id) => state.travel.rentedModeIds.includes(id),
  battlesPlayed: (state, { city, atLeast }) => battles.filter((battle) => battle.scope !== "city_finale" &&
    landmarks.find((landmark) => landmark.id === battle.landmarkId)?.cityId === city && battlePlayed(state, battle.id)).length >= atLeast,
  relationship: (state, { axis, ...range }) => inRange(state[axis], range),
  money: (state, range) => inRange(spendableMoney(state), range),
  romanceStage: (state, range) => inRange(state.romanceStage, range),
  couple: (state) => state.confessionStatus === "accepted",
};

function meetsLeaf(state: Readonly<GameState>, leaf: Leaf): boolean {
  const kind = leafKind(leaf);
  return (LEAVES[kind] as (state: Readonly<GameState>, value: unknown) => boolean)(state, (leaf as Record<LeafKind, unknown>)[kind]);
}

/** Whether the condition is true now; no condition is always true. */
export function meets(state: Readonly<GameState>, condition: Condition | undefined): boolean {
  if (condition === undefined) return true;
  if ("all" in condition) return condition.all.every((child) => meets(state, child));
  if ("any" in condition) return condition.any.some((child) => meets(state, child));
  if ("not" in condition) return !meets(state, condition.not);
  if ("atLeast" in condition)
    return condition.atLeast.of.filter((child) => meets(state, child)).length >= condition.atLeast.count;
  return meetsLeaf(state, condition as Leaf);
}
