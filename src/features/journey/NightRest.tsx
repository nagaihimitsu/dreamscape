import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { holdTaps } from "../../components/tap-hold";
import { DAY_END_REST_JA } from "./night-rest-text";
import "./night-rest.css";

/** How long the card shows (ms): the night falls, the line, the fade to what lies under it. Reduced motion: the line, still. */
const NIGHT_REST_MS = 2800;
const NIGHT_REST_REDUCED_MS = 2000;
/** The plain fade to the morning after the hotel's scenes of a night screen's rest (ms; none with reduced motion). */
const NIGHT_FADE_MS = 700;
/** The live region is in the page a moment before its line, so a screen reader hears the line as an announcement. */
const ANNOUNCE_AFTER_MS = 100;
/** The keys that end a card at once (a held key's repeats do not). */
const ENDING_KEYS = new Set(["Enter", " ", "Escape"]);

/** A four-pointed star around 0,0 (radius 5), placed by each star's transform. */
const STAR = "M0-5L1.2-1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2-1.2Z";
/** The stars around the moon in the 160×100 sky: x, y, size. */
const STARS: readonly (readonly [number, number, number])[] = [[26, 24, 1.2], [138, 18, 0.9], [148, 62, 0.7], [14, 70, 0.6], [120, 90, 0.8]];

/** The game's 「演出を短縮する」 or the system's reduced motion, read once when a night visual starts. */
export function reducedMotionNow(reduceMotion: boolean): boolean {
  return reduceMotion || (typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/** The night's motif (the card, the night screen): a crescent moon and a few stars. Decorative. */
export function NightSky() {
  return <svg className="night-rest-sky" viewBox="0 0 160 100" aria-hidden="true" focusable="false">
    <path className="night-rest-moon" d="M80 22A26 26 0 0 1 80 74A10 26 0 0 0 80 22Z" transform="rotate(-20 80 48)" />
    {STARS.map(([x, y, size]) => <path key={`${x}:${y}`} className="night-rest-star" d={STAR} transform={`translate(${x} ${y}) scale(${size})`} />)}
  </svg>;
}

/** A night visual's live region: empty as it appears, its line a moment later, so screen readers hear it as an announcement. */
export function useAnnounced(): boolean {
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(true), ANNOUNCE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return announced;
}

/**
 * The ending of a night card that covers what a rest led to (NightRest, the night screen's NightLeaving, NightFade): taps are held
 * as it appears and as it goes (holdTaps: the second tap of a double tap presses nothing under it), it ends after `ms` (`reducedMs`
 * with reduced motion) or at once on a tap (the caller's `end`) or Enter, Space or Esc, and `onEnd` runs once. `announced` turns
 * true a moment after it appears, for its live region.
 */
export function useNightCard({ reduceMotion, ms, reducedMs, onEnd }: { reduceMotion: boolean; ms: number; reducedMs: number; onEnd: () => void }) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const [reduced] = useState(() => reducedMotionNow(reduceMotion));
  const announced = useAnnounced();
  const ended = useRef(false);
  function end() {
    if (ended.current) return;
    ended.current = true;
    // What lay under the card is now under the finger: the second tap of a double tap presses nothing there.
    holdTaps();
    onEndRef.current();
  }
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => {
    // The tap that led here (or a double tap's second) must not end the card at once.
    holdTaps();
    const timer = window.setTimeout(() => endRef.current(), reduced ? reducedMs : ms);
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !ENDING_KEYS.has(event.key)) return;
      // The key ends the card, not a control or a line under it.
      event.preventDefault();
      event.stopPropagation();
      endRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [reduced, ms, reducedMs]);
  return { reduced, announced, end: () => endRef.current() };
}

/**
 * The day's end card (21:00; GameApp, getDayEnd with no night action): the game has already rested at the hotel by itself, as
 * 「休む」 does, and saved. It covers what the night led to (the next morning, or the hotel's scenes after waking) until it ends:
 * the screen turns to the night colour, a crescent moon and a few stars come out with 「夜も更けたので、ホテルで休みました。」,
 * then the card fades. It plays once a night: when the rest sleeps at once, or after the hotel's scenes before the night
 * (useTravelEffects). A tap (once the double-tap moment of holdTaps has passed) or Enter, Space or Esc ends it at once, and it
 * always ends by itself. With reduced motion nothing moves: the line shows plainly until a tap or 2 s. Screen readers hear the
 * line from a live region; the focus stays where it is. It never changes the game.
 */
export function NightRest({ reduceMotion, onEnd }: { reduceMotion: boolean; onEnd: () => void }) {
  const { reduced, announced, end } = useNightCard({ reduceMotion, ms: NIGHT_REST_MS, reducedMs: NIGHT_REST_REDUCED_MS, onEnd });
  // `data-obstructs-dialogue`: a scene under the card (the hotel's after waking, a tour's morning) waits for it as for an open
  // dialog (dialogueObstructed: no typing, auto-advance or reading on), and the tap that ends it does not read on either.
  return createPortal(<div className={`night-rest${reduced ? " is-reduced" : ""}`} data-testid="night-rest" data-obstructs-dialogue=""
    onClick={end}>
    <div className="night-rest-content">
      <NightSky />
      {/* Seen here; read from the live region below (not twice). */}
      <p className="night-rest-text" aria-hidden="true">{DAY_END_REST_JA}</p>
    </div>
    <p className="sr-only" role="status">{announced ? DAY_END_REST_JA : ""}</p>
  </div>, document.body);
}

/**
 * The plain fade to the morning (no moon, no line): the night after the hotel's scenes of a rest the night screen began, whose
 * line was the night screen's own (one night visual a night). It starts at the night colour and fades to the morning in 0.7 s
 * (a tap ends it); with reduced motion there is none.
 */
export function NightFade({ reduceMotion, onEnd }: { reduceMotion: boolean; onEnd: () => void }) {
  const [still] = useState(() => reducedMotionNow(reduceMotion));
  return still ? <NoFade onEnd={onEnd} /> : <PlainFade onEnd={onEnd} />;
}
function NoFade({ onEnd }: { onEnd: () => void }) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  // Once, also when StrictMode runs the effect twice.
  const ended = useRef(false);
  useEffect(() => {
    if (ended.current) return;
    ended.current = true;
    onEndRef.current();
  }, []);
  return null;
}
function PlainFade({ onEnd }: { onEnd: () => void }) {
  const { end } = useNightCard({ reduceMotion: false, ms: NIGHT_FADE_MS, reducedMs: NIGHT_FADE_MS, onEnd });
  return createPortal(<div className="night-fade" data-testid="night-fade" data-obstructs-dialogue="" aria-hidden="true" onClick={end} />, document.body);
}
