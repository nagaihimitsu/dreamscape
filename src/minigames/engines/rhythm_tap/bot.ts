// A seeded player for rhythm_tap skins' tests (docs/13 6.2): only tests import it (never the play). It taps each beat
// as a person does with one thumb: anticipating it (not reacting to it), a little late on a phone (`biasMs`), with a
// spread (`sigmaMs`), and pulled toward the old tempo on the first beat after a change (`inertia`: a fraction of the
// change; after a pause longer than PAUSE_RATIO times the gap before, it waits for the mark and spreads wider instead).
// Now and then a thumb slips far early or late (`slip`), or taps twice (`doubleTap`). A rest it sees coming on the lane is
// tapped only by a slip of rhythm (`restSlip`); a feint (a rest that looks like a beat until `tellMs` before it) is
// tapped unless the player sees its tell in time (a reaction, `reactMs` ± `reactSdMs`) and does not miss it (`lapse`).
// The three bots of round 3 (2026-11-14): skilled, average, careless. Pure: the caller gives the seed.

/** A seeded random number in [0, 1) (the same seed, the same numbers). */
export function rhythmTapBotRandom(seed: number): () => number {
  let state = Math.floor(seed) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** A normal deviate (Box–Muller) from a uniform source. */
export const rhythmTapBotGauss = (random: () => number): number =>
  Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

export interface RhythmTapBot {
  name: "skilled" | "average" | "careless";
  /** Taps land this much after the beat on average (a phone's touch and screen). */
  biasMs: number;
  /** The spread of a tap around its aim. */
  sigmaMs: number;
  /** The pull toward the old tempo on the first beat after a change (0: none; 1: the old tempo). */
  inertia: number;
  /** A thumb's slip: this share of taps lands far off (early or late, by 120–260 ms). */
  slip: number;
  /** This share of taps comes with a second tap just after (a double tap). */
  doubleTap: number;
  /** Seeing a tell and holding back takes this long (a reaction), give or take `reactSdMs`. */
  reactMs: number;
  reactSdMs: number;
  /** This share of tells is missed even with time to react (looking at the wrong place). */
  lapse: number;
  /** A rest shown on the lane is tapped this often (the old beat goes on in the thumb). */
  restSlip: number;
}

/** The three players of round 3 (common brief): reaction ≈ 250 ± 60 ms; timing σ 25 (skilled), 45 (average), 80 (careless). */
export const RHYTHM_TAP_BOTS: readonly RhythmTapBot[] = [
  { name: "skilled", biasMs: 25, sigmaMs: 25, inertia: 0.1, slip: 0.005, doubleTap: 0.005, reactMs: 230, reactSdMs: 50, lapse: 0.02, restSlip: 0.02 },
  { name: "average", biasMs: 40, sigmaMs: 45, inertia: 0.2, slip: 0.02, doubleTap: 0.015, reactMs: 250, reactSdMs: 60, lapse: 0.06, restSlip: 0.07 },
  { name: "careless", biasMs: 50, sigmaMs: 80, inertia: 0.3, slip: 0.08, doubleTap: 0.04, reactMs: 280, reactSdMs: 70, lapse: 0.2, restSlip: 0.2 },
];

/** A gap this many times the one before is a pause: the player waits for the mark (no pull), with a wider spread. */
const PAUSE_RATIO = 1.6;
/** The pull toward the old tempo is at most this much. */
const INERTIA_CAP_MS = 120;

/** What the bot plays: the beats, the rests (a feint's `tellMs`; none: a rest shown from the start), the gap before the first beat. */
export interface RhythmTapBotScene {
  beats: readonly number[];
  rests?: readonly { at: number; tellMs?: number }[];
  /** The gap the player has in mind before the first beat (a count-in's); none: the first gap. */
  leadGapMs?: number;
}

/** Whether the player sees a tell this long before its moment and holds back in time. */
export function rhythmTapBotSees(bot: RhythmTapBot, leadMs: number, random: () => number): boolean {
  return random() >= bot.lapse && bot.reactMs + rhythmTapBotGauss(random) * bot.reactSdMs < leadMs;
}

/** A reaction's length (a tell seen, then a press). */
export const rhythmTapBotReaction = (bot: RhythmTapBot, random: () => number): number =>
  Math.max(120, bot.reactMs + rhythmTapBotGauss(random) * bot.reactSdMs);

/** The taps of one play (sorted). */
export function rhythmTapBotTaps(scene: RhythmTapBotScene, bot: RhythmTapBot, random: () => number): number[] {
  const events = [
    ...scene.beats.map((at) => ({ at, rest: false as const, tellMs: undefined as number | undefined })),
    ...(scene.rests ?? []).map((rest) => ({ at: rest.at, rest: true as const, tellMs: rest.tellMs })),
  ].sort((a, b) => a.at - b.at);
  const taps: number[] = [];
  const aim = (index: number) => {
    const at = events[index].at;
    const gap = index > 0 ? at - events[index - 1].at : undefined;
    const before = index > 1 ? events[index - 1].at - events[index - 2].at : index === 1 ? scene.leadGapMs ?? gap : undefined;
    let pull = 0;
    let spread = bot.sigmaMs;
    if (gap !== undefined && before !== undefined) {
      if (gap > before * PAUSE_RATIO) spread *= 1.5;
      else pull = Math.max(-INERTIA_CAP_MS, Math.min(INERTIA_CAP_MS, bot.inertia * (before - gap)));
    }
    let tap = at + bot.biasMs + pull + rhythmTapBotGauss(random) * spread;
    if (random() < bot.slip) tap += (random() < 0.5 ? -1 : 1) * (120 + random() * 140);
    return tap;
  };
  events.forEach((event, index) => {
    if (event.rest) {
      const fooled = event.tellMs === undefined ? random() < bot.restSlip : !rhythmTapBotSees(bot, event.tellMs, random);
      if (fooled) taps.push(aim(index));
      return;
    }
    const tap = aim(index);
    taps.push(tap);
    if (random() < bot.doubleTap) taps.push(tap + 90 + random() * 70);
  });
  return taps.filter((tap) => tap >= 0).map((tap) => Math.round(tap)).sort((a, b) => a - b);
}

/** Each outcome's share of `plays` (0–1), and each ★'s (a play without ★ counts as "-"). */
export function rhythmTapBotTally(plays: readonly { outcome: string; stars: number | null }[]): {
  outcomes: Record<string, number>; stars: Record<string, number>;
} {
  const outcomes: Record<string, number> = {};
  const stars: Record<string, number> = {};
  for (const play of plays) {
    outcomes[play.outcome] = (outcomes[play.outcome] ?? 0) + 1 / plays.length;
    const key = play.stars === null ? "-" : `★${play.stars}`;
    stars[key] = (stars[key] ?? 0) + 1 / plays.length;
  }
  return { outcomes, stars };
}
