import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { MONKEY_TUNING, monkeyCatchRulesFor, monkeyPlan, type MonkeyCatchOutcome, type MonkeyCatchParams, type MonkeyPlan, type MonkeyTuning } from "./rules";
import "./skin.css";

// The catch's field (a cue_tap skin): the player at the foot of the gate's wall, looking up. The monkey sits on the wall's
// edge holding the thing out (the tag's `thing`: a small bottle, or sunglasses) and teases (rules.ts monkeyPlan): its arm
// jerks down, the fist closed (a feint); its other hand drops a peanut shell (small, brown: let it fall); it lets go of the
// thing and snatches it back in mid-air; then it opens its hand wide and lets go, a second shell beside it. The shells
// fall straight; the thing clips the carved ledge half way down (a knock, a puff of dust) and comes on a moment later.
// The player's hands wait at the bottom with a ring where things meet them: it tightens for whatever is about to arrive
// (the shells too: the ring says when, the thing's look says what). With the use's art (`art.wall`, `art.monkey`) the
// drawn wall and monkey give way to those pictures.
//
// The host's flow (docs/13 2.6): the play ends as the field shows the outcome (the thing landing in the hands, bouncing
// off the fingers, or gone past them), with its juice there and the heroine's face; the monkey reacts after. No meter:
// the ring over the hands is the gauge.

type Point = { x: number; y: number; size: number };
const mix = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, size: from.size + (to.size - from.size) * t });
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

// In percent of the field. The monkey's hand (the thing before it falls), its other hand (the shells), and the cup of the
// player's hands. The monkey's picture is placed by its hand: the hand is at (20%, 50%) of the picture, its seat on the
// wall's edge at about 83%, so the wall's top edge is at about 30% of the field (the art request says so). Sizes: the
// thing's scale (1 = its drawn size).
const HELD: Point = { x: 46, y: 22, size: 0.75 };
const OTHER: Point = { x: 58, y: 25, size: 0.8 };
const HANDS: Point = { x: 50, y: 80, size: 1.25 };
const SHELL_HANDS: Point = { x: 54, y: 80, size: 1.2 };
/** How far past the cup a thing slides down the palms before it drops out below them (percent of the field). */
const THROUGH_DEPTH = 11;
/** The ring over the hands tightens over this long before something arrives. */
const RING_TIGHTEN_MS = 300;
/** A thing past the fingertips slides down the palms this long (a late catch still finds it there), then drops out in GONE_MS. */
const THROUGH_MS = 300;
const GONE_MS = 200;

/** Where a thing dropped at `drop` falling straight from `from` to `to` in `fallMs` is at `ms` (faster as it falls). */
const straight = (from: Point, to: Point, drop: number, fallMs: number, ms: number): Point => {
  const s = clamp01((ms - drop) / fallMs);
  return mix(from, to, s * s);
};
/** Past the hands (nothing closed on it): it slides down the palms, then drops out of the field. */
function through(at: Point, u: number): Point {
  if (u <= THROUGH_MS) {
    const t = easeOut(u / THROUGH_MS);
    return { x: at.x + 3 * t, y: at.y + THROUGH_DEPTH * t, size: at.size };
  }
  const w = (u - THROUGH_MS) / GONE_MS;
  return { x: at.x + 3 + 4 * w, y: at.y + THROUGH_DEPTH + 34 * w * w + 6 * w, size: at.size * (1 + 0.1 * clamp01(w)) };
}

/** The ledge's place on the wall: where a straight fall from the monkey's hand is when the thing clips it. */
const ledgeOf = (plan: MonkeyPlan, tuning: MonkeyTuning): Point => straight(HELD, HANDS, plan.release, tuning.fallMs, plan.ledge);

/**
 * Where the thing is at `ms`, untouched: in the monkey's hand (dipping in the feint), falling and snatched back, held
 * again, let go, clipping the ledge and hopping out from it, reaching the hands, then sliding down the palms and out.
 */
