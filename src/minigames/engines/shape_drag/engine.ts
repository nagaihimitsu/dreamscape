import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `shape_drag` engine's rules (docs/13 2.2): a soft shape (dough) on a square board; each one-finger stroke rolls it
// out, and after each stroke it turns a little. When the play ends (a stroke limit, the 「done」 button, an ending shape,
// or a time limit if the skin has one), the shape's measures (how big, how round, how boxy, how far across the board)
// give the skin's outcome through the skin's thresholds. Nothing is random: the same strokes give the same shape. Pure
// geometry: no clock, DOM or React (EnginePlay.tsx draws and times; a skin draws the board).
//
// The geometry. The shape is a convex polygon on the board, its centroid at the board's centre. A stroke is a rolling pin
// pushed along the finger's way: the part of the shape inside the pin's strip (`band` on each side of the finger's line)
// is carried forward by the push, and the shape becomes the convex hull of itself and the carried part. A pin over the
// whole shape stretches it the way a pin does (a disc becomes a stadium, with straight sides); a pin along one side pushes
// that side out (a lopsided shape). Then the shape is centred again and turned by `turnDeg`. Area and span (the widest
// width) never shrink, so a class that only asks for enough area or span, once reached, stays (a tear stays a tear).

/** A point on the board: 0 to 1 across and down (as fieldPoint gives); the board's centre is (0.5, 0.5). */
export interface ShapePoint { x: number; y: number }
/** One stroke: where the finger went down and where it lifted. */
export interface ShapeStroke { from: ShapePoint; to: ShapePoint }
/** A play's record: its strokes in order (taps and strokes that miss the shape are kept and change nothing). */
export type ShapeDragRecord = readonly ShapeStroke[];

/** A skin's tuning (in its definition's code, never in a tag: docs/13 2.2). Lengths are in board widths. */
export const shapeDragTuningSchema = z.object({
  /** The shape at the start: a disc of this radius. */
  startRadius: z.number().positive().max(0.4),
  /** The disc's corners (the drawing's smoothness). */
  sides: z.number().int().min(12).max(96),
  /** How far a stroke pushes, per board width of stroke. */
  gain: z.number().positive(),
  /** The longest push of one stroke. */
  maxPush: z.number().positive(),
  /** The pin's strip: this far on each side of the finger's line. */
  band: z.number().positive(),
  /** Shorter is a tap, not a stroke. */
  minStroke: z.number().positive(),
  /** After each stroke the shape turns this much (clockwise on the screen). */
  turnDeg: z.number().min(-180).max(180),
  /** The play's time, from its first stroke (null: no time limit; the strokes, the 「done」 button or an ending class end it). */
  timeMs: z.number().int().positive().nullable(),
  /** The play ends after this many strokes (null: only the time, the 「done」 button or an ending class end it). */
  maxStrokes: z.number().int().positive().nullable(),
  /** The 「done」 button works from this many strokes on. */
  minStrokesToFinish: z.number().int().min(0),
  /** A key's stroke: through the centre, this long. */
  keyStroke: z.number().positive(),
  /**
   * A heavier pin near the end of the shape's way (a tear): once the shape is at least this big (area, span), a stroke
   * pushes with this gain instead, so a careful player can stop in time.
   */
  heavy: z.object({
    gain: z.number().positive(),
    atLeast: z.object({ area: z.number().positive().optional(), span: z.number().positive().optional() }).strict(),
  }).strict().optional(),
}).strict();
export type ShapeDragTuning = z.infer<typeof shapeDragTuningSchema>;

/** The shape's measures: all the same however it lies on the board. */
export interface ShapeMeasures {
  /** Strokes that rolled it. */
  strokes: number;
  /** Its area against the start's (1 at the start). */
  area: number;
  /** Its widest width, in board widths. */
  span: number;
  /** Its narrowest width against its widest (1: as round as a disc; 0.5: twice as long as wide). */
  roundness: number;
  /** Its area against the smallest rectangle around it (about 0.79 for a disc, 1 for a rectangle). */
  boxiness: number;
}
export type ShapeMeasure = keyof ShapeMeasures;
export const SHAPE_MEASURES: readonly ShapeMeasure[] = ["strokes", "area", "span", "roundness", "boxiness"];
/** The measures that never go down as strokes go on (an ending class may ask only for enough of these). */
export const SHAPE_GROWING_MEASURES: readonly ShapeMeasure[] = ["strokes", "area", "span"];

