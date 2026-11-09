import type { GameState } from "./game-state-schema";

/**
 * The screen a state shows (4.7): one pure function the game's screen (GameApp) and the list of the
 * player's actions (listPlayerActions, the exploration tests) both read, so they cannot drift. The
 * order is the screens': an encounter, an arrival or epilogue, sightseeing (the guide or the
 * observation), a battle, a date, the 「交際開始」 screen (a step of the date's occasion), free time.
 */
export type Screen = "encounter" | "epilogue" | "tourism" | "battle" | "date" | "romance_ending" | "free_time";
export function screenFor(state: Pick<GameState, "activeEncounter" | "activeEpilogue" | "activeTourism" | "activeBattle" | "activeDate" | "occasion">): Screen {
  if (state.activeEncounter) return "encounter";
  if (state.activeEpilogue) return "epilogue";
  if (state.activeTourism) return "tourism";
  if (state.activeBattle) return "battle";
  if (state.activeDate) return "date";
  if (state.occasion?.romanceEnding) return "romance_ending";
  return "free_time";
}
