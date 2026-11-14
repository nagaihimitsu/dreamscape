import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import type { SearchFieldProps, SearchSkin } from "../engines/search/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { fieldPoint } from "../host/seed";
import { MEHNDI_HINT_JA } from "./definition";
import {
  MEHNDI_SPOTS, MEHNDI_TUNING, mehndiGameFor, mehndiRulesFor, type MehndiOutcome, type MehndiParams, type MehndiSpot, type MehndiTarget, type MehndiTuning,
} from "./rules";
import "./skin.css";

// The hidden name's field (a search skin): her right palm held out in the night, the mehndi's broad lines dim; where the
// lamp is held (a small soft-edged pool of light that flickers a little), the fine lines come out, and at one place,
// writing that pretends to be pattern. Round 3 (2026-11-14) made the look a hunt: the pool is small, so the palm must be
// explored; at each other place the fine lines curl into something that looks like writing at a glance (never letters of
// any script); the real writing catches the light now and then (a glint, the tell); and her hand is the hot and cold: with
// the lamp near the writing her fingers curl in and she teases once (「ふふ……どうかな」: she knows what is written), or, in
// the branch where she does not know (FARHANA), she leans in (「ん？　そこ、何か……」); the lamp held long on another
// place, 「そこ、じっと見すぎ」 once. Drag to move the lamp (it rides a little above a finger, so the finger does not hide
// what it lights), tap to point. A wrong place: her word by it, her teasing face and a dashed ring (the look goes on);
// from the third on, she only hints the area (a dotted ring round it for a moment, 「このへん、かな」): the find is always
// the player's. The six places are buttons for Tab and the screen reader; a pointer hits them by where it lands. Finding
// the writing is the one moment of impact: a short stop, the pool opening over the whole palm, the writing swelling, her
// surprised face, stars from it (the host's juice). With the use's art (`art.palm`, `art.lamp`), those pictures in place
// of the drawn hand and lamp; the writing and the curls are drawn by the game either way.

/** The hand's drawing, in its own units (the field keeps this shape: 5 wide to 7 high). */
const W = 300;
const H = 420;
/** The places, where the eye stops in the pattern (their names say what is drawn there, never what hides in it). */
export const MEHNDI_PLACES: Record<MehndiSpot, { x: number; y: number; labelJa: string }> = {
  index: { x: 204, y: 104, labelJa: "人差し指の花" },
  pinky: { x: 88, y: 204, labelJa: "小指の側の花" },
  peacock: { x: 150, y: 236, labelJa: "孔雀の羽の付け根" },
  thumb: { x: 214, y: 298, labelJa: "親指の付け根の蔓" },
  vine: { x: 136, y: 322, labelJa: "真ん中の蔓" },
  wrist: { x: 150, y: 392, labelJa: "手首の模様" },
};
/** A pointer within this of a place points at it (the places are further apart than twice this). */
export const MEHNDI_HIT = 30;
/** On a small palm, a finger's reach is at least this (px): a 44px target, the nearest place taken. */
const FINGER_HIT_PX = 22;
/**
 * Where the writing lies at each target: its centre, its slant and the room it has. The central vine's curls lie off its
 * letters (2026-11-13 playtest: the H of FARHANA was under a curl), and its line breaks behind them (VINE_GAP).
 */
const WRITING: Record<MehndiTarget, { x: number; y: number; rotate: number; width: number }> = {
  thumb: { x: 210, y: 320, rotate: -22, width: 62 },
  peacock: { x: 150, y: 246, rotate: -8, width: 58 },
  vine: { x: 141, y: 316, rotate: -14, width: 62 },
};
/** Where the central vine's line breaks behind the writing hidden in it (in the writing's own frame): lit only, so the
 * dark shows no gap to give it away. */
const VINE_GAP = { x: -16, y: -11, width: 32, height: 21 };
/**
 * The curls at each place that look like writing at a glance (lit only; drawn where the writing is not): a row of loops
 * (count, height, width of each), a slant, an offset from the place's centre, and a dotted underline or not. No letters
 * of any script: loops and dots only.
 */
