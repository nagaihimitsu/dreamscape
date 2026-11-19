import { battles, dates, episodes, landmarks, scenes, storyState } from "../content";
import { usableAp, usableMoney } from "./reservations";
import { confessionThresholds } from "./difficulty";
import { leafKind, type Condition, type Leaf, type LeafKind, type LeafValues } from "../content/condition-schemas";
import { isMomentQuiz } from "./moments";
import type { GameState } from "./game-state-schema";
import { getGameWeekday, getTimePeriod, NIGHT_START } from "./travel";
// A part that reads the other dates' availability (normalDateAvailable): date-rules.ts reads `meets` in turn, so the two
// modules import each other; the part calls it only when judged (never while the modules load).
import { normalDateAvailable } from "./date-rules";

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

/** Completed ordinary dates and up to three real recovery conversations (the count the romance stages and the confession read). */
export function completedDateCount(state: Readonly<GameState>): number {
  const ordinary = state.playedDateIds.filter((id) => dates.some((date) => date.id === id && date.kind === "normal")).length;
  return ordinary + state.completedRecoveryCount;
}

/**
 * No rejection waits now (the leaf dateSinceRejection): the last confession's answer was not a rejection, or a new
 * ordinary date or a recovery was completed since it. Before 2026-11-15 the game made every confession wait so; now a
 * writer writes it on the confessions that wait (India: Agra's and Jaipur's), and on a recovery that opens during the
 * wait (Milan's).
 */
export function dateSinceRejection(state: Readonly<GameState>): boolean {
  return state.confessionStatus !== "rejected" || state.lastRejectedDateCount === null ||
    completedDateCount(state) > state.lastRejectedDateCount || state.recoveryAfterRejection;
}

/**
 * A confession would be accepted now (the leaf confessionReady; confessionResult in date-rules.ts reads it too): the
 * hidden relationship values and the completed dates meet the confession's thresholds at the save's level of money and AP
 * (difficulty.ts confessionThresholds: the journey's own there, else romance/progression.json's).
 */
export function canConfessSuccessfully(state: Readonly<GameState>): boolean {
  const need = confessionThresholds(state);
  return (
    state.affection >= need.minAffection &&
    state.trust >= need.minTrust &&
    state.spark >= need.minSpark &&
    completedDateCount(state) >= need.minCompletedDates
  );
}

/** The money that can be spent now: the budget less the fare home and the main parts' payments kept back (reservations.ts). */
export const spendableMoney = (state: Readonly<GameState>) => usableMoney(state);

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
  // Read, or the city's epilogue on screen now (activeEpilogue without a kind: not an arrival or a tour leg).
  epilogueStarted: (state, id) => state.viewedEpilogueCityIds.includes(id) || (!!state.activeEpilogue && state.activeEpilogue.kind === undefined &&
    episodes.some((episode) => episode.id === state.activeEpilogue?.episodeId && episode.cityId === id)),
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
  // The city's map quizzes (not its finale, nor a moment quiz, # at: depart|epilogue, which no map shows; 2026-11-18).
  battlesPlayed: (state, { city, atLeast }) => battles.filter((battle) => battle.scope !== "city_finale" && !isMomentQuiz(battle.id) &&
    landmarks.find((landmark) => landmark.id === battle.landmarkId)?.cityId === city && battlePlayed(state, battle.id)).length >= atLeast,
  relationship: (state, { axis, ...range }) => inRange(state[axis], range),
  money: (state, range) => inRange(spendableMoney(state), range),
  romanceStage: (state, range) => inRange(state.romanceStage, range),
  couple: (state) => state.confessionStatus === "accepted",
  dateSinceRejection,
  datesCompleted: (state, range) => inRange(completedDateCount(state), range),
  confessionReady: canConfessSuccessfully,
  normalDateAvailable: (state) => normalDateAvailable(state),
  ap: (state, range) => inRange(usableAp(state), range),
  flag: (state, id) => state.storyProgress.flags.includes(id),
  // Met: a scene naming the person in # person: was seen (decision 42; seen covers every ending).
  met: (state, id) => scenes.some((scene) => scene.people.includes(id) && state.seenEncounterIds.includes(scene.id)),
  condition: (state, name) => Object.hasOwn(storyState.conditions, name) && meets(state, storyState.conditions[name]),
  // A clue in 手がかり帳: found in an observation or heard in a scene (# clue:, # on_done: clue; 2026-11-18).
  clue: (state, id) => state.discoveredClueIds.includes(id),
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
