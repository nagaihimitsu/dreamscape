import { rhythmTapBeats, rhythmTapRules, rhythmTapVsPartner, type RhythmTapSummary, type RhythmTapTuning } from "../engines/rhythm_tap/engine";

// The golgappa duel's rules (docs/13 2.4): a rhythm_tap skin. The player's golgappa are the beats; she gets hers between
// them (the field draws them) and raises her hand after her 14th. Two left in the bowl end the play (a choke); the
// player's 「バス」 against her 14th decides the rest. Nothing is random. Pure.

export type GolgappaOutcome = "together" | "you_first" | "choke" | "outlast";
/** The duel has no keys of its own. */
export type GolgappaParams = object;

/** She raises her hand after her 14th (the scene's count: 「十四で、二人とも同時に手を上げた」). */
export const GOLGAPPA_HER_STOP = 14;
/** Raising the hand this many golgappa before or after her is 「同時」. */
export const GOLGAPPA_TOGETHER_WITHIN = 1;

/**
 * The player's golgappa: the first after the vendor's reach, 1.2 s apart, faster evenly to 0.6 s by the 14th, then
 * steady; 17 in all (about 15 s). Generous windows: a golgappa can be eaten as it lands and a while after; a missed one
 * stays in the bowl, and the second one there ends the play.
 */
export const GOLGAPPA_TUNING: RhythmTapTuning = {
  beats: rhythmTapBeats({ firstMs: 1400, count: 17, intervalMs: 1200, endIntervalMs: 600, rampBeats: GOLGAPPA_HER_STOP }),
  earlyMs: 150,
  lateMs: 300,
  endAfterMs: 700,
  missLimit: 2,
  partnerStop: GOLGAPPA_HER_STOP,
};

/** The field's moments: how long a golgappa falls (less than half the shortest gap: one falls at a time), and how long she takes to eat hers and (after her 14th) raise her hand. */
export const GOLGAPPA_FIELD = { fallMs: 280, herEatMs: 250 } as const;

/** When her golgappa lands: halfway before each of the player's (the vendor gives hers first in each round). */
export function golgappaHerLandings(tuning: RhythmTapTuning = GOLGAPPA_TUNING): number[] {
  const { beats } = tuning;
  const gapBefore = (index: number) => (index === 0 ? beats[1] - beats[0] : beats[index] - beats[index - 1]);
  return beats.slice(0, GOLGAPPA_HER_STOP).map((beat, index) => beat - Math.round(gapBefore(index) / 2));
}
/** When she raises her hand: her 14th eaten. */
export const GOLGAPPA_HER_HAND_MS = golgappaHerLandings()[GOLGAPPA_HER_STOP - 1] + GOLGAPPA_FIELD.herEatMs;

/** The outcome of what the player did. */
export function golgappaOutcome(summary: RhythmTapSummary): GolgappaOutcome {
  if (summary.ended === "misses") return "choke";
  const ahead = rhythmTapVsPartner(summary, GOLGAPPA_TUNING);
  // Never raised: ate every one the vendor had.
  if (ahead === null) return "outlast";
  if (ahead < -GOLGAPPA_TOGETHER_WITHIN) return "you_first";
  return ahead <= GOLGAPPA_TOGETHER_WITHIN ? "together" : "outlast";
}

const all = () => true;
/** Together: every one eaten, 「バス」 after the 14th. First: after the 10th. Choke: the 9th and 10th left. Outlast: all 17. */
export const golgappaRules = rhythmTapRules<GolgappaParams, GolgappaOutcome>(GOLGAPPA_TUNING, golgappaOutcome, {
  together: { hit: all, stopAfter: GOLGAPPA_HER_STOP },
  you_first: { hit: all, stopAfter: 10 },
  choke: { hit: (index) => index < 8 },
  outlast: { hit: all },
});
