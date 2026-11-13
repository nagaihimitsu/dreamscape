import { searchRules, type SearchGame, type SearchSetup } from "../engines/search/engine";

// The parasol's rules (docs/13 2.4): a search skin. The street below the lattice window has nine umbrellas (PARASOL_SPOTS);
// the old parasol is one of the three stalls on the near pavement (the tag's `at`). A wrong umbrella is only looked at
// (the search goes on); the old one found among the first two looked at is `found`, later `found_slow`; 「どこ？」 or
// doing nothing for a while is `pointed` (she points it out). Nothing is random. Pure.

export type ParasolOutcome = "found" | "found_slow" | "pointed";
/** Where on the near pavement the old parasol is. */
export type ParasolPlace = "left" | "middle" | "right";
export interface ParasolParams {
  at: ParasolPlace;
}

/** The umbrellas, in the field's order (and Tab's): the far pavement, the road, the near pavement. */
export const PARASOL_SPOTS = ["far_left", "far_middle", "far_right", "road_upper", "road_lower", "near_walk", "near_left", "near_middle", "near_right"] as const;
export type ParasolSpot = (typeof PARASOL_SPOTS)[number];
/** The near pavement's stalls, where the old parasol may be. */
export const PARASOL_PLACES: Record<ParasolPlace, ParasolSpot> = { left: "near_left", middle: "near_middle", right: "near_right" };
/** Found with at most this many wrong umbrellas looked at first: found; more: found_slow. */
export const PARASOL_QUICK_MISSES = 1;
/** Doing nothing this long ends the look: she points it out. */
export const PARASOL_IDLE_MS = 8000;

export function parasolSetup(params: ParasolParams): SearchSetup {
  return {
    spots: PARASOL_SPOTS.length,
    targets: [PARASOL_SPOTS.indexOf(PARASOL_PLACES[params.at] ?? PARASOL_PLACES.middle)],
    // A wrong umbrella is only a look: the player looks at the next.
    wrongEnds: false,
    buttons: [{ id: "ask", presses: 1 }],
    timeLimitMs: null,
    idleMs: PARASOL_IDLE_MS,
  };
}

export const parasolGame: SearchGame<ParasolParams, ParasolOutcome> = {
  setup: parasolSetup,
  outcome: (ending) => {
    switch (ending.kind) {
      case "found": return ending.misses <= PARASOL_QUICK_MISSES ? "found" : "found_slow";
      // 「どこ？」, doing nothing, or a play stopped with nothing: she points it out. A wrong umbrella does not end this
      // play (wrongEnds: false); were it to, she would point it out too.
      case "button":
      case "idle":
      case "timeout":
      case "wrong": return "pointed";
    }
  },
  auto: (outcome) => {
    switch (outcome) {
      case "found": return { kind: "found", misses: 0 };
      case "found_slow": return { kind: "found", misses: PARASOL_QUICK_MISSES + 1 };
      case "pointed": return { kind: "button", button: "ask" };
    }
  },
};

export const parasolRules = searchRules(parasolGame);
