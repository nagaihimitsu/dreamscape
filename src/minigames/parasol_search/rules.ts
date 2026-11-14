import type { MiniGameRating, MiniGameRules } from "../contract";
import { searchEnding, searchRules, type SearchGame, type SearchRecord, type SearchSetup } from "../engines/search/engine";

// The parasol's rules (docs/13 2.4): a search skin of three rounds, the three things the heroine later tells the vegetable
// seller she saw from the window (2026-11-13 playtest: the game now looks at what the story reports). Round 1, her old
// parasol among the street's umbrellas (the tag's `at`: one of the near pavement's stalls); round 2, the customer arguing
// with her over the price, among six others (two of them with their arms up too); round 3, the child she gave a tomato
// to, among four others (one with a red ball, one with a red flower). A wrong one is only looked at (the round goes on);
// 「どこ？」 or doing nothing for a while has her point it out, and the next round comes (sooner after a round the player
// left to her). Outcomes: every round found by the player with at most one wrong look in all (`found`), with more
// (`found_slow`), or any round pointed out (`pointed`). The rating (★, the result card only) adds the time. The tag's
// `rounds` may play fewer (the practice: the parasol only). Nothing is random. Pure.

export type ParasolOutcome = "found" | "found_slow" | "pointed";
/** Where on the near pavement the old parasol is. */
export type ParasolPlace = "left" | "middle" | "right";
export interface ParasolParams {
  at: ParasolPlace;
  /** How many of the three rounds to play, from the first (3 in the story; 1 in the practice). */
  rounds?: number;
}

/** Round 1's umbrellas, in the field's order (and Tab's): five stalls on the far pavement, three people walking in the road, five stalls on the near pavement. */
export const PARASOL_SPOTS = [
  "far_1", "far_2", "far_3", "far_4", "far_5", "road_1", "road_2", "road_3", "near_1", "near_2", "near_3", "near_4", "near_5",
] as const;
export type ParasolSpot = (typeof PARASOL_SPOTS)[number];
/** The near pavement's stalls where the old parasol may be (the tag's `at`). */
export const PARASOL_PLACES: Record<ParasolPlace, ParasolSpot> = { left: "near_2", middle: "near_3", right: "near_4" };
/** Round 2's customers, in the field's order: each stands in front of a stall (three across the road, four on the near pavement). */
export const PARASOL_CUSTOMERS = ["far_2", "far_3", "far_4", "near_1", "near_2", "near_3", "near_4"] as const satisfies readonly ParasolSpot[];
/** Round 3's children walking by, in the field's order (two across the road, three on the near side); one holds the tomato she gave. */
export const PARASOL_CHILDREN = ["child_1", "child_2", "child_3", "child_4", "child_5"] as const;
export const PARASOL_TOMATO_CHILD = 1;
export const PARASOL_ROUNDS = 3;

/** The parasol's numbers (E1; Debug's room may change them for its next play). */
export type ParasolTuning = {
  /** Doing nothing this long in a round: she points it out, and the next round comes. */
  idleMs: number;
  /** After a round the player left to her (nothing looked at, doing nothing): the next rounds' wait before she points. */
  idleAfterLeftMs: number;
  /** Every round found with at most this many wrong looks in all: found; more: found_slow. */
  quickMisses: number;
  /** ★3: no wrong look, and every round found within this long a round (about 15 s for the three). */
  starMsPerRound: number;
};
export const PARASOL_TUNING: ParasolTuning = { idleMs: 8000, idleAfterLeftMs: 4000, quickMisses: 1, starMsPerRound: 5000 };
export const PARASOL_QUICK_MISSES = PARASOL_TUNING.quickMisses;
export const PARASOL_IDLE_MS = PARASOL_TUNING.idleMs;

/** The rounds the tag plays (1 to 3, all three when it says nothing). */
export const parasolRounds = (params: ParasolParams) => Math.min(PARASOL_ROUNDS, Math.max(1, Math.trunc(params.rounds ?? PARASOL_ROUNDS) || PARASOL_ROUNDS));

