import { seededRandom } from "../../host/seed";
import type { SearchAction, SearchRecord } from "./engine";

// A seeded player for a search skin's tests (docs/13 6.2, round 3 of 2026-11-14: measure the difficulty, don't guess).
// It looks at a round the way a person does: reads the round's hint, glances at one thing after another, now and then
// takes a look-alike for the thing (more when a look-alike is doing the thing's gesture: a feint), cannot tell the thing
// while its tell is not showing (an argument between its bursts), has its eye drawn by something popping on (the burst,
// and the feint too), uses a cue it remembers from an earlier round or a moment it watched (the handover), and taps with a person's reaction and timing (a tap on a moving thing misses by its
// speed times the timing error). Doing nothing for the round's idle limit, or the round's own time running out, has her
// point it out. Test support only: never in a play. A skin's test describes its field as BotRounds and runs the bot for
// hundreds of seeds through its own rules.

/** How a kind of player looks and taps (the brief's human-like timing: reaction 250 ± 60 ms; σ 25 / 45 / 80 ms). */
export interface SearchBotProfile {
  id: "skilled" | "average" | "careless";
  reactionMs: number;
  reactionSdMs: number;
  /** A tap's timing error (σ, ms), and the careless player's occasional slip (that share of taps, this much later or earlier). */
  timingSdMs: number;
  slip: { share: number; ms: number };
  /** The share of taps, hurried, that land on the thing beside the one meant (a wrong look; the careless player's slip in a field). */
  fumble: number;
  /** One glance at a thing (mean and σ, ms). */
  glanceMs: number;
  glanceSdMs: number;
  /** How strongly look-alikes pull (a share of each thing's own pull: 1 for the average player). */
  lure: number;
  /** The share of glances at the thing, its tell showing, that pass it by. */
  overlook: number;
  /** The share of plays that use a cue remembered from an earlier round (where the round has one). */
  remember: number;
  /** The share of plays that watch a moment the round shows (where it has one), and of flashes that draw the eye. */
  watch: number;
}

export const SEARCH_BOTS: readonly SearchBotProfile[] = [
  { id: "skilled", reactionMs: 250, reactionSdMs: 60, timingSdMs: 25, slip: { share: 0, ms: 0 }, fumble: 0, glanceMs: 220, glanceSdMs: 45, lure: 0.4, overlook: 0.03, remember: 0.75, watch: 0.85 },
  { id: "average", reactionMs: 250, reactionSdMs: 60, timingSdMs: 45, slip: { share: 0, ms: 0 }, fumble: 0.01, glanceMs: 290, glanceSdMs: 65, lure: 1, overlook: 0.08, remember: 0.4, watch: 0.6 },
  { id: "careless", reactionMs: 250, reactionSdMs: 60, timingSdMs: 80, slip: { share: 0.1, ms: 220 }, fumble: 0.08, glanceMs: 250, glanceSdMs: 80, lure: 2.2, overlook: 0.18, remember: 0.1, watch: 0.3 },
];

/** One thing of a round's field, as the bot sees it. Times are ms from when the round came on show. */
export interface BotThing {
  target?: boolean;
  /** How strongly a glance takes it for the thing (0–1): a near look-alike about 0.1, plainly something else 0.005. */
  pull: number;
  /** When the thing can be told for what it is (its tell showing); none: always. */
  tellAt?(ms: number): boolean;
  /** When a look-alike is doing the thing's gesture (a feint), and how much more it pulls then. */
  feintAt?(ms: number): boolean;
  feintPull?: number;
  /** When something about it pops on (a burst, arms flung up): the moment draws the eye of a watching player. */
  flashes?: readonly number[];
  /** How fast it moves at a time (px/s on a 390-wide phone); none: it stands. */
  speedAt?(ms: number): number;
  /** From this time it can no longer be tapped (walked out of the window). */
  goneAt?: number;
}

/** A round as the bot plays it. */
export interface BotRound {
  things: readonly BotThing[];
  /** The idle limit: doing nothing this long has her point it out (the longer and the shorter, after a round left to her). */
  idleMs: number;
  idleAfterLeftMs?: number;
  /** The round's own time (the thing walks off). */
  limitMs?: number;
  /** Reading the round's hint before the first glance (ms; the first round starts on the host's スタート). */
  readMs?: number;
  /** A cue from an earlier round names the thing at once (her stall), for a player who remembers. */
  remembered?: boolean;
  /** From this time a watching player knows the thing (the tomato handed over). */
  shownAt?: number;
}

/** What a bot's play came to: the engine's record (with when it ended) and the rounds that she pointed out. */
export interface BotPlay {
  record: SearchRecord;
  pointed: number;
}

/** The half-width of a tap target (px): a tap that lands farther from a moving thing's centre misses it. */
const HIT_PX = 26;
/** A finger's move to the thing once it is known (mean and σ, ms). */
const MOVE_MS = 170;
const MOVE_SD_MS = 40;

