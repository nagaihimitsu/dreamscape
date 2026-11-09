import { encounters } from "../../src/content/encounters";
import {
  encounterVisitSlot, getTourismEncounterAvailability, leaveBattleToFreeTime, startTourismEncounter,
} from "../../src/domain/encounter";
import { landmarks } from "../../src/content";
import { advanceOccasion } from "../../src/domain/occasion";
import type { Availability, GameState } from "../../src/domain/game";
import { closeTourism, openTourism, skipTourismGuide } from "../../src/domain/tourism";
import { finishTravelEventIfComplete } from "../../src/domain/travel-game";
import { playBattleToResult, startEncounterScene } from "../../src/dev/scenario-builders";

// Encounters start only at their landmark's visit (the free-time start was
// removed with the save format v14; condition system decision 7): most while
// observing it, those with head tags (the unified event design, stage 1) before
// or after its main part. These helpers meet an encounter that way with the
// game's own functions, for unit tests whose states are planted or built.

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

/** Back in free time: an open observation is closed and its map event settled, as the screen does. */
function inFreeTime(state: GameState): GameState {
  return state.activeTourism ? finishTravelEventIfComplete(state, closeTourism(state, state.revision)) : state;
}

/**
 * Meet the encounter at its moment with the given reaction ticket: in a new observation of its
 * landmark; before the main part, on a new departure from the map to the landmark (walking);
 * after it, on leaving the result of the landmark's battle played from free time. When the
 * moment does not offer it, the state is returned without that encounter (the observation, the
 * visit's main part or free time).
 */
export function meetEncounter(state: GameState, encounterId: string, nextRoll: () => number = () => 0): GameState {
  const landmarkId = landmarkOf(encounterId);
  const slot = encounterVisitSlot(encounterId);
  if (slot !== "observe") {
    // Before, after a part or after the main group: the visit's occasion from the map (as Debug opens it).
    const free = inFreeTime(state);
    try { return startEncounterScene(free, encounterId, nextRoll()); }
    catch {
      // After the battle of a landmark the map no longer leads to: the battle played again in a visit of its own.
      if (slot !== "after" && slot !== "afterBattle") return free;
      const battleId = landmarks.find((item) => item.id === landmarkId)!.battleId;
      const replay = advanceOccasion({ ...free, occasion: { kind: "visit", eventId: null, landmarkId, parts: ["battle"], ran: [], at: null, started: [] } }, nextRoll);
      if (replay.activeBattle?.battleId !== battleId) return free;
      const result = playBattleToResult(replay);
      return leaveBattleToFreeTime(result, result.revision, nextRoll);
    }
  }
  const observing = observeLandmark(state, landmarkId);
  return startTourismEncounter(observing, encounterId, observing.revision, nextRoll);
}