/** One of a skin's shapes: its outcome when every bound holds (atLeast: ≥; below: <). */
export interface ShapeClass<Outcome extends string> {
  outcome: Outcome;
  atLeast?: Partial<Record<ShapeMeasure, number>>;
  below?: Partial<Record<ShapeMeasure, number>>;
  /** The play ends as soon as the shape is in this class (a tear): only `atLeast` of growing measures. */
  ends?: true;
}

/** A skin's shapes: tried in order, the first that holds is the outcome; none: the fallback. */
export interface ShapeClassifier<Outcome extends string> {
  classes: readonly ShapeClass<Outcome>[];
  fallback: Outcome;
}

/** The shape as it is: its corners (centred on the board's centre, as offsets from it) and the strokes that rolled it. */
export interface ShapeState {
  points: readonly ShapePoint[];
  strokes: number;
}

const EPSILON = 1e-9;
const sub = (a: ShapePoint, b: ShapePoint): ShapePoint => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: ShapePoint, b: ShapePoint) => a.x * b.x + a.y * b.y;
const cross = (o: ShapePoint, a: ShapePoint, b: ShapePoint) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** A disc of `radius` with `sides` corners around the centre. */
export function regularPolygon(sides: number, radius: number): ShapePoint[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

/** The convex hull of points (anticlockwise in maths axes; corners on a straight line dropped). */
export function convexHull(points: readonly ShapePoint[]): ShapePoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const half = (list: ShapePoint[]) => {
    const out: ShapePoint[] = [];
    for (const point of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], point) <= EPSILON) out.pop();
      out.push(point);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** The part of a convex polygon where normal·point ≤ limit. */
function clip(points: readonly ShapePoint[], normal: ShapePoint, limit: number): ShapePoint[] {
  const out: ShapePoint[] = [];
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const da = dot(normal, a) - limit;
    const db = dot(normal, b) - limit;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** The polygon's area (shoelace; positive for either winding). */
export function polygonArea(points: readonly ShapePoint[]): number {
  let twice = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/** The polygon's centroid. */
function centroid(points: readonly ShapePoint[]): ShapePoint {
  let twice = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const term = a.x * b.y - b.x * a.y;
    twice += term;
    x += (a.x + b.x) * term;
    y += (a.y + b.y) * term;
  }
  if (Math.abs(twice) < EPSILON) return { x: 0, y: 0 };
  return { x: x / (3 * twice), y: y / (3 * twice) };
}

/** The polygon turned by `degrees` around the centre (clockwise on the screen, whose y goes down). */
function turn(points: readonly ShapePoint[], degrees: number): ShapePoint[] {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => ({ x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }));
}

/** The shape at the start of a play. */
export function shapeStart(tuning: ShapeDragTuning): ShapeState {
  return { points: regularPolygon(tuning.sides, tuning.startRadius), strokes: 0 };
}

/** Whether the pin is heavy now: the shape has reached any of the tuning's `heavy` sizes. */
export function shapeHeavy(state: ShapeState, tuning: ShapeDragTuning): boolean {
  const heavy = tuning.heavy;
  if (!heavy) return false;
  const measures = shapeMeasures(state, tuning);
  return (heavy.atLeast.area !== undefined && measures.area >= heavy.atLeast.area) || (heavy.atLeast.span !== undefined && measures.span >= heavy.atLeast.span);
}

/** How far a stroke pushes the shape per board width of stroke: the heavy pin's gain near a tear, the tuning's before. */
const shapeGain = (state: ShapeState, tuning: ShapeDragTuning): number => (tuning.heavy && shapeHeavy(state, tuning) ? tuning.heavy.gain : tuning.gain);

/**
 * The shape after one stroke (rolled out, centred, turned), or the same shape when the stroke is a tap or its strip misses
 * the shape. `turned: false` leaves out the turn (the drawing turns it after the finger lifts).
 */
