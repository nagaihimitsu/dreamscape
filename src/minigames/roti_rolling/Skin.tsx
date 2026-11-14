import { useEffect, useId, useMemo, useRef, type CSSProperties } from "react";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import { shapePath, type ShapeDragFieldProps, type ShapeDragSkin, type ShapeDragView } from "../engines/shape_drag/EnginePlay";
import type { ShapePoint } from "../engines/shape_drag/engine";
import { ROTI_GAME, type RotiGame, type RotiOutcome, type RotiParams } from "./rules";
import "./skin.css";

// The roti's field (a shape_drag skin): the work table seen from above, a round wooden board, the dough on it and the pin.
// Over the dough, an arrow shows the way of the next stroke (an eighth round further each time, from the seed: looks only,
// the rules never read it), and a dotted ring how big a good roti is. Left alone, a faint finger rolls along the arrow.
// A stroke presses the dough (a moment's stop, flour where the pin lifts, the dough squashed); near a tear its edge turns
// to a dark dotted line. Harbans looks on from the far corner. With the use's art (`art.kitchen`, `art.board`, `art.pin`,
// `art.dough`) those pictures take the place of the drawn ones. The board's square is 1 across (offsets -0.5 to 0.5 from
// its centre); the round board fills it.

type FieldProps = ShapeDragFieldProps<RotiParams, RotiOutcome>;

const PIN_THICKNESS = 0.06;
/** Where the pin rests between strokes: the board's corner, smaller, under the dough. */
const PIN_REST = { x: 0.3, y: 0.39, degrees: -32, scale: 0.55 };
/** The arrow for the next stroke: this long, through the centre. */
const ARROW_LENGTH = 0.42;
/** A stroke's press: a short stop (no rhythm to keep here). */
const PRESS_STOP_MS = 50;

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