const LOOKALIKES: Record<MehndiSpot, { loops: number; h: number; w: number; rotate: number; dx: number; dy: number; dots: boolean }> = {
  index: { loops: 3, h: 6, w: 6, rotate: -15, dx: 0, dy: 20, dots: true },
  pinky: { loops: 4, h: 5, w: 6, rotate: 10, dx: 2, dy: 22, dots: false },
  peacock: { loops: 3, h: 8, w: 5, rotate: -8, dx: 0, dy: 12, dots: true },
  thumb: { loops: 3, h: 6, w: 7, rotate: -22, dx: -2, dy: 20, dots: false },
  vine: { loops: 4, h: 6, w: 6, rotate: -14, dx: 4, dy: -2, dots: true },
  wrist: { loops: 5, h: 4, w: 6, rotate: 0, dx: 0, dy: -8, dots: false },
};
/** Her word at a wrong place (the look goes on), by the place, then before the hints; and her hint of the area. */
const WRONG_JA: Record<MehndiSpot, string> = {
  index: "そこは、ただの花びら",
  pinky: "そこは、ただの花びら",
  peacock: "そこは、孔雀の羽だけ",
  thumb: "そこは、ただの蔓",
  vine: "そこは、ただの蔓",
  wrist: "そこは、手首の飾り",
};
const AGAIN_JA = "そこでもないよ。次も外れたら、教えちゃうね";
const HINT_JA = "このへん、かな";
/**
 * Her hand as the hot and cold: the lamp near the writing (she knows it is there / she does not), held long elsewhere.
 * They come again, in turn, each time the lamp comes near again or rests on another place again (2026-11-14 playtest: once
 * each, a long sweep went silent), at most once in TELL_AGAIN_MS.
 */
const NEAR_KNOWS_JA = ["ふふ……どうかな", "……さあ、どうでしょう", "あ、そこは……ううん、なんでもない"] as const;
const NEAR_WONDERS_JA = ["ん？　そこ、何か……", "え、そこ？　何かある？", "……そこだけ、模様がこみいってる"] as const;
const LINGER_JA = ["そこ、じっと見すぎ", "そこばっかり見てる", "……そこ、そんなに気になる？"] as const;
const TELL_AGAIN_MS = 3500;
/** The lamp near the writing this long before her hand tells (a lamp only passing by does not). */
const NEAR_DWELL_MS = 200;
/** How long her word (and her hint's ring) shows (the play's clock). */
const SAID_MS = 1600;
/** The stop as the writing is found (ms). */
const FOUND_STOP_MS = 120;
/** A drag starts after this much movement (px); a shorter touch is a tap. */
const DRAG_PX = 10;
/** A finger's lamp rides this far above it (px). */
const FINGER_LIFT_PX = 52;
/**
 * What a lifted finger points at (2026-11-14 playtest: a finger held still to light what was above it, then lifted, pointed
 * at the place under the finger): a finger that holds the lamp still over a place for AIM_MS aims at what is lit (a ring
 * and 「離すと、ここ」), and lifting it points there; a tap (lifted sooner, not moved) points under the finger, and the lamp
 * goes there; a drag, or a still finger whose lamp lit no place, points at nothing. A finger's lamp shows LAMP_SHOW_MS after
 * it goes down (a tap never flashes the lamp above the finger first).
 */
const AIM_MS = 450;
const LAMP_SHOW_MS = 120;
const AIM_JA = "離すと、ここ";
const SOUNDS = { found: "clue_new", wrong: "ui_tap" } as const;

/** The place a point (in the hand's units) points at: the nearest within `reach`, if any. */
export function mehndiSpotAt(x: number, y: number, reach = MEHNDI_HIT): number | null {
  const distances = MEHNDI_SPOTS.map((spot) => Math.hypot(MEHNDI_PLACES[spot].x - x, MEHNDI_PLACES[spot].y - y));
  const nearest = distances.indexOf(Math.min(...distances));
  return distances[nearest] <= reach ? nearest : null;
}

/**
 * Whether a point of the lamp (in the hand's units) is near the place to point at for the writing (her hand's hot and cold):
 * centred on the place a point finds, so it never fires nearer another place (2026-11-14 playtest: the thumb's tell fired
 * with the lamp nearer the central vine).
 */
export function mehndiNear(x: number, y: number, target: MehndiTarget, units = MEHNDI_TUNING.nearUnits): boolean {
  return Math.hypot(MEHNDI_PLACES[target].x - x, MEHNDI_PLACES[target].y - y) <= units;
}

