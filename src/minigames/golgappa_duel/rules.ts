import { rhythmTapBeats, rhythmTapRules, rhythmTapThen, rhythmTapVsPartner, type RhythmTapSummary, type RhythmTapTuning } from "../engines/rhythm_tap/engine";

// The golgappa duel's rules (docs/13 2.4): a rhythm_tap skin. The player's golgappa are the beats; she gets hers between
// them (the field draws them) and raises her hand after her 14th. Two left in the bowl end the play (a choke), and so
// does mashing: a bite at nothing (a stray) fills the choke gauge, a golgappa eaten empties a drop, and a full gauge
// leaves one in the bowl. After her 14th the vendor goes faster and the windows narrow: going on past her is a risk.
// The player's 「バス」 against her hand decides the rest. Nothing is random. Pure. Every number to tune is here (E1).

export type GolgappaOutcome = "together" | "you_first" | "choke" | "outlast";
/** The duel has no keys of its own. */
export type GolgappaParams = object;

/** She raises her hand after her 14th (the scene's count: 「十四で、二人とも手を上げた」). */
export const GOLGAPPA_HER_STOP = 14;
/** Raising the hand this many golgappa after her (the player's own count) is still 「同時」. */
export const GOLGAPPA_TOGETHER_AFTER = 1;
/** Raising it before her 14th by no more than this (ms before her hand goes up) is still 「同時」: nobody sees the gap. */
export const GOLGAPPA_TOGETHER_BEFORE_MS = 150;

/**
 * The player's golgappa: the first after the vendor's reach, 1.2 s apart, faster evenly to 0.6 s by the 14th; then the
 * peak after her hand goes up, 0.48, 0.42 and 0.42 s apart with a narrower late window; 17 in all (about 14 s).
 * Generous windows: a golgappa can be eaten as it lands and a while after. A missed one stays in the bowl; a full choke
 * gauge (three bites at nothing, less the golgappa eaten since) leaves one too; the second one there ends the play.
 */
export const GOLGAPPA_TUNING: RhythmTapTuning = {
  beats: rhythmTapThen(rhythmTapBeats({ firstMs: 1400, count: GOLGAPPA_HER_STOP, intervalMs: 1200, endIntervalMs: 600 }), [480, 420, 420]),
  earlyMs: 150,
  lateMs: 300,
  peak: { from: GOLGAPPA_HER_STOP, earlyMs: 150, lateMs: 200 },
  perfect: { earlyMs: 60, lateMs: 90 },
  endAfterMs: 700,
  missLimit: 2,
  strayLimit: 3,
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
/** When she raises her hand: her 14th eaten (just before the player's 14th lands). */
export const GOLGAPPA_HER_HAND_MS = golgappaHerLandings()[GOLGAPPA_HER_STOP - 1] + GOLGAPPA_FIELD.herEatMs;

/** The outcome of what the player did. */
export function golgappaOutcome(summary: RhythmTapSummary): GolgappaOutcome {
  if (summary.ended === "misses") return "choke";
  const ahead = rhythmTapVsPartner(summary, GOLGAPPA_TUNING);
  // Never raised: ate every one the vendor had.
  if (ahead === null) return "outlast";
  // Just before her hand (her 14th in her mouth): nobody could tell who was first.
  if (ahead === -1) return (summary.endMs ?? 0) >= GOLGAPPA_HER_HAND_MS - GOLGAPPA_TOGETHER_BEFORE_MS ? "together" : "you_first";
  if (ahead < 0) return "you_first";
  return ahead <= GOLGAPPA_TOGETHER_AFTER ? "together" : "outlast";
}

const all = () => true;
/** Together: every one eaten, 「バス」 after the 14th. First: after the 10th. Choke: the 9th and 10th left. Outlast: all 17. */
export const golgappaRules = rhythmTapRules<GolgappaParams, GolgappaOutcome>(GOLGAPPA_TUNING, golgappaOutcome, {
  together: { hit: all, stopAfter: GOLGAPPA_HER_STOP },
  you_first: { hit: all, stopAfter: 10 },
  choke: { hit: (index) => index < 8 },
  outlast: { hit: all },
});
