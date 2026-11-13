import { searchRules, type SearchGame, type SearchSetup } from "../engines/search/engine";

// The parasol's rules (docs/13 2.4): a search skin of three rounds, the three things the heroine later tells the vegetable
// seller she saw from the window (2026-11-13 playtest: the game now looks at what the story reports). Round 1, her old
// parasol among the street's umbrellas (the tag's `at`: one of the near pavement's stalls); round 2, the customer arguing
// with her over the price; round 3, the child she gave a tomato to. A wrong one is only looked at (the round goes on);
// 「どこ？」 or doing nothing for a while has her point it out, and the next round comes. Outcomes: every round found by the
// player with at most one wrong look in all (`found`), with more (`found_slow`), or any round pointed out (`pointed`).
// Nothing is random. Pure.

export type ParasolOutcome = "found" | "found_slow" | "pointed";
/** Where on the near pavement the old parasol is. */
export type ParasolPlace = "left" | "middle" | "right";
export interface ParasolParams {
  at: ParasolPlace;
}

/** Round 1's umbrellas, in the field's order (and Tab's): five stalls on the far pavement, three people walking in the road, five stalls on the near pavement. */
export const PARASOL_SPOTS = [
  "far_1", "far_2", "far_3", "far_4", "far_5", "road_1", "road_2", "road_3", "near_1", "near_2", "near_3", "near_4", "near_5",
] as const;
export type ParasolSpot = (typeof PARASOL_SPOTS)[number];
/** The near pavement's stalls where the old parasol may be (the tag's `at`). */
export const PARASOL_PLACES: Record<ParasolPlace, ParasolSpot> = { left: "near_2", middle: "near_3", right: "near_4" };
/** Round 2's customers, in the field's order: each stands in front of a stall (two across the road, three on the near pavement). */
export const PARASOL_CUSTOMERS = ["far_2", "far_4", "near_2", "near_3", "near_4"] as const satisfies readonly ParasolSpot[];
/** Round 3's children walking by, in the field's order; one of them holds the tomato she gave. */
export const PARASOL_CHILDREN = ["child_1", "child_2", "child_3"] as const;
export const PARASOL_TOMATO_CHILD = 1;
/** Every round found with at most this many wrong looks in all: found; more: found_slow. */
export const PARASOL_QUICK_MISSES = 1;
/** Doing nothing this long in a round: she points it out, and the next round comes. */
export const PARASOL_IDLE_MS = 8000;

/** The rounds' targets for the tag's `at`: her stall, the customer at it, the child with the tomato. */
export function parasolTargets(params: ParasolParams): [number, number, number] {
  const stall = PARASOL_PLACES[params.at] ?? PARASOL_PLACES.middle;
  return [PARASOL_SPOTS.indexOf(stall), PARASOL_CUSTOMERS.indexOf(stall as (typeof PARASOL_CUSTOMERS)[number]), PARASOL_TOMATO_CHILD];
}

export function parasolSetup(params: ParasolParams): SearchSetup {
  const [stall, customer, child] = parasolTargets(params);
  return {
    rounds: [
      { spots: PARASOL_SPOTS.length, targets: [stall] },
      { spots: PARASOL_CUSTOMERS.length, targets: [customer] },
      { spots: PARASOL_CHILDREN.length, targets: [child] },
    ],
    // A wrong one is only a look: the player looks at the next.
    wrongLimit: null,
    buttons: [{ id: "ask", presses: 1, ends: "round" }],
    timeLimitMs: null,
    idleMs: PARASOL_IDLE_MS,
    idleEnds: "round",
  };
}

export const parasolGame: SearchGame<ParasolParams, ParasolOutcome> = {
  setup: parasolSetup,
  outcome: (ending) => {
    // She pointed out any of the three: pointed.
    if (ending.helped > 0) return "pointed";
    switch (ending.kind) {
      case "found": return ending.misses <= PARASOL_QUICK_MISSES ? "found" : "found_slow";
      // Helped through the last round, or a play stopped with nothing (never sent by the play): she points it out. There
      // is no wrong limit, no play button, no time limit; were there, she would point it out too.
      case "helped":
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
