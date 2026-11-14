import { describe, expect, it } from "vitest";
import { playSearchBot, SEARCH_BOTS, type BotRound, type SearchBotProfile } from "../engines/search/bot";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, MEHNDI_TUNING, mehndiRules, type MehndiOutcome, type MehndiParams } from "./rules";

// How a player who looks for the writing ends (round 3, 2026-11-14). Not a skill test (an attitude game: no ★, no right
// answer; 「明日にする」 is a choice of its own): the search bot (engines/search/bot.ts) looks at the six places one after
// another under the lamp. Before round 3 the pool lit two places at once and nothing but the writing looked like writing;
// now the pool is small (a glance at one place, a little longer to bring the lamp there) and the five other places curl
// like writing, so a player who points at the first thing that looks like writing points at a curl (wrong_spot: her word,
// and the story remembers it), and one who waits for the glint finds it first time (found).

/** A glance at one place: with the old pool, two places showed at once (half as long a place). */
const GLANCE = { before: 0.55, after: 1.15 };
/** How strongly a curl that looks like writing pulls a glance; before, the fine lines had none (a guess now and then). */
const PULL = { before: 0.02, after: 0.12 };
const PLAYS = 600;
const percent = (share: number) => `${(100 * share).toFixed(1)}%`;

/** The look as the bot sees it: six places, the writing at the target's (always told when lit), no idle limit. */
function mehndiBotRound(params: MehndiParams, field: "before" | "after"): BotRound {
  return {
    idleMs: Infinity,
    things: MEHNDI_SPOTS.map((spot) => (spot === params.target ? { target: true, pull: 0 } : { pull: PULL[field] })),
  };
}

export function mehndiBotShares(profile: SearchBotProfile, field: "before" | "after", params: MehndiParams = { target: "thumb", text: "player" }) {
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
  it("prints the table: before (big pool, nothing like writing) and after (small pool, curls that look like writing)", () => {
    for (const field of ["before", "after"] as const) for (const profile of SEARCH_BOTS) {
      const { outcomes, ms } = mehndiBotShares(profile, field);
      console.log(`${field.padEnd(6)} ${profile.id.padEnd(8)} found ${percent(outcomes.found ?? 0)}, wrong_spot ${percent(outcomes.wrong_spot ?? 0)} | ${(ms / 1000).toFixed(1)} s`);
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
});
