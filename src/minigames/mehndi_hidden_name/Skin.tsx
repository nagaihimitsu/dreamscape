import { useEffect, useRef, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import type { SearchFieldProps, SearchSkin } from "../engines/search/EnginePlay";
import { fieldPoint } from "../host/seed";
import { MEHNDI_SPOTS, mehndiGame, mehndiRules, type MehndiOutcome, type MehndiParams, type MehndiSpot, type MehndiTarget } from "./rules";
import "./skin.css";

// The hidden name's field (a search skin): her right palm held out in the night, the mehndi's broad lines dim; where the
// lamp is held, the fine lines come out, and at one place, writing that pretends to be pattern. Drag to move the lamp
// (it rides a little above a finger, so the finger does not hide what it lights), tap to point. The six places are
// buttons for Tab and the screen reader; a pointer hits them by where it lands. With the use's art (`art.palm`,
// `art.lamp`), those pictures in place of the drawn hand and lamp; the writing is drawn by the game either way.

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
/** Where the writing lies at each target: its centre, its slant and the room it has. */
const WRITING: Record<MehndiTarget, { x: number; y: number; rotate: number; width: number }> = {
  thumb: { x: 210, y: 320, rotate: -22, width: 62 },
  peacock: { x: 150, y: 246, rotate: -8, width: 58 },
  vine: { x: 138, y: 320, rotate: -14, width: 62 },
};
/** A drag starts after this much movement (px); a shorter touch is a tap. */
const DRAG_PX = 10;
/** A finger's lamp rides this far above it (px). */
const FINGER_LIFT_PX = 52;
const SOUNDS = { found: "clue_new" } as const;

/** The place a point (in the hand's units) points at: the nearest within `reach`, if any. */
export function mehndiSpotAt(x: number, y: number, reach = MEHNDI_HIT): number | null {
  const distances = MEHNDI_SPOTS.map((spot) => Math.hypot(MEHNDI_PLACES[spot].x - x, MEHNDI_PLACES[spot].y - y));
  const nearest = distances.indexOf(Math.min(...distances));
  return distances[nearest] <= reach ? nearest : null;
}

/** The writing's size: the name as typed, smaller for a long one, never cut (docs/13 2.10). */
export function writingSize(text: string, width: number): { fontSize: number; squeeze: boolean } {
  const em = [...text].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.62), 0) || 1;
  const fontSize = Math.min(11, width / em);
  return fontSize >= 4.5 ? { fontSize, squeeze: false } : { fontSize: 4.5, squeeze: true };
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
function BroadLines({ target }: { target: MehndiTarget }) {
  return (
    <g className="mg-mehndi-hidden-name-ink">
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
      <path d="M150 240 C162 262 128 282 140 304 C150 324 124 346 138 374" />
      <path d={SPIRAL} />
      {/* The central vine "unusually intricate" where the writing hides in it (the story says so). */}
      {target === "vine" && <path d="M126 312 c8 -6 16 2 10 8 c-6 6 -14 -2 -8 -8 M140 326 c6 -4 12 2 6 6" />}
      <path d="M96 210 Q110 202 124 210 Q138 202 152 210 Q166 202 180 210 Q194 202 208 210 Q222 202 234 210" />
      <path d="M98 384 L202 384 M96 400 L204 400" />
    </g>
  );
}

/** The fine lines the lamp brings out: dots, inner petals, the feather's barbs, leaves on the vine. */
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