function untouched(ms: number, plan: MonkeyPlan, tuning: MonkeyTuning): Point {
  const { feint, fake, release, ledge, hands } = plan;
  if (ms < feint + tuning.feintMs && ms >= feint) return { ...HELD, y: HELD.y + 3 * Math.sin(Math.PI * ((ms - feint) / tuning.feintMs)) };
  if (ms >= fake.drop && ms < release) {
    if (ms < fake.snatch) return straight(HELD, HANDS, fake.drop, tuning.fallMs, ms);
    // Snatched: the monkey's hand brings it back up.
    const at = straight(HELD, HANDS, fake.drop, tuning.fallMs, fake.snatch);
    return mix(at, HELD, easeOut(clamp01((ms - fake.snatch) / 260)));
  }
  if (ms < release) return HELD;
  if (ms < ledge) return straight(HELD, HANDS, release, tuning.fallMs, ms);
  const clip = ledgeOf(plan, tuning);
  if (ms < hands) {
    // Off the ledge: it hops out from the wall a little, then falls on (slower than a straight fall would be by now).
    const t = (ms - ledge) / (hands - ledge);
    return { x: clip.x + 5 * Math.sin(Math.PI * Math.min(1, t * 1.2)) * (1 - t) + (HANDS.x - clip.x) * t, y: clip.y - 2.5 * Math.sin(Math.PI * Math.min(1, t * 2)) * (1 - t) + (HANDS.y - clip.y) * t * t, size: clip.size + (HANDS.size - clip.size) * t };
  }
  return through(HANDS, ms - hands);
}

/** Where shell `index` is at `ms` (null before it is dropped and once it is gone), or in the hands when they closed on it. */
function shellAt(index: number, ms: number, tapMs: number | null, plan: MonkeyPlan, tuning: MonkeyTuning): Point | null {
  const shell = plan.shells[index];
  if (ms < shell.drop) return null;
  if (tapMs !== null && closedOnShell(index, tapMs, plan) && ms >= tapMs) return { ...SHELL_HANDS, y: SHELL_HANDS.y + 1 };
  if (ms <= shell.hands) return straight(OTHER, SHELL_HANDS, shell.drop, tuning.fallMs, ms);
  const past = through(SHELL_HANDS, ms - shell.hands);
  return past.y > 125 ? null : past;
}
/** Whether the hands closed on shell `index` (a tap as it reached them). */
const closedOnShell = (index: number, tapMs: number, plan: MonkeyPlan): boolean => Math.abs(tapMs - plan.shells[index].hands) <= 150;

/** When a tapped play's thing meets the hands: the tap, or its arrival when the hands closed before it came. */
const meetsAt = (tapMs: number, plan: MonkeyPlan) => Math.max(tapMs, plan.hands);

/** Hands closed far too soon: it falls just beyond the fingertips (it veers past the closed hands, never into them). */
function pastClosedHands(ms: number, plan: MonkeyPlan, tuning: MonkeyTuning): Point {
  const base = ms <= plan.hands ? untouched(ms, plan, tuning) : { ...HANDS, y: HANDS.y + 0.13 * (ms - plan.hands) + 0.0003 * (ms - plan.hands) ** 2 };
  const veer = clamp01((ms - (plan.hands - 320)) / 320);
  return { ...base, x: base.x + 17 * veer * veer };
}

/** A thing that bounced off the fingers, `u` ms after it hit them at `from`: a little hop up and aside, then down and out. */
function bounced(from: Point, u: number): Point {
  return { x: from.x + 16 * Math.min(1, u / 600), y: from.y - 0.093 * u + 0.00031 * u * u, size: from.size * (1 + 0.1 * Math.min(1, u / 600)) };
}

/** Where the thing is at `ms` once the play is decided (or before). */
function thingAt(ms: number, tapMs: number | null, outcome: MonkeyCatchOutcome | null, plan: MonkeyPlan, tuning: MonkeyTuning): { at: Point; held: boolean } {
  if (outcome === "caught" && tapMs !== null && ms >= meetsAt(tapMs, plan)) {
    // In the hands: closed before it came, it lands there; closed as it slid down the palms, they take it back up.
    return { at: mix(untouched(meetsAt(tapMs, plan), plan, tuning), HANDS, clamp01((ms - meetsAt(tapMs, plan)) / 90)), held: true };
  }
  if (outcome === "fumbled" && tapMs !== null && ms >= meetsAt(tapMs, plan)) return { at: bounced(untouched(meetsAt(tapMs, plan), plan, tuning), ms - meetsAt(tapMs, plan)), held: false };
  if (outcome === "missed" && tapMs !== null && tapMs < plan.hands) return { at: pastClosedHands(ms, plan, tuning), held: false };
  return { at: untouched(ms, plan, tuning), held: false };
}

