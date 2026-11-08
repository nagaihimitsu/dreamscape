import { encounters } from "../../src/content/encounters";
import { getTourismEncounterAvailability, startTourismEncounter } from "../../src/domain/encounter";
import type { Availability, GameState } from "../../src/domain/game";
import { closeTourism, openTourism, skipTourismGuide } from "../../src/domain/tourism";

// Encounters start only during an observation of their landmark (the free-time
// start was removed with the save format v14; condition system decision 7).
// These helpers meet an encounter that way with the game's own functions, for
// unit tests whose states are planted or built.

const landmarkOf = (encounterId: string): string => {
  const encounter = encounters.encounters.find((item) => item.id === encounterId);
  if (!encounter) throw new Error(`no encounter ${encounterId}`);
  return encounter.landmarkId;
};

/** A new observation visit of the landmark: an open observation is closed first, a first visit skips its guide. */
export function observeLandmark(state: GameState, landmarkId: string): GameState {
  let next = state.activeTourism ? closeTourism(state, state.revision) : state;
  next = openTourism(next, landmarkId);
  if (next.activeTourism?.phase === "guide") next = skipTourismGuide(next, next.revision);
  if (next.activeTourism?.landmarkId !== landmarkId || next.activeTourism.phase !== "exploring")
    throw new Error(`the observation of ${landmarkId} does not open in this state`);
  return next;
}

/** Whether a new observation of the encounter's landmark would offer it (the reason when not). */
export function encounterOffered(state: GameState, encounterId: string): Availability {
  return getTourismEncounterAvailability(observeLandmark(state, landmarkOf(encounterId)), encounterId);
}

/**
 * Meet the encounter in a new observation of its landmark with the given reaction ticket. When the
 * observation does not offer it, the observation is returned without an encounter.
 */
export function meetEncounter(state: GameState, encounterId: string, nextRoll: () => number = () => 0): GameState {
  const observing = observeLandmark(state, landmarkOf(encounterId));
  return startTourismEncounter(observing, encounterId, observing.revision, nextRoll);
}
