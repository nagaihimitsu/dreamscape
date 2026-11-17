import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import type { SearchFieldProps, SearchSkin } from "../engines/search/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { fieldPoint } from "../host/seed";
import { MEHNDI_HINT_JA } from "./definition";
import { AGAIN_JA, DECOY_JA, HINT_JA, LINGER_JA, NEAR_KNOWS_JA, NEAR_WONDERS_JA, WRONG_JA } from "./lines";
import {
  MEHNDI_HIT, MEHNDI_MARK_PAD, MEHNDI_PLACES, MEHNDI_WRITING, MEHNDI_WRITING_MARK, mehndiDecoyGlyphs, mehndiDecoySize, mehndiDecoysFor, mehndiMarkRing, mehndiMarks,
  mehndiNear, mehndiPointAt, mehndiVineGaps, mehndiWritingRing, mehndiWrongRings, type MehndiDecoy, type MehndiMark, type MehndiPointed, type MehndiPointedAt,
} from "./marks";
import {
  MEHNDI_SPOTS, MEHNDI_TUNING, mehndiGameFor, mehndiRulesFor, type MehndiOutcome, type MehndiParams, type MehndiSpot, type MehndiTarget, type MehndiTuning,
} from "./rules";
import { WRITING_BASELINE, writingSize } from "./writing";
import "./skin.css";

// The hidden name's field (a search skin): her right palm held out in the night, the mehndi's broad lines dim; where the
// lamp is held (a small soft-edged pool of light that flickers a little), the fine lines come out, and at one place,
// writing that pretends to be pattern. Round 3 (2026-11-14) made the look a hunt: the pool is small, so the palm must be
// explored; the real writing catches the light now and then (a glint, the tell); and her hand is the hot and cold: with
// the lamp near the writing her fingers curl in and she teases once (「ふふ……どうかな」: she knows what is written), or, in
// the branch where she does not know (FARHANA), she leans in (「ん？　そこ、何か……」); the lamp held long on another
// place, 「そこ、じっと見すぎ」 once. Round 4 (2026-11-17, the user: 「既存のものではかんたんすぎる」): in place of round 3's
// curls at the five other places (loops and dots: the name alone was in the thin Fasol SP hand, and showed from afar),
// runs of decorations that look like letters lie across the fingers, the palm and above the wrist (marks.ts): each mark a
// Fasol SP letter or two laid over each other, mirrored or turned, drawn as text from the font in the name's colour and at
// the name's size, lit only, never glinting, read as no word. Pointing at one (a tap on it, or the lamp held still on it)
// points at the place it belongs to: her word about decorations, a dashed ring round that run, her teasing face (a second
// run of a place already wrong: her next word and its own ring, not counted again). The writing is pointed at on its
// letters too (its box), not only near its place. Drag to move the lamp (it rides a little above a finger, so the finger
// does not hide what it lights), tap to point. A wrong place: her word by it, her teasing face and a dashed ring (the look
// goes on); from the third on, she only hints the area (a dotted ring round it for a moment, 「このへん、かな」): the find
// is always the player's. The six places are buttons for Tab and the screen reader (the decorations are part of the
// picture); a pointer hits them by where it lands. Finding the writing is the one moment of impact: a short stop, the pool
// opening over the whole palm, the writing swelling, her surprised face, stars from it (the host's juice). With the use's
// art (`art.palm`, `art.lamp`), those pictures in place of the drawn hand and lamp; the writing and the decorations are
// drawn by the game either way.

/** The hand's drawing, in its own units (the field keeps this shape: 5 wide to 7 high). */
const W = 300;
const H = 420;
/** On a small palm, a finger's reach is at least this (px): a 44px target, the nearest place taken. */
const FINGER_HIT_PX = 22;
/** And a finger is on a decoration (or the writing) this near its box (px): the smallest run about 45px across with it. */
const MARK_TAP_PX = 16;
/**
 * Where the peacock feather's point (its base in the palm) breaks behind Fasol SP letters laid there, the player's name
 * or the run of decorations drawn there when the writing is elsewhere (in the frame of the writing at the peacock, which
 * is that run's too; lit only, as the vine's gaps): from below the point up to 2.5 above the tall strokes of the largest
 * size (they reached into it, 2026-11-17). Not behind the letterless mark or FARHANA at the peacock (they keep clear of
 * the point).
 */
