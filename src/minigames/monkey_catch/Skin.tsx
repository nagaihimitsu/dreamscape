import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { MONKEY_FIELD, MONKEY_HANDS_MS, MONKEY_RELEASE_MS, MONKEY_TUNING, monkeyCatchRules, type MonkeyCatchOutcome, type MonkeyCatchParams } from "./rules";
import "./skin.css";

// The catch's field (a cue_tap skin): the player at the foot of the gate's wall, looking up. The monkey sits on the wall's
// edge holding the bottle out; it lets go, the bottle tumbles down and grows as it comes, and the player's hands wait at
// the bottom. With the use's art (`art.wall`, `art.monkey`) the drawn wall and monkey give way to those pictures.

type Point = { x: number; y: number; size: number };
const mix = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, size: from.size + (to.size - from.size) * t });
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// In percent of the field. The monkey's hand (the bottle before it falls) and the cup of the player's hands. The monkey's
// picture is placed by its hand: the hand is at (20%, 50%) of the picture, its seat on the wall's edge at about 83%, so the
// wall's top edge is at about 30% of the field (the art request says so).
const HELD: Point = { x: 46, y: 22, size: 0.45 };
const HANDS: Point = { x: 50, y: 80, size: 1 };
/** Its speed as it reaches the hands (percent of the field per millisecond; the fall speeds up as it comes). */
const ARRIVAL_SPEED = (2 * (HANDS.y - HELD.y)) / MONKEY_TUNING.approachMs;

/** Where the falling bottle is `ms` after the start, untouched: in the monkey's hand, falling, past the fingertips and out below. */
function untouched(ms: number): Point {
  if (ms <= MONKEY_RELEASE_MS) return HELD;
  if (ms <= MONKEY_HANDS_MS) {
    const s = (ms - MONKEY_RELEASE_MS) / MONKEY_TUNING.approachMs;
    return mix(HELD, HANDS, s * s);
  }
  // Past the hands it brushes the fingertips aside a little and goes on falling (out of the field by MONKEY_FIELD.goneMs).
  const u = ms - MONKEY_HANDS_MS;
  return { x: HANDS.x + 8 * Math.min(1, u / MONKEY_FIELD.goneMs), y: HANDS.y + ARRIVAL_SPEED * u + 0.00012 * u * u, size: HANDS.size + 0.15 * clamp01(u / MONKEY_FIELD.goneMs) };
}

/** A bottle that bounced off the fingers, `u` ms after it hit them at `from`: a little hop up and aside, then down and out. */
function bounced(from: Point, u: number): Point {
  return { x: from.x + 16 * Math.min(1, u / 600), y: from.y - 0.093 * u + 0.00031 * u * u, size: from.size * (1 + 0.1 * Math.min(1, u / 600)) };
}

/** When a tapped play's bottle meets the hands: the tap, or its arrival when the hands closed before it came. */
const meetsAt = (tapMs: number) => Math.max(tapMs, MONKEY_HANDS_MS);

/** The sounds of a play (definition `sounds`): the hands closing on nothing, and the bottle landing in them. */
const SOUNDS = { grab: "cloth_grab", catch: "item_pouch" } as const;

/** The monkey (drawn when the use gives no picture): grey-brown, on the wall's edge, one arm held out; its hand at (20%, 50%). */
function MonkeyFigure() {
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
      <path d="M41 54 Q 30 56, 20 60" fill="none" stroke="#8d8475" strokeWidth="9" strokeLinecap="round" />
      <circle cx="20" cy="60" r="6" fill="#a39a88" />
    </svg>
  );
}