/** The writing's size: the name as typed, smaller for a long one, never cut (docs/13 2.10). */
export function writingSize(text: string, width: number): { fontSize: number; squeeze: boolean } {
  const em = [...text].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.62), 0) || 1;
  const fontSize = Math.min(11, width / em);
  return fontSize >= 4.5 ? { fontSize, squeeze: false } : { fontSize: 4.5, squeeze: true };
}

/** A row of loops like a hurried hand's writing (no letters): `loops` loops `h` high and `w` wide, centred on 0. */
export function mehndiLoops(loops: number, h: number, w: number): string {
  let d = `M${(-loops * w) / 2} 0`;
  for (let index = 0; index < loops; index += 1) {
    // Up and over into a small loop, then on along the line (each a little taller or shorter, like a hand's).
    const tall = h * (index % 2 ? 0.75 : 1);
    d += ` c${(w * 0.25).toFixed(1)} ${(-tall).toFixed(1)} ${(w * 0.9).toFixed(1)} ${(-tall).toFixed(1)} ${(w * 0.45).toFixed(1)} 0`;
    d += ` c${(-w * 0.1).toFixed(1)} ${(tall * 0.35).toFixed(1)} ${(w * 0.35).toFixed(1)} ${(tall * 0.35).toFixed(1)} ${(w * 0.55).toFixed(1)} 0`;
  }
  return d;
}

