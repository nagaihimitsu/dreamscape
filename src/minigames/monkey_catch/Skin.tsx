import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import {
  MONKEY_FIELD, MONKEY_HANDS_MS, MONKEY_RELEASE_MS, MONKEY_SLIP_MS, MONKEY_TUNING, monkeyCatchRules, type MonkeyCatchOutcome, type MonkeyCatchParams,
} from "./rules";
import "./skin.css";

// The catch's field (a cue_tap skin): the player at the foot of the gate's wall, looking up. The monkey sits on the wall's
// edge holding the thing out (the tag's `thing`: a small bottle, or sunglasses); its grip gives (the thing wobbles and
// slips in its fingers: the cue), it lets go, the thing tumbles down and grows as it comes, and the player's hands wait at
// the bottom with a ring where it will meet them (the ring tightens as it comes). Past the fingertips it slides down the
// palms and drops out. With the use's art (`art.wall`, `art.monkey`) the drawn wall and monkey give way to those pictures.

type Point = { x: number; y: number; size: number };
const mix = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, size: from.size + (to.size - from.size) * t });
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

// In percent of the field. The monkey's hand (the thing before it falls) and the cup of the player's hands. The monkey's
// picture is placed by its hand: the hand is at (20%, 50%) of the picture, its seat on the wall's edge at about 83%, so the
// wall's top edge is at about 30% of the field (the art request says so). Sizes: the thing's scale (1 = its drawn size).
const HELD: Point = { x: 46, y: 22, size: 0.75 };
const HANDS: Point = { x: 50, y: 80, size: 1.25 };
/** How far past the cup it slides down the palms before it drops out below them (percent of the field). */
const THROUGH_DEPTH = 11;

/** How much it wobbles in the monkey's slipping grip at `ms` (0 before its grip gives, 1 as it lets go). */
const slipAt = (ms: number) => clamp01((ms - MONKEY_SLIP_MS) / (MONKEY_RELEASE_MS - MONKEY_SLIP_MS));

/** Where the thing is `ms` after the start, untouched: in the monkey's slipping grip, falling, sliding down the palms, then out below. */
function untouched(ms: number): Point {
  if (ms <= MONKEY_RELEASE_MS) {
    // It sinks a little in the fingers as the grip gives.
    const slip = slipAt(ms);
    return { ...HELD, y: HELD.y + 1.5 * slip * slip };
  }
  if (ms <= MONKEY_HANDS_MS) {
    const s = (ms - MONKEY_RELEASE_MS) / MONKEY_TUNING.approachMs;
    return mix({ ...HELD, y: HELD.y + 1.5 }, HANDS, s * s);
  }
  // Past the fingertips it slides down the palms (the fingers brush it aside a little), then drops out of the field.
  const u = ms - MONKEY_HANDS_MS;
  if (u <= MONKEY_FIELD.throughMs) {
    const t = easeOut(u / MONKEY_FIELD.throughMs);
    return { x: HANDS.x + 3 * t, y: HANDS.y + THROUGH_DEPTH * t, size: HANDS.size };
  }
  const w = (u - MONKEY_FIELD.throughMs) / MONKEY_FIELD.goneMs;
  return { x: HANDS.x + 3 + 4 * w, y: HANDS.y + THROUGH_DEPTH + 34 * w * w + 6 * w, size: HANDS.size * (1 + 0.1 * clamp01(w)) };
}

/** Hands closed far too soon: it falls just beyond the fingertips (it veers past the closed hands, never into them). */
function pastClosedHands(ms: number): Point {
  const base = ms <= MONKEY_HANDS_MS ? untouched(ms) : { ...HANDS, y: HANDS.y + 0.13 * (ms - MONKEY_HANDS_MS) + 0.0003 * (ms - MONKEY_HANDS_MS) ** 2 };
  const veer = clamp01((ms - (MONKEY_HANDS_MS - 320)) / 320);
  return { ...base, x: base.x + 17 * veer * veer };
}

/** A thing that bounced off the fingers, `u` ms after it hit them at `from`: a little hop up and aside, then down and out. */
function bounced(from: Point, u: number): Point {
  return { x: from.x + 16 * Math.min(1, u / 600), y: from.y - 0.093 * u + 0.00031 * u * u, size: from.size * (1 + 0.1 * Math.min(1, u / 600)) };
}

/** When a tapped play's thing meets the hands: the tap, or its arrival when the hands closed before it came. */
const meetsAt = (tapMs: number) => Math.max(tapMs, MONKEY_HANDS_MS);

