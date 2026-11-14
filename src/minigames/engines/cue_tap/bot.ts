import type { MiniGameRules } from "../../contract";
import { seededRandom } from "../../host/seed";
import type { CueTapRecord, CueTapScript } from "./engine";

// A player for the tests (docs/13 6.2, round 3): it plays a cue_tap script with human-like timing, so a skin's tests can
// measure how often each outcome and each number of ★ comes (the difficulty targets). Never in a play: only tests import
// it. Seeded: the same seed plays the same taps.
//
// How it plays (the assumptions, stated once):
// - Timing: a tap it plans lands off by a normal error of `sigmaMs`.
// - Reaction: it can change a planned tap only with what it saw a reaction (`reaction`, normal, at least 140 ms) before
//   the tap. A moment whose last change (read.tellAt) shows later than that is tapped where the pattern so far put it
//   (read.guessAt), or as soon as it can react when that has gone by; with little time to spare, its timing is rougher
//   (up to 1.8 × sigmaMs at no time to spare, back to 1 × with 250 ms or more).
// - Traps (engine CueTapTrap): a rest or a decoy that shows what it is later than a reaction before it fools it; a feint
//   fools it as often as it flinches (`flinch`), a decoy that could be told apart as often as it is drawn in by one (`decoy`).
// - Slips (the careless player): now and then a tap goes far off, early or late.
// - First play: it knows nothing of the script but what it sees. Practised (`knows`): it knows the script (every change
//   and trap), so only its timing, flinches and slips are left.

/** A kind of player. */
export interface CueTapPlayer {
  sigmaMs: number;
  reaction: { meanMs: number; sdMs: number };
  /** How often it presses at a feint (the arm jerking, the fist still closed). */
  flinch: number;
  /** How often it presses at a decoy it could have told apart (the wrong thing reaching the hands). */
  decoy: number;
  /** How often a tap slips far off (early or late by minMs to maxMs). */
  slip?: { rate: number; minMs: number; maxMs: number };
}

/**
 * The three players of the difficulty targets (round 3's brief: timing σ 25 / 45 / 80 ms, the average player's reaction
 * 250 ± 60 ms; the skilled one reacts a little faster and steadier, the careless one slower and less steady).
 */
export const CUE_TAP_PLAYERS = {
  skilled: { sigmaMs: 25, reaction: { meanMs: 220, sdMs: 40 }, flinch: 0.02, decoy: 0.04 },
  average: { sigmaMs: 45, reaction: { meanMs: 250, sdMs: 60 }, flinch: 0.06, decoy: 0.12 },
  careless: { sigmaMs: 80, reaction: { meanMs: 280, sdMs: 80 }, flinch: 0.2, decoy: 0.3, slip: { rate: 0.12, minMs: 120, maxMs: 260 } },
} as const satisfies Record<string, CueTapPlayer>;
export type CueTapPlayerName = keyof typeof CUE_TAP_PLAYERS;

/** A normal number (Box–Muller) from a seeded generator. */
function normal(random: () => number, mean: number, sd: number): number {
  const u = Math.max(random(), 1e-12);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** The tap one play of `script` gets from `player` (null: no tap before the play ended). */
export function cueTapBotTap(
  script: CueTapScript, player: CueTapPlayer, random: () => number, knows = false, counted: (ms: number) => boolean = (ms) => ms >= script.start,
): CueTapRecord {
  const reaction = () => Math.max(140, normal(random, player.reaction.meanMs, player.reaction.sdMs));
  const slip = (tap: number) => {
    if (!player.slip || random() >= player.slip.rate) return tap;
    const far = player.slip.minMs + (player.slip.maxMs - player.slip.minMs) * random();
    return tap + (random() < 0.5 ? -far : far);
  };
  // A tap before the start (or where the skin turns taps away: the cricket's walk back) is turned away (the play takes
  // the next one): the player plays on.
  const counts = (tap: number) => tap >= script.start && counted(tap);
  const finish = (tap: number): CueTapRecord => (tap > script.end ? null : tap);
  for (const trap of script.traps) {
    const late = trap.kind !== "feint" && trap.at - trap.tellAt < reaction();
    const drawn = trap.kind === "feint" ? random() < player.flinch : trap.kind === "decoy" ? random() < player.decoy * (knows ? 0.5 : 1) : false;
    if ((late && !knows) || drawn) {
      const tap = slip(normal(random, trap.at, player.sigmaMs));
      if (counts(tap)) return finish(tap);
    }
  }
  const { moment } = script;
  const { guessAt, tellAt } = knows ? { guessAt: moment, tellAt: Number.NEGATIVE_INFINITY } : script.read;
  const r = reaction();
  const spare = moment - tellAt - r;
  let tap: number;
  // The tap it planned from the pattern went before it could see the change; else it meets the moment if it can, or
  // taps as soon as it reacts.
  if (guessAt !== moment && guessAt <= tellAt + r) tap = normal(random, guessAt, player.sigmaMs);
  else if (spare >= 0) tap = normal(random, moment, player.sigmaMs * (1 + 0.8 * Math.max(0, 1 - spare / 250)));
  else tap = normal(random, tellAt + r, player.sigmaMs);
  tap = slip(tap);
  // Turned away as too soon (a far slip before the start): it taps again as the thing arrives.
  if (!counts(tap)) tap = normal(random, moment + r * 0.5, player.sigmaMs);
  return finish(tap);
}

/** How often each outcome and each number of ★ (0: none) came in `plays` seeded plays. */
export interface CueTapTally {
  plays: number;
  outcomes: Record<string, number>;
  stars: Record<0 | 1 | 2 | 3, number>;
}

/** Plays `script` `plays` times with `player` (seed `seed`) and tallies the rules' outcomes and ★. */
export function cueTapBotTally<Params, Outcome extends string>(
  script: CueTapScript, rules: MiniGameRules<Params, Outcome, CueTapRecord>, params: Params, player: CueTapPlayer,
  { plays = 1000, seed = 1, knows = false, counts }: { plays?: number; seed?: number; knows?: boolean; counts?: (ms: number) => boolean } = {},
): CueTapTally {
  const random = seededRandom(seed);
  const tally: CueTapTally = { plays, outcomes: {}, stars: { 0: 0, 1: 0, 2: 0, 3: 0 } };
  for (let play = 0; play < plays; play += 1) {
    const record = cueTapBotTap(script, player, random, knows, counts);
    const outcome = rules.outcomeOf(record, params);
    tally.outcomes[outcome] = (tally.outcomes[outcome] ?? 0) + 1;
    tally.stars[rules.rate?.(record, params)?.stars ?? 0] += 1;
  }
  return tally;
}

/** A tally as shares (0 to 1), for reading and for the tests' bounds. */
export function cueTapShares(tally: CueTapTally): { outcomes: Record<string, number>; stars: Record<0 | 1 | 2 | 3, number> } {
  const share = (count: number) => count / tally.plays;
  return {
    outcomes: Object.fromEntries(Object.entries(tally.outcomes).map(([outcome, count]) => [outcome, share(count)])),
    stars: { 0: share(tally.stars[0]), 1: share(tally.stars[1]), 2: share(tally.stars[2]), 3: share(tally.stars[3]) },
  };
}