/** The roti's skin built from its game (the story's, or Debug's room's edited numbers: play.ts retune). */
export function rotiSkinFor(game: RotiGame): ShapeDragSkin<RotiParams, RotiOutcome> {
  const { tuning, numbers } = game;
  /** The pin: as long as its strip is wide (what one stroke rolls), and its handles. */
  const pinLength = tuning.band * 2;

  /** Harbans's word for the moment (shown, never in the story): the dough near a tear, or a stroke that went the arrow's way. */
  const harbansWord = (seed: number, view: ShapeDragView): string | null => {
    if (view.outcome !== null || view.pin) return null;
    if (game.note(view.measures)) return "おっと";
    return rotiFollowedArrow(seed, view) ? "そうだ" : null;
  };

  function RotiBackdrop({ art, cast, seed, view }: FieldProps) {
    const word = harbansWord(seed, view);
    return (
      <div className="mg-roti-rolling-table" data-art-kitchen={art.kitchen ? true : undefined}>
        {art.kitchen && <img className="mg-roti-rolling-kitchen mg-photo" src={art.kitchen} alt="" draggable={false} />}
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
    if (art.pin) return <image href={art.pin} x={-pinLength / 2 - 0.06} y={-PIN_THICKNESS} width={pinLength + 0.12} height={PIN_THICKNESS * 2} preserveAspectRatio="xMidYMid meet" />;
    return (
      <g className="mg-roti-rolling-pin-drawn">
        <rect x={-pinLength / 2 - 0.06} y={-PIN_THICKNESS / 3} width={pinLength + 0.12} height={(PIN_THICKNESS * 2) / 3} rx={PIN_THICKNESS / 3} className="mg-roti-rolling-pin-handle" />
        <rect x={-pinLength / 2} y={-PIN_THICKNESS / 2} width={pinLength} height={PIN_THICKNESS} rx={PIN_THICKNESS / 2} className="mg-roti-rolling-pin-body" />
      </g>
    );
  }

  function RotiBoard({ art, seed, view }: FieldProps) {
    const ids = useId().replace(/:/gu, "");
    const kit = useMiniGameKit();
    const press = useRef<SVGGElement>(null);
    const lift = useRef<SVGCircleElement>(null);
    const hole = useRef<SVGPathElement>(null);
    // Flour on the board: where the specks lie is looks only (from the seed), never the rules.
    const flour = useMemo(() => {
      const random = seededRandom(seed);
      return Array.from({ length: 26 }, () => {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * 0.44;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: 0.004 + random() * 0.008 };
      });
    }, [seed]);
    const live = useRef(kit);
    live.current = kit;
    // A stroke's press: a moment's stop, flour where the pin lifted, the dough squashed.
    const pressed = useRef(0);
    useEffect(() => {
      if (view.strokes <= pressed.current) return;
      pressed.current = view.strokes;
      const { juice } = live.current;
      juice.hitStop(PRESS_STOP_MS);
      juice.burst(lift.current, "dust", 0.7);
      juice.squash(press.current, "press");
    }, [view.strokes]);
    // The end in the field: a round one sparkles; a hole puffs and shakes the board.
    useEffect(() => {
      const { juice } = live.current;
      if (view.outcome === "round") juice.burst(press.current, "star", 1.2);
      if (view.outcome === "torn") {
        juice.burst(hole.current, "dust", 1);
        juice.shake("s");
      }
    }, [view.outcome]);
    const path = useMemo(() => shapePath(softOutline(view.points)), [view.points]);
    // Thinner dough is paler and lets the board show a little (the hint also says so: not by colour alone).
    const thin = Math.min(1, Math.max(0, (view.measures.area - 1) / (numbers.tearArea - 1)));
    const torn = view.outcome === "torn";
    const warn = view.outcome === null && game.note(view.measures) !== null;
    const playing = view.outcome === null && !view.pin && (tuning.maxStrokes === null || view.strokes < tuning.maxStrokes);
    const arrow = rotiArrowDegrees(seed, view.strokes);
    const big = view.measures.span >= numbers.bigSpan;
    const lifted = view.lastStroke ? { x: view.lastStroke.to.x - 0.5, y: view.lastStroke.to.y - 0.5 } : { x: 0, y: 0 };
    return (
      <svg className="mg-roti-rolling mg-play-object" viewBox="-0.5 -0.5 1 1" data-art-board={art.board ? true : undefined} data-torn={torn || undefined} data-warn={warn || undefined}>
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
        <circle r={numbers.bigSpan / 2} className="mg-roti-rolling-target" data-reached={big || undefined} />
        <g transform={`translate(${PIN_REST.x} ${PIN_REST.y}) rotate(${PIN_REST.degrees}) scale(${PIN_REST.scale})`} opacity={view.pin ? 0 : 1}>
          <Pin art={art} />
        </g>
        <g className="mg-roti-rolling-press" ref={press}>
          <path d={path} className="mg-roti-rolling-dough-shadow" transform="translate(0.006 0.01)" />
          <path d={path} fill={art.dough ? `url(#${ids}-texture)` : `url(#${ids}-dough)`} fillOpacity={1 - thin * 0.22} className="mg-roti-rolling-dough" data-testid="roti-dough" />
        </g>
        {torn && <path ref={hole} d={holePath(view.points)} className="mg-roti-rolling-hole" />}
        {/* Where the pin last lifted (the flour's burst comes from here). */}
        <circle ref={lift} cx={lifted.x} cy={lifted.y} r="0.01" className="mg-roti-rolling-lift" />
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

  return {
    tuning,
    classifier: game.shapes,
    rules: game.rules,
    hintJa: "矢印の向きになぞって伸ばす",
    doneJa: "できた",
    doneHintJa: "ローティーを伸ばし終えるときに押します。8回伸ばすと、ひとりでに終わります。",
    autoJa: "おまかせで伸ばしています",
    noteJa: game.note,
    notReadyJa: "まず生地をなぞって伸ばそう",
    meter: (view) => {
      const { percent, boxy, small } = game.roundness(view.measures);
      const rolled = view.strokes > 0 || view.pin !== null;
      // A box, or a ball barely rolled, is not a round roti however round it measures: the bar does not light, the words say
      // why; one round and big enough to be まん丸 says so (the card's ★3).
      const roundEnough = view.measures.roundness >= numbers.roundness;
      const why = boxy ? "（四角い）" : small && roundEnough ? "（まだ小さい）" : game.perfect(view.measures) ? "（まん丸）" : "";
      return {
        labelJa: "丸さ", value: rolled ? view.measures.roundness : null, mark: numbers.roundness,
        over: rolled && roundEnough && !boxy && !small, textJa: rolled ? `${percent}%${why}` : "—",
      };
    },
    // The card's score (rules.ts rate) says how round: no line of its own.
    strokeSound: "cloth_grab",
    Backdrop: RotiBackdrop,
    Board: RotiBoard,
  };
}

/** The roti as a shape_drag skin: its tuning, shapes, rules, words and drawings. */
export const rotiSkin = rotiSkinFor(ROTI_GAME);
