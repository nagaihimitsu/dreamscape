import { useId, useMemo, type CSSProperties } from "react";
import { seededRandom } from "../host/seed";
import { shapePath, type ShapeDragFieldProps, type ShapeDragSkin, type ShapeDragView } from "../engines/shape_drag/EnginePlay";
import type { ShapePoint } from "../engines/shape_drag/engine";
import {
  ROTI_BIG_SPAN, ROTI_ROUND, ROTI_SHAPES, ROTI_TUNING, rotiDetail, rotiNote, rotiRoundness, rotiRules, type RotiOutcome, type RotiParams,
} from "./rules";
import "./skin.css";

// The roti's field (a shape_drag skin): the work table seen from above, a round wooden board, the dough on it and the pin.
// Over the dough, an arrow shows the way of the next stroke (an eighth round further each time, from the seed: looks only,
// the rules never read it), and a dotted ring how big a good roti is. Left alone, a faint finger rolls along the arrow.
// A stroke presses the dough (it squashes as the pin lifts, and flour puffs from the pin's ends); near a tear its edge
// turns to a dark dotted line. With the use's art (`art.kitchen`, `art.board`, `art.pin`, `art.dough`) those pictures take
// the place of the drawn ones. The board's square is 1 across (offsets -0.5 to 0.5 from its centre); the round board fills it.

type FieldProps = ShapeDragFieldProps<RotiParams, RotiOutcome>;

/** The pin: as long as its strip is wide (what one stroke rolls), and its handles. */
const PIN_LENGTH = ROTI_TUNING.band * 2;
const PIN_THICKNESS = 0.06;
/** Where the pin rests between strokes: the board's corner, smaller, under the dough. */
const PIN_REST = { x: 0.3, y: 0.39, degrees: -32, scale: 0.55 };
/** How thin the dough looks: from the start to a tear (the area's ratio). */
const TEAR_AREA = ROTI_SHAPES.classes.find((item) => item.outcome === "torn" && item.atLeast?.area !== undefined)?.atLeast?.area ?? 10;
/** The arrow for the next stroke: this long, through the centre. */
const ARROW_LENGTH = 0.42;

/** Each stroke's way (degrees on the screen: 0 right, 90 down): the first from the seed, then an eighth round further. */
export function rotiArrowDegrees(seed: number, strokes: number): number {
  const first = Math.floor(seededRandom(seed)() * 8) * 45;
  return (first + strokes * 45) % 360;
}

/** How the dough's outline is softened for the drawing: rays round its middle, and how far each radius is averaged. */
const OUTLINE = { rays: 96, reach: 3, passes: 3 } as const;

/**
 * The dough's outline as drawn: its radius round the middle, each averaged with its neighbours (a few degrees either side),
 * so a rolled roti's short flat sides (a pin rolls straight) read as the soft edge of dough, while a box keeps its
 * corners. The drawing only, never the rules (which measure the rolled shape itself). The shape is convex and centred.
 */
