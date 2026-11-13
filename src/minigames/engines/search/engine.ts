import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `search` engine's rules (docs/13 2.2): one or more rounds, each a field of places to search (spots) with the thing
// to find at one of them; a few extra buttons (「名前を呼ぶ」「明日にする」「どこ？」); a time limit or none; an idle limit or
// none. A round ends when its thing is found, or when the player is helped through it (a round's button, or doing nothing
// in a game whose idle limit helps); the play ends when the last round does, or at the first event that ends the play: a
// wrong spot past the limit, a play button's last press, the time running out, or the player doing nothing (always, or
// only before their first action). The outcome comes from that and what came before it (how many wrong spots, how many
// rounds were helped); nothing is random. Pure: no clock, DOM or React (EnginePlay.tsx times and draws; a skin draws).

/**
 * One thing the player did: searched a spot of the round on show (by its index in the skin's field for that round),
 * pressed one of the buttons (by its ID), or did nothing for the idle limit (only recorded where that helps a round on).
 */
export type SearchAction = { spot: number } | { button: string } | { idle: true };

/** A play's record: what the player did, in order, and what stopped the play when none of that did. */
export interface SearchRecord {
  actions: readonly SearchAction[];
  /**
   * The play ran out without an action ending it: its time limit (`timeout`), or the player did nothing for the idle limit
   * (`idle`). null: an action ended it. A record that ends with neither (the play stopped with nothing) reads as idle.
   */
  lapse: "timeout" | "idle" | null;
}

/** What ends a play, with how many wrong spots were searched before (each spot once a round) and how many rounds were helped. */
export type SearchEnding =
  /** The last round's thing, found by the player. */
  | { kind: "found"; spot: number; misses: number; helped: number }
  /** The last round, helped through (its button, or doing nothing where that helps). */
  | { kind: "helped"; misses: number; helped: number }
  /** A wrong spot past the setup's limit. */
  | { kind: "wrong"; spot: number; misses: number; helped: number }
  | { kind: "button"; button: string; misses: number; helped: number }
  | { kind: "timeout"; misses: number; helped: number }
  | { kind: "idle"; misses: number; helped: number };
export type SearchEndingKind = SearchEnding["kind"];
export const SEARCH_ENDING_KINDS: readonly SearchEndingKind[] = ["found", "helped", "wrong", "button", "timeout", "idle"];

const ID = /^[a-z][a-z0-9_]*$/u;

/** A round: how many places there are to search, and which of them hide its thing (one or more). Spots are 0 to spots − 1. */
export const searchRoundSchema = z.object({
  spots: z.number().int().min(2).max(24),
  targets: z.array(z.number().int().min(0)).min(1),
}).strict();
export type SearchRound = z.infer<typeof searchRoundSchema>;