/**
 * When the field shows each outcome (the play ends there): the catch or the bounce as it meets the hands; a miss as it
 * goes past the hands closed too soon (at a feint, on a shell, on the thing snatched back), as hands close too late on
 * nothing, or (no tap) once the play is over.
 */
function impactOf(outcome: MonkeyCatchOutcome, tapMs: number | null, plan: MonkeyPlan): number {
  if (tapMs === null) return plan.script.end;
  if (outcome === "missed") return tapMs < plan.hands ? plan.hands + 120 : tapMs;
  return meetsAt(tapMs, plan);
}

/**
 * How the thing turns: in the hand it rocks in the feint and the snatch; falling, around a point below its middle (its
 * heavy end), faster as it falls, spinning off the ledge; drawn the same every time.
 */
function turnAt(ms: number, thing: MonkeyCatchParams["thing"], plan: MonkeyPlan, tuning: MonkeyTuning): number {
  const spin = thing === "glasses" ? 300 : 420;
  if (ms >= plan.fake.drop && ms < plan.release) return Math.min(1, (ms - plan.fake.drop) / tuning.fallMs) * spin * 0.6;
  if (ms < plan.release) return ms >= plan.feint && ms < plan.feint + tuning.feintMs ? 14 * Math.sin((ms - plan.feint) / 40) : 0;
  const s = (ms - plan.release) / tuning.fallMs;
  const kick = ms > plan.ledge ? 140 * Math.min(1, (ms - plan.ledge) / 300) : 0;
  return spin * Math.pow(Math.min(s, 1.6), 1.4) + 22 * Math.sin(s * 7.5) + kick;
}
/** Sunglasses flip edge-on and back as they tumble (their width narrows); a bottle is round and does not. */
const flipAt = (ms: number, thing: MonkeyCatchParams["thing"], plan: MonkeyPlan) =>
  thing === "glasses" && ms > plan.release ? 0.55 + 0.45 * Math.abs(Math.cos((ms - plan.release) / 140)) : 1;

/**
 * The ring over the hands: it tightens over the last moments before something arrives (0 to 1): a shell, the thing (also
 * the fall the monkey snatches back, until it does).
 */
function ringAt(ms: number, plan: MonkeyPlan, tuning: MonkeyTuning): number {
  const arrivals = [plan.shells[0].hands, ...(ms < plan.fake.snatch ? [plan.fake.drop + tuning.fallMs] : []), plan.shells[1].hands, plan.hands];
  let ring = 0;
  for (const at of arrivals) if (ms <= at + 60) ring = Math.max(ring, clamp01((ms - (at - RING_TIGHTEN_MS)) / RING_TIGHTEN_MS));
  return ring;
}

/** What the monkey's hand does at `ms`: holds it out, jerks (fist closed), opens (it let go), snaps down (the snatch). */
type Grip = "hold" | "jerk" | "open" | "snatch";
function gripAt(ms: number, plan: MonkeyPlan, tuning: MonkeyTuning): Grip {
  if (ms >= plan.release) return "open";
  if (ms >= plan.fake.snatch && ms < plan.fake.snatch + 320) return "snatch";
  if (ms >= plan.fake.drop && ms < plan.fake.snatch) return "open";
  if (ms >= plan.feint && ms < plan.feint + tuning.feintMs) return "jerk";
  return "hold";
}

/**
 * The sounds of a play (definition `sounds`): the hands closing on nothing; the catch, a sharp snap of the palms right as
 * they meet it (a short, high wooden knock: its attack 10 ms in) under the pouch's softer settle; the thing's knock on
 * the ledge (the same knock, quieter and higher), the shell's tick into the hands' shadow.
 */
const SOUNDS = { grab: "cloth_grab", snap: "bat_hit", catch: "item_pouch" } as const;
const CATCH_SNAP = { volume: 0.55, rate: 1.5 } as const;
const CATCH_SETTLE = { volume: 0.7 } as const;
const LEDGE_KNOCK = { volume: 0.35, rate: 1.8 } as const;