/** Plays the rounds once with a profile and a seed. */
export function playSearchBot(rounds: readonly BotRound[], profile: SearchBotProfile, seed: number): BotPlay {
  const random = seededRandom(seed);
  const normal = (mean: number, sd: number) => {
    const u = Math.max(1e-9, random());
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  };
  const positive = (mean: number, sd: number, floor: number) => Math.max(floor, normal(mean, sd));
  const actions: SearchAction[] = [];
  let at = 0;
  let pointed = 0;
  let left = false;
  for (const round of rounds) {
    const start = at;
    const idle = left && round.idleAfterLeftMs !== undefined ? round.idleAfterLeftMs : round.idleMs;
    const limit = round.limitMs ?? Infinity;
    let last = 0;
    let t = (round.readMs ?? 0) + positive(profile.reactionMs, profile.reactionSdMs, 120);
    let searched = false;
    let found = false;
    // The help that comes first, if the player is not done before it: her pointing (idle) or the thing walking off.
    const help = () => Math.min(last + idle, limit);
    /** A tap aimed at the thing now: where it lands (on it, or off a moving thing), and when. */
    const tapAt = (thing: BotThing, from: number): { at: number; hit: boolean } => {
      const slip = random() < profile.slip.share ? (random() < 0.5 ? -1 : 1) * profile.slip.ms : 0;
      const error = normal(0, profile.timingSdMs) + slip;
      const when = from + positive(MOVE_MS, MOVE_SD_MS, 80);
      const speed = thing.speedAt?.(when) ?? 0;
      return { at: Math.max(from, when + error), hit: Math.abs((speed * error) / 1000) <= HIT_PX };
    };
    /** The thing beside one in the field's order (another still there), for a fumbled tap. */
    const beside = (index: number, at: number) => [index + 1, index - 1].find((other) => other >= 0 && other < round.things.length
      && !round.things[other].target && at < (round.things[other].goneAt ?? Infinity));
    const tapThing = (index: number, from: number): boolean => {
      const thing = round.things[index];
      for (let attempt = 0; attempt < 4; attempt++) {
        const tap = tapAt(thing, from);
        if (tap.at >= help() || tap.at >= (thing.goneAt ?? Infinity)) return false;
        const fumbled = random() < profile.fumble ? beside(index, tap.at) : undefined;
        if (fumbled !== undefined) {
          // Landed on the thing beside it: a wrong look, then a look again and another tap.
          actions.push({ spot: fumbled });
          last = tap.at;
          from = tap.at + positive(profile.reactionMs, profile.reactionSdMs, 120);
          continue;
        }
        if (tap.hit) {
          actions.push({ spot: index });
          last = tap.at;
          t = tap.at;
          return true;
        }
        // Off a moving thing: a look again, and another tap.
        from = tap.at + positive(profile.reactionMs, profile.reactionSdMs, 120);
      }
      return false;
    };
    const target = round.things.findIndex((thing) => thing.target);
    // A cue remembered, or the moment watched: straight to the thing.
    if (round.remembered && random() < profile.remember) found = tapThing(target, t);
    else if (round.shownAt !== undefined && random() < profile.watch)
      found = tapThing(target, Math.max(t, round.shownAt + positive(profile.reactionMs, profile.reactionSdMs, 120)));
    // Otherwise glance at one thing after another (a shuffled order, again from the start after the last), until the thing.
    const ruled = new Set<number>();
    let order: number[] = [];
    while (!found && t < help()) {
      if (!order.length) {
        order = round.things.map((_, index) => index).filter((index) => !ruled.has(index));
        for (let index = order.length - 1; index > 0; index--) {
          const swap = Math.floor(random() * (index + 1));
          [order[index], order[swap]] = [order[swap], order[index]];
        }
      }
      const glance = positive(profile.glanceMs, profile.glanceSdMs, 90);
      // Something popping on before this glance ends draws the eye there (a burst, or a feint), for a watching player.
      let drawn: { index: number; at: number } | null = null;
      round.things.forEach((thing, index) => {
        if (ruled.has(index)) return;
        for (const at of thing.flashes ?? []) if (at > t && at <= t + glance && (!drawn || at < drawn.at)) drawn = { index, at };
      });
      const pulled = drawn as { index: number; at: number } | null;
      const looked = pulled && random() < profile.watch ? pulled : null;
      const index = looked ? looked.index : order.shift()!;
      const thing = round.things[index];
      t = looked ? looked.at + positive(profile.reactionMs, profile.reactionSdMs, 120) : t + glance;
      if (t >= help() || t >= (thing.goneAt ?? Infinity)) continue;
      if (thing.target) {
        if ((thing.tellAt?.(t) ?? true) && random() >= profile.overlook) found = tapThing(index, t);
        continue;
      }
      const pull = Math.min(0.95, profile.lure * (thing.pull + (thing.feintAt?.(t) ? thing.feintPull ?? 0 : 0)));
      if (random() < pull) {
        // Taken for the thing: a wrong look (it moves aside to show it was not), and the search goes on.
        const tap = tapAt(thing, t);
        if (tap.at >= help()) break;
        if (tap.hit && tap.at < (thing.goneAt ?? Infinity)) {
          actions.push({ spot: index });
          last = tap.at;
          searched = true;
        }
        t = tap.at;
        ruled.add(index);
      }
    }
    if (found) {
      at = start + t;
      continue;
    }
    // She points it out: at the idle limit, or when the thing walks off.
    pointed += 1;
    const helpedAt = help();
    actions.push(helpedAt === limit ? { gone: true } : { idle: true });
    if (helpedAt !== limit && !searched) left = true;
    at = start + helpedAt;
  }
  return { record: { actions, lapse: null, endMs: Math.round(at) }, pointed };
}

/** The share of each key over many plays (a map of key → share, 0–1), for a test's table. */
export function shares<Key extends string>(keys: readonly Key[]): Record<Key, number> {
  const counts = {} as Record<Key, number>;
  for (const key of keys) counts[key] = (counts[key] ?? 0) + 1 / keys.length;
  return counts;
}