/** A play's setup: the skin's tuning (in its definition's code, never in a tag: docs/13 2.2) with the tag's choices. */
export const searchSetupSchema = z.object({
  /** The rounds, in order (most games: one). */
  rounds: z.array(searchRoundSchema).min(1).max(6),
  /** The wrong spot (counted over the play) that ends it: 1, the first; null, never (a wrong one is only a look). */
  wrongLimit: z.number().int().min(1).nullable(),
  /**
   * The extra buttons, how many presses of each end what, and what they end: the play (「明日にする」 1, 「名前を呼ぶ」 3),
   * or the round on show (「どこ？」 1: the player is helped through it; its presses count again in the next round).
   */
  buttons: z.array(z.object({ id: z.string().regex(ID), presses: z.number().int().min(1), ends: z.enum(["play", "round"]) }).strict()),
  /** The play runs out after this long (ms of the host's clock from its start); null: no time limit. */
  timeLimitMs: z.number().int().positive().nullable(),
  /** The player doing nothing this long (ms since their last action or look); null: nothing happens. */
  idleMs: z.number().int().positive().nullable(),
  /**
   * What doing nothing for `idleMs` does: ends the play (`play`); ends it only before the player's first action, after
   * which the search goes on (`before_action`: the field may give a hint); helps the round on show through (`round`).
   */
  idleEnds: z.enum(["play", "before_action", "round"]),
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

const wrongSpots = (round: SearchRound) => Array.from({ length: round.spots }, (_, spot) => spot).filter((spot) => !round.targets.includes(spot));

/** The reasons a setup is not fair or not whole (none: fine). */
export function searchFairness(setup: SearchSetup): string[] {
  const problems: string[] = [];
  const parsed = searchSetupSchema.safeParse(setup);
  if (!parsed.success) return [`not a setup: ${parsed.error.issues[0]?.message ?? ""}`];
  setup.rounds.forEach((round, index) => {
    const name = setup.rounds.length > 1 ? `round ${index + 1}: ` : "";
    for (const target of round.targets) if (target >= round.spots) problems.push(`${name}target ${target} is not one of the ${round.spots} spots`);
    if (new Set(round.targets).size !== round.targets.length) problems.push(`${name}a target is listed twice`);
    if (round.targets.length >= round.spots) problems.push(`${name}every spot hides the thing: nothing to search`);
  });
  if (new Set(setup.buttons.map((button) => button.id)).size !== setup.buttons.length) problems.push("a button ID is listed twice");
  if (setup.wrongLimit !== null && setup.wrongLimit > wrongSpots(setup.rounds[0]).length)
    problems.push(`wrongLimit ${setup.wrongLimit} is more than the first round's wrong spots: 「おまかせ」 could not reach it`);
  if (setup.idleMs !== null && setup.idleMs < SEARCH_MIN_IDLE_MS) problems.push(`idleMs ${setup.idleMs} is shorter than ${SEARCH_MIN_IDLE_MS} (time to look)`);
  if (setup.timeLimitMs !== null && setup.timeLimitMs < SEARCH_MIN_TIME_MS) problems.push(`timeLimitMs ${setup.timeLimitMs} is shorter than ${SEARCH_MIN_TIME_MS}`);
  if (setup.idleMs !== null && setup.timeLimitMs !== null && setup.idleMs >= setup.timeLimitMs) problems.push("the time runs out before doing nothing could end the play");
  const searchAll = setup.rounds.reduce((sum, round) => sum + round.spots, 0);
  if (setup.timeLimitMs !== null && SEARCH_AUTO_LEAD_MS + SEARCH_AUTO_STEP_MS * searchAll >= setup.timeLimitMs)
    problems.push("「おまかせ」 could not search every spot before the time runs out");
  return problems;
}

/** Where a play is after its actions so far: the round on show and what was done in it, the rounds before, and the ending. */
export interface SearchProgress {
  /** The round on show, from 0 (the last one stays on show once the play is over). */
  round: number;
  /** The round on show's spots searched, in order (its thing too, once found). */
  searched: readonly number[];
  /** The rounds over (the last one too, once the play is): their spots searched, and whether the player found the thing (else they were helped). */
  done: readonly { searched: readonly number[]; found: boolean }[];
  /** Each button's presses: a play button's over the play, a round button's in the round on show. */
  presses: Readonly<Record<string, number>>;
  misses: number;
  helped: number;
  /** The player has searched a spot or pressed a button. */
  acted: boolean;
  /** What ended the play, once something has (null: it goes on). */
  ending: SearchEnding | null;
}

/** Walks a play's actions (docs/13 2.4): an action that does nothing (no such spot or button, a spot searched already) is skipped. */
export function searchProgress(actions: readonly SearchAction[], setup: SearchSetup): SearchProgress {
  const rounds = setup.rounds;
  let round = 0;
  let searched: number[] = [];
  const done: { searched: readonly number[]; found: boolean }[] = [];
  const presses: Record<string, number> = {};
  let misses = 0;
  let helped = 0;
  let acted = false;
  const roundButtons = setup.buttons.filter((button) => button.ends === "round").map((button) => button.id);
  const progress = (ending: SearchEnding | null): SearchProgress => ({ round, searched, done, presses, misses, helped, acted, ending });
  // The round on show is over (found by the player, or helped); the next comes on show, or the play ends (the last round
  // stays on show, with what was searched in it).
  const over = (found: boolean, spot: number): SearchEnding | null => {
    done.push({ searched, found });
    if (round + 1 >= rounds.length) return found ? { kind: "found", spot, misses, helped } : { kind: "helped", misses, helped };
    round += 1;
    searched = [];
    for (const id of roundButtons) delete presses[id];
    return null;
  };
  for (const action of Array.isArray(actions) ? actions : []) {
    if (!action || typeof action !== "object") continue;
    if ("spot" in action) {
      const { spot } = action;
      // No such spot, or one searched already this round: nothing happens.
      if (!Number.isInteger(spot) || spot < 0 || spot >= rounds[round].spots || searched.includes(spot)) continue;
      searched = [...searched, spot];
      acted = true;
      if (rounds[round].targets.includes(spot)) {
        const ending = over(true, spot);
        if (ending) return progress(ending);
        continue;
      }
      if (setup.wrongLimit !== null && misses + 1 >= setup.wrongLimit) return progress({ kind: "wrong", spot, misses, helped });
      misses += 1;
    } else if ("button" in action) {
      const button = setup.buttons.find((item) => item.id === action.button);
      if (!button) continue;
      acted = true;
      presses[button.id] = (presses[button.id] ?? 0) + 1;
      if (presses[button.id] < button.presses) continue;
      if (button.ends === "play") return progress({ kind: "button", button: button.id, misses, helped });
      helped += 1;
      const ending = over(false, -1);
      if (ending) return progress(ending);
    } else if (action.idle === true) {
      // Doing nothing: helps the round through, or ends the play (always, or before the first action), or nothing (a hint).
      if (setup.idleEnds === "round") {
        helped += 1;
        const ending = over(false, -1);
        if (ending) return progress(ending);
      } else if (setup.idleEnds === "play" || !acted) return progress({ kind: "idle", misses, helped });
    }
  }
  return progress(null);
}

/** The ending an action brought, as the play goes (null: the play goes on). */
export function searchActionEnding(actions: readonly SearchAction[], setup: SearchSetup): SearchEnding | null {
  return searchProgress(actions, setup).ending;
}

/** How a play's record ended: the first action that ended it, else its lapse (none: idle, the player stopped). */
export function searchEnding(record: SearchRecord, setup: SearchSetup): SearchEnding {
  const { ending, misses, helped } = searchProgress(record?.actions ?? [], setup);
  return ending ?? { kind: record?.lapse === "timeout" ? "timeout" : "idle", misses, helped };
}

/**
 * What 「おまかせ」 does: find every round's thing (after `misses` wrong spots in the first round), point at wrong spots
 * up to the limit, press a button to its end (a round button: in every round), or let the play run out.
 */
export type SearchPlan =
  | { kind: "found"; misses: number }
  | { kind: "wrong" }
  | { kind: "button"; button: string }
  | { kind: "timeout" }
  | { kind: "idle" };

/** 「おまかせ」's record for a plan (wrong spots in the field's order, as many as the plan says, as many as there are). */
export function searchAutoRecord(plan: SearchPlan, setup: SearchSetup): SearchRecord {
  const first = setup.rounds[0];
  const targets = setup.rounds.map((round) => ({ spot: Math.min(...round.targets) }));
  switch (plan.kind) {
    case "found":
      return { actions: [...wrongSpots(first).slice(0, Math.max(0, plan.misses)).map((spot) => ({ spot })), ...targets], lapse: null };
    case "wrong":
      return { actions: wrongSpots(first).slice(0, setup.wrongLimit ?? 1).map((spot) => ({ spot })), lapse: null };
    case "button": {
      const button = setup.buttons.find((item) => item.id === plan.button);
      const presses = Array.from({ length: button?.presses ?? 1 }, () => ({ button: plan.button }));
      return { actions: button?.ends === "round" ? setup.rounds.flatMap(() => presses) : presses, lapse: null };
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
