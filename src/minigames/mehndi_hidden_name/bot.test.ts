import { describe, expect, it } from "vitest";
import { playSearchBot, SEARCH_BOTS, type BotRound, type SearchBotProfile } from "../engines/search/bot";
import { mehndiDecoysFor } from "./marks";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, MEHNDI_TUNING, mehndiRules, type MehndiOutcome, type MehndiParams } from "./rules";

// How a player who looks for the writing ends (round 3, 2026-11-14; round 4, 2026-11-17). Not a skill test (an attitude
// game: no ★, no right answer; 「明日にする」 is a choice of its own): the search bot (engines/search/bot.ts) looks at the six
// places one after another under the lamp. Before round 3 the pool lit two places at once and nothing but the writing
// looked like writing; with round 3 the pool was small (a glance at one place, a little longer to bring the lamp there)
// and the five other places curled like writing, so a player who pointed at the first thing that looked like writing
// pointed at a curl (wrong_spot: her word, and the story remembers it), and one who waited for the glint found it first
// time (found). Round 4 (「かんたんすぎる」) puts runs of letter-like decorations across the palm in place of the curls, in
// the name's own hand: a place now pulls once for itself and once more for each run that belongs to it (a run pointed at is
// its place pointed at), and a glance takes longer (there is more to tell apart under the lamp).

type Field = "before" | "after" | "decoys";
/** A glance at one place: with the old pool, two places showed at once (half as long a place); with the decorations, more to look through. */
const GLANCE: Record<Field, number> = { before: 0.55, after: 1.15, decoys: 1.6 };
/** How strongly a curl that looks like writing pulls a glance; before, the fine lines had none (a guess now and then). */
const PULL = { before: 0.02, after: 0.12 };
const PLAYS = 600;
const percent = (share: number) => `${(100 * share).toFixed(1)}%`;

/** A place's pull: round 4, the place's own and each of its runs' (any one of them taken for the writing). */
function pullOf(spot: (typeof MEHNDI_SPOTS)[number], params: MehndiParams, field: Field): number {
  if (field !== "decoys") return PULL[field];
  const runs = mehndiDecoysFor(params.target).filter((decoy) => decoy.place === spot).length;
  return 1 - (1 - PULL.after) ** (1 + runs);
}

/** The look as the bot sees it: six places, the writing at the target's (always told when lit), no idle limit. */
function mehndiBotRound(params: MehndiParams, field: Field): BotRound {
  return {
    idleMs: Infinity,
    things: MEHNDI_SPOTS.map((spot) => (spot === params.target ? { target: true, pull: 0 } : { pull: pullOf(spot, params, field) })),
  };
}

export function mehndiBotShares(profile: SearchBotProfile, field: Field, params: MehndiParams = { target: "thumb", text: "player" }) {
  const outcomes: Partial<Record<MehndiOutcome, number>> = {};
  let ms = 0;
  const looker = { ...profile, glanceMs: profile.glanceMs * GLANCE[field], glanceSdMs: profile.glanceSdMs * GLANCE[field] };
  for (let seed = 1; seed <= PLAYS; seed++) {
    const { record } = playSearchBot([mehndiBotRound(params, field)], looker, seed * 15485863);
    const outcome = mehndiRules.outcomeOf(record, params);
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1 / PLAYS;
    ms += (record.endMs ?? 0) / PLAYS;
  }
  return { outcomes, ms };
}

describe("how a player who looks for the writing ends (bot, 600 seeded plays a kind of player)", () => {
  it("prints the table: before (big pool, nothing like writing), after (small pool, curls) and decoys (letter-like decorations)", () => {
    for (const field of ["before", "after", "decoys"] as const) for (const profile of SEARCH_BOTS) {
      const { outcomes, ms } = mehndiBotShares(profile, field);
      console.log(`${field.padEnd(6)} ${profile.id.padEnd(8)} found ${percent(outcomes.found ?? 0)}, wrong_spot ${percent(outcomes.wrong_spot ?? 0)} | ${(ms / 1000).toFixed(1)} s`);
    }
    for (const target of MEHNDI_TARGETS) {
      const { outcomes } = mehndiBotShares(SEARCH_BOTS[1], "decoys", { target, text: "player" });
      console.log(`decoys average at ${target.padEnd(7)} found ${percent(outcomes.found ?? 0)}, wrong_spot ${percent(outcomes.wrong_spot ?? 0)}`);
    }
  });

  it("makes pointing at a curl a real way to end (wrong_spot), more for the hasty, and leaves found for the careful", () => {
    const after = Object.fromEntries(SEARCH_BOTS.map((profile) => [profile.id, mehndiBotShares(profile, "after")]));
    const before = Object.fromEntries(SEARCH_BOTS.map((profile) => [profile.id, mehndiBotShares(profile, "before")]));
    for (const id of ["skilled", "average", "careless"]) {
      expect(after[id].outcomes.wrong_spot ?? 0, id).toBeGreaterThan(before[id].outcomes.wrong_spot ?? 0);
      expect(after[id].ms, id).toBeGreaterThan(before[id].ms);
    }
    expect(after.careless.outcomes.wrong_spot ?? 0).toBeGreaterThan(after.skilled.outcomes.wrong_spot ?? 0);
    // Neither way dominates for the average player (no right answer).
    expect(after.average.outcomes.found ?? 0).toBeGreaterThan(0.3);
    expect(after.average.outcomes.wrong_spot ?? 0).toBeGreaterThan(0.2);
    for (const target of MEHNDI_TARGETS) expect(mehndiBotShares(SEARCH_BOTS[1], "after", { target, text: "player" }).outcomes.found ?? 0, target).toBeGreaterThan(0.3);
    expect(MEHNDI_TUNING.lampPct).toBeLessThan(13);
  });

  it("makes the look harder with the decorations (round 4): more wrong places and a longer look for every kind of player, the find still within reach", () => {
    const after = Object.fromEntries(SEARCH_BOTS.map((profile) => [profile.id, mehndiBotShares(profile, "after")]));
    const decoys = Object.fromEntries(SEARCH_BOTS.map((profile) => [profile.id, mehndiBotShares(profile, "decoys")]));
    for (const id of ["skilled", "average", "careless"]) {
      expect(decoys[id].outcomes.wrong_spot ?? 0, id).toBeGreaterThan(after[id].outcomes.wrong_spot ?? 0);
      expect(decoys[id].ms, id).toBeGreaterThan(after[id].ms);
    }
    expect(decoys.careless.outcomes.wrong_spot ?? 0).toBeGreaterThan(decoys.skilled.outcomes.wrong_spot ?? 0);
    // Finding it first time stays a real way to end for the average player, wherever the writing is.
    for (const target of MEHNDI_TARGETS) expect(mehndiBotShares(SEARCH_BOTS[1], "decoys", { target, text: "player" }).outcomes.found ?? 0, target).toBeGreaterThanOrEqual(0.15);
  });
});