/** One of the player's hands, palm toward the coming bottle (the right one is the same, mirrored). */
function Hand({ side }: { side: "left" | "right" }) {
  return (
    <svg viewBox="0 0 60 80" className={`mg-monkey-catch-hand mg-monkey-catch-hand-${side}`} aria-hidden="true">
      <g fill="#f3dfcc" stroke="rgba(70, 46, 30, 0.55)" strokeWidth="2" transform={side === "right" ? "translate(60 0) scale(-1 1)" : undefined}>
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

function MonkeyCatchField({ still, art, sound, frames }: CueTapFieldProps<MonkeyCatchParams, MonkeyCatchOutcome>) {
  const bottle = useRef<HTMLSpanElement>(null);
  const [dropped, setDropped] = useState(false);
  const [closed, setClosed] = useState(false);
  const [holding, setHolding] = useState(false);
  const play = useRef(sound);
  play.current = sound;
  useEffect(() => {
    let released = false;
    let shut = false;
    let held = false;
    return frames(({ ms, tapMs, outcome }) => {
      if (!released && ms >= MONKEY_RELEASE_MS) {
        released = true;
        setDropped(true);
      }
      if (tapMs !== null && !shut) {
        shut = true;
        setClosed(true);
        if (outcome !== "caught") play.current(SOUNDS.grab);
      }
      let where = untouched(ms);
      let hidden = false;
      if (outcome === "caught" && tapMs !== null && ms >= meetsAt(tapMs)) {
        // In the hands: closed before it came, it lands there; closed just after it touched them, they take it back in.
        const from = untouched(meetsAt(tapMs));
        where = mix(from, HANDS, clamp01((ms - meetsAt(tapMs)) / 90));
        if (!held) {
          held = true;
          setHolding(true);
          play.current(SOUNDS.catch);
        }
      } else if (outcome === "fumbled" && tapMs !== null && ms >= meetsAt(tapMs)) {
        where = bounced(untouched(meetsAt(tapMs)), ms - meetsAt(tapMs));
      }
      if (where.y > 120) hidden = true;
      const element = bottle.current;
      if (!element) return;
      // It tumbles as it falls (drawn the same every time; with less motion it does not turn).
      const turn = still || held ? 0 : -14 + 400 * clamp01((ms - MONKEY_RELEASE_MS) / MONKEY_TUNING.approachMs) + Math.max(0, ms - MONKEY_HANDS_MS) * 0.5;
      element.style.left = `${where.x}%`;
      element.style.top = `${where.y}%`;
      element.style.transform = `translate(-50%, -50%) scale(${where.size}) rotate(${turn}deg)`;
      element.style.opacity = hidden ? "0" : "1";
    });
  }, [frames, still]);
  return (
    <div className="mg-monkey-catch" data-art-wall={art.wall ? true : undefined} data-still={still || undefined}>
      {art.wall && <img className="mg-monkey-catch-backdrop" src={art.wall} alt="" draggable={false} />}
      <span className="mg-monkey-catch-wall"><span className="mg-monkey-catch-coping" /><span className="mg-monkey-catch-inlay" /></span>
      <span className="mg-monkey-catch-monkey" data-dropped={dropped || undefined}>
        <span className="mg-monkey-catch-monkey-lean">
          {art.monkey ? <img src={art.monkey} alt="" draggable={false} /> : <MonkeyFigure />}
        </span>
      </span>
      <span className="mg-monkey-catch-ring" data-done={closed || undefined} />
      <span className="mg-monkey-catch-hands" data-closed={closed || undefined} data-holding={holding || undefined}>
        <Hand side="left" />
        <Hand side="right" />
      </span>
      <span className="mg-monkey-catch-bottle" ref={bottle}><span className="mg-monkey-catch-bottle-glass" /></span>
    </div>
  );
}

/** The catch as a cue_tap skin: its timing, rules, words and field. */
export const monkeyCatchSkin: CueTapSkin<MonkeyCatchParams, MonkeyCatchOutcome> = {
  tuning: MONKEY_TUNING,
  rules: monkeyCatchRules,
  hintJa: "針が金色の所に来たら「受け止める」",
  actionJa: "受け止める",
  actionHintJa: "落ちてくる小瓶が手に届くのに合わせて押します。",
  autoJa: "おまかせで受け止めています",
  // The catch settling in the hands, the bounce off the fingers, or the bottle falling out of sight, before the outcome shows.
  endAt: ({ outcome, tapMs }, still) => {
    if (outcome === "caught" && tapMs !== null) return meetsAt(tapMs) + (still ? 300 : 650);
    if (outcome === "fumbled" && tapMs !== null) return meetsAt(tapMs) + (still ? 350 : 650);
    return Math.max(tapMs ?? 0, MONKEY_HANDS_MS + MONKEY_FIELD.goneMs) + 300;
  },
  Field: MonkeyCatchField,
};
