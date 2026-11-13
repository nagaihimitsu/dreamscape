// Debug's speed of the lines' voices (2026-11-13 user request: 「Debugモードで、ヒロインのボイスの再生速度を変えられるように」):
// the author hears the recorded voices faster or slower to judge the pace that fits. The rule only: the scale, the
// rate the voices play at (always 1× with Debug mode off) and how long a voice then takes. Stored by
// src/app/debug-mode.ts (this device's Debug preference), played by src/components/useVoice.ts.

/** The control's scale: 0.75× to 1.5× in steps of 0.05, 1× to start with. */
export const VOICE_RATE_MIN = 0.75;
export const VOICE_RATE_MAX = 1.5;
export const VOICE_RATE_STEP = 0.05;
export const VOICE_RATE_DEFAULT = 1;

/** A rate on the control's scale: clamped to 0.75–1.5 and rounded to its 0.05 steps; anything but a finite number is 1. */
export function clampVoiceRate(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return VOICE_RATE_DEFAULT;
  const clamped = Math.min(VOICE_RATE_MAX, Math.max(VOICE_RATE_MIN, value));
  // Whole steps, then two decimals (0.05 × 23 is 1.1500000000000001).
  return Math.round(Math.round(clamped / VOICE_RATE_STEP) * VOICE_RATE_STEP * 100) / 100;
}

/** A stored rate (text, or null when nothing is stored) on the scale; text that is no number is 1. */
export function parseVoiceRate(text: string | null): number {
  return text === null ? VOICE_RATE_DEFAULT : clampVoiceRate(Number.parseFloat(text));
}

/** The rate the voices play at: the stored Debug rate while Debug mode is on, and 1 with it off, whatever is stored. */
export function effectiveVoiceRate(debugOn: boolean, stored: unknown): number {
  return debugOn ? clampVoiceRate(stored) : VOICE_RATE_DEFAULT;
}

/** How long `lengthMs` of a recording lasts when it plays at `rate` (its length ÷ the rate on the scale). */
export function effectiveVoiceMs(lengthMs: number, rate: number): number {
  return lengthMs / clampVoiceRate(rate);
}

/** A rate as the control says it: 「1.25倍」 (two decimals). */
export function voiceRateJa(rate: number): string {
  return `${clampVoiceRate(rate).toFixed(2)}倍`;
}
