import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  centreStroke, shapeClassify, shapeDragRules, shapeMeasures, shapeOfRecord, type ShapeClassifier, type ShapeDragRecord, type ShapeDragTuning,
  type ShapeMeasures, type ShapeStroke,
} from "../engines/shape_drag/engine";

// The roti's rules (docs/13 2.4): a shape_drag skin. The player rolls a ball of dough on the board with a pin, 8 strokes;
// after each stroke the dough turns a quarter (the roll-and-turn way of keeping a roti round). The board shows the way of
// each stroke (an eighth round further each time; looks only, from the seed) and how round the dough is. The rolled shape
// gives Harbans's joke: round (a dull map), a box (a truck's bed), some country, or a hole. Nothing is random; the same
// strokes give the same roti. Pure. Every number to tune is in ROTI_NUMBERS (E1; Debug's room edits them: play.ts retune).

export type RotiOutcome = "round" | "truck_bed" | "country" | "torn";
/** The roti has no keys of its own. */
export type RotiParams = object;

/**
 * The roti's numbers (lengths in board widths). The dough, the pin and the strokes: the pin is wider than the dough (its
 * strip covers it unless a stroke runs along one side), so rolling one way over and over (with the quarter turns) squares
 * the dough off; rolling a new way each time rounds it. A stroke of half the board pushes about a tenth of it; eight such
 * strokes make a roti about three quarters of the board. Near a tear (across 0.8 of the board, or 7.5 times the ball's
 * area) the hint warns and the pin gets heavy; at 0.95 or 10.5 it tears. A box (boxiness 0.9) is told before round
 * (roundness 0.8 and three times the ball); round and across the dotted ring (0.66) is a big one (◎).
 */
export const ROTI_NUMBERS = {
  startRadius: 0.13,
  gain: 0.2,
  heavyGain: 0.12,
  maxPush: 0.14,
  band: 0.4,
  minStroke: 0.04,
  turnDeg: 90,
  maxStrokes: 8,
  keyStroke: 0.45,
  warnSpan: 0.8,
  warnArea: 7.5,
  tearSpan: 0.95,
  tearArea: 10.5,
  boxiness: 0.9,
  roundness: 0.8,
  roundArea: 3,
  bigSpan: 0.66,
} as const;
export type RotiNumbers = { readonly [Key in keyof typeof ROTI_NUMBERS]: number };

/** A roti built from its numbers: the tuning, the shapes, what the hint and the meter say, the rules. */
export interface RotiGame {
  numbers: RotiNumbers;
  tuning: ShapeDragTuning;
  shapes: ShapeClassifier<RotiOutcome>;
  /** Near a tear: the line over 「できた」 says so (and the dough's edge shows it), so a careful player can stop in time. */
  note(measures: ShapeMeasures): string | null;
  /** The roundness the meter shows (0 to 100), and whether the dough is boxy or still small (not round however round it measures). */
  roundness(measures: ShapeMeasures): { percent: number; boxy: boolean; small: boolean };
  /** The score line: how round (and big) the roti came out (shown only; never in the story); none for a hole. */
  score(measures: ShapeMeasures, outcome: RotiOutcome): string | undefined;
  rules: MiniGameRules<RotiParams, RotiOutcome, ShapeDragRecord>;
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

/** The roti from its numbers (the story's: ROTI_NUMBERS; Debug's room's edited ones). */
export function rotiGame(numbers: RotiNumbers = ROTI_NUMBERS): RotiGame {
  const tuning: ShapeDragTuning = {
    startRadius: numbers.startRadius,
    sides: 48,
    gain: numbers.gain,
    maxPush: numbers.maxPush,
    band: numbers.band,
    minStroke: numbers.minStroke,
    turnDeg: numbers.turnDeg,
    timeMs: null,
    maxStrokes: Math.max(1, Math.round(numbers.maxStrokes)),
    minStrokesToFinish: 1,
    keyStroke: numbers.keyStroke,
    heavy: { gain: numbers.heavyGain, atLeast: { span: numbers.warnSpan, area: numbers.warnArea } },
  };
  // Rolled too thin, or out past the board: torn (the play ends there). Then a box, then round. Else: some country.
  const shapes: ShapeClassifier<RotiOutcome> = {
    classes: [
      { outcome: "torn", atLeast: { area: numbers.tearArea }, ends: true },
      { outcome: "torn", atLeast: { span: numbers.tearSpan }, ends: true },
      { outcome: "truck_bed", atLeast: { boxiness: numbers.boxiness } },
      { outcome: "round", atLeast: { roundness: numbers.roundness, area: numbers.roundArea } },
    ],
    fallback: "country",
  };
  const note = (measures: ShapeMeasures): string | null => {
    if (measures.span >= numbers.warnSpan) return "板からはみ出しそう";
    if (measures.area >= numbers.warnArea) return "生地がうすくなってきた";
    return null;
  };
  const roundness = (measures: ShapeMeasures) => ({
    percent: Math.round(measures.roundness * 100), boxy: measures.boxiness >= numbers.boxiness, small: measures.area < numbers.roundArea,
  });
  const score = (measures: ShapeMeasures, outcome: RotiOutcome): string | undefined => {
    if (outcome === "torn") return undefined;
    const round = `丸さ ${roundness(measures).percent}%`;
    return outcome === "round" && measures.span >= numbers.bigSpan ? `${round}・大きさ ◎` : round;
  };
  /**
   * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: round ★2, round
   * and big (across the dotted ring) ★3, a box, a country or a hole ★1 (Harbans's jokes all).
   */
  const rate = (record: ShapeDragRecord): MiniGameRating => {
    const measures = shapeMeasures(shapeOfRecord(record, tuning, shapes), tuning);
    const outcome = shapeClassify(measures, shapes);
    const stars = outcome !== "round" ? 1 : measures.span >= numbers.bigSpan ? 3 : 2;
    const scoreJa = score(measures, outcome);
    return scoreJa ? { stars, scoreJa } : { stars };
  };
  return { numbers, tuning, shapes, note, roundness, score, rules: { ...shapeDragRules<RotiParams, RotiOutcome>(tuning, shapes, ROTI_AUTO), rate } };
}

/** The story's roti. */
export const ROTI_GAME = rotiGame();
export const ROTI_TUNING = ROTI_GAME.tuning;
export const ROTI_SHAPES = ROTI_GAME.shapes;
export const ROTI_ROUND = { roundness: ROTI_NUMBERS.roundness, area: ROTI_NUMBERS.roundArea } as const;
export const ROTI_BIG_SPAN = ROTI_NUMBERS.bigSpan;
export const rotiNote = ROTI_GAME.note;
export const rotiRoundness = ROTI_GAME.roundness;
export const rotiDetail = ROTI_GAME.score;
export const rotiRules = ROTI_GAME.rules;
