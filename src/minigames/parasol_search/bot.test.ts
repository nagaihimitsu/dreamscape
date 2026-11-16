import { describe, expect, it } from "vitest";
import { playSearchBot, SEARCH_BOTS, type BotRound, type SearchBotProfile } from "../engines/search/bot";
import {
  PARASOL_CHILDREN, PARASOL_CUSTOMERS, PARASOL_SPOTS, PARASOL_TOMATO_CHILD, PARASOL_TUNING, PARASOL_WARMUP_MS, PARASOL_WARMUP_SPOTS, PARASOL_WARMUP_TARGET,
  parasolActive, parasolRulesFor, parasolTargets,
  type ParasolGesture, type ParasolOutcome, type ParasolParams, type ParasolTuning,
} from "./rules";
import { parasolChildAt, parasolGestures, parasolHoldings, parasolKinds } from "./Skin";

// The parasol's difficulty, measured (round 3, 2026-11-14: 「難しく、楽しく」): the search bot (engines/search/bot.ts) plays
// the field as it is drawn — round 1's look-alike stalls, round 2's bursts and feints and the stall a player may remember,
// round 3's handover, the children walking off and the tomato child's side street — for hundreds of seeds, through the
// parasol's own rules. The pulls are how often a glance takes a thing for the one asked for: the two other old parasols
// and the new one with vegetables strongly, a glad or stretching customer while their arms are up (a feint), a red ball or
// a red flower while the tomato is not yet handed over; plain others hardly at all. The targets (the brief's): ★3 for an
// average player 20–35 %, a skilled one 55–75 %, a careless one under 10 %; every outcome reachable; `found`, the story's
// default, a little above 70 % for the average player at most.

/** How strongly a glance takes each thing for the one asked for. */
const STALL_PULL: Record<string, number> = { chai: 0.1, old_garland: 0.1, new_greens: 0.08, greens: 0.04, black: 0.004, floral: 0.004, white: 0.004 };
const OTHER_PULL = 0.008;
/**
 * A glad or stretching customer pulls a little with arms down, much more with the arms up and its own shout in the same
 * burst as the argument's, only no ₹ (the feint, as drawn since the 2026-11-14 playtest: big arms, a burst); a waver,
 * one arm and no burst, less.
 */
const FEINT_PULL: Record<string, number> = { cheer: 0.3, stretch: 0.26, wave: 0.1 };
const GESTURE_PULL: Record<string, number> = { cheer: 0.04, stretch: 0.04, wave: 0.02 };
/** A red ball or a red flower taken for the tomato (the tomato's green crown tells them apart). */
const HOLD_PULL: Record<string, number> = { red_ball: 0.08, flower: 0.06, ball: 0.02 };
/** Reading the next round's hint as its things come in. */
const READ_MS = 450;
/** The window of a 390-wide phone (px), for how fast the children walk. */
const WINDOW_PX = 370;

