import { centreStroke, shapeDragRules, type ShapeClassifier, type ShapeDragRecord, type ShapeDragTuning, type ShapeMeasures, type ShapeStroke } from "../engines/shape_drag/engine";

// The roti's rules (docs/13 2.4): a shape_drag skin. The player rolls a ball of dough on the board with a pin, 8 strokes;
// after each stroke the dough turns a quarter (the roll-and-turn way of keeping a roti round). The board shows the way of
// each stroke (an eighth round further each time; looks only, from the seed) and how round the dough is. The rolled shape
// gives Harbans's joke: round (a dull map), a box (a truck's bed), some country, or a hole. Nothing is random; the same
// strokes give the same roti. Pure. Every number to tune is here (E1).

export type RotiOutcome = "round" | "truck_bed" | "country" | "torn";
/** The roti has no keys of its own. */
export type RotiParams = object;

/** Near a tear: this big (across the board, or thin against the ball), the line over 「できた」 warns and the pin gets heavy. */
export const ROTI_WARN = { span: 0.8, area: 7.5 } as const;

/**
 * The dough, the pin and the strokes. The pin is wider than the dough (its strip covers it unless a stroke runs along one
 * side), so rolling one way over and over (with the quarter turns) squares the dough off; rolling a new way each time
 * rounds it. A stroke of half the board pushes about a tenth of it; eight such strokes make a roti about three quarters of
 * the board. Near a tear the pin gets heavy (pushes less). No time limit (the play waits for the first stroke, and ends
 * after the 8th or at 「できた」).
 */
export const ROTI_TUNING: ShapeDragTuning = {
  startRadius: 0.13,
  sides: 48,
  gain: 0.2,
  maxPush: 0.14,
  band: 0.4,
  minStroke: 0.04,
  turnDeg: 90,
  timeMs: null,
  maxStrokes: 8,
  minStrokesToFinish: 1,
  keyStroke: 0.45,
  heavy: { gain: 0.12, atLeast: { ...ROTI_WARN } },
};

/** Round: rolled out evenly and at least this round (the board's meter marks it) and this big (against the ball). */
export const ROTI_ROUND = { roundness: 0.8, area: 3 } as const;
/** Squared off: this boxy (a box comes before round: a rounded square can be round enough). */
export const ROTI_BOX = { boxiness: 0.9 } as const;
/** Big: across at least this much of the board (the dotted ring), a round one gets 「大きさ ◎」 (shown only). */
export const ROTI_BIG_SPAN = 0.66;

/** Rolled too thin, or out past the board: torn (the play ends there). Then a box, then round. Else: some country. */
export const ROTI_SHAPES: ShapeClassifier<RotiOutcome> = {
  classes: [
    { outcome: "torn", atLeast: { area: 10.5 }, ends: true },
    { outcome: "torn", atLeast: { span: 0.95 }, ends: true },
    { outcome: "truck_bed", atLeast: { ...ROTI_BOX } },
    { outcome: "round", atLeast: { ...ROTI_ROUND } },
  ],
  fallback: "country",
};

/** Near a tear: the line over 「できた」 says so (and the dough's edge shows it), so a careful player can stop in time. */
export function rotiNote(measures: ShapeMeasures): string | null {
  if (measures.span >= ROTI_WARN.span) return "板からはみ出しそう";
  if (measures.area >= ROTI_WARN.area) return "生地がうすくなってきた";
  return null;
}

/** The roundness the meter shows (0 to 100), and whether the dough is boxy (the meter says so: a box is not round). */
export function rotiRoundness(measures: ShapeMeasures): { percent: number; boxy: boolean } {
  return { percent: Math.round(measures.roundness * 100), boxy: measures.boxiness >= ROTI_BOX.boxiness };
}

/** The line under the outcome: how round (and big) the roti came out (shown only; never in the story). */
export function rotiDetail(measures: ShapeMeasures, outcome: RotiOutcome): string | undefined {
  if (outcome === "torn") return undefined;
  const round = `丸さ ${rotiRoundness(measures).percent}%`;
  return outcome === "round" && measures.span >= ROTI_BIG_SPAN ? `${round}・大きさ ◎` : round;
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
  // A new way each time, an eighth round further (the board's arrows).
  round: Array.from({ length: 8 }, (_, index) => centreStroke(index * 45, 0.5)),
  // A few strokes this way and that, one along a side.
  country: [centreStroke(UP, 0.5), centreStroke(30, 0.5), besideStroke(150, 0.4, 0.08), centreStroke(UP + 20, 0.35)],
  // Long hard strokes the same way, until it gives.
  torn: Array.from({ length: 8 }, () => centreStroke(UP, 0.9)),
};

export const rotiRules = shapeDragRules<RotiParams, RotiOutcome>(ROTI_TUNING, ROTI_SHAPES, ROTI_AUTO);
