import { centreStroke, shapeDragRules, type ShapeClassifier, type ShapeDragRecord, type ShapeDragTuning, type ShapeMeasures, type ShapeStroke } from "../engines/shape_drag/engine";

// The roti's rules (docs/13 2.4): a shape_drag skin. The player rolls a ball of dough on the board with a pin; after each
// stroke the dough turns a quarter (the roll-and-turn way of keeping a roti round). The rolled shape gives Harbans's
// joke: round (a dull map), a box (a truck's bed), some country, or a hole. Nothing is random; the same strokes give the
// same roti. Pure.

export type RotiOutcome = "round" | "truck_bed" | "country" | "torn";
/** The roti has no keys of its own. */
export type RotiParams = object;

/**
 * The dough, the pin and the time. The pin is wider than the dough (its strip covers it unless a stroke runs along one
 * side), so rolling one way over and over (with the quarter turns) squares the dough off; rolling in many ways rounds it.
 * A stroke of half the board pushes about a tenth of it; eight such strokes make a roti about three quarters of the board.
 */
export const ROTI_TUNING: ShapeDragTuning = {
  startRadius: 0.13,
  sides: 48,
  gain: 0.2,
  maxPush: 0.14,
  band: 0.4,
  minStroke: 0.04,
  turnDeg: 90,
  timeMs: 15000,
  maxStrokes: null,
  minStrokesToFinish: 1,
  keyStroke: 0.45,
};

/** Rolled too thin, or out past the board: torn (the play ends there). Round: rolled out evenly. A box: rolled one or two ways. Else: some country. */
export const ROTI_SHAPES: ShapeClassifier<RotiOutcome> = {
  classes: [
    { outcome: "torn", atLeast: { area: 10.5 }, ends: true },
    { outcome: "torn", atLeast: { span: 0.95 }, ends: true },
    { outcome: "round", atLeast: { roundness: 0.88, area: 3 } },
    { outcome: "truck_bed", atLeast: { boxiness: 0.9 } },
  ],
  fallback: "country",
};

/** Near a tear: the line over 「できた」 says so (and the dough looks thinner), so a careful player can stop in time. */
export function rotiNote(measures: ShapeMeasures): string | null {
  if (measures.span >= 0.8) return "板からはみ出しそう";
  if (measures.area >= 7.5) return "生地がうすくなってきた";
  return null;
}

const UP = 270;
/** A stroke beside the centre: `offset` across the way it rolls. */
const besideStroke = (degrees: number, length: number, offset: number): ShapeStroke => {
  const stroke = centreStroke(degrees, length);
  const across = ((degrees + 90) * Math.PI) / 180;
  const shift = { x: Math.cos(across) * offset, y: Math.sin(across) * offset };
  return { from: { x: stroke.from.x + shift.x, y: stroke.from.y + shift.y }, to: { x: stroke.to.x + shift.x, y: stroke.to.y + shift.y } };
};

/** 「おまかせ」's rolls for each outcome (the rules template checks each gives its outcome). */
export const ROTI_AUTO: Readonly<Record<RotiOutcome, ShapeDragRecord>> = {
  // Up and down, up and down: with the quarter turns, a box.
  truck_bed: Array.from({ length: 6 }, (_, index) => centreStroke(index % 2 ? UP - 180 : UP, 0.5)),
  // A new way each time, an eighth round further.
  round: Array.from({ length: 8 }, (_, index) => centreStroke(index * 45, 0.5)),
  // A few strokes this way and that, one along a side.
  country: [centreStroke(UP, 0.5), centreStroke(30, 0.5), besideStroke(150, 0.4, 0.08), centreStroke(UP + 20, 0.35)],
  // Long hard strokes the same way, until it gives.
  torn: Array.from({ length: 10 }, () => centreStroke(UP, 0.9)),
};

export const rotiRules = shapeDragRules<RotiParams, RotiOutcome>(ROTI_TUNING, ROTI_SHAPES, ROTI_AUTO);