export function shapeRoll(state: ShapeState, stroke: ShapeStroke, tuning: ShapeDragTuning, { turned = true }: { turned?: boolean } = {}): ShapeState {
  const from = { x: stroke.from.x - 0.5, y: stroke.from.y - 0.5 };
  const way = sub({ x: stroke.to.x - 0.5, y: stroke.to.y - 0.5 }, from);
  const length = Math.hypot(way.x, way.y);
  if (!Number.isFinite(length) || length < tuning.minStroke) return state;
  const along = { x: way.x / length, y: way.y / length };
  const across = { x: -along.y, y: along.x };
  const line = dot(across, from);
  const under = clip(clip(state.points, across, line + tuning.band), { x: -across.x, y: -across.y }, -(line - tuning.band));
  if (under.length < 3 || polygonArea(under) < EPSILON) return state;
  const push = Math.min(length * shapeGain(state, tuning), tuning.maxPush);
  const carried = under.map((point) => ({ x: point.x + along.x * push, y: point.y + along.y * push }));
  const hull = convexHull([...state.points, ...carried]);
  const middle = centroid(hull);
  const centred = hull.map((point) => sub(point, middle));
  return { points: turned ? turn(centred, tuning.turnDeg) : centred, strokes: state.strokes + 1 };
}

/** The widths of the polygon across each whole degree from 0 to 179. */
function widths(points: readonly ShapePoint[]): number[] {
  return Array.from({ length: 180 }, (_, degree) => {
    const angle = (degree * Math.PI) / 180;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    let low = Infinity;
    let high = -Infinity;
    for (const point of points) {
      const along = dot(direction, point);
      low = Math.min(low, along);
      high = Math.max(high, along);
    }
    return high - low;
  });
}

/** The shape's measures. */
export function shapeMeasures(state: ShapeState, tuning: ShapeDragTuning): ShapeMeasures {
  const area = polygonArea(state.points);
  const across = widths(state.points);
  const widest = Math.max(...across);
  const narrowest = Math.min(...across);
  const box = Math.min(...across.slice(0, 90).map((width, degree) => width * across[degree + 90]));
  return {
    strokes: state.strokes,
    area: area / polygonArea(regularPolygon(tuning.sides, tuning.startRadius)),
    span: widest,
    roundness: widest > 0 ? narrowest / widest : 1,
    boxiness: box > 0 ? Math.min(1, area / box) : 1,
  };
}

/** Whether a class's bounds all hold. */
function holds<Outcome extends string>(item: ShapeClass<Outcome>, measures: ShapeMeasures): boolean {
  return SHAPE_MEASURES.every((measure) =>
    (item.atLeast?.[measure] === undefined || measures[measure] >= item.atLeast[measure])
    && (item.below?.[measure] === undefined || measures[measure] < item.below[measure]));
}

/** The outcome of a shape: the first class that holds, or the fallback. */
export function shapeClassify<Outcome extends string>(measures: ShapeMeasures, classifier: ShapeClassifier<Outcome>): Outcome {
  return classifier.classes.find((item) => holds(item, measures))?.outcome ?? classifier.fallback;
}

/** Whether the play ends at once with this shape (it is in an ending class). */
export function shapeEnds<Outcome extends string>(measures: ShapeMeasures, classifier: ShapeClassifier<Outcome>): boolean {
  return classifier.classes.some((item) => item.ends && holds(item, measures));
}

/**
 * The shape a record rolls: its strokes in order, up to the stroke limit and the first ending shape (the play takes no
 * strokes after those, so the rules take none either).
 */
export function shapeOfRecord<Outcome extends string>(record: ShapeDragRecord, tuning: ShapeDragTuning, classifier: ShapeClassifier<Outcome>): ShapeState {
  let state = shapeStart(tuning);
  for (const stroke of Array.isArray(record) ? record : []) {
    if (tuning.maxStrokes !== null && state.strokes >= tuning.maxStrokes) break;
    if (shapeEnds(shapeMeasures(state, tuning), classifier)) break;
    if (!stroke || !stroke.from || !stroke.to) continue;
    state = shapeRoll(state, stroke, tuning);
  }
  return state;
}

/** A stroke through the board's centre toward `degrees` (0 right, 90 down: the screen's way), `length` long. */
export function centreStroke(degrees: number, length: number): ShapeStroke {
  const angle = (degrees * Math.PI) / 180;
  const half = { x: (Math.cos(angle) * length) / 2, y: (Math.sin(angle) * length) / 2 };
  return { from: { x: 0.5 - half.x, y: 0.5 - half.y }, to: { x: 0.5 + half.x, y: 0.5 + half.y } };
}