/** Three turns of a vine, round the thumb's base (an Archimedean spiral; the same lines every time). */
const SPIRAL = (() => {
  const points: string[] = [];
  for (let step = 0; step <= 72; step += 1) {
    const angle = (step / 72) * Math.PI * 6;
    const radius = 3 + (17 * step) / 72;
    points.push(`${(MEHNDI_PLACES.thumb.x + radius * Math.cos(angle)).toFixed(1)} ${(MEHNDI_PLACES.thumb.y - 6 + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
})();

/** The hand: four fingers, the thumb out to the right, the palm and the wrist. */
function Hand() {
  return (
    <g className="mg-mehndi-hidden-name-skin">
      <rect x="66" y="118" width="34" height="140" rx="17" transform="rotate(-7 83 248)" />
      <rect x="103" y="66" width="38" height="190" rx="19" transform="rotate(-2 122 246)" />
      <rect x="144" y="44" width="40" height="210" rx="20" />
      <rect x="187" y="70" width="37" height="186" rx="18" transform="rotate(5 205 246)" />
      <rect x="214" y="206" width="40" height="114" rx="20" transform="rotate(22 234 320)" />
      <path d="M66 214 C60 280 70 350 100 384 L200 384 C232 352 244 300 236 228 C236 214 224 206 212 206 L84 206 C72 206 66 210 66 214 Z" />
      <path d="M100 380 L200 380 L208 420 L92 420 Z" />
    </g>
  );
}

/** A flower of six petals. */
const flower = (x: number, y: number, size: number) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 60, 120, 180, 240, 300].map((angle) => <ellipse key={angle} cx="0" cy={-size} rx={size * 0.42} ry={size * 0.75} transform={`rotate(${angle})`} />)}
    <circle r={size * 0.42} className="mg-mehndi-hidden-name-fill" />
  </g>
);

/** The mehndi's broad lines (seen in the dark too): fingertips, finger bands, the flowers, the feather, the vines, the wrist. */
function BroadLines({ target, lit }: { target: MehndiTarget; lit: boolean }) {
  // Lit, with the writing in the central vine: its line breaks behind the letters (never crossing them).
  const gap = `${useId().replace(/[^a-zA-Z0-9]/gu, "")}vinegap`;
  const cut = lit && target === "vine";
  const place = WRITING.vine;
  return (
    <g className="mg-mehndi-hidden-name-ink">
      {cut && (
        <defs>
          <mask id={gap} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <rect {...VINE_GAP} rx="4" fill="#000" transform={`translate(${place.x} ${place.y}) rotate(${place.rotate})`} />
          </mask>
        </defs>
      )}
      <g className="mg-mehndi-hidden-name-fill">
        <rect x="66" y="118" width="34" height="30" rx="17" transform="rotate(-7 83 248)" />
        <rect x="103" y="66" width="38" height="32" rx="19" transform="rotate(-2 122 246)" />
        <rect x="144" y="44" width="40" height="34" rx="20" />
        <rect x="187" y="70" width="37" height="32" rx="18" transform="rotate(5 205 246)" />
        <rect x="214" y="206" width="40" height="30" rx="20" transform="rotate(22 234 320)" />
      </g>
      <path d="M70 172 L100 176 M106 140 L140 140 M146 128 L182 128 M190 146 L224 150 M240 258 L270 270" />
      {flower(MEHNDI_PLACES.index.x, MEHNDI_PLACES.index.y, 9)}
      {flower(MEHNDI_PLACES.pinky.x, MEHNDI_PLACES.pinky.y, 11)}
      {/* The peacock's feather: from its base in the palm up toward the ring finger, its eye near the top. */}
      <path d="M150 236 C138 214 114 198 114 172 C114 150 138 148 142 168 C146 188 152 208 150 236 Z" />
      <ellipse cx="128" cy="174" rx="7" ry="10" />
      <path d="M150 240 C162 262 128 282 140 304 C150 324 124 346 138 374" {...(cut ? { mask: `url(#${gap})` } : {})} />
      <path d={SPIRAL} />
      {/* The central vine "unusually intricate" where the writing hides in it (the story says so). */}
      {target === "vine" && <path d="M114 284 c8 -6 16 2 10 8 c-6 6 -14 -2 -8 -8 M152 336 c6 -4 12 2 6 6 M124 334 c-6 -2 -8 6 -2 8" />}
      <path d="M96 210 Q110 202 124 210 Q138 202 152 210 Q166 202 180 210 Q194 202 208 210 Q222 202 234 210" />
      <path d="M98 384 L202 384 M96 400 L204 400" />
    </g>
  );
}

/**
 * The fine lines the lamp brings out: dots, inner petals, the feather's barbs, leaves on the vine; and at each place but
 * the writing's, curls that look like writing at a glance (the temptation to point too soon).
 */
function FineLines({ target }: { target: MehndiTarget }) {
  const dots = (points: [number, number][]) => points.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" className="mg-mehndi-hidden-name-fill" />);
  return (
    <g className="mg-mehndi-hidden-name-ink mg-mehndi-hidden-name-fine">
      <path d="M128 164 L120 156 M132 182 L122 190 M138 196 L130 204 M142 214 L134 222 M136 168 L144 160 M144 192 L150 186" />
      <path d="M150 262 c-8 0 -10 -8 -4 -10 M138 290 c8 -2 12 6 6 10 M146 340 c-8 0 -8 -8 -2 -10 M132 358 c8 0 8 8 2 10" />
      {dots([[196, 120], [212, 120], [204, 132], [76, 222], [100, 222], [88, 232], [110, 392], [124, 392], [138, 392], [162, 392], [176, 392], [190, 392]])}
      {dots([[234, 284], [236, 300], [232, 316], [194, 284], [192, 300]])}
      <circle cx={MEHNDI_PLACES.index.x} cy={MEHNDI_PLACES.index.y} r="15" />
      <circle cx={MEHNDI_PLACES.pinky.x} cy={MEHNDI_PLACES.pinky.y} r="18" />
      {target !== "peacock" && <path d="M142 246 c4 6 12 6 16 0 M144 254 c4 4 8 4 12 0" />}
      {MEHNDI_SPOTS.filter((spot) => spot !== target).map((spot) => {
        const look = LOOKALIKES[spot];
        const at = MEHNDI_PLACES[spot];
        return (
          <g key={spot} className="mg-mehndi-hidden-name-lookalike" data-place={spot}
            transform={`translate(${at.x + look.dx} ${at.y + look.dy}) rotate(${look.rotate})`}>
            <path d={mehndiLoops(look.loops, look.h, look.w)} />
            {look.dots && Array.from({ length: look.loops + 1 }, (_, index) => (
              <circle key={index} cx={((index - look.loops / 2) * look.w).toFixed(1)} cy="4" r="0.9" className="mg-mehndi-hidden-name-fill" />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** The writing at the target (docs/13 2.10): the name as typed, an illegible mark, or FARHANA over unreadable marks. */
function Writing({ params, name }: { params: MehndiParams; name: string }) {
  const place = WRITING[params.target];
  const transform = `translate(${place.x} ${place.y}) rotate(${place.rotate})`;
  if (params.text === "player") {
    const { fontSize, squeeze } = writingSize(name, place.width);
    return (
      <text className="mg-mehndi-hidden-name-writing" transform={transform} fontSize={fontSize} textAnchor="middle" dominantBaseline="central"
        {...(squeeze ? { textLength: place.width, lengthAdjust: "spacingAndGlyphs" } : {})}>{name}</text>
    );
  }
  if (params.text === "farhana") return (
    <g className="mg-mehndi-hidden-name-writing" transform={transform}>
      <text fontSize="9.5" textAnchor="middle" dominantBaseline="central" y="-4" letterSpacing="0.6">FARHANA</text>
      {Array.from({ length: 9 }, (_, index) => <rect key={index} x={-22 + index * 5} y="5" width="2.6" height="3.6" rx="1" />)}
    </g>
  );
  // A line on top and curls hanging from it: no letters of any script are drawn (the story only says they read as Hindi).
  return (
    <g className="mg-mehndi-hidden-name-writing mg-mehndi-hidden-name-mark" transform={transform}>
      <path d="M-26 -7 H26 M-21 -7 c-5 4 -3 11 3 10 c4 -1 3 -6 -1 -5 M-8 -7 c4 3 5 9 0 11 c-4 2 -6 -3 -2 -4 M5 -7 c-4 4 -2 10 3 9 c4 -1 2 -6 -1 -4 M17 -7 c5 3 4 10 -1 10 c-3 0 -3 -4 0 -4" />
      <circle cx="-13" cy="6" r="1.2" /><circle cx="11" cy="7" r="1.2" />
    </g>
  );
}

const mehndiFieldFor = (tuning: MehndiTuning) => function MehndiField({ params, setup, view, live, search, active, frames, names, art, still, sound, vibrate }: SearchFieldProps<MehndiParams, MehndiOutcome>) {
  const palm = useRef<HTMLDivElement>(null);
  // The lamp starts over the fingers, away from every place the writing may hide.
  const lamp = useRef({ x: 150 / W, y: 60 / H });
  /**
   * A finger (or the mouse) down on the palm: where it went down and when, whether it has moved (a drag), whether its lamp
   * shows yet, where its lamp would be, and when and where the lamp last came to rest (an aim needs it still).
   */
  const press = useRef<{
    id: number; x: number; y: number; at: number; moved: boolean; shown: boolean; lamp: { x: number; y: number };
    restAt: number; restX: number; restY: number;
  } | null>(null);
  /** The place a resting lamp aims at (lifting the finger points there), shown by a ring. */
  const [aim, setAim] = useState<number | null>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const writingRing = useRef<HTMLSpanElement>(null);
  const target = setup.rounds[0].targets[0];
  const ending = view.ending;
  const [said, setSaid] = useState<{ spot: number; textJa: string; at: number; hint?: boolean } | null>(null);
  const clockMs = useRef(0);
  /**
   * Her hand's hot and cold: whether the lamp is near the writing and since when, when the lamp last moved, when she last
   * said something, whether she has for this visit near it or this rest elsewhere, and how many of each she has said.
   */
  const near = useRef(false);
  const nearSince = useRef(0);
  const movedAt = useRef(0);
  const told = useRef({ at: Number.NEGATIVE_INFINITY, near: false, linger: false, nearCount: 0, lingerCount: 0 });
  const liveRef = useRef(live);
  liveRef.current = live && !ending;

  const place = (x: number, y: number, glide: boolean) => {
    const next = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    // A move to another place lets her tease a long look there again.
    if (Math.hypot((next.x - lamp.current.x) * W, (next.y - lamp.current.y) * H) > MEHNDI_HIT / 2) told.current.linger = false;
    lamp.current = next;
    movedAt.current = clockMs.current;
    const box = palm.current;
    if (!box) return;
    box.style.setProperty("--mehndi-lamp-x", `${lamp.current.x * 100}%`);
    box.style.setProperty("--mehndi-lamp-y", `${lamp.current.y * 100}%`);
    box.toggleAttribute("data-glide", glide);
    // The lamp near the writing: her fingers curl in (each time it comes near); her word comes from the frames.
    const close = mehndiNear(lamp.current.x * W, lamp.current.y * H, params.target, tuning.nearUnits);
    if (close !== near.current) {
      near.current = close;
      nearSince.current = clockMs.current;
      if (!close) told.current.near = false;
      box.toggleAttribute("data-near", close);
    }
  };
  useEffect(() => { place(lamp.current.x, lamp.current.y, false); }, []);
  /** Her word for the hot and cold, in turn from its list, at most once in TELL_AGAIN_MS. */
  const tell = (kind: "near" | "linger", ms: number) => {
    const state = told.current;
    state.at = ms;
    if (kind === "near") {
      state.near = true;
      // She knows what is written where (her name for the player, her own secret), or not (FARHANA's own).
      const lines = params.text === "farhana" ? NEAR_WONDERS_JA : NEAR_KNOWS_JA;
      kitRef.current.react(params.text === "farhana" ? "surprise" : "tease", lines[state.nearCount++ % lines.length]);
    } else {
      state.linger = true;
      kitRef.current.react("tease", LINGER_JA[state.lingerCount++ % LINGER_JA.length]);
    }
  };
  // The lamp's flame flickers a little (the pool's edge breathes; not with less motion); her word fades on the play's
  // clock; a finger's lamp shows a moment after it goes down, and resting still over a place it aims there; the lamp a
  // moment near the writing, or held long on another place, brings her hot and cold again and again (TELL_AGAIN_MS apart).
  useEffect(() => frames((ms) => {
    clockMs.current = ms;
    if (!still) palm.current?.style.setProperty("--mehndi-lamp-k", (1 + 0.014 * Math.sin(ms * 0.0377) + 0.008 * Math.sin(ms * 0.0911)).toFixed(4));
    setSaid((current) => (current && ms - current.at >= SAID_MS ? null : current));
    const down = press.current;
    if (down && !down.shown && ms - down.at >= LAMP_SHOW_MS) {
      down.shown = true;
      place(down.lamp.x, down.lamp.y, false);
    }
    const aiming = down && down.shown && liveRef.current && ms - down.restAt >= AIM_MS ? mehndiSpotAt(lamp.current.x * W, lamp.current.y * H) : null;
    setAim((current) => (current === aiming ? current : aiming));
    if (!liveRef.current || ms - told.current.at < TELL_AGAIN_MS || (down && !down.shown)) return;
    if (near.current && !told.current.near && ms - nearSince.current >= NEAR_DWELL_MS) tell("near", ms);
    else if (!near.current && !told.current.linger && ms - movedAt.current >= tuning.lingerMs) {
      const spot = mehndiSpotAt(lamp.current.x * W, lamp.current.y * H);
      if (spot !== null && spot !== target) tell("linger", ms);
    }
  }), [frames, still]);
  // Her word at a wrong place: by the place, then before the hints that the next one brings one; from then on, her hint:
  // 「このへん、かな」 over a dotted ring round the writing's area (the lamp stays where the player pointed).
  const say = (spot: number, misses: number) => {
    if (misses >= tuning.hintAfter) {
      setSaid({ spot: target, textJa: HINT_JA, at: clockMs.current, hint: true });
      return;
    }
    // The first wrong point teases (「ふふ、」: round 2 playtest), the next warns that a hint comes, then the hints.
    const textJa = misses < tuning.hintAfter - 1 ? `${misses === 1 ? "ふふ、" : ""}${WRONG_JA[MEHNDI_SPOTS[spot]]}` : AGAIN_JA;
    setSaid({ spot, textJa, at: clockMs.current });
  };
  // A place pointed at (by hand or by おまかせ): the lamp goes to it; the writing found rings; a wrong place, her word or
  // her hint, and her teasing face.
  const pointed = view.searched.length;
  useEffect(() => {
    if (!pointed) return;
    const last = view.searched[pointed - 1];
    const spot = MEHNDI_PLACES[MEHNDI_SPOTS[last]];
    place(spot.x / W, spot.y / H, true);
    if (last === target) {
      // The find: the writing lit, a short stop, stars from it, her face.
      play.current.sound(SOUNDS.found);
      play.current.vibrate("success");
      kitRef.current.juice.hitStop(FOUND_STOP_MS);
      kitRef.current.juice.burst(writingRing.current, "star", 0.9);
      // Her surprise always shows at the find (over a hot-and-cold word or a tease just before: 2026-11-14 playtest).
      kitRef.current.react("surprise", undefined, { over: true });
    } else {
      play.current.sound(SOUNDS.wrong);
      kitRef.current.react("tease");
      say(last, pointed);
    }
  }, [pointed]); // each place pointed at once

  /** Points at a place: the look's search, or her word again for a wrong place pointed at again (the look counts it once). */
  const pointAt = (spot: number) => {
    if (view.searched.includes(spot) && spot !== target) say(spot, 1);
    else search(spot);
  };
  /** Where a pointer's lamp is (in the palm's share): a finger's rides above it, so the finger does not hide what it lights. */
  const lampOf = (event: PointerEvent<HTMLDivElement>, box: HTMLDivElement) => {
    const lift = event.pointerType === "touch" ? FINGER_LIFT_PX / box.getBoundingClientRect().height : 0;
    const point = fieldPoint(event, box);
    return { x: point.x, y: point.y - lift, lifted: lift > 0 };
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !live || !palm.current) return;
    palm.current.setPointerCapture?.(event.pointerId);
    const at = lampOf(event, palm.current);
    const now = clockMs.current;
    // A finger's lamp shows a moment later (the frames), a mouse's at once (it is the pointer).
    press.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY, at: now, moved: false, shown: !at.lifted, lamp: { x: at.x, y: at.y },
      restAt: now, restX: event.clientX, restY: event.clientY,
    };
    if (!at.lifted) place(at.x, at.y, false);
    active();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const down = press.current;
    if (!down || down.id !== event.pointerId || !palm.current) return;
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_PX) down.moved = true;
    // The lamp comes to rest where it stays within a small reach (a finger's tremble keeps it at rest).
    if (Math.hypot(event.clientX - down.restX, event.clientY - down.restY) > DRAG_PX) {
      down.restAt = clockMs.current;
      down.restX = event.clientX;
      down.restY = event.clientY;
    }
    const at = lampOf(event, palm.current);
    down.lamp = { x: at.x, y: at.y };
    if (down.moved) down.shown = true;
    if (down.shown) place(at.x, at.y, false);
    active();
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const down = press.current;
    press.current = null;
    setAim(null);
    if (!down || down.id !== event.pointerId || !palm.current || !live) return;
    const now = clockMs.current;
    // The lamp held still over a place (its aim ring showing), then the finger lifted: what is lit is what is pointed at.
    const aimed = down.shown && now - down.restAt >= AIM_MS ? mehndiSpotAt(lamp.current.x * W, lamp.current.y * H) : null;
    if (aimed !== null) {
      pointAt(aimed);
      return;
    }
    if (!down.moved && now - down.at < AIM_MS) {
      // A tap (lifted before any aim): the lamp to it, and a place there pointed at (what is lit then is what was pointed at).
      const point = fieldPoint(event, palm.current);
      place(point.x, point.y, true);
      const width = palm.current.getBoundingClientRect().width;
      const spot = mehndiSpotAt(point.x * W, point.y * H, Math.max(MEHNDI_HIT, width ? (FINGER_HIT_PX * W) / width : 0));
      if (spot !== null) pointAt(spot);
    }
    // Else a look (a drag, or a still finger whose lamp lit no place): nothing is pointed at.
  };
  const onFocus = (event: FocusEvent<HTMLButtonElement>, spot: MehndiSpot) => {
    // Tab brings the lamp (a focus the host gives at the start, after a finger, does not move it).
    if (event.currentTarget.matches(":focus-visible")) place(MEHNDI_PLACES[spot].x / W, MEHNDI_PLACES[spot].y / H, true);
  };

  const drawn = (lit: boolean): ReactNode => art.palm
    ? <img className="mg-mehndi-hidden-name-picture" src={art.palm} alt="" draggable={false} />
    : (
      <svg viewBox={`0 0 ${W} ${H}`} className="mg-mehndi-hidden-name-picture" aria-hidden="true" focusable="false">
        <Hand />
        <BroadLines target={params.target} lit={lit} />
        {lit && <FineLines target={params.target} />}
      </svg>
    );
  // The writing ringed once found; the wrong places pointed at, each with a dashed ring; her hint's ring for a moment.
  const shownWriting = ending?.kind === "found";
  const wrongs = view.searched.filter((spot) => spot !== target);
  const at = (spot: number) => ({ left: `${(MEHNDI_PLACES[MEHNDI_SPOTS[spot]].x / W) * 100}%`, top: `${(MEHNDI_PLACES[MEHNDI_SPOTS[spot]].y / H) * 100}%` });
  // The pool never smaller than a fingertip on a small phone.
  const pool = { "--mehndi-lamp-r": `max(${tuning.lampPct}cqw, 18px)`, "--mehndi-glint-every": `${Math.max(400, tuning.glintEveryMs)}ms` } as CSSProperties;
  return (
    <div className="mg-mehndi-hidden-name" data-ending={ending?.kind} data-art-palm={art.palm ? true : undefined}>
      <div className="mg-mehndi-hidden-name-palm" ref={palm} style={pool} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { press.current = null; setAim(null); }}>
        <div className="mg-mehndi-hidden-name-dark" aria-hidden="true">{drawn(false)}</div>
        <div className="mg-mehndi-hidden-name-lit" aria-hidden="true">
          {drawn(true)}
          {/* With the use's palm picture, the curls that look like writing are drawn over it too (the game's, like the writing). */}
          {art.palm && <svg viewBox={`0 0 ${W} ${H}`} className="mg-mehndi-hidden-name-picture" focusable="false"><FineLines target={params.target} /></svg>}
          <svg viewBox={`0 0 ${W} ${H}`} className="mg-mehndi-hidden-name-picture" focusable="false"><Writing params={params} name={names.player} /></svg>
        </div>
        <span className="mg-mehndi-hidden-name-glow" aria-hidden="true" />
        <span className="mg-mehndi-hidden-name-lamp mg-play-object" aria-hidden="true">
          {art.lamp ? <img src={art.lamp} alt="" draggable={false} /> : (
            <svg viewBox="0 0 24 32" focusable="false">
              <path d="M8 4 h8 M12 0 v4" className="mg-mehndi-hidden-name-brass-line" />
              <path d="M6 6 h12 l-1 4 h-10 z M7 26 h10 l2 4 h-14 z" className="mg-mehndi-hidden-name-brass" />
              <rect x="7" y="10" width="10" height="16" rx="3" className="mg-mehndi-hidden-name-glass" />
              <ellipse cx="12" cy="19" rx="2.2" ry="3.6" className="mg-mehndi-hidden-name-flame" />
            </svg>
          )}
        </span>
        {wrongs.map((spot) => <span key={spot} className="mg-mehndi-hidden-name-mark-ring" data-wrong style={at(spot)} aria-hidden="true" />)}
        {/* The place a resting lamp aims at: lifting the finger points there (what is lit is what is chosen). */}
        {aim !== null && (
          <span key={`aim-${aim}`} className="mg-mehndi-hidden-name-aim" style={at(aim)}
            data-testid="mehndi-aim" aria-hidden="true"><span>{AIM_JA}</span></span>
        )}
        {shownWriting && <span ref={writingRing} className="mg-mehndi-hidden-name-mark-ring" data-writing style={at(target)} aria-hidden="true" />}
        {said?.hint && <span key={`hint-${said.at}`} className="mg-mehndi-hidden-name-hint-ring" style={at(target)} aria-hidden="true" />}
        {said && (
          <span key={said.at} className="mg-mehndi-hidden-name-said" data-below={MEHNDI_PLACES[MEHNDI_SPOTS[said.spot]].y < H * 0.4 || undefined}
            data-hint={said.hint || undefined} style={at(said.spot)} role="status">{said.textJa}</span>
        )}
        {MEHNDI_SPOTS.map((spot, index) => (
          <button key={spot} type="button" className="mg-mehndi-hidden-name-spot" data-testid={`minigame-spot-${index}`}
            aria-disabled={!live || undefined} aria-label={MEHNDI_PLACES[spot].labelJa}
            style={{ left: `${(MEHNDI_PLACES[spot].x / W) * 100}%`, top: `${(MEHNDI_PLACES[spot].y / H) * 100}%` }}
            onFocus={(event) => onFocus(event, spot)} onClick={() => {
              if (!live) return;
              // A wrong place pointed at again by keys: her word again (never a dead press).
              if (view.searched.includes(index) && index !== target) say(index, 1);
              else search(index);
            }} />
        ))}
      </div>
    </div>
  );
};

/** The hidden name as a search skin for a tuning (Debug's room retunes it): its game, rules, words and field. */
export const mehndiSkinFor = (tuning: MehndiTuning): SearchSkin<MehndiParams, MehndiOutcome> => ({
  game: mehndiGameFor(tuning),
  rules: mehndiRulesFor(tuning),
  hintJa: MEHNDI_HINT_JA,
  buttons: [{ id: "later", labelJa: "明日にする", hintJa: "今夜は探すのをやめて、明日にします。", tone: "secondary" }],
  autoJa: "おまかせで探しています",
  // The writing lit and ringed, or the lamp going out, before the outcome shows.
  endDelayMs: (ending, still) => (still ? 900 : ending.kind === "found" ? 1500 : 1100),
  Field: mehndiFieldFor(tuning),
});
export const mehndiSkin = mehndiSkinFor(MEHNDI_TUNING);
