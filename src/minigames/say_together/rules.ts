import { cueTapEnd, cueTapMoment, cueTapRules, type CueTapTuning } from "../engines/cue_tap/engine";

// Saying it together (docs/13 2.4): a cue_tap skin. She counts 「せー」「の」 on a steady beat and says the words on the next
// one; the player says them with one tap. On her beat the two voices overlap (together); before it, the player's voice
// comes alone first (early); after it, hers comes alone first (late); no tap while she says them: she says them alone
// (silent). Timing only (2026-11-13 user decision: 「大きさじゃなくてタイミングを合わせる」); nothing is random. Pure.

export type SayTogetherOutcome = "together" | "early" | "late" | "silent";
/** The game has no keys of its own. */
export type SayTogetherParams = object;

/** The field's own moments: her breath, her count and her words. */
export const SAY_FIELD = {
  /** She turns to the player and takes a breath: the player sees her, the count's dots, the meter and the button. */
  settleMs: 1000,
  /** One beat of her count: 「せー」, then 「の」, then the words on the next beat. */
  beatMs: 650,
  /** The beats she counts before the words (「せー」「の」). */
  countBeats: 2,
  /** Her words, one after another from the beat (ヤートリーガン、クリプヤー、ディヤーン、デーン！): when each starts. */
  wordsAtMs: [0, 420, 820, 1180],
  /** She has said them all this long after the beat (a tap until then joins her late). */
  wordsMs: 1500,
} as const;

/** Generous windows (a phone's tap has its own lag; two voices starting this close sound as one). */
export const SAY_TUNING: CueTapTuning = {
  leadMs: SAY_FIELD.settleMs,
  /** From 「せー」 to the beat of the words. */
  approachMs: SAY_FIELD.beatMs * SAY_FIELD.countBeats,
  cleanMs: 120,
  nearMs: 300,
  /** She finishes the words, and a moment more, before a play without a tap ends. */
  noneAfterMs: SAY_FIELD.wordsMs + 200,
};

/** When she says 「せー」, when she says the words (the moment), and when a play without a tap ends. */
export const SAY_COUNT_MS = SAY_TUNING.leadMs;
export const SAY_WORDS_MS = cueTapMoment(SAY_TUNING);
export const SAY_END_MS = cueTapEnd(SAY_TUNING);

/** On her beat: together. Any tap before: the player first; any after, while she says them: she first. No tap: silent. */
export const sayTogetherRules = cueTapRules<SayTogetherParams, SayTogetherOutcome>(SAY_TUNING,
  { clean: "together", early: "early", late: "late", miss: { early: "early", late: "late" }, none: "silent" });
