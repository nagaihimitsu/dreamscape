import { useLayoutEffect, useRef, useState } from "react";
import "./fx.css";

// Small feedback marks shared by the header's buttons and 手がかり帳's (2026-11-13 user decision): presentation only,
// decorative (aria-hidden; a mark's meaning is in its button's name), they take no presses, never move the focus and
// never change the game.

/** How long キラリ plays (milliseconds; fx.css): after the bag's pop, a light crosses the button and sparkles burst. */
export const SPARKLE_MS = 900;

/**
 * Whether the cue numbered `count` (a counter that grows by one with each change) plays: for `ms` after it changed. Never
 * for the count the component mounted with, nor once its time is over: a cue that came before a button showed, or an
 * element drawn again later (the bag after it was empty), does not replay.
 */
export function useCuePlaying(count: number | undefined, ms: number): boolean {
  const mounted = useRef(count);
  const [playing, setPlaying] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (count === undefined || count === mounted.current) return;
    setPlaying(count);
    const timer = window.setTimeout(() => setPlaying(undefined), ms);
    return () => window.clearTimeout(timer);
  }, [count, ms]);
  return playing !== undefined && playing === count;
}

/**
 * キラリ over its button (an `fx-host`) while `playing` (useCuePlaying with SPARKLE_MS): a diagonal light crosses it and
 * three tiny sparkles burst out and fade, about 0.8 s. Under reduced motion and 「演出を短縮する」 one soft gold glow on
 * the button instead, without movement. `cue` starts it again for the next change.
 */
export function Sparkle({ playing, cue }: { playing: boolean; cue: number | undefined }) {
  if (!playing) return null;
  return (
    <span key={cue} className="fx-sparkle" aria-hidden="true">
      <span className="fx-sparkle-sweep" />
      <span className="fx-star fx-star-1" />
      <span className="fx-star fx-star-2" />
      <span className="fx-star fx-star-3" />
    </span>
  );
}

/**
 * The small dot of something new on a button (no text). `label` says it with the button's name (「手がかり帳、新しい
 * 手がかりあり」); a button named by its aria-label says it there instead and shows the dot alone (no label).
 */
export function NewDot({ label }: { label?: string }) {
  return <><span className="fx-dot" aria-hidden="true" />{label && <span className="sr-only">、{label}</span>}</>;
}