/** Where the thing is at `ms` once the play is decided (or before). */
function thingAt(ms: number, tapMs: number | null, outcome: MonkeyCatchOutcome | null): { at: Point; held: boolean } {
  if (outcome === "caught" && tapMs !== null && ms >= meetsAt(tapMs)) {
    // In the hands: closed before it came, it lands there; closed as it slid down the palms, they take it back up.
    return { at: mix(untouched(meetsAt(tapMs)), HANDS, clamp01((ms - meetsAt(tapMs)) / 90)), held: true };
  }
  if (outcome === "fumbled" && tapMs !== null && ms >= meetsAt(tapMs)) return { at: bounced(untouched(meetsAt(tapMs)), ms - meetsAt(tapMs)), held: false };
  if (outcome === "missed" && tapMs !== null && tapMs < MONKEY_HANDS_MS) return { at: pastClosedHands(ms), held: false };
  return { at: untouched(ms), held: false };
}

/**
 * How the thing turns as it falls: around a point below its middle (its heavy end), faster as it falls and unevenly (a
 * wobble on the spin), drawn the same every time. In the monkey's slipping grip it rocks; once held, it rests upright.
 */
function turnAt(ms: number, thing: MonkeyCatchParams["thing"]): number {
  if (ms <= MONKEY_RELEASE_MS) {
    const slip = slipAt(ms);
    return slip * (8 + 18 * slip) * Math.sin(ms / 45);
  }
  const s = (ms - MONKEY_RELEASE_MS) / MONKEY_TUNING.approachMs;
  const spin = thing === "glasses" ? 300 : 420;
  return spin * Math.pow(Math.min(s, 1.6), 1.4) + 22 * Math.sin(s * 7.5);
}
/** Sunglasses flip edge-on and back as they tumble (their width narrows); a bottle is round and does not. */
const flipAt = (ms: number, thing: MonkeyCatchParams["thing"]) =>
  thing === "glasses" && ms > MONKEY_RELEASE_MS ? 0.55 + 0.45 * Math.abs(Math.cos((ms - MONKEY_RELEASE_MS) / 140)) : 1;

/** The ring where the thing meets the hands: it tightens over the last moments before it arrives (0 to 1). */
const RING_TIGHTEN_MS = 300;
const ringAt = (ms: number) => clamp01((ms - (MONKEY_HANDS_MS - RING_TIGHTEN_MS)) / RING_TIGHTEN_MS);

/** The sounds of a play (definition `sounds`): the hands closing on nothing, and the thing landing in them. */
const SOUNDS = { grab: "cloth_grab", catch: "item_pouch" } as const;

/** The monkey after the play: it bobs (the catch impressed it), or leans over the edge to see where the thing went. */
type MonkeyReact = "cheer" | "peer";
const monkeyReactOf = (outcome: MonkeyCatchOutcome): MonkeyReact => (outcome === "caught" ? "cheer" : "peer");

