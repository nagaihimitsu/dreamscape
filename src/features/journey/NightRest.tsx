import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { holdTaps } from "../../components/tap-hold";
import { getCityBackdropPath } from "../../content/city-backdrop";
import { playSe } from "../../audio/sound-effects";
import { DAY_END_REST_JA } from "./night-rest-text";
import { hasNightRecap, routeSentenceJa, type NightRecap } from "./night-recap";
import { NightRecapView } from "./NightRecap";
import "./night-rest.css";
import { MOTION } from "../../components/motion";

/** Under a card that waits for the player (NightRest, the night screen's NightLeaving): how it ends. */
export const NIGHT_TAP_HINT_JA = "タップして次へ";
/** The plain fade to the morning after the hotel's scenes of a night screen's rest (ms; none with reduced motion). */
const NIGHT_FADE_MS = MOTION.slow;
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

/**
 * The city at night behind the card and the night screen (2026-11-25 user decision: the night falls on the place, not on a
 * blank screen): the city's free-time backdrop (its own artwork or its photo), fixed and cropped to fill the screen, under a
 * night colour that deepens from dusk (night-rest.css). A city without one keeps the plain night colour. Decorative.
 */
export function NightBackdrop({ cityId }: { cityId?: string }) {
  const path = cityId ? getCityBackdropPath(cityId) : null;
  if (!path) return null;
  return <div className="night-backdrop" aria-hidden="true">
    <img src={`${import.meta.env.BASE_URL}${path}`} alt="" decoding="async" />
  </div>;
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
 * with reduced motion) or at once on a tap (the caller's `end`) or Enter, Space or Esc, and `onEnd` runs once. `ms: null` waits
 * for the tap or key (the night's 「ホテルで休みました」, 2026-11-15: the player may still be reading today's route). `announced` turns
 * true a moment after it appears, for its live region.
 */
export function useNightCard({ reduceMotion, ms, reducedMs, onEnd }: { reduceMotion: boolean; ms: number | null; reducedMs: number | null; onEnd: () => void }) {
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
    const wait = reduced ? reducedMs : ms;
    const timer = wait === null ? undefined : window.setTimeout(() => endRef.current(), wait);
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
 * (on screen no 「タップして次へ」: 2026-11-27 user decision). Under the line: the heroine's line and today's route when there are any
 * (`recap`, the night before the rest; NightRecap, 2026-11-11). It plays once a night: when the rest sleeps at once, or after the
 * hotel's scenes before the night (useTravelEffects). It stays until a tap anywhere on it (once the double-tap moment of holdTaps
 * has passed) or Enter, Space or Esc (2026-11-15 user decision: it used to end by itself, while the player read today's route).
 * With reduced motion nothing moves. Screen readers hear the line (and the route and her line) from a
 * live region; the focus stays where it is. It never changes the game.
 * The same card, its `line` 「ホテルで休みました。」, is the night of a rest before 21:00 whose night has a recap (2026-11-13;
 * night-recap.ts restNightCard), in place of 「次の日」.
 */
export function NightRest({ cityId, recap, line = DAY_END_REST_JA, reduceMotion, onEnd }: {
  /** The city the night falls on (its backdrop behind the card). */
  cityId?: string;
  recap?: NightRecap;
  /** The card's line: the day's end's (21:00), or 「ホテルで休みました。」 for an earlier rest. */
  line?: string;
  reduceMotion: boolean;
  onEnd: () => void;
}) {
  useEffect(() => playSe("night_rest"), []);
  const shown = hasNightRecap(recap) ? recap : undefined;
  const { reduced, announced, end } = useNightCard({ reduceMotion, ms: null, reducedMs: null, onEnd });
  const heard = shown ? [line, shown.line === null ? "" : `${shown.heroineName}：${shown.line}`, routeSentenceJa(shown.route)].join("") : line;
  // `data-obstructs-dialogue`: a scene under the card (the hotel's after waking, a tour's morning) waits for it as for an open
  // dialog (dialogueObstructed: no typing, auto-advance or reading on), and the tap that ends it does not read on either.
  return createPortal(<div className={`night-rest${reduced ? " is-reduced" : ""}${shown ? " has-recap" : ""}`} data-testid="night-rest" data-obstructs-dialogue=""
    onClick={end}>
    <NightBackdrop cityId={cityId} />
    <div className="night-rest-content">
      <NightSky />
      {/* Seen here; read from the live region below (not twice). */}
      <p className="night-rest-text" aria-hidden="true">{line}</p>
      {shown && <div aria-hidden="true"><NightRecapView recap={shown} /></div>}
    </div>
    <p className="sr-only" role="status">{announced ? `${heard}${NIGHT_TAP_HINT_JA}。` : ""}</p>
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
