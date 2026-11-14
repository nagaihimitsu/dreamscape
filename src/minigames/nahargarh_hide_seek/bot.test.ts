import { describe, expect, it } from "vitest";
import { SEARCH_BOTS, type SearchBotProfile } from "../engines/search/bot";
import { seededRandom } from "../host/seed";
import { HIDE_SEEK_DOORS, HIDE_SEEK_TUNING, hideSeekPeek, hideSeekRules, type HideSeekOutcome } from "./rules";
import { hideSeekLean } from "./Skin";

// How a player who searches the corridor ends (round 3, 2026-11-14). Not a skill test (an attitude game: no ★, no right
// answer); the bot shows that each way of searching leads somewhere and that her peeks and the leaning rooms give the
// player something to read. Two ways of searching, by the search bot's three kinds of player (their reaction and how
// much they watch): opening doors at once ("rush": from the first door, following each room's lean when they read it),
// or watching the corridor a few seconds first ("watch": a bold player who goes to the door she peeked from). A door is
// a reaction, a finger's move and a look into the room; a door out of view adds a swipe. Waiting (just_wait) and
// calling (call_her_name) are a single choice each and need no bot.

/** A door's open and a look into the room (ms), and a swipe along the corridor to a door out of view. */
const DOOR_MS = 420;
const LOOK_MS = 300;
const SWIPE_MS = 400;
/** About two doors show on a 390-wide phone. */
const IN_VIEW = 2;
/** The share of rooms whose lean the player reads and follows, by kind of player. */
const READS: Record<SearchBotProfile["id"], number> = { skilled: 0.9, average: 0.6, careless: 0.25 };

type Way = "rush" | "watch";

/** One play: the doors opened in order and whether her peek drew the player, for a way of searching, a kind of player, a seed. */
export function hideSeekBotPlay(way: Way, profile: SearchBotProfile, seed: number, field: "before" | "after", target = 6): { doors: number[]; ms: number } {
  const random = seededRandom(seed);
  const reaction = () => Math.max(120, profile.reactionMs + profile.reactionSdMs * (random() + random() + random() - 1.5) * 1.4);
  const doors: number[] = [];
  let t = 450 + reaction();
  let view = 0;
  // Most players go from the first door, some pick doors at random (before round 3 there was nothing else to go by).
  const order = random() < 0.6 ? Array.from({ length: HIDE_SEEK_DOORS }, (_, door) => door)
    : Array.from({ length: HIDE_SEEK_DOORS }, (_, door) => door).sort(() => random() - 0.5);
  /** The first peek that draws the player (after `from`), if any: they go to her door. */
  const drawn = (from: number, to: number) => {
    if (field === "before") return null;
    for (let ms = from; ms < to; ms += 50) if (hideSeekPeek(ms) === "peek" && hideSeekPeek(ms - 50) !== "peek") return random() < profile.watch ? ms : null;
    return null;
  };
  const open = (door: number) => {
    t += (Math.abs(door - view) >= IN_VIEW ? SWIPE_MS : 0) + DOOR_MS + LOOK_MS;
    view = door;
    doors.push(door);
  };
  if (way === "watch") {
    // Watching the corridor 2–5 s before searching: her peek (at 3 s) draws a watching player straight to her door.
    const until = t + 2000 + 3000 * random();
    const peek = drawn(t, until);
    if (peek !== null) {
      t = peek + reaction();
      open(target);
      return { doors, ms: t };
    }
    t = until;
  }
  let next = order[0];
  while (doors.length < HIDE_SEEK_DOORS) {
    const peek = drawn(t, t + DOOR_MS + LOOK_MS);
    if (peek !== null && !doors.includes(target)) {
      t = peek + reaction();
      open(target);
      break;
    }
    open(next);
    if (next === target) break;
    const rest = order.filter((door) => !doors.includes(door));
    if (field === "after" && random() < READS[profile.id]) {
      // Reading the room: next door, her gasp (hers is next); warm, a couple of doors its way; quiet, past the near doors.
      const lean = hideSeekLean(next, target);
      const step = lean.next ? target - next : lean.toward === "right" ? 2 : lean.toward === "left" ? -2 : HIDE_SEEK_TUNING.warmDoors + 1;
      next = Math.min(HIDE_SEEK_DOORS - 1, Math.max(0, next + step));
      while (doors.includes(next) && next < HIDE_SEEK_DOORS - 1) next += 1;
      while (doors.includes(next)) next -= 1;
    } else if (field === "after") {
      next = rest[0];
    } else next = rest[0];
  }
  return { doors, ms: t };
}

const PLAYS = 600;
const percent = (share: number) => `${(100 * share).toFixed(1)}%`;

/** The outcome shares and the mean doors opened over the seeds. */
export function hideSeekBotShares(way: Way, profile: SearchBotProfile, field: "before" | "after") {
  const outcomes: Partial<Record<HideSeekOutcome, number>> = {};
  let opened = 0;
  let ms = 0;
  for (let seed = 1; seed <= PLAYS; seed++) {
    const { doors, ms: end } = hideSeekBotPlay(way, profile, seed * 104729, field);
    const outcome = hideSeekRules.outcomeOf({ actions: doors.map((spot) => ({ spot })), lapse: null }, { hide: 7 });
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1 / PLAYS;
    opened += doors.length / PLAYS;
    ms += end / PLAYS;
  }
  return { outcomes, opened, ms };
}

describe("how a player who searches the corridor ends (bot, 600 seeded plays a kind of player)", () => {
  it("prints the table: before (nothing to read) and after (her peeks, the leaning rooms)", () => {
    for (const field of ["before", "after"] as const) for (const way of ["rush", "watch"] as const) for (const profile of SEARCH_BOTS) {
      if (field === "before" && way === "watch") continue;
      const { outcomes, opened, ms } = hideSeekBotShares(way, profile, field);
      console.log(`${field.padEnd(6)} ${way.padEnd(5)} ${profile.id.padEnd(8)} door_quick ${percent(outcomes.door_quick ?? 0)}, door_by_door ${percent(outcomes.door_by_door ?? 0)} | ${opened.toFixed(1)} doors | ${(ms / 1000).toFixed(1)} s`);
    }
  });

  it("lets a bold player who watches go straight to her (door_quick), and a searcher who reads the rooms find her in fewer doors", () => {
    for (const profile of SEARCH_BOTS) {
      const watch = hideSeekBotShares("watch", profile, "after");
      const rush = hideSeekBotShares("rush", profile, "after");
      const before = hideSeekBotShares("rush", profile, "before");
      expect(watch.outcomes.door_quick ?? 0, profile.id).toBeGreaterThan(0.25);
      expect(rush.opened, profile.id).toBeLessThan(before.opened);
      // Every searching way still reaches both endings (no right answer, no dead end).
      expect((rush.outcomes.door_by_door ?? 0) + (watch.outcomes.door_by_door ?? 0), profile.id).toBeGreaterThan(0);
    }
    expect(HIDE_SEEK_TUNING.peekFirstMs).toBeLessThan(HIDE_SEEK_TUNING.idleMs);
  });
});