/** The rounds' targets for the tag's `at`: her stall, the customer at it, the child with the tomato. */
export function parasolTargets(params: ParasolParams): [number, number, number] {
  const stall = PARASOL_PLACES[params.at] ?? PARASOL_PLACES.middle;
  return [PARASOL_SPOTS.indexOf(stall), PARASOL_CUSTOMERS.indexOf(stall as (typeof PARASOL_CUSTOMERS)[number]), PARASOL_TOMATO_CHILD];
}

export const parasolSetupFor = (tuning: ParasolTuning) => (params: ParasolParams): SearchSetup => {
  const [stall, customer, child] = parasolTargets(params);
  return {
    rounds: [
      { spots: PARASOL_SPOTS.length, targets: [stall] },
      { spots: PARASOL_CUSTOMERS.length, targets: [customer] },
      { spots: PARASOL_CHILDREN.length, targets: [child] },
    ].slice(0, parasolRounds(params)),
    // A wrong one is only a look: the player looks at the next.
    wrongLimit: null,
    buttons: [{ id: "ask", presses: 1, ends: "round" }],
    timeLimitMs: null,
    idleMs: Math.max(1, Math.round(tuning.idleMs)),
    idleAfterLeftMs: Math.max(1, Math.round(tuning.idleAfterLeftMs)),
    idleEnds: "round",
  };
};
export const parasolSetup = parasolSetupFor(PARASOL_TUNING);

export const parasolGameFor = (tuning: ParasolTuning): SearchGame<ParasolParams, ParasolOutcome> => ({
  setup: parasolSetupFor(tuning),
  outcome: (ending) => {
    // She pointed out any of the three: pointed.
    if (ending.helped > 0) return "pointed";
    switch (ending.kind) {
      case "found": return ending.misses <= tuning.quickMisses ? "found" : "found_slow";
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
      case "found_slow": return { kind: "found", misses: tuning.quickMisses + 1 };
      case "pointed": return { kind: "button", button: "ask" };
    }
  },
});
export const parasolGame = parasolGameFor(PARASOL_TUNING);

/**
 * How well the look went (the result card's ★ only; never saved, never Ink), in step with the outcome: found with no
 * wrong look and every round within its time ★3, found ★2, found_slow ★1, pointed out not rated. The score is the time,
 * and the wrong looks when there were any (what took a ★ off a quick find): 「4.6秒・見間違い 2」.
 */
export function parasolRating(record: SearchRecord, params: ParasolParams, tuning: ParasolTuning = PARASOL_TUNING): MiniGameRating | null {
  const ending = searchEnding(record, parasolSetupFor(tuning)(params));
  if (ending.kind !== "found" || ending.helped > 0) return null;
  const endMs = typeof record?.endMs === "number" && Number.isFinite(record.endMs) ? record.endMs : null;
  const seconds = endMs === null ? null : `${(endMs / 1000).toFixed(1)}秒`;
  const scoreJa = seconds === null ? undefined : ending.misses > 0 ? `${seconds}・見間違い ${ending.misses}` : `${seconds}で見つけた`;
  if (ending.misses > tuning.quickMisses) return { stars: 1, ...(scoreJa ? { scoreJa } : {}) };
  const quick = ending.misses === 0 && endMs !== null && endMs <= tuning.starMsPerRound * parasolRounds(params);
  return { stars: quick ? 3 : 2, ...(scoreJa ? { scoreJa } : {}) };
}

export function parasolRulesFor(tuning: ParasolTuning): MiniGameRules<ParasolParams, ParasolOutcome, SearchRecord> {
  return { ...searchRules(parasolGameFor(tuning)), rate: (record, params) => parasolRating(record, params, tuning) };
}
export const parasolRules = parasolRulesFor(PARASOL_TUNING);