/** The directions the keys roll toward (degrees on the screen): the arrows, and with Shift the diagonal clockwise of it. */
export const SHAPE_KEY_DEGREES: Readonly<Record<string, number>> = { ArrowRight: 0, ArrowDown: 90, ArrowLeft: 180, ArrowUp: 270 };
/** A key's stroke (null: not a rolling key). */
export function keyStroke(key: string, shift: boolean, tuning: ShapeDragTuning): ShapeStroke | null {
  const degrees = SHAPE_KEY_DEGREES[key];
  return degrees === undefined ? null : centreStroke(degrees + (shift ? 45 : 0), tuning.keyStroke);
}

/** The narrowest tap a finger makes on a phone (board widths): a stroke must be longer, and the pin wider. */
export const SHAPE_DRAG_MIN_STROKE = 0.03;
/** At least this long to play (ms): time to see the shape, roll a few strokes and finish. */
export const SHAPE_DRAG_MIN_TIME_MS = 6000;
/** Without a stroke for this long (from the start or the last stroke), the board shows how to roll again. */
export const SHAPE_DRAG_IDLE_HINT_MS = 3000;

/** The reasons a skin's tuning and shapes do not make a fair play (none: fair). */
export function shapeDragFairness<Outcome extends string>(tuning: ShapeDragTuning, classifier: ShapeClassifier<Outcome>): string[] {
  const problems: string[] = [];
  if (tuning.minStroke < SHAPE_DRAG_MIN_STROKE) problems.push(`minStroke ${tuning.minStroke} is shorter than a tap's slip (${SHAPE_DRAG_MIN_STROKE})`);
  if (tuning.band < tuning.minStroke) problems.push(`band ${tuning.band} is narrower than minStroke`);
  if (tuning.keyStroke < tuning.minStroke) problems.push(`keyStroke ${tuning.keyStroke} is shorter than minStroke: keys would not roll`);
  if (tuning.heavy && tuning.heavy.gain >= tuning.gain) problems.push(`the heavy pin's gain ${tuning.heavy.gain} is not less than gain ${tuning.gain}`);
  if (tuning.heavy && tuning.heavy.atLeast.area === undefined && tuning.heavy.atLeast.span === undefined) problems.push("the heavy pin has no size to start from");
  if (tuning.timeMs !== null && tuning.timeMs < SHAPE_DRAG_MIN_TIME_MS) problems.push(`timeMs ${tuning.timeMs} is shorter than ${SHAPE_DRAG_MIN_TIME_MS}`);
  if (tuning.timeMs === null && tuning.maxStrokes === null) problems.push("neither timeMs nor maxStrokes: only the 「done」 button would end the play");
  if (tuning.maxStrokes !== null && tuning.maxStrokes < tuning.minStrokesToFinish) problems.push("maxStrokes is less than minStrokesToFinish");
  for (const item of classifier.classes) {
    if (!item.ends) continue;
    if (item.below && Object.keys(item.below).length) problems.push(`the ending class ${item.outcome} has an upper bound (it could stop holding)`);
    for (const measure of Object.keys(item.atLeast ?? {}) as ShapeMeasure[])
      if (!SHAPE_GROWING_MEASURES.includes(measure)) problems.push(`the ending class ${item.outcome} asks for ${measure}, which can go down`);
    if (!item.atLeast || !Object.keys(item.atLeast).length) problems.push(`the ending class ${item.outcome} has no bound (it would end every play)`);
  }
  if (shapeEnds(shapeMeasures(shapeStart(tuning), tuning), classifier)) problems.push("the start shape is already in an ending class");
  return problems;
}

/**
 * A skin's rules from the engine's (docs/13 2.4): the shape a record rolls, classified by the skin's shapes. 「おまかせ」
 * plays the skin's own record for each outcome (the rules template checks it gives that outcome).
 */
export function shapeDragRules<Params, Outcome extends string>(
  tuning: ShapeDragTuning,
  classifier: ShapeClassifier<Outcome>,
  auto: Readonly<Record<Outcome, ShapeDragRecord>>,
): MiniGameRules<Params, Outcome, ShapeDragRecord> {
  return {
    outcomeOf: (record) => shapeClassify(shapeMeasures(shapeOfRecord(record, tuning, classifier), tuning), classifier),
    autoRecord: (outcome) => {
      if (!Object.hasOwn(auto, outcome)) throw new Error(`No shape_drag record gives ${outcome}`);
      return auto[outcome];
    },
  };
}