/** The monkey (drawn when the use gives no picture): grey-brown, on the wall's edge, one arm held out; its hand at (20%, 50%). */
function MonkeyFigure({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 100 120" className="mg-monkey-catch-monkey-figure" aria-hidden="true">
      <path d="M78 92 C 92 100, 96 112, 88 120" fill="none" stroke="#6f6658" strokeWidth="5" strokeLinecap="round" />
      <path d="M48 94 L 44 118 M66 94 L 70 118" stroke="#7d7466" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="57" cy="72" rx="23" ry="28" fill="#8d8475" />
      <ellipse cx="60" cy="78" rx="12" ry="15" fill="#a39a88" />
      <circle cx="37" cy="22" r="5.5" fill="#7d7466" />
      <circle cx="67" cy="22" r="5.5" fill="#7d7466" />
      <circle cx="52" cy="27" r="16" fill="#8d8475" />
      <ellipse cx="52" cy="31" rx="10" ry="11" fill="#d4b29a" />
      <circle cx="48" cy="28" r="1.8" fill="#2a221c" />
      <circle cx="56" cy="28" r="1.8" fill="#2a221c" />
      {open ? <ellipse cx="52" cy="36" rx="2.6" ry="2" fill="#5a2e24" /> : <path d="M49 36 Q 52 37.5, 55 36" fill="none" stroke="#5a2e24" strokeWidth="1.3" strokeLinecap="round" />}
      <path d="M41 54 Q 30 56, 20 60" fill="none" stroke="#8d8475" strokeWidth="9" strokeLinecap="round" />
      {open ? <path d="M15 56 L 12 51 M20 54 L 19 48 M25 56 L 27 51" stroke="#a39a88" strokeWidth="3" strokeLinecap="round" />
        : <circle cx="20" cy="60" r="6" fill="#a39a88" />}
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

function MonkeyCatchField({ params, still, art, sound, frames }: CueTapFieldProps<MonkeyCatchParams, MonkeyCatchOutcome>) {
  const thing = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const [grip, setGrip] = useState<"hold" | "slip" | "let_go">("hold");
  const [closed, setClosed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [react, setReact] = useState<MonkeyReact | null>(null);
  const play = useRef(sound);
  play.current = sound;
  useEffect(() => {
    let shownGrip = "hold";
    let shut = false;
    let held = false;
    let reacted = false;
    return frames(({ ms, tapMs, outcome, endAt }) => {
      const nextGrip = ms >= MONKEY_RELEASE_MS ? "let_go" : ms >= MONKEY_SLIP_MS ? "slip" : "hold";
      if (nextGrip !== shownGrip) {
        shownGrip = nextGrip;
        setGrip(nextGrip);
      }
      if (tapMs !== null && !shut) {
        shut = true;
        setClosed(true);
        if (outcome !== "caught") play.current(SOUNDS.grab);
      }
      const { at, held: inHands } = thingAt(ms, tapMs, outcome);
      if (inHands && !held) {
        held = true;
        setHolding(true);
        play.current(SOUNDS.catch);
      }
      // Once it is settled in the hands (or gone), the monkey on the wall reacts.
      if (outcome && endAt !== null && !reacted && ms >= endAt - 420) {
        reacted = true;
        setReact(monkeyReactOf(outcome));
      }
      const ringElement = ring.current;
      if (ringElement) ringElement.style.transform = `translate(-50%, -50%) scale(${1 - 0.18 * ringAt(ms)})`;
      const element = thing.current;
      if (!element) return;
      // It tumbles as it falls (drawn the same every time; with less motion it does not turn).
      const turn = still || inHands ? 0 : turnAt(ms, params.thing);
      const flip = still || inHands ? 1 : flipAt(ms, params.thing);
      element.style.left = `${at.x}%`;
      element.style.top = `${at.y}%`;
      element.style.transform = `translate(-50%, -50%) scale(${at.size * flip}, ${at.size}) rotate(${turn}deg)`;
      element.style.opacity = at.y > 125 ? "0" : "1";
    });
  }, [frames, still, params.thing]);
  return (
    <div className="mg-monkey-catch" data-art-wall={art.wall ? true : undefined} data-still={still || undefined}>
      {art.wall && <img className="mg-monkey-catch-backdrop" src={art.wall} alt="" draggable={false} />}
      <span className="mg-monkey-catch-wall"><span className="mg-monkey-catch-coping" /><span className="mg-monkey-catch-inlay" /></span>
      <span className="mg-monkey-catch-monkey" data-grip={grip} data-react={react ?? undefined}>
        <span className="mg-monkey-catch-monkey-lean">
          {art.monkey ? <img src={art.monkey} alt="" draggable={false} /> : <MonkeyFigure open={grip === "let_go"} />}
        </span>
      </span>
      <span className="mg-monkey-catch-ring" ref={ring} data-done={closed || undefined} />
      <span className="mg-monkey-catch-hands" data-closed={closed || undefined} data-holding={holding || undefined}>
        <Hand side="left" />
        <Hand side="right" />
      </span>
      <span className="mg-monkey-catch-thing" ref={thing} data-thing={params.thing}>
        {params.thing === "glasses" ? <span className="mg-monkey-catch-glasses"><span /><span /></span> : <span className="mg-monkey-catch-bottle" />}
      </span>
    </div>
  );
}

/** The catch as a cue_tap skin: its timing, rules, words and field. */
export const monkeyCatchSkin: CueTapSkin<MonkeyCatchParams, MonkeyCatchOutcome> = {
  tuning: MONKEY_TUNING,
  rules: monkeyCatchRules,
  hintJa: "落ちてくる物が輪に届く瞬間に「受け止める」",
  actionJa: "受け止める",
  actionHintJa: "猿の手から離れて落ちてくる物が、両手の上の輪に届くのに合わせて押します。",
  autoJa: "おまかせで受け止めています",
  // The catch settling in the hands (the monkey on the wall reacting), the bounce off the fingers, or the thing falling
  // out of sight, before the outcome shows.
  endAt: ({ outcome, tapMs }, still) => {
    if (outcome === "caught" && tapMs !== null) return meetsAt(tapMs) + (still ? 450 : 800);
    if (outcome === "fumbled" && tapMs !== null) return meetsAt(tapMs) + (still ? 450 : 750);
    return Math.max(tapMs ?? 0, MONKEY_HANDS_MS + MONKEY_FIELD.throughMs + MONKEY_FIELD.goneMs) + 350;
  },
  Field: MonkeyCatchField,
};

/** For the tests: where the thing is, its turn, the ring, and the monkey's grip. */
export const MONKEY_FIELD_POINTS = { untouched, thingAt, turnAt, ringAt, slipAt, HELD, HANDS, THROUGH_DEPTH } as const;
