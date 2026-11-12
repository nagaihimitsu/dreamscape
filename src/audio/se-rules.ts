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