/**
 * The moment the field shows each outcome (group3 6.4's values): the stop on the thing, the burst where it meets the hands
 * (a catch's stars, a bounce's ring), the small shake and the hands' squash on a catch; and the heroine's face (it is her
 * bottle or her sunglasses).
 */
const IMPACTS: Readonly<Record<MonkeyCatchOutcome, { stopMs?: number; burst?: { kind: "star" | "ring" | "dust"; size: number }; shake?: "s"; react: "surprise" | "oops" }>> = {
  caught: { stopMs: 90, burst: { kind: "star", size: 1 }, shake: "s", react: "surprise" },
  fumbled: { stopMs: 60, burst: { kind: "ring", size: 0.9 }, react: "oops" },
  missed: { react: "oops" },
};

/** The heroine's one word while the play goes on (unvoiced): as the first shell falls past the open hands, she laughs. */
const SHELL_LINE_JA = "殻だった。セーフ";

/** The monkey after the play: it bobs (the catch impressed it), or leans over the edge to see where the thing went. */
type MonkeyReact = "cheer" | "peer";
const monkeyReactOf = (outcome: MonkeyCatchOutcome): MonkeyReact => (outcome === "caught" ? "cheer" : "peer");

/**
 * The monkey (drawn when the use gives no picture): a grey-brown macaque hunched on the wall's edge, one arm held out, its
 * hand at (20%, 50%). Drawn to sit with the photos and the standing pictures (D1): a dark outline round every part, fur
 * shaded from a light upper left, a few strokes of fur, a pink face with a brow and a muzzle.
 */
function MonkeyFigure({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 100 120" className="mg-monkey-catch-monkey-figure" aria-hidden="true">
      <defs>
        <radialGradient id="mg-monkey-catch-fur" cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#b8aa92" />
          <stop offset="0.55" stopColor="#8b7d68" />
          <stop offset="1" stopColor="#5c5143" />
        </radialGradient>
        <radialGradient id="mg-monkey-catch-face" cx="0.42" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#f2cbb2" />
          <stop offset="1" stopColor="#c88c71" />
        </radialGradient>
      </defs>
      <g stroke="#2a211c" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        {/* The tail hangs down over the wall's edge (an outline under a fur stroke). */}
        <path d="M74 97 C 89 100, 95 110, 87 119" fill="none" strokeWidth="7.5" />
        <path d="M74 97 C 89 100, 95 110, 87 119" fill="none" stroke="#7a6d5b" strokeWidth="3.6" />
        <path d="M45 92 Q 39 105, 43 117 L 52 117 Q 51 105, 56 95 Z" fill="#6c604f" />
        <path d="M39 59 Q 35 80, 43 96 Q 58 105, 75 96 Q 83 79, 74 58 Q 66 46, 54 47 Q 43 49, 39 59 Z" fill="url(#mg-monkey-catch-fur)" />
        <ellipse cx="60" cy="81" rx="9.5" ry="12.5" fill="#b7aa93" stroke="none" opacity="0.85" />
        <path d="M58 89 Q 72 83, 79 96 Q 81 106, 72 110 L 75 117 L 61 117 Q 57 104, 58 89 Z" fill="url(#mg-monkey-catch-fur)" />
        <path d="M47 64 l 3 4 M66 60 l 3 4 M70 73 l 3 3.5 M50 78 l 2.5 4" fill="none" stroke="#54493c" strokeWidth="1.3" />
        {/* The arm held out over the edge, the hand open (it let go) or gripping. */}
        <path d="M47 53 Q 34 53, 21 56 L 21 64 Q 34 63, 48 62 Z" fill="url(#mg-monkey-catch-fur)" />
        {open ? (
          <g fill="url(#mg-monkey-catch-face)">
            <path d="M23 57 Q 15 55, 12 58 Q 12 62, 15 63 Q 19 65, 23 63 Z" />
            <path d="M15 57 L 11 52 M18 56 L 16 50 M21 56 L 22 50" fill="none" strokeWidth="2.6" />
          </g>
        ) : <circle cx="20" cy="60" r="5.6" fill="url(#mg-monkey-catch-face)" />}
        <circle cx="36.5" cy="23" r="5.8" fill="#7a6d5b" />
        <circle cx="67.5" cy="23" r="5.8" fill="#7a6d5b" />
        <circle cx="36.5" cy="23" r="2.6" fill="#d9a48b" stroke="none" />
        <circle cx="67.5" cy="23" r="2.6" fill="#d9a48b" stroke="none" />
        <circle cx="52" cy="27" r="16" fill="url(#mg-monkey-catch-fur)" />
        <path d="M38.5 21 Q 44 9.5, 52 10.5 Q 60 9.5, 65.5 21 Q 58 15.5, 52 16.5 Q 46 15.5, 38.5 21 Z" fill="#5c5143" stroke="none" />
        <path d="M42 28 Q 42 20.5, 52 21.5 Q 62 20.5, 62 28 Q 63 38, 56.5 43 Q 52 45.5, 47.5 43 Q 41 38, 42 28 Z" fill="url(#mg-monkey-catch-face)" />
      </g>
      <path d="M44.5 26 Q 48 23.8, 51 25.6 M53 25.6 Q 56 23.8, 59.5 26" fill="none" stroke="#5a3a2c" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="48" cy="29" r="2" fill="#2a221c" />
      <circle cx="56" cy="29" r="2" fill="#2a221c" />
      <circle cx="48.6" cy="28.4" r="0.6" fill="#fff" />
      <circle cx="56.6" cy="28.4" r="0.6" fill="#fff" />
      <ellipse cx="52" cy="36.5" rx="5.2" ry="4.2" fill="#e5b398" />
      <path d="M50.6 34.6 h 0.1 M53.3 34.6 h 0.1" stroke="#5a3a2c" strokeWidth="1.3" strokeLinecap="round" />
      {open ? <ellipse cx="52" cy="38.4" rx="2.4" ry="1.8" fill="#5a2e24" />
        : <path d="M49.4 38.2 Q 52 39.6, 54.6 38.2" fill="none" stroke="#5a2e24" strokeWidth="1.3" strokeLinecap="round" />}
    </svg>
  );
}

