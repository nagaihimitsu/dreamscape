import type { GameState } from "../../src/domain/game";
import { advanceTourismGuide, chooseTourismGuide, guideChoiceDisplay } from "../../src/domain/tourism";

/**
 * Read the open sightseeing guide to its end as a player does (its first open choice at each choice), with the game's own
 * functions only: for unit tests whose states are planted. Returns the state unchanged when no guide is open.
 */
export function readGuide(initial: GameState): GameState {
  let state = initial;
  for (let step = 0; state.activeTourism?.phase === "guide"; step++) {
    if (step > 1000) throw new Error(`the guide of ${state.activeTourism.landmarkId} does not end`);
    const choice = state.activeTourism.frame?.choices.find((item) => guideChoiceDisplay(state, item.index).show === "open");
    const next = choice ? chooseTourismGuide(state, choice.index, state.revision) : advanceTourismGuide(state, state.revision);
    if (next === state) throw new Error(`the guide of ${state.activeTourism.landmarkId} does not go on`);
    state = next;
  }
  return state;
}