function MehndiField({ params, setup, view, live, search, active, names, art, sound, vibrate }: SearchFieldProps<MehndiParams, MehndiOutcome>) {
  const palm = useRef<HTMLDivElement>(null);
  // The lamp starts over the fingers, away from every place the writing may hide.
  const lamp = useRef({ x: 150 / W, y: 60 / H });
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  const target = setup.targets[0];
  const ending = view.ending;

  const place = (x: number, y: number, glide: boolean) => {
    lamp.current = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    const box = palm.current;
    if (!box) return;
    box.style.setProperty("--lamp-x", `${lamp.current.x * 100}%`);
    box.style.setProperty("--lamp-y", `${lamp.current.y * 100}%`);
    box.toggleAttribute("data-glide", glide);
  };
  useEffect(() => { place(lamp.current.x, lamp.current.y, false); }, []);
  // A place pointed at (by hand or by おまかせ): the lamp goes to it; the writing found rings.
  const pointed = view.searched.length;
  useEffect(() => {
    if (!pointed) return;
    const spot = MEHNDI_PLACES[MEHNDI_SPOTS[view.searched[pointed - 1]]];
    place(spot.x / W, spot.y / H, true);
    if (view.searched[pointed - 1] === target) {
      play.current.sound(SOUNDS.found);
      play.current.vibrate("clue");
    }
  }, [pointed]); // each place pointed at once

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !live || !palm.current) return;
    palm.current.setPointerCapture?.(event.pointerId);
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    const lift = event.pointerType === "touch" ? FINGER_LIFT_PX / palm.current.getBoundingClientRect().height : 0;
    const point = fieldPoint(event, palm.current);
    place(point.x, point.y - lift, false);
    active();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const down = press.current;
    if (!down || down.id !== event.pointerId || !palm.current) return;
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_PX) down.moved = true;
    const lift = event.pointerType === "touch" ? FINGER_LIFT_PX / palm.current.getBoundingClientRect().height : 0;
    const point = fieldPoint(event, palm.current);
    place(point.x, point.y - lift, false);
    active();
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const down = press.current;
    press.current = null;
    if (!down || down.id !== event.pointerId || !palm.current || down.moved || !live) return;
    // A tap: the lamp to it, and a place there pointed at.
    const point = fieldPoint(event, palm.current);
    place(point.x, point.y, true);
    const width = palm.current.getBoundingClientRect().width;
    const spot = mehndiSpotAt(point.x * W, point.y * H, Math.max(MEHNDI_HIT, width ? (FINGER_HIT_PX * W) / width : 0));
    if (spot !== null) search(spot);
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
        <BroadLines target={params.target} />
        {lit && <FineLines target={params.target} />}
      </svg>
    );
  const marked = ending && (ending.kind === "found" || ending.kind === "wrong") ? MEHNDI_PLACES[MEHNDI_SPOTS[ending.spot]] : null;
  return (
    <div className="mg-mehndi-hidden-name" data-ending={ending?.kind} data-art-palm={art.palm ? true : undefined}>
      <div className="mg-mehndi-hidden-name-palm" ref={palm} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { press.current = null; }}>
        <div className="mg-mehndi-hidden-name-dark" aria-hidden="true">{drawn(false)}</div>
        <div className="mg-mehndi-hidden-name-lit" aria-hidden="true">
          {drawn(true)}
          <svg viewBox={`0 0 ${W} ${H}`} className="mg-mehndi-hidden-name-picture" focusable="false"><Writing params={params} name={names.player} /></svg>
        </div>
        <span className="mg-mehndi-hidden-name-glow" aria-hidden="true" />
        <span className="mg-mehndi-hidden-name-lamp" aria-hidden="true">
          {art.lamp ? <img src={art.lamp} alt="" draggable={false} /> : (
            <svg viewBox="0 0 24 32" focusable="false">
              <path d="M8 4 h8 M12 0 v4" className="mg-mehndi-hidden-name-brass-line" />
              <path d="M6 6 h12 l-1 4 h-10 z M7 26 h10 l2 4 h-14 z" className="mg-mehndi-hidden-name-brass" />
              <rect x="7" y="10" width="10" height="16" rx="3" className="mg-mehndi-hidden-name-glass" />
              <ellipse cx="12" cy="19" rx="2.2" ry="3.6" className="mg-mehndi-hidden-name-flame" />
            </svg>
          )}
        </span>
        {marked && <span className="mg-mehndi-hidden-name-mark-ring" style={{ left: `${(marked.x / W) * 100}%`, top: `${(marked.y / H) * 100}%` }} aria-hidden="true" />}
        {MEHNDI_SPOTS.map((spot, index) => (
          <button key={spot} type="button" className="mg-mehndi-hidden-name-spot" data-testid={`minigame-spot-${index}`}
            data-minigame-primary={index === 0 || undefined} aria-disabled={!live || undefined} aria-label={MEHNDI_PLACES[spot].labelJa}
            style={{ left: `${(MEHNDI_PLACES[spot].x / W) * 100}%`, top: `${(MEHNDI_PLACES[spot].y / H) * 100}%` }}
            onFocus={(event) => onFocus(event, spot)} onClick={() => { if (live) search(index); }} />
        ))}
      </div>
    </div>
  );
}

/** The hidden name as a search skin: its game, rules, words and field. */
export const mehndiSkin: SearchSkin<MehndiParams, MehndiOutcome> = {
  game: mehndiGame,
  rules: mehndiRules,
  hintJa: "なぞると灯りが動く。文字を見つけたら、そこを押す",
  buttons: [{ id: "later", labelJa: "明日にする", hintJa: "今夜は探すのをやめて、明日にします。", tone: "secondary" }],
  autoJa: "おまかせで探しています",
  // The writing lit and ringed, the wrong place ringed, or the lamp going out, before the outcome shows.
  endDelayMs: (ending, still) => (still ? 700 : ending.kind === "found" ? 1500 : 1100),
  statusJa: (_, leftMs) => (leftMs === null ? "" : `のこり${Math.ceil(leftMs / 1000)}秒`),
  Field: MehndiField,
};