/** One of the player's hands, palm toward the coming thing (the right one is the same, mirrored). */
function Hand({ side }: { side: "left" | "right" }) {
  return (
    <svg viewBox="0 0 60 80" className={`mg-monkey-catch-hand mg-monkey-catch-hand-${side}`} aria-hidden="true">
      <g fill="#f3dfcc" stroke="#6b4630" strokeWidth="2.5" strokeLinejoin="round" transform={side === "right" ? "translate(60 0) scale(-1 1)" : undefined}>
        <rect x="9" y="10" width="9" height="34" rx="4.5" />
        <rect x="19" y="4" width="9" height="40" rx="4.5" />
        <rect x="29" y="6" width="9" height="38" rx="4.5" />
        <rect x="39" y="14" width="8.5" height="30" rx="4.25" />
        <path d="M10 36 Q 8 58, 16 70 L 44 74 Q 52 60, 54 46 L 50 32 Q 48 38, 46 40 L 12 40 Z" />
        <path d="M50 44 Q 56 30, 58 22" strokeWidth="9" stroke="#f3dfcc" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/** A peanut shell (the decoy): small, dull brown, its waist and its ridges. */
function Shell() {
  return (
    <svg viewBox="0 0 28 18" className="mg-monkey-catch-shell-figure" aria-hidden="true">
      <path d="M3 9 Q 3 2, 9 3 Q 13 4, 14 6 Q 15 4, 19 3 Q 25 2, 25 9 Q 25 16, 19 15 Q 15 14, 14 12 Q 13 14, 9 15 Q 3 16, 3 9 Z"
        fill="#c79a5e" stroke="#4a3018" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 6 L 8 12 M11 5 L 11 13 M17 5 L 17 13 M21 6 L 20 12" stroke="#8a6234" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** The catch's skin with a tuning (the story's; Debug's room plays an edited one: play.ts retune). */
export function monkeyCatchSkinFor(tuning: MonkeyTuning): CueTapSkin<MonkeyCatchParams, MonkeyCatchOutcome> {
  const plan = monkeyPlan(tuning);
  const clip = ledgeOf(plan, tuning);

  function MonkeyCatchField({ params, still, art, sound, vibrate, frames }: CueTapFieldProps<MonkeyCatchParams, MonkeyCatchOutcome>) {
    const thing = useRef<HTMLSpanElement>(null);
    const shells = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
    const ring = useRef<HTMLSpanElement>(null);
    const hands = useRef<HTMLSpanElement>(null);
    const ledge = useRef<HTMLSpanElement>(null);
    const [grip, setGrip] = useState<Grip>("hold");
    const [closed, setClosed] = useState(false);
    const [holding, setHolding] = useState(false);
    const [react, setReact] = useState<MonkeyReact | null>(null);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    useEffect(() => {
      let shownGrip: Grip = "hold";
      let shut = false;
      let held = false;
      let struck = false;
      let reacted = false;
      let knocked = false;
      let laughed = false;
      return frames(({ ms, tapMs, outcome, impactAt, endAt }) => {
        const { juice } = live.current.kit;
        const nextGrip = gripAt(ms, plan, tuning);
        if (nextGrip !== shownGrip) {
          shownGrip = nextGrip;
          setGrip(nextGrip);
        }
        if (tapMs !== null && !shut) {
          shut = true;
          setClosed(true);
          live.current.vibrate("tap");
          if (outcome !== "caught") live.current.sound(SOUNDS.grab);
        }
        const { at, held: inHands } = thingAt(ms, tapMs, outcome, plan, tuning);
        if (inHands && !held) {
          held = true;
          setHolding(true);
          live.current.sound(SOUNDS.snap, CATCH_SNAP);
          live.current.sound(SOUNDS.catch, CATCH_SETTLE);
        }
        // The knock on the ledge (with a puff of the wall's dust), unless the hands closed long before.
        if (!knocked && ms >= plan.ledge) {
          knocked = true;
          live.current.sound(SOUNDS.snap, LEDGE_KNOCK);
          juice.burst(ledge.current, "dust", 0.6);
        }
        // Her laugh as the first shell falls past the open hands.
        if (!laughed && tapMs === null && ms >= plan.shells[0].hands + 120) {
          laughed = true;
          live.current.kit.react("laugh", SHELL_LINE_JA);
        }
        const element = thing.current;
        // It tumbles as it falls (drawn the same every time; with less motion it does not turn).
        const turn = still || inHands ? 0 : turnAt(ms, params.thing, plan, tuning);
        const flip = still || inHands ? 1 : flipAt(ms, params.thing, plan);
        if (element) {
          element.style.left = `${at.x}%`;
          element.style.top = `${at.y}%`;
          element.style.transform = `translate(-50%, -50%) scale(${at.size * flip}, ${at.size}) rotate(${turn}deg)`;
          element.style.opacity = at.y > 125 ? "0" : "1";
        }
        for (const [index, shellRef] of shells.entries()) {
          const shell = shellRef.current;
          if (!shell) continue;
          const place = shellAt(index, ms, tapMs, plan, tuning);
          shell.style.opacity = place ? "1" : "0";
          if (place) {
            shell.style.left = `${place.x}%`;
            shell.style.top = `${place.y}%`;
            shell.style.transform = `translate(-50%, -50%) scale(${place.size}) rotate(${still ? 0 : (ms - plan.shells[index].drop) * 0.5}deg)`;
          }
        }
        // The moment the field shows the outcome (the engine ends the play in this frame): its juice, and her face.
        if (outcome && impactAt !== null && ms >= impactAt && !struck) {
          struck = true;
          const it = IMPACTS[outcome];
          if (it.stopMs) juice.hitStop(it.stopMs, element);
          if (it.burst) juice.burst(element, it.burst.kind, it.burst.size);
          if (it.shake) juice.shake(it.shake);
          if (outcome === "caught") {
            juice.squash(hands.current, "land");
            live.current.vibrate("hit");
          }
          live.current.kit.react(it.react);
        }
        // Once it is settled in the hands (or gone), the monkey on the wall reacts.
        if (outcome && endAt !== null && !reacted && ms >= endAt - 420) {
          reacted = true;
          setReact(monkeyReactOf(outcome));
        }
        const ringElement = ring.current;
        if (ringElement) ringElement.style.transform = `translate(-50%, -50%) scale(${1 - 0.18 * ringAt(ms, plan, tuning)})`;
      });
    }, [frames, still, params.thing]);
    return (
      <div className="mg-monkey-catch" data-art-wall={art.wall ? true : undefined} data-still={still || undefined}>
        {art.wall && <img className="mg-monkey-catch-backdrop mg-photo" src={art.wall} alt="" draggable={false} />}
        <span className="mg-monkey-catch-wall"><span className="mg-monkey-catch-coping" /><span className="mg-monkey-catch-inlay" /></span>
        <span className="mg-monkey-catch-ledge" ref={ledge} style={{ top: `${clip.y + 2.4}%` }} />
        <span className="mg-monkey-catch-monkey mg-play-object" data-grip={grip} data-react={react ?? undefined}>
          <span className="mg-monkey-catch-monkey-lean">
            {art.monkey ? <img src={art.monkey} alt="" draggable={false} /> : <MonkeyFigure open={grip === "open"} />}
          </span>
        </span>
        <span className="mg-monkey-catch-ring" ref={ring} data-done={closed || undefined} />
        <span className="mg-monkey-catch-hands mg-play-object" ref={hands} data-closed={closed || undefined} data-holding={holding || undefined}>
          <Hand side="left" />
          <Hand side="right" />
        </span>
        {shells.map((shellRef, index) => <span key={index} className="mg-monkey-catch-shell mg-play-object" ref={shellRef}><Shell /></span>)}
        <span className="mg-monkey-catch-thing" ref={thing} data-thing={params.thing}>
          {params.thing === "glasses" ? <span className="mg-monkey-catch-glasses mg-play-object"><span /><span /></span>
            : <span className="mg-monkey-catch-bottle mg-play-object" />}
        </span>
      </div>
    );
  }

  return {
    tuning: plan.tuning,
    rules: monkeyCatchRulesFor(tuning),
    hintJa: "落とし物が輪に届く瞬間に「受け止める」",
    actionJa: "受け止める",
    actionHintJa: "猿の手から離れて落ちてくる落とし物が、両手の上の輪に届くのに合わせて押します。猿はからかって、腕だけ振ったり、殻を落としたり、取り返したりします。",
    autoJa: "おまかせで受け止めています",
    // The play ends as it meets the hands (a catch, a bounce) or goes past them, the host's finish over it…
    impactAt: ({ outcome, tapMs }) => impactOf(outcome, tapMs, plan),
    // …and the field goes on: the catch settling in the hands (the monkey on the wall reacting), the bounce off the
    // fingers, or the thing falling out of sight, before the result card.
    endAt: ({ outcome, tapMs }, still) => {
      if (outcome === "caught" && tapMs !== null) return meetsAt(tapMs, plan) + (still ? 450 : 800);
      if (outcome === "fumbled" && tapMs !== null) return meetsAt(tapMs, plan) + (still ? 450 : 750);
      return Math.max(tapMs ?? 0, plan.hands + THROUGH_MS + GONE_MS) + 350;
    },
    Field: MonkeyCatchField,
    // The ring over the hands is the gauge (it tightens for whatever is about to arrive): no meter.
    Gauge: null,
  };
}

/** The catch as a cue_tap skin: its timing, rules, words and field. */
export const monkeyCatchSkin = monkeyCatchSkinFor(MONKEY_TUNING);

/** For the tests: where the thing and the shells are, the ring, the monkey's grip (the story's tuning). */
const STORY_PLAN = monkeyPlan(MONKEY_TUNING);
export const MONKEY_FIELD_POINTS = {
  plan: STORY_PLAN,
  untouched: (ms: number) => untouched(ms, STORY_PLAN, MONKEY_TUNING),
  thingAt: (ms: number, tapMs: number | null, outcome: MonkeyCatchOutcome | null) => thingAt(ms, tapMs, outcome, STORY_PLAN, MONKEY_TUNING),
  shellAt: (index: number, ms: number, tapMs: number | null) => shellAt(index, ms, tapMs, STORY_PLAN, MONKEY_TUNING),
  ringAt: (ms: number) => ringAt(ms, STORY_PLAN, MONKEY_TUNING),
  gripAt: (ms: number) => gripAt(ms, STORY_PLAN, MONKEY_TUNING),
  impactOf: (outcome: MonkeyCatchOutcome, tapMs: number | null) => impactOf(outcome, tapMs, STORY_PLAN),
  ledge: ledgeOf(STORY_PLAN, MONKEY_TUNING),
  HELD, HANDS, THROUGH_DEPTH, SHELL_LINE_JA,
} as const;