/** The parasol's three rounds as the bot sees them, for the tag's params, a seed's street and a tuning. */
export function parasolBotRounds(params: ParasolParams, seed: number, tuning: ParasolTuning = PARASOL_TUNING): BotRound[] {
  const kinds = parasolKinds(params.at, seed);
  const gestures = parasolGestures(params.at, seed);
  const holdings = parasolHoldings(seed);
  const [stall, customer, child] = parasolTargets(params);
  const idle = { idleMs: tuning.idleMs, idleAfterLeftMs: tuning.idleAfterLeftMs };
  /** When a customer's gesture pops on (a burst, a feint), within the idle limit. */
  const onsets = (gesture: ParasolGesture) => Array.from({ length: Math.ceil(tuning.idleMs / 10) }, (_, step) => step * 10)
    .filter((ms) => parasolActive(gesture, ms, tuning) && (ms === 0 || !parasolActive(gesture, ms - 10, tuning)));
  const speed = (index: number) => (ms: number) => Math.abs(parasolChildAt(index, params.at, ms + 50, tuning).x - parasolChildAt(index, params.at, ms - 50, tuning).x) * WINDOW_PX / 10;
  /** When a child walks out of the window (searched to the 10 ms). */
  const goneAt = (index: number) => {
    for (let ms = 0; ms <= tuning.walkOffMs + 10; ms += 10) if (parasolChildAt(index, params.at, ms, tuning).gone) return ms;
    return undefined;
  };
  return [
    { ...idle, things: PARASOL_SPOTS.map((spot, index) => ({ target: index === stall, pull: STALL_PULL[kinds[spot]] ?? OTHER_PULL })) },
    {
      ...idle, readMs: READ_MS, remembered: true,
      things: PARASOL_CUSTOMERS.map((_, index) => {
        const gesture = gestures[index];
        if (index === customer) return { target: true, pull: 0, tellAt: (ms: number) => parasolActive("argue", ms, tuning), flashes: onsets("argue") };
        const feint = FEINT_PULL[gesture];
        return {
          pull: GESTURE_PULL[gesture] ?? OTHER_PULL,
          ...(feint ? { feintAt: (ms: number) => parasolActive(gesture, ms, tuning), feintPull: feint, flashes: onsets(gesture) } : {}),
        };
      }),
    },
    {
      ...idle, readMs: READ_MS, shownAt: tuning.handoverMs, limitMs: tuning.walkOffMs,
      things: PARASOL_CHILDREN.map((_, index) => index === child
        ? { target: true, pull: 0, tellAt: (ms: number) => ms >= tuning.handoverMs, speedAt: speed(index), goneAt: tuning.walkOffMs }
        : { pull: HOLD_PULL[holdings[index]] ?? OTHER_PULL, speedAt: speed(index), ...(goneAt(index) !== undefined ? { goneAt: goneAt(index) } : {}) }),
    },
  ].slice(0, params.rounds ?? 3);
}

/** The outcome and ★ shares of a profile over `plays` seeds (0–1). */
export function parasolBotShares(profile: SearchBotProfile, plays: number, params: ParasolParams = { at: "middle" }, tuning: ParasolTuning = PARASOL_TUNING) {
  const rules = parasolRulesFor(tuning);
  const outcomes: Record<ParasolOutcome, number> = { found: 0, found_slow: 0, pointed: 0 };
  const stars = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let ms = 0;
  for (let seed = 1; seed <= plays; seed++) {
    const { record } = playSearchBot(parasolBotRounds(params, seed, tuning), profile, seed * 7919);
    outcomes[rules.outcomeOf(record, params)] += 1 / plays;
    stars[rules.rate?.(record, params)?.stars ?? 0] += 1 / plays;
    ms += (record.endMs ?? 0) / plays;
  }
  return { outcomes, stars, ms };
}

const PLAYS = 600;
const percent = (share: number) => `${(100 * share).toFixed(1)}%`;

describe("the parasol's difficulty (the search bot, 600 seeded plays a kind of player)", () => {
  const results = Object.fromEntries(SEARCH_BOTS.map((profile) => [profile.id, parasolBotShares(profile, PLAYS)]));
  it("prints the table (for the docs and the report)", () => {
    for (const [id, { outcomes, stars, ms }] of Object.entries(results))
      console.log(`${id.padEnd(9)} found ${percent(outcomes.found)}, found_slow ${percent(outcomes.found_slow)}, pointed ${percent(outcomes.pointed)} | ★3 ${percent(stars[3])}, ★2 ${percent(stars[2])}, ★1 ${percent(stars[1])}, none ${percent(stars[0])} | ${(ms / 1000).toFixed(1)} s`);
  });

  it("gives ★3 to about a quarter of average players, most skilled ones and hardly any careless ones", () => {
    expect(results.average.stars[3]).toBeGreaterThanOrEqual(0.2);
    expect(results.average.stars[3]).toBeLessThanOrEqual(0.35);
    expect(results.skilled.stars[3]).toBeGreaterThanOrEqual(0.55);
    expect(results.skilled.stars[3]).toBeLessThanOrEqual(0.75);
    expect(results.careless.stars[3]).toBeLessThan(0.1);
  });

  it("reaches every outcome by play (her pointing also by 「どこ？」, which the bot never presses); `found` is the story's default", () => {
    for (const id of ["average", "careless"]) for (const share of Object.values(results[id].outcomes)) expect(share, id).toBeGreaterThan(0);
    expect(results.skilled.outcomes.found_slow).toBeGreaterThan(0);
    // The story's neutral way (「古い日傘はすぐに見つかった。」): most average players, never all; the careless often slip.
    expect(results.average.outcomes.found).toBeLessThanOrEqual(0.9);
    expect(results.careless.outcomes.found_slow).toBeGreaterThan(0.3);
    expect(results.average.outcomes.pointed).toBeLessThan(0.1);
  });

  it("is the same for every stall the tag may name (within a few points)", () => {
    const average = SEARCH_BOTS.find((profile) => profile.id === "average")!;
    for (const at of ["left", "right"] as const)
      expect(Math.abs(parasolBotShares(average, 300, { at }).stars[3] - results.average.stars[3]), at).toBeLessThan(0.08);
  });

  it("plays the tomato child's walk-off in the rules: a bot that never finds it gets her pointing, never a wrong end", () => {
    const blind: SearchBotProfile = { ...SEARCH_BOTS[1], overlook: 1, lure: 0, remember: 0, watch: 0 };
    const [first, second, third] = parasolBotRounds({ at: "middle" }, 1);
    const sure: SearchBotProfile = { ...SEARCH_BOTS[1], overlook: 0, lure: 0 };
    const before = playSearchBot([first, second], sure, 1).record;
    const last = playSearchBot([third], blind, 1).record;
    expect(last.actions).toEqual([{ gone: true }]);
    expect(parasolRulesFor(PARASOL_TUNING).outcomeOf({ actions: [...before.actions, ...last.actions], lapse: null }, { at: "middle" })).toBe("pointed");
    expect(PARASOL_TOMATO_CHILD).toBe(parasolTargets({ at: "middle" })[2]);
  });
});