export function softOutline(points: readonly ShapePoint[]): ShapePoint[] {
  if (points.length < 3) return [...points];
  const cross = (a: ShapePoint, b: ShapePoint) => a.x * b.y - a.y * b.x;
  let radii = Array.from({ length: OUTLINE.rays }, (_, ray) => {
    const angle = (ray / OUTLINE.rays) * Math.PI * 2;
    const way = { x: Math.cos(angle), y: Math.sin(angle) };
    let far = 0;
    points.forEach((a, index) => {
      const b = points[(index + 1) % points.length];
      const side = { x: b.x - a.x, y: b.y - a.y };
      const denominator = cross(way, side);
      if (Math.abs(denominator) < 1e-12) return;
      const along = cross(a, side) / denominator;
      const at = cross(a, way) / denominator;
      if (along > 0 && at >= -1e-9 && at <= 1 + 1e-9) far = Math.max(far, along);
    });
    return far;
  });
  for (let pass = 0; pass < OUTLINE.passes; pass++) {
    radii = radii.map((_, ray) => {
      let sum = 0;
      for (let step = -OUTLINE.reach; step <= OUTLINE.reach; step++) sum += radii[(ray + step + OUTLINE.rays) % OUTLINE.rays];
      return sum / (OUTLINE.reach * 2 + 1);
    });
  }
  return radii.map((radius, ray) => {
    const angle = (ray / OUTLINE.rays) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

/** The tear: a ragged hole in the dough's middle (the story's 「生地の真ん中に、ぽっかり穴」), as large as the dough allows. */
function holePath(points: readonly ShapePoint[]): string {
  const nearest = Math.min(...points.map((point) => Math.hypot(point.x, point.y)));
  const size = Math.min(0.1, nearest * 0.45);
  // A fixed ragged outline (the same every time), scaled to the hole's size.
  const outline = [[-1, -0.1], [-0.7, -0.75], [0.1, -0.85], [0.8, -0.55], [1, 0.15], [0.55, 0.8], [-0.15, 0.7], [-0.75, 0.55]];
  return shapePath(outline.map(([x, y]) => ({ x: x * size, y: y * size * 0.8 })));
}

/** How far (degrees) a stroke may stray from its arrow, either way along it, and still be the arrow's way (Harbans's 「そうだ」). */
const ARROW_FOLLOWED_DEG = 25;

/** Whether the last stroke went the way its arrow showed (either way along it: the pin rolls both ways). */
export function rotiFollowedArrow(seed: number, view: Pick<ShapeDragView, "lastStroke" | "strokes">): boolean {
  const stroke = view.lastStroke;
  if (!stroke || view.strokes === 0) return false;
  const way = (Math.atan2(stroke.to.y - stroke.from.y, stroke.to.x - stroke.from.x) * 180) / Math.PI;
  const apart = (((way - rotiArrowDegrees(seed, view.strokes - 1)) % 180) + 180) % 180;
  return Math.min(apart, 180 - apart) <= ARROW_FOLLOWED_DEG;
}

/** Harbans's word for the moment (shown, never in the story): the dough near a tear, or a stroke that went the arrow's way. */
function harbansWord(seed: number, view: ShapeDragView): string | null {
  if (view.outcome !== null || view.pin) return null;
  if (rotiNote(view.measures)) return "おっと";
  return rotiFollowedArrow(seed, view) ? "そうだ" : null;
}

function RotiBackdrop({ art, cast, seed, view }: FieldProps) {
  const word = harbansWord(seed, view);
  return (
    <div className="mg-roti-rolling-table" data-art-kitchen={art.kitchen ? true : undefined}>
      {art.kitchen && <img className="mg-roti-rolling-kitchen" src={art.kitchen} alt="" draggable={false} />}
      {/* Harbans (the scene's speaker), looking on from the table's far corner; a word now and then. */}
      {cast.person && (
        <span className="mg-roti-rolling-harbans">
          <span className="mg-roti-rolling-harbans-figure">{cast.person}</span>
          {word && <span className="mg-roti-rolling-harbans-word" key={`${view.strokes}-${word}`}>{word}</span>}
        </span>
      )}
    </div>
  );
}

/** The pin, drawn or the use's picture, lying along x (its middle at 0, 0). */
function Pin({ art }: { art: Readonly<Record<string, string>> }) {
  if (art.pin) return <image href={art.pin} x={-PIN_LENGTH / 2 - 0.06} y={-PIN_THICKNESS} width={PIN_LENGTH + 0.12} height={PIN_THICKNESS * 2} preserveAspectRatio="xMidYMid meet" />;
  return (
    <g className="mg-roti-rolling-pin-drawn">
      <rect x={-PIN_LENGTH / 2 - 0.06} y={-PIN_THICKNESS / 3} width={PIN_LENGTH + 0.12} height={(PIN_THICKNESS * 2) / 3} rx={PIN_THICKNESS / 3} className="mg-roti-rolling-pin-handle" />
      <rect x={-PIN_LENGTH / 2} y={-PIN_THICKNESS / 2} width={PIN_LENGTH} height={PIN_THICKNESS} rx={PIN_THICKNESS / 2} className="mg-roti-rolling-pin-body" />
    </g>
  );
}

/** Flour puffing from the pin's two ends as it lifts (where the last stroke ended). */
function Flour({ stroke }: { stroke: NonNullable<ShapeDragView["lastStroke"]> }) {
  const dx = stroke.to.x - stroke.from.x;
  const dy = stroke.to.y - stroke.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const across = { x: -dy / length, y: dx / length };
  const ends = [1, -1].map((side) => ({ x: stroke.to.x - 0.5 + across.x * side * (PIN_LENGTH / 2), y: stroke.to.y - 0.5 + across.y * side * (PIN_LENGTH / 2), side }));
  return (
    <g className="mg-roti-rolling-flour-puff" aria-hidden="true">
      {ends.flatMap((end) => [0, 1, 2, 3].map((index) => {
        const spread = (index - 1.5) * 0.5;
        const out = { x: (across.x * end.side + (dx / length) * spread * 0.6) * 0.05, y: (across.y * end.side + (dy / length) * spread * 0.6) * 0.05 };
        return <circle key={`${end.side}-${index}`} cx={end.x} cy={end.y} r={0.012 + (index % 2) * 0.006}
          style={{ "--puff-x": `${out.x}px`, "--puff-y": `${out.y}px` } as CSSProperties} />;
      }))}
    </g>
  );
}

function RotiBoard({ art, seed, still, view }: FieldProps) {
  const ids = useId().replace(/:/gu, "");
  // Flour on the board: where the specks lie is looks only (from the seed), never the rules.
  const flour = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: 26 }, () => {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 0.44;
      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: 0.004 + random() * 0.008 };
    });
  }, [seed]);
  const path = useMemo(() => shapePath(softOutline(view.points)), [view.points]);
  // Thinner dough is paler and lets the board show a little (the hint also says so: not by colour alone).
  const thin = Math.min(1, Math.max(0, (view.measures.area - 1) / (TEAR_AREA - 1)));
  const torn = view.outcome === "torn";
  const warn = view.outcome === null && rotiNote(view.measures) !== null;
  const playing = view.outcome === null && !view.pin && (ROTI_TUNING.maxStrokes === null || view.strokes < ROTI_TUNING.maxStrokes);
  const arrow = rotiArrowDegrees(seed, view.strokes);
  const big = view.measures.span >= ROTI_BIG_SPAN;
  return (
    <svg className="mg-roti-rolling" viewBox="-0.5 -0.5 1 1" data-art-board={art.board ? true : undefined} data-torn={torn || undefined} data-warn={warn || undefined}>
      <defs>
        <radialGradient id={`${ids}-wood`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#c8955f" />
          <stop offset="0.75" stopColor="#a8723f" />
          <stop offset="1" stopColor="#8a5a31" />
        </radialGradient>
        <radialGradient id={`${ids}-dough`} cx="0.4" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#f6e9cb" />
          <stop offset="0.7" stopColor="#ecd6a8" />
          <stop offset="1" stopColor="#dcbd86" />
        </radialGradient>
        {art.dough && (
          <pattern id={`${ids}-texture`} patternUnits="userSpaceOnUse" x="-0.5" y="-0.5" width="0.5" height="0.5">
            <image href={art.dough} x="0" y="0" width="0.5" height="0.5" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
      </defs>
      {art.board
        ? <image href={art.board} x="-0.5" y="-0.5" width="1" height="1" preserveAspectRatio="xMidYMid meet" />
        : (
          <g className="mg-roti-rolling-board">
            <circle r="0.49" fill={`url(#${ids}-wood)`} className="mg-roti-rolling-board-face" />
            <circle r="0.455" className="mg-roti-rolling-board-ring" />
          </g>
        )}
      {flour.map((speck, index) => <circle key={`speck-${index}`} cx={speck.x} cy={speck.y} r={speck.r} className="mg-roti-rolling-flour" />)}
      {/* How big a good roti is: reached, it turns gold. */}
      <circle r={ROTI_BIG_SPAN / 2} className="mg-roti-rolling-target" data-reached={big || undefined} />
      <g transform={`translate(${PIN_REST.x} ${PIN_REST.y}) rotate(${PIN_REST.degrees}) scale(${PIN_REST.scale})`} opacity={view.pin ? 0 : 1}>
        <Pin art={art} />
      </g>
      <g className="mg-roti-rolling-press" key={`press-${view.strokes}`} data-pressed={view.strokes > 0 || undefined}>
        <path d={path} className="mg-roti-rolling-dough-shadow" transform="translate(0.006 0.01)" />
        <path d={path} fill={art.dough ? `url(#${ids}-texture)` : `url(#${ids}-dough)`} fillOpacity={1 - thin * 0.22} className="mg-roti-rolling-dough" data-testid="roti-dough" />
      </g>
      {torn && <path d={holePath(view.points)} className="mg-roti-rolling-hole" />}
      {!still && view.lastStroke && view.strokes > 0 && <Flour key={`flour-${view.strokes}`} stroke={view.lastStroke} />}
      {/* The next stroke's way, and (left alone) a finger rolling along it. */}
      {playing && (
        <g className="mg-roti-rolling-arrow" transform={`rotate(${arrow})`} data-testid="roti-arrow" data-degrees={arrow}>
          <line x1={-ARROW_LENGTH / 2} y1="0" x2={ARROW_LENGTH / 2 - 0.05} y2="0" />
          <path d={`M ${ARROW_LENGTH / 2} 0 L ${ARROW_LENGTH / 2 - 0.07} -0.045 L ${ARROW_LENGTH / 2 - 0.07} 0.045 Z`} />
          {view.idle && <circle className="mg-roti-rolling-finger" r="0.045" cx={-ARROW_LENGTH / 2} cy="0" style={{ "--finger-travel": `${ARROW_LENGTH}px` } as CSSProperties} />}
        </g>
      )}
      {view.pin && (
        <g transform={`translate(${view.pin.x} ${view.pin.y}) rotate(${view.pin.degrees + 90})`} className="mg-roti-rolling-pin">
          <Pin art={art} />
        </g>
      )}
    </svg>
  );
}

/** The roti as a shape_drag skin: its tuning, shapes, rules, words and drawings. */
export const rotiSkin: ShapeDragSkin<RotiParams, RotiOutcome> = {
  tuning: ROTI_TUNING,
  classifier: ROTI_SHAPES,
  rules: rotiRules,
  hintJa: "矢印の向きになぞって伸ばす",
  doneJa: "できた",
  doneHintJa: "ローティーを伸ばし終えるときに押します。8回伸ばすと、ひとりでに終わります。",
  autoJa: "おまかせで伸ばしています",
  noteJa: rotiNote,
  notReadyJa: "まず生地をなぞって伸ばそう",
  meter: (view) => {
    const { percent, boxy } = rotiRoundness(view.measures);
    const rolled = view.strokes > 0 || view.pin !== null;
    // A box, or a ball barely rolled, is not a round roti however round it measures: the bar does not light, the words say why.
    const small = view.measures.area < ROTI_ROUND.area;
    const why = boxy ? "（四角い）" : small && view.measures.roundness >= ROTI_ROUND.roundness ? "（まだ小さい）" : "";
    return {
      labelJa: "丸さ", value: rolled ? view.measures.roundness : null, mark: ROTI_ROUND.roundness,
      over: rolled && view.measures.roundness >= ROTI_ROUND.roundness && !boxy && !small, textJa: rolled ? `${percent}%${why}` : "—",
    };
  },
  detailJa: rotiDetail,
  strokeSound: "cloth_grab",
  Backdrop: RotiBackdrop,
  Board: RotiBoard,
};
