// When a sound effect may start (sound-effects.ts), as pure rules. Light module (no audio, no content).

/** The same sound asked for again within this many milliseconds of its last start plays once (a double render, a double tap). */
export const SE_REPEAT_MS = 80;
/** At most this many sound effects play at once; a new one beyond it is dropped (the ones playing go on). */
export const SE_MAX_PLAYING = 4;
/** A sound that is ready only this long after it was asked for is dropped: a click heard late is worse than none. */
export const SE_LATE_MS = 1000;

/**
 * Whether a sound may start `now` (milliseconds): fewer than SE_MAX_PLAYING sounds playing (`playing`), and not the same
 * sound again within SE_REPEAT_MS of its last start (`lastStart`, undefined when it has not played yet).
 */
export function admitsSe(lastStart: number | undefined, playing: number, now: number): boolean {
  return playing < SE_MAX_PLAYING && (lastStart === undefined || now - lastStart >= SE_REPEAT_MS);
}

/**
 * A sound's share of its volume for one play, one of four (2026-11-28 user decision: a few patterns, as the design's
 * numbers): faint (a far echo, a small tick), soft (a step, a creak), normal (a cue to hear), full (the moment itself).
 * A mini-game asks with these (contract.ts).
 */
export const SE_VOLUME = { faint: 0.3, soft: 0.5, normal: 0.7, full: 1 } as const;
export type SeVolume = (typeof SE_VOLUME)[keyof typeof SE_VOLUME];

/** A sound's own level for one play (a mini-game's fading echo, a lower creak): its volume share and playback rate. */
export interface SeLevel {
  /** A share of the sound's registered volume, 0 to 1 (default 1). */
  volume?: number;
  /** Its playback rate, 0.5 to 2 (default 1; below 1 lower and longer). */
  rate?: number;
}

/** The gain and rate a sound plays at: its registered volume times the asked share, and the asked rate, each kept in range. */
export function seLevel(registered: number, level: SeLevel = {}): { gain: number; rate: number } {
  const share = Number.isFinite(level.volume) ? Math.min(1, Math.max(0, level.volume!)) : 1;
  const rate = Number.isFinite(level.rate) ? Math.min(2, Math.max(0.5, level.rate!)) : 1;
  return { gain: registered * share, rate };
}
