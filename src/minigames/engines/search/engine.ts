import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `search` engine's rules (docs/13 2.2): a field of places to search (spots), a few extra buttons (「名前を呼ぶ」
// 「明日にする」), a time limit or none, an idle limit or none. The play ends at the first event that ends it: a spot that
// hides the thing (found), a wrong spot where a wrong one ends the play, a button's last press, the time running out, or
// the player doing nothing for the idle limit. The outcome comes from that event and what came before it (how many wrong
// spots); nothing is random. Pure: no clock, DOM or React (EnginePlay.tsx times and draws; a skin draws the field).

/** One thing the player did: searched a spot (by its index in the skin's field), or pressed one of the buttons (by its ID). */
export type SearchAction = { spot: number } | { button: string };

/** A play's record: what the player did, in order, and what stopped the play when none of that did. */
export interface SearchRecord {
  actions: readonly SearchAction[];
  /**
   * The play ran out without an action ending it: its time limit (`timeout`), or the player did nothing for the idle limit
   * (`idle`). null: an action ended it. A record that ends with neither (the play stopped with nothing) reads as idle.
   */
  lapse: "timeout" | "idle" | null;
}

/** How a play ended, and how many wrong spots were searched before (each spot counts once). */
export type SearchEnding =
  | { kind: "found"; spot: number; misses: number }
  | { kind: "wrong"; spot: number; misses: number }
  | { kind: "button"; button: string; misses: number }
  | { kind: "timeout"; misses: number }
  | { kind: "idle"; misses: number };
export type SearchEndingKind = SearchEnding["kind"];
export const SEARCH_ENDING_KINDS: readonly SearchEndingKind[] = ["found", "wrong", "button", "timeout", "idle"];

const ID = /^[a-z][a-z0-9_]*$/u;

/**
 * A play's setup: the skin's tuning (in its definition's code, never in a tag: docs/13 2.2) with the tag's choice of where
 * the thing is (`targets`). Spots are 0 to spots − 1.
 */
export const searchSetupSchema = z.object({
  /** How many places there are to search. */
  spots: z.number().int().min(2).max(24),
  /** The spots that hide the thing (one or more). */
  targets: z.array(z.number().int().min(0)).min(1),
  /** A wrong spot ends the play (the player pointed and was wrong); false: it is searched, and the search goes on. */
  wrongEnds: z.boolean(),
  /** The extra buttons, and how many presses of each end the play (「明日にする」 1, 「名前を呼ぶ」 3). */
  buttons: z.array(z.object({ id: z.string().regex(ID), presses: z.number().int().min(1) }).strict()),
  /** The play runs out after this long (ms of the host's clock from its start); null: no time limit. */
  timeLimitMs: z.number().int().positive().nullable(),
  /** The play runs out after the player has done nothing for this long; null: never. */
  idleMs: z.number().int().positive().nullable(),
}).strict();
export type SearchSetup = z.infer<typeof searchSetupSchema>;

/**
 * Fair on a phone (docs/13 2.2): the player has time to look before doing nothing ends the play, and a time limit leaves
 * time to search; doing nothing can happen before the time runs out; the spots and buttons are what the setup says.
 */
export const SEARCH_MIN_IDLE_MS = 6000;
export const SEARCH_MIN_TIME_MS = 10000;
/** 「おまかせ」's pace: its first action after the start's double-tap guard (450 ms) and a look, then one action a step. */
export const SEARCH_AUTO_LEAD_MS = 1000;
export const SEARCH_AUTO_STEP_MS = 600;

/** The reasons a setup is not fair or not whole (none: fine). */
export function searchFairness(setup: SearchSetup): string[] {
  const problems: string[] = [];
  const parsed = searchSetupSchema.safeParse(setup);
  if (!parsed.success) problems.push(`not a setup: ${parsed.error.issues[0]?.message ?? ""}`);
  for (const target of setup.targets) if (target >= setup.spots) problems.push(`target ${target} is not one of the ${setup.spots} spots`);
  if (new Set(setup.targets).size !== setup.targets.length) problems.push("a target is listed twice");
  if (setup.targets.length >= setup.spots) problems.push("every spot hides the thing: nothing to search");
  if (new Set(setup.buttons.map((button) => button.id)).size !== setup.buttons.length) problems.push("a button ID is listed twice");
  if (setup.idleMs !== null && setup.idleMs < SEARCH_MIN_IDLE_MS) problems.push(`idleMs ${setup.idleMs} is shorter than ${SEARCH_MIN_IDLE_MS} (time to look)`);
  if (setup.timeLimitMs !== null && setup.timeLimitMs < SEARCH_MIN_TIME_MS) problems.push(`timeLimitMs ${setup.timeLimitMs} is shorter than ${SEARCH_MIN_TIME_MS}`);
  if (setup.idleMs !== null && setup.timeLimitMs !== null && setup.idleMs >= setup.timeLimitMs) problems.push("the time runs out before doing nothing could end the play");
  if (setup.timeLimitMs !== null && SEARCH_AUTO_LEAD_MS + SEARCH_AUTO_STEP_MS * setup.spots >= setup.timeLimitMs)
    problems.push("「おまかせ」 could not search every spot before the time runs out");
  return problems;
}