/** The practice's look as the bot sees it: four plain umbrellas of different colours (none a look-alike), its own time. */
export function parasolWarmupBotRounds(tuning: ParasolTuning = PARASOL_TUNING): BotRound[] {
  return [{
    idleMs: tuning.idleMs, idleAfterLeftMs: tuning.idleAfterLeftMs, limitMs: PARASOL_WARMUP_MS,
    things: PARASOL_WARMUP_SPOTS.map((_, index) => (index === PARASOL_WARMUP_TARGET ? { target: true, pull: 0 } : { pull: OTHER_PULL })),
  }];
}

describe("the parasol's practice, measured (the search bot, 300 seeded plays a kind of player)", () => {
  const warm: ParasolParams = { at: "middle", rounds: 3, warmup: "yes" };
  const rules = parasolRulesFor(PARASOL_TUNING);
  const plays = (profile: SearchBotProfile) => Array.from({ length: 300 }, (_, seed) => playSearchBot(parasolWarmupBotRounds(), profile, (seed + 1) * 7919).record);

  it("is over in about a second for every kind of player, by its 4 s at the latest: a fraction of the real look", () => {
    for (const profile of SEARCH_BOTS) {
      const records = plays(profile);
      const ms = records.map((record) => record.endMs ?? Infinity);
      const mean = ms.reduce((sum, value) => sum + value, 0) / ms.length;
      console.log(`practice ${profile.id.padEnd(9)} ${(mean / 1000).toFixed(1)} s on average, ${(Math.max(...ms) / 1000).toFixed(1)} s at most`);
      expect(Math.max(...ms), profile.id).toBeLessThanOrEqual(PARASOL_WARMUP_MS);
      expect(mean, profile.id).toBeLessThan(2000);
      expect(mean, profile.id).toBeLessThan(parasolBotShares(profile, 150).ms / 2);
    }
  });

  it("is easy: nearly every player finds the blue umbrella themselves, and every play ends with one of the outcomes", () => {
    for (const profile of SEARCH_BOTS) {
      const outcomes = plays(profile).map((record) => rules.outcomeOf(record, warm));
      expect(outcomes.filter((outcome) => outcome === "found").length / outcomes.length, profile.id).toBeGreaterThan(0.9);
      for (const outcome of outcomes) expect(["found", "found_slow", "pointed"]).toContain(outcome);
    }
    // A player who never finds it: its own time runs out and she points it out (the practice ends by itself).
    const blind: SearchBotProfile = { ...SEARCH_BOTS[1], overlook: 1, lure: 0 };
    const last = playSearchBot(parasolWarmupBotRounds(), blind, 1).record;
    expect(last).toEqual({ actions: [{ gone: true }], lapse: null, endMs: PARASOL_WARMUP_MS });
    expect(rules.outcomeOf(last, warm)).toBe("pointed");
  });
});