export const MEHNDI_FEATHER_GAP = { x: -8, y: -14, width: 16, height: 8 };
/** Her hot and cold comes again at most once in this (her lines: lines.ts). */
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

// The hand's shapes, as data the drawing reads (skin.test.ts measures where the writing and the decorations lie from them).
/** The four fingers and the thumb: a rounded bar each, turned about a point at its base; `tip`: how far the fingertip is dyed. */
export const MEHNDI_FINGERS = [
  { x: 66, y: 118, width: 34, height: 140, rx: 17, rotate: -7, cx: 83, cy: 248, tip: 30 },
  { x: 103, y: 66, width: 38, height: 190, rx: 19, rotate: -2, cx: 122, cy: 246, tip: 32 },
  { x: 144, y: 44, width: 40, height: 210, rx: 20, rotate: 0, cx: 0, cy: 0, tip: 34 },
  { x: 187, y: 70, width: 37, height: 186, rx: 18, rotate: 5, cx: 205, cy: 246, tip: 32 },
  { x: 214, y: 206, width: 40, height: 114, rx: 20, rotate: 22, cx: 234, cy: 320, tip: 30 },
] as const;
/** The palm's outline (the writing's rooms lie inside it). */
export const MEHNDI_PALM = "M66 214 C60 280 70 350 100 384 L200 384 C232 352 244 300 236 228 C236 214 224 206 212 206 L84 206 C72 206 66 210 66 214 Z";
export const MEHNDI_WRIST = "M100 380 L200 380 L208 420 L92 420 Z";
/** The broad lines: a band across each finger, the wave along the fingers' roots, the two lines of the wrist. */
export const MEHNDI_BANDS = "M70 172 L100 176 M106 140 L140 140 M146 128 L182 128 M190 146 L224 150 M240 258 L270 270";
export const MEHNDI_WAVE = "M96 210 Q110 202 124 210 Q138 202 152 210 Q166 202 180 210 Q194 202 208 210 Q222 202 234 210";
export const MEHNDI_WRIST_LINES = "M98 384 L202 384 M96 400 L204 400";
/** The two flowers (six petals `size` long round the place of that name) and the fine ring round each. */
export const MEHNDI_FLOWERS = [{ spot: "index", size: 9, ring: 15 }, { spot: "pinky", size: 11, ring: 18 }] as const;
/** The peacock's feather: from its point at its base in the palm (150, 236) up toward the ring finger; and its eye. */
export const MEHNDI_FEATHER = "M150 236 C138 214 114 198 114 172 C114 150 138 148 142 168 C146 188 152 208 150 236 Z";
export const MEHNDI_EYE = { cx: 128, cy: 174, rx: 7, ry: 10 } as const;
/** The central vine, from the feather's base down to the wrist. */
export const MEHNDI_VINE = "M150 240 C162 262 128 282 140 304 C150 324 124 346 138 374";
/** The curls that make the central vine "unusually intricate" where the writing hides in it (the story says so). */
export const MEHNDI_INTRICATE = "M114 284 c8 -6 16 2 10 8 c-6 6 -14 -2 -8 -8 M152 336 c6 -4 12 2 6 6 M124 334 c-6 -2 -8 6 -2 8";
/** Three turns of a vine, round the thumb's base (an Archimedean spiral; the same lines every time). */
export const MEHNDI_SPIRAL = (() => {
  const points: string[] = [];
  for (let step = 0; step <= 72; step += 1) {
    const angle = (step / 72) * Math.PI * 6;
    const radius = 3 + (17 * step) / 72;
    points.push(`${(MEHNDI_PLACES.thumb.x + radius * Math.cos(angle)).toFixed(1)} ${(MEHNDI_PLACES.thumb.y - 6 + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
})();
/** The fine lines the lamp brings out: the feather's barbs, the leaves on the vine, and dots (by the flowers, along the wrist, by the thumb's spiral). */
export const MEHNDI_BARBS = "M128 164 L120 156 M132 182 L122 190 M138 196 L130 204 M142 214 L134 222 M136 168 L144 160 M144 192 L150 186";
export const MEHNDI_LEAVES = "M138 290 c8 -2 12 6 6 10 M146 340 c-8 0 -8 -8 -2 -10 M132 358 c8 0 8 8 2 10";
export const MEHNDI_FINE_DOTS: readonly (readonly [number, number])[] = [
  [196, 120], [212, 120], [204, 132], [76, 222], [100, 222], [88, 232], [110, 392], [124, 392], [138, 392], [162, 392], [176, 392], [190, 392],
  // By the thumb's spiral, none under it (2026-11-16: one there read as a full stop after the name).
  [234, 284], [236, 300], [194, 284], [192, 300],
];

/** A length as drawn: to a hundredth of a unit. */
const round = (value: number) => Math.round(value * 100) / 100;

/** A finger's bar, or its dyed tip (`height`). */
const finger = ({ x, y, width, rx, rotate, cx, cy }: (typeof MEHNDI_FINGERS)[number], height: number) => (
  <rect key={x} x={x} y={y} width={width} height={height} rx={rx} {...(rotate ? { transform: `rotate(${rotate} ${cx} ${cy})` } : {})} />
);

/** The hand: four fingers, the thumb out to the right, the palm and the wrist. */
function Hand() {
  return (
    <g className="mg-mehndi-hidden-name-skin">
      {MEHNDI_FINGERS.map((bar) => finger(bar, bar.height))}
      <path d={MEHNDI_PALM} />
      <path d={MEHNDI_WRIST} />
    </g>
  );
}

/** A flower of six petals. */
const flower = (x: number, y: number, size: number) => (
  <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
    {[0, 60, 120, 180, 240, 300].map((angle) => <ellipse key={angle} cx="0" cy={-size} rx={size * 0.42} ry={size * 0.75} transform={`rotate(${angle})`} />)}
    <circle r={size * 0.42} className="mg-mehndi-hidden-name-fill" />
  </g>
);

/** The mehndi's broad lines (seen in the dark too): fingertips, finger bands, the flowers, the feather, the vines, the wrist. */
function BroadLines({ target, lit, lettering }: { target: MehndiTarget; lit: boolean; lettering: boolean }) {
  // Lit, the central vine's line breaks behind what is laid on it (the writing or a run of decorations, at the feather's
  // base and in the vine's middle: never crossing them), and the feather's point behind Fasol SP letters at its base (the
  // run of decorations there when the writing is elsewhere; the player's name when it is there). The dark shows no gap.
  const id = useId().replace(/[^a-zA-Z0-9]/gu, "");
  const gap = `${id}vinegap`;
  const tip = `${id}feathergap`;
  const cutTip = lit && (target !== "peacock" || lettering);
  const base = MEHNDI_WRITING.peacock;
  return (
    <g className="mg-mehndi-hidden-name-ink">
      {lit && (
        <defs>
          <mask id={gap} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            {/* No stroke: the ink's stroke, inherited, would leave a pale band of the line at the gap's edge. */}
            {mehndiVineGaps(target).map(({ x, y, rotate, rect }) => (
              <rect key={`${x}-${y}`} x={round(rect.x)} y={round(rect.y)} width={round(rect.width)} height={round(rect.height)} rx="4" fill="#000" stroke="none"
                transform={`translate(${x} ${y}) rotate(${rotate})`} />
            ))}
          </mask>
          {cutTip && (
            <mask id={tip} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <rect width={W} height={H} fill="#fff" />
              <rect {...MEHNDI_FEATHER_GAP} rx="4" fill="#000" stroke="none" transform={`translate(${base.x} ${base.y}) rotate(${base.rotate})`} />
            </mask>
          )}
        </defs>
      )}
      <g className="mg-mehndi-hidden-name-fill">
        {MEHNDI_FINGERS.map((bar) => finger(bar, bar.tip))}
      </g>
      <path d={MEHNDI_BANDS} />
      {MEHNDI_FLOWERS.map(({ spot, size }) => flower(MEHNDI_PLACES[spot].x, MEHNDI_PLACES[spot].y, size))}
      {/* The peacock's feather: from its base in the palm up toward the ring finger, its eye near the top. */}
      <path d={MEHNDI_FEATHER} {...(cutTip ? { mask: `url(#${tip})` } : {})} />
      <ellipse {...MEHNDI_EYE} />
      <path d={MEHNDI_VINE} {...(lit ? { mask: `url(#${gap})` } : {})} />
      <path d={MEHNDI_SPIRAL} />
      {target === "vine" && <path d={MEHNDI_INTRICATE} />}
      <path d={MEHNDI_WAVE} />
      <path d={MEHNDI_WRIST_LINES} />
    </g>
  );
}

/** The fine lines the lamp brings out: dots, the flowers' rings, the feather's barbs, leaves on the vine. */
function FineLines() {
  return (
    <g className="mg-mehndi-hidden-name-ink mg-mehndi-hidden-name-fine">
      <path d={MEHNDI_BARBS} />
      <path d={MEHNDI_LEAVES} />
      {MEHNDI_FINE_DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" className="mg-mehndi-hidden-name-fill" />)}
      {MEHNDI_FLOWERS.map(({ spot, ring }) => <circle key={spot} cx={MEHNDI_PLACES[spot].x} cy={MEHNDI_PLACES[spot].y} r={ring} />)}
    </g>
  );
}

/**
 * The decorations that look like letters (marks.ts; docs/13 2.10): each run a group in its own frame, each glyph one Fasol
 * SP letter as text (one letter a text, so no kerning moves letters laid over each other), its advance centred on its
 * place, mirrored or half-turned about the small letters' middle. The name's colour and font, never its glint (not the
 * writing's class).
 */
function Decoys({ decoys, size }: { decoys: readonly MehndiDecoy[]; size: number }) {
  return (
    <>
      {decoys.map((decoy) => {
        const fontSize = round(size * decoy.scale);
        return (
          <g key={decoy.id} className="mg-mehndi-hidden-name-decoy" data-decoy={decoy.id} transform={`translate(${decoy.x} ${decoy.y}) rotate(${decoy.rotate})`}
            fontSize={fontSize}>
            {mehndiDecoyGlyphs(decoy).map((glyph, index) => {
              const x = round(glyph.x * fontSize);
              const turn = glyph.turn === "mirror" ? `matrix(-1 0 0 1 ${2 * x} 0)` : glyph.turn === "half" ? `rotate(180 ${x} 0)` : undefined;
              return <text key={index} x={x} y={round(fontSize * WRITING_BASELINE)} textAnchor="middle" {...(turn ? { transform: turn } : {})}>{glyph.letter}</text>;
            })}
          </g>
        );
      })}
    </>
  );
}

/**
 * The writing at the target (docs/13 2.10): the player's name in Latin letters in the Fasol SP hand (writing.ts; as text,
 * never HTML), or, with no Latin form of it (a name in kanji whose reading was not caught), the illegible mark as for
 * `illegible` (no letters of any script are made up); an illegible mark; or FARHANA over unreadable marks.
 */
function Writing({ params, latin }: { params: MehndiParams; latin: string | null }) {
  const place = MEHNDI_WRITING[params.target];
  const transform = `translate(${place.x} ${place.y}) rotate(${place.rotate})`;
  if (params.text === "player" && latin) {
    // The small letters centred on the place (the tall strokes and the tails above and below them).
    const { fontSize, squeeze } = writingSize(latin, place.width);
    return (
      <text className="mg-mehndi-hidden-name-writing mg-mehndi-hidden-name-lettering" transform={transform} fontSize={fontSize} textAnchor="middle"
        y={fontSize * WRITING_BASELINE} {...(squeeze ? { textLength: place.width, lengthAdjust: "spacingAndGlyphs" } : {})}>{latin}</text>
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

/** What a point points at, as a key: the thing, or the place itself. */
const pointedKey = (pointed: MehndiPointed | null) => (pointed ? pointed.mark?.id ?? `place-${pointed.spot}` : null);
/** A point of the hand as a share of the palm. */
const share = ({ x, y }: { x: number; y: number }) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
/** A ring's width (a diameter in the hand's units) in the palm's own unit. */
const across = (diameter: number) => `${((diameter / W) * 100).toFixed(2)}cqw`;

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
  const latin = names.playerLatin ?? null;
  /** The things that can be pointed at by themselves: the runs of decorations drawn and the writing (for the frames too). */
  const marks = useMemo(() => mehndiMarks(params, latin), [params.target, params.text, latin]);
  const marksRef = useRef(marks);
  marksRef.current = marks;
  /** What a resting lamp aims at (lifting the finger points there), shown by a ring: a thing, or a place. */
  const [aim, setAim] = useState<MehndiPointed | null>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const writingRing = useRef<HTMLSpanElement>(null);
  const target = setup.rounds[0].targets[0];
  const ending = view.ending;
  /** Her word, by the thing or the place it is about (`about`: that thing's or place's key; her hint is by the writing's area). */
  const [said, setSaid] = useState<{ x: number; y: number; textJa: string; at: number; about: string; hint?: boolean } | null>(null);
  /**
   * The wrong things and places pointed at by hand (each once: their dashed rings), what the look's latest search pointed
   * at (the effect below reads it once), and how many words about decorations she has said (they come in turn).
   */
  const [pointedAt, setPointedAt] = useState<MehndiPointedAt[]>([]);
  const lastPointed = useRef<MehndiPointed | null>(null);
  const decoyWords = useRef(0);
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
  /** What the lamp is on (a thing under it, or a place within reach). */
  const lit = () => mehndiPointAt(marksRef.current, lamp.current.x * W, lamp.current.y * H);
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
  // clock; a finger's lamp shows a moment after it goes down, and resting still over a thing or a place it aims there; the
  // lamp a moment near the writing, or held long on a decoration or another place, brings her hot and cold again and again
  // (TELL_AGAIN_MS apart).
  useEffect(() => frames((ms) => {
    clockMs.current = ms;
    if (!still) palm.current?.style.setProperty("--mehndi-lamp-k", (1 + 0.014 * Math.sin(ms * 0.0377) + 0.008 * Math.sin(ms * 0.0911)).toFixed(4));
    setSaid((current) => (current && ms - current.at >= SAID_MS ? null : current));
    const down = press.current;
    if (down && !down.shown && ms - down.at >= LAMP_SHOW_MS) {
      down.shown = true;
      place(down.lamp.x, down.lamp.y, false);
    }
    const aiming = down && down.shown && liveRef.current && ms - down.restAt >= AIM_MS ? lit() : null;
    setAim((current) => (pointedKey(current) === pointedKey(aiming) ? current : aiming));
    if (!liveRef.current || ms - told.current.at < TELL_AGAIN_MS || (down && !down.shown)) return;
    if (near.current && !told.current.near && ms - nearSince.current >= NEAR_DWELL_MS) tell("near", ms);
    else if (!near.current && !told.current.linger && ms - movedAt.current >= tuning.lingerMs) {
      const on = lit();
      if (on && on.spot !== target) tell("linger", ms);
    }
  }), [frames, still]);
  // Her word at a wrong place, by the thing or the place pointed at: about decorations (in turn) or about the pattern
  // there; the first of the look teases (「ふふ、」: round 2 playtest), the one before the hints warns that the next brings
  // one; from then on, her hint: 「このへん、かな」 over a dotted ring round the writing's area (the lamp stays where the
  // player pointed). `misses`: the look's wrong places so far; null for a wrong thing or place pointed at again (the look
  // counts it once): her word alone (not 「ふふ、」 every time).
  const say = (spot: number, mark: MehndiMark | null, misses: number | null) => {
    const at = clockMs.current;
    const about = pointedKey({ spot, mark })!;
    if (misses !== null && misses >= tuning.hintAfter) {
      setSaid({ x: MEHNDI_PLACES[params.target].x, y: MEHNDI_PLACES[params.target].y, textJa: HINT_JA, at, about, hint: true });
      return;
    }
    const where = mark ?? MEHNDI_PLACES[MEHNDI_SPOTS[spot]];
    const word = () => (mark && mark.id !== MEHNDI_WRITING_MARK ? DECOY_JA[decoyWords.current++ % DECOY_JA.length] : WRONG_JA[MEHNDI_SPOTS[spot]]);
    const textJa = misses === null ? word() : misses === tuning.hintAfter - 1 ? AGAIN_JA : `${misses === 1 ? "ふふ、" : ""}${word()}`;
    setSaid({ x: where.x, y: where.y, textJa, at, about });
  };
  // A place pointed at (by hand or by おまかせ): the lamp goes to it (to the thing pointed at, if it was one); the writing
  // found rings; a wrong place, her word or her hint, and her teasing face.
  const searches = view.searched.length;
  useEffect(() => {
    if (!searches) return;
    const last = view.searched[searches - 1];
    const mark = lastPointed.current?.spot === last ? lastPointed.current.mark : null;
    lastPointed.current = null;
    const to = mark ?? MEHNDI_PLACES[MEHNDI_SPOTS[last]];
    place(to.x / W, to.y / H, true);
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
      say(last, mark, searches);
    }
  }, [searches]); // each place pointed at once

  /**
   * Points at a thing or a place: the look's search of its place, or, for a wrong place pointed at again (the look counts
   * it once), her word again (never a dead press). A wrong thing or place is remembered for its dashed ring. The second
   * tap of a double tap (the same thing again while her word about it still shows) changes nothing: her word, or her
   * hint, stays to be read.
   */
  const pointAt = (hit: MehndiPointed) => {
    if (hit.spot !== target) {
      const markId = hit.mark?.id ?? null;
      setPointedAt((current) => (current.some((item) => item.spot === hit.spot && item.markId === markId) ? current : [...current, { spot: hit.spot, markId }]));
      if (view.searched.includes(hit.spot)) {
        if (said?.about !== pointedKey(hit)) say(hit.spot, hit.mark, null);
        return;
      }
    }
    lastPointed.current = hit;
    search(hit.spot);
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
    // The lamp held still over a thing or a place (its aim ring showing), then the finger lifted: what is lit is what is pointed at.
    const aimed = down.shown && now - down.restAt >= AIM_MS ? lit() : null;
    if (aimed) {
      pointAt(aimed);
      return;
    }
    if (!down.moved && now - down.at < AIM_MS) {
      // A tap (lifted before any aim): the lamp to it, and what is there pointed at (what is lit then is what was pointed
      // at): a thing under the finger, a place within a finger's reach, or a thing a finger's width away.
      const point = fieldPoint(event, palm.current);
      place(point.x, point.y, true);
      const width = palm.current.getBoundingClientRect().width;
      const unit = width ? W / width : 0;
      const hit = mehndiPointAt(marks, point.x * W, point.y * H, Math.max(MEHNDI_HIT, FINGER_HIT_PX * unit), Math.max(MEHNDI_MARK_PAD, MARK_TAP_PX * unit));
      if (hit) pointAt(hit);
    }
    // Else a look (a drag, or a still finger whose lamp lit nothing to point at): nothing is pointed at.
  };
  const onFocus = (event: FocusEvent<HTMLButtonElement>, spot: MehndiSpot) => {
    // Tab brings the lamp (a focus the host gives at the start, after a finger, does not move it).
    if (event.currentTarget.matches(":focus-visible")) place(MEHNDI_PLACES[spot].x / W, MEHNDI_PLACES[spot].y / H, true);
  };

  const drawn = (shown: boolean): ReactNode => art.palm
    ? <img className="mg-mehndi-hidden-name-picture" src={art.palm} alt="" draggable={false} />
    : (
      <svg viewBox={`0 0 ${W} ${H}`} className="mg-mehndi-hidden-name-picture" aria-hidden="true" focusable="false">
        <Hand />
        <BroadLines target={params.target} lit={shown} lettering={params.text === "player" && !!latin} />
        {shown && <FineLines />}
      </svg>
    );
  // The writing ringed once found; the wrong things and places pointed at, each with a dashed ring (a decoration's round
  // the decoration); her hint's ring for a moment.
  const shownWriting = ending?.kind === "found";
  const wrongs = mehndiWrongRings(params.target, view.searched, pointedAt, marks);
  const ring = mehndiWritingRing(params.target);
  const aimRing = aim?.mark ? mehndiMarkRing(aim.mark) : null;
  // The pool never smaller than a fingertip on a small phone.
  const pool = { "--mehndi-lamp-r": `max(${tuning.lampPct}cqw, 18px)`, "--mehndi-glint-every": `${Math.max(400, tuning.glintEveryMs)}ms` } as CSSProperties;
  return (
    <div className="mg-mehndi-hidden-name" data-ending={ending?.kind} data-art-palm={art.palm ? true : undefined}>
      <div className="mg-mehndi-hidden-name-palm" ref={palm} style={pool} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { press.current = null; setAim(null); }}>
        <div className="mg-mehndi-hidden-name-dark" aria-hidden="true">{drawn(false)}</div>
        <div className="mg-mehndi-hidden-name-lit" aria-hidden="true">
          {drawn(true)}
          {/* The decorations and the writing are the game's, over the use's palm picture too. */}
          <svg viewBox={`0 0 ${W} ${H}`} className="mg-mehndi-hidden-name-picture" focusable="false">
            <Decoys decoys={mehndiDecoysFor(params.target)} size={mehndiDecoySize(params, latin)} />
            <Writing params={params} latin={latin} />
          </svg>
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
        {wrongs.map((wrong) => (
          <span key={wrong.key} className="mg-mehndi-hidden-name-mark-ring" data-wrong
            style={wrong.diameter === null ? share(wrong) : { ...share(wrong), width: across(wrong.diameter) }} aria-hidden="true" />
        ))}
        {/* What a resting lamp aims at: lifting the finger points there (what is lit is what is chosen). */}
        {aim !== null && (
          <span key={`aim-${pointedKey(aim)}`} className="mg-mehndi-hidden-name-aim"
            style={aimRing ? { ...share(aimRing), width: across(aimRing.diameter) } : share(MEHNDI_PLACES[MEHNDI_SPOTS[aim.spot]])}
            data-testid="mehndi-aim" aria-hidden="true"><span>{AIM_JA}</span></span>
        )}
        {shownWriting && <span ref={writingRing} className="mg-mehndi-hidden-name-mark-ring" data-writing aria-hidden="true"
          style={{ ...share(ring), width: across(ring.diameter) }} />}
        {said?.hint && <span key={`hint-${said.at}`} className="mg-mehndi-hidden-name-hint-ring" style={share(MEHNDI_PLACES[params.target])} aria-hidden="true" />}
        {said && (
          <span key={said.at} className="mg-mehndi-hidden-name-said" data-below={said.y < H * 0.4 || undefined}
            data-hint={said.hint || undefined} style={{ "--mehndi-said-x": `${((said.x / W) * 100).toFixed(2)}cqw`, top: `${(said.y / H) * 100}%` } as CSSProperties}
            role="status">{said.textJa}</span>
        )}
        {MEHNDI_SPOTS.map((spot, index) => (
          <button key={spot} type="button" className="mg-mehndi-hidden-name-spot" data-testid={`minigame-spot-${index}`}
            aria-disabled={!live || undefined} aria-label={MEHNDI_PLACES[spot].labelJa} style={share(MEHNDI_PLACES[spot])}
            onFocus={(event) => onFocus(event, spot)} onClick={() => {
              // Keys point at the place itself (a wrong place pointed at again: her word again, never a dead press).
              if (live) pointAt({ spot: index, mark: null });
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