/** Walks a play's actions: the action that ended it (null: none did) and the wrong spots searched before the end. */
function walk(actions: readonly SearchAction[], setup: SearchSetup): { ending: SearchEnding | null; misses: number } {
  const searched = new Set<number>();
  const presses = new Map<string, number>();
  let misses = 0;
  for (const action of actions) {
    if ("spot" in action) {
      const { spot } = action;
      // No such spot, or one searched already: nothing happens.
      if (!Number.isInteger(spot) || spot < 0 || spot >= setup.spots || searched.has(spot)) continue;
      searched.add(spot);
      if (setup.targets.includes(spot)) return { ending: { kind: "found", spot, misses }, misses };
      if (setup.wrongEnds) return { ending: { kind: "wrong", spot, misses }, misses };
      misses += 1;
    } else {
      const button = setup.buttons.find((item) => item.id === action.button);
      if (!button) continue;
      const count = (presses.get(button.id) ?? 0) + 1;
      presses.set(button.id, count);
      if (count >= button.presses) return { ending: { kind: "button", button: button.id, misses }, misses };
    }
  }
  return { ending: null, misses };
}

/** The ending an action brought, as the play goes (null: the play goes on). */
export function searchActionEnding(actions: readonly SearchAction[], setup: SearchSetup): SearchEnding | null {
  return walk(actions, setup).ending;
}

/** How a play's record ended: the first action that ended it, else its lapse (none: idle, the player stopped). */
export function searchEnding(record: SearchRecord, setup: SearchSetup): SearchEnding {
  const { ending, misses } = walk(Array.isArray(record.actions) ? record.actions : [], setup);
  return ending ?? { kind: record.lapse === "timeout" ? "timeout" : "idle", misses };
}

/** What 「おまかせ」 does: find the thing after `misses` wrong spots, point at a wrong spot, press a button to its end, or let the play run out. */
export type SearchPlan =
  | { kind: "found"; misses: number }
  | { kind: "wrong" }
  | { kind: "button"; button: string }
  | { kind: "timeout" }
  | { kind: "idle" };

/**
 * 「おまかせ」's record for a plan: the wrong spots in the field's order (as many as the plan says, as many as there are),
 * then the first target; or the first wrong spot; or the button's presses; or nothing, and the lapse.
 */
export function searchAutoRecord(plan: SearchPlan, setup: SearchSetup): SearchRecord {
  const target = Math.min(...setup.targets);
  const wrong = Array.from({ length: setup.spots }, (_, spot) => spot).filter((spot) => !setup.targets.includes(spot));
  switch (plan.kind) {
    case "found":
      return { actions: [...wrong.slice(0, Math.max(0, plan.misses)).map((spot) => ({ spot })), { spot: target }], lapse: null };
    case "wrong":
      return { actions: wrong.length ? [{ spot: wrong[0] }] : [], lapse: null };
    case "button": {
      const presses = setup.buttons.find((button) => button.id === plan.button)?.presses ?? 1;
      return { actions: Array.from({ length: presses }, () => ({ button: plan.button })), lapse: null };
    }
    case "timeout":
    case "idle":
      return { actions: [], lapse: plan.kind };
  }
}

/** When 「おまかせ」 does its record's `index`-th action (the host's clock, from the play's start). */
export const searchAutoActionAt = (index: number): number => SEARCH_AUTO_LEAD_MS + index * SEARCH_AUTO_STEP_MS;

/** A skin's game in the engine's words: its setup for the tag's params, its outcome of each ending, 「おまかせ」's plan for each outcome. */
export interface SearchGame<Params, Outcome extends string> {
  setup(params: Params): SearchSetup;
  outcome(ending: SearchEnding, params: Params): Outcome;
  auto(outcome: Outcome, params: Params): SearchPlan;
}

/** A skin's rules from its game (docs/13 2.4). */
export function searchRules<Params, Outcome extends string>(game: SearchGame<Params, Outcome>): MiniGameRules<Params, Outcome, SearchRecord> {
  return {
    outcomeOf: (record, params) => game.outcome(searchEnding(record, game.setup(params)), params),
    autoRecord: (outcome, params) => searchAutoRecord(game.auto(outcome, params), game.setup(params)),
  };
}
