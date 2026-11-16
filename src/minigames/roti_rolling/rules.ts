import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  centreStroke, shapeClassify, shapeDragRules, shapeHandWindows, shapeMeasures, shapeOfRecord, type ShapeClassifier, type ShapeDragRecord,
  type ShapeDragTuning, type ShapeHand, type ShapeMeasures, type ShapeRollMark, type ShapeStroke,
} from "../engines/shape_drag/engine";

// The roti's rules (docs/13 2.4): a shape_drag skin with a hand. Harbans turns the dough on his own beat (「押して、回す。
// 押して、回す」, round 3: no fixed cycle any more); the player rolls a ball of dough with a pin in the windows between his
// turns. A calm opening of three windows, then the twist (a long pause while he checks the tava, room for two strokes; a
// quick pair; a feint: his hand comes with a pinch of flour and turns nothing; a breath), then the climax: the tava is hot,
// three short windows, and he lifts the roti onto it. A stroke that meets his hand on the dough skids (a lopsided
// push). The board's arrow points the way of the dough rolled least so far (rotiNextWay: advice the rules never read).
// The rolled shape gives Harbans's joke: round (a dull map), a box (a truck's bed), some country, or a hole (well round
// and big is まん丸: ★3 on the result card only). Nothing is random; the same strokes at the same times give the same roti.
// Pure. Every number to tune is in ROTI_NUMBERS (E1; Debug's room edits them: play.ts retune). Practice plays a short
// roti of its own instead (ROTI_WARMUP: two strokes on a small ball, none of Harbans's beat), when its params say `warmup`.

export type RotiOutcome = "round" | "truck_bed" | "country" | "torn";
/** The roti's keys: only practice's `warmup` (the definition's practice sets it; a story never writes it). */
export type RotiParams = { warmup?: "yes" };
/** Whether a play is practice's short roti of its own (ROTI_WARMUP), not the real one. */
export const isRotiWarmup = (params: RotiParams | undefined): boolean => params?.warmup === "yes";
type RotiRules = MiniGameRules<RotiParams, RotiOutcome, ShapeDragRecord>;

/**
 * The roti's numbers (lengths in board widths, times in ms). The dough, the pin and the strokes: the pin is wider than the
 * dough (its strip covers it unless a stroke runs along one side), so rolling the same way of the screen over and over
 * (with his quarter turns) squares the dough off; rolling the arrow's way each time rounds it. A stroke of half the board
 * pushes 0.08; one such stroke in each of his eleven chances makes a roti across the dotted ring (0.7). Near a tear (across
 * 0.74, or 11 times the ball's area) the hint warns and the pin gets heavy; at 0.86 or 14.5 it tears (the ring and the tear
 * are closer than before round 3: the hot windows at the end are where it is won or torn). A box (boxiness 0.9) is told
 * before round (roundness 0.8 and three times the ball); round and across the ring is a big one (◎); big and roundness
 * 0.88 is まん丸.
 *
 * Harbans's beat: his hand shows `handComeMs` before it touches the dough, is on it `handLeadMs` before his turn and
 * `handStayMs` after (a stroke then skids: `skidGain` of its push along a strip `skidBand` wide, `skidShift` beside the
 * finger's line). The windows it leaves: three of `openMs`, a `pauseMs` one, two of `quickMs` (the feint after the second),
 * a `breathMs` one, and three of `hotMs` (the tava is hot; the play ends after the last).
 */
export const ROTI_NUMBERS = {
  startRadius: 0.11,
  gain: 0.16,
  heavyGain: 0.09,
  maxPush: 0.11,
  band: 0.4,
  minStroke: 0.04,
  keyStroke: 0.45,
  warnSpan: 0.74,
  warnArea: 11,
  tearSpan: 0.86,
  tearArea: 14.5,
  boxiness: 0.9,
  roundness: 0.8,
  roundArea: 3,
  bigSpan: 0.7,
  perfectRoundness: 0.88,
  handTurnDeg: 90,
  handComeMs: 320,
  handLeadMs: 280,
  handStayMs: 220,
  skidGain: 0.9,
  skidBand: 0.08,
  skidShift: 0.16,
  openMs: 1450,
  pauseMs: 2400,
  quickMs: 900,
  breathMs: 1200,
  hotMs: 740,
} as const;
export type RotiNumbers = { readonly [Key in keyof typeof ROTI_NUMBERS]: number };

/** A dough under this many times the ball's area is still the ball (the card says 「まだ玉のまま」, not how round). */
export const ROTI_BALL_AREA = 1.3;

/** What each window of Harbans's beat is (the skin's words and the tava's glow follow it). */
export type RotiWindowKind = "open" | "pause" | "quick" | "breath" | "hot";
/** The windows in order, and what his hand does after each (the last ends the play: he lifts the roti). */
export const ROTI_BEAT: readonly { kind: RotiWindowKind; then: "turn" | "feint" | "end" }[] = [
  { kind: "open", then: "turn" }, { kind: "open", then: "turn" }, { kind: "open", then: "turn" },
  { kind: "pause", then: "turn" }, { kind: "quick", then: "turn" }, { kind: "quick", then: "feint" },
  { kind: "breath", then: "turn" }, { kind: "hot", then: "turn" }, { kind: "hot", then: "turn" }, { kind: "hot", then: "end" },
];

/** Harbans's hand from the numbers: each window's length, then his visit (a turn or the feint), up to the end. */
export function rotiHand(numbers: RotiNumbers): ShapeHand {
  const length: Record<RotiWindowKind, number> = { open: numbers.openMs, pause: numbers.pauseMs, quick: numbers.quickMs, breath: numbers.breathMs, hot: numbers.hotMs };
  const lead = Math.max(0, Math.round(numbers.handLeadMs));
  const stay = Math.max(0, Math.round(numbers.handStayMs));
  const turns: { at: number; deg: number }[] = [];
  let free = 0;
  let endMs = 0;
  for (const beat of ROTI_BEAT) {
    const touch = free + Math.max(0, Math.round(length[beat.kind]));
    if (beat.then === "end") {
      endMs = touch;
      break;
    }
    turns.push({ at: touch + lead, deg: beat.then === "turn" ? numbers.handTurnDeg : 0 });
    free = touch + lead + stay;
  }
  return {
    turns, comeMs: Math.max(0, Math.round(numbers.handComeMs)), leadMs: lead, stayMs: stay, endMs: Math.max(1, endMs),
    skid: { gain: numbers.skidGain, band: numbers.skidBand, shift: numbers.skidShift },
  };
}

/** The four ways a roti needs rolling (degrees across the dough, its own): rolled about evenly, it comes out round. */
export const ROTI_WAYS = [0, 45, 90, 135] as const;
/** How far each way of the dough has been rolled (pushes summed by the nearest way). */
export function rotiRolledWays(rolls: readonly ShapeRollMark[]): number[] {
  const sums = ROTI_WAYS.map(() => 0);
  for (const roll of rolls) {
    const nearest = Math.round(roll.degrees / 45) % 4;
    sums[nearest] += roll.push;
  }
  return sums;
}
/**
 * The way the arrow shows next (degrees across the dough, its own; the board adds the dough's turn): the way rolled least,
 * ties in `prefer`'s order (the skin's, from the seed: looks only). Advice only: the rules measure the shape, never this.
 */
export function rotiNextWay(rolls: readonly ShapeRollMark[], prefer: readonly number[] = ROTI_WAYS): number {
  const sums = rotiRolledWays(rolls);
  const order = prefer.map((way) => ROTI_WAYS.indexOf(way as (typeof ROTI_WAYS)[number])).filter((index) => index >= 0);
  let best = order[0] ?? 0;
  for (const index of order) if (sums[index] < sums[best] - 1e-9) best = index;
  return ROTI_WAYS[best];
}

/** A roti built from its numbers: the tuning, the shapes, what the hint and the meter say, the rules. */
export interface RotiGame {
  numbers: RotiNumbers;
  tuning: ShapeDragTuning;
  /** Harbans's hand (the tuning's), and the kind of each window it leaves (ROTI_BEAT's, in order). */
  hand: ShapeHand;
  windows: readonly { from: number; to: number; kind: RotiWindowKind }[];
  shapes: ShapeClassifier<RotiOutcome>;
  /** Near a tear: the line over 「できた」 says so (and the dough's edge shows it), so a careful player can stop in time. */
  note(measures: ShapeMeasures): string | null;
  /** The roundness the meter shows (0 to 100), and whether the dough is boxy or still small (not round however round it measures). */
  roundness(measures: ShapeMeasures): { percent: number; boxy: boolean; small: boolean };
  /** Round and big enough, and as round as まん丸 (by the percent shown, so 「88%」 is always まん丸): the ★3 roti. */
  perfect(measures: ShapeMeasures): boolean;
  /** The score line: how round (and big) the roti came out, how boxy a box (shown only; never in the story); none for a hole. */
  score(measures: ShapeMeasures, outcome: RotiOutcome): string | undefined;
  /** The roti's rules, and practice's (ROTI_WARMUP's) for a play whose params say `warmup`. */
  rules: RotiRules;
}

const UP = 270;
/** A stroke beside the centre: `offset` across the way it rolls. */
const besideStroke = (degrees: number, length: number, offset: number): ShapeStroke => {
  const stroke = centreStroke(degrees, length);
  const across = ((degrees + 90) * Math.PI) / 180;
  const shift = { x: Math.cos(across) * offset, y: Math.sin(across) * offset };
  return { from: { x: stroke.from.x + shift.x, y: stroke.from.y + shift.y }, to: { x: stroke.to.x + shift.x, y: stroke.to.y + shift.y } };
};
/** A stroke in a window: down a little after it opens, up a quarter of a second later (a calm stroke). */
const inWindow = (stroke: ShapeStroke, slot: { from: number }, after = 300): ShapeStroke =>
  ({ ...stroke, downMs: slot.from + after, upMs: slot.from + after + 250 });

/** 「おまかせ」's rolls for each outcome, in Harbans's windows (the rules template checks each gives its outcome). */
export function rotiAuto(game: Pick<RotiGame, "windows" | "tuning" | "shapes">): Record<RotiOutcome, ShapeDragRecord> {
  const { windows } = game;
  const each = (stroke: () => ShapeStroke) => windows.map((slot) => inWindow(stroke(), slot));
  // The arrow's way each window (and twice in the long pause), shorter in the hot ones (the ring is reached by then).
  const round: ShapeStroke[] = [];
  for (const slot of windows) {
    for (const after of slot.kind === "pause" ? [300, 1300] : [300]) {
      const state = shapeOfRecord(round, game.tuning, game.shapes, slot.from + after);
      round.push(inWindow(centreStroke(rotiNextWay(state.rolls) + state.turned, slot.kind === "hot" ? 0.3 : 0.5), slot, after));
    }
  }
  return {
    // The same way of the screen every window: with his quarter turns, a box.
    truck_bed: each(() => centreStroke(UP, 0.5)),
    round,
    // A few strokes this way and that, one along a side.
    country: [inWindow(centreStroke(UP, 0.5), windows[0]), inWindow(centreStroke(30, 0.5), windows[1]),
      inWindow(besideStroke(150, 0.4, 0.08), windows[2]), inWindow(centreStroke(UP + 20, 0.35), windows[3])],
    // Long hard strokes the same way, until it gives.
    torn: each(() => centreStroke(UP, 0.9)),
  };
}

/** The roti from its numbers (the story's: ROTI_NUMBERS; Debug's room's edited ones). */
export function rotiGame(numbers: RotiNumbers = ROTI_NUMBERS): RotiGame {
  const hand = rotiHand(numbers);
  const tuning: ShapeDragTuning = {
    startRadius: numbers.startRadius,
    sides: 48,
    gain: numbers.gain,
    maxPush: numbers.maxPush,
    band: numbers.band,
    minStroke: numbers.minStroke,
    turnDeg: 0,
    timeMs: null,
    maxStrokes: null,
    minStrokesToFinish: 1,
    keyStroke: numbers.keyStroke,
    heavy: { gain: numbers.heavyGain, atLeast: { span: numbers.warnSpan, area: numbers.warnArea } },
    hand,
  };
  const windows = shapeHandWindows(hand).map((slot, index) => ({ ...slot, kind: ROTI_BEAT[Math.min(index, ROTI_BEAT.length - 1)].kind }));
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
  const perfect = (measures: ShapeMeasures) =>
    measures.span >= numbers.bigSpan && Math.round(measures.roundness * 100) >= Math.round(numbers.perfectRoundness * 100);
  // A box says how boxy (group2 N2: 「丸さ 81%」 on a box read like a round one); まん丸 only on the ★3 roti (N3). A ball
  // barely rolled or not at all says so, not its roundness (2026-11-14 playtest: doing nothing read 「丸さ 100%」).
  const score = (measures: ShapeMeasures, outcome: RotiOutcome): string | undefined => {
    if (outcome === "torn") return undefined;
    if (outcome === "truck_bed") return `四角さ ${Math.round(measures.boxiness * 100)}%`;
    if (outcome === "country" && measures.area < numbers.roundArea) return measures.area < ROTI_BALL_AREA ? "まだ玉のまま" : "伸ばし足りない";
    const round = `丸さ ${roundness(measures).percent}%`;
    if (outcome !== "round" || measures.span < numbers.bigSpan) return round;
    return perfect(measures) ? `${round}・まん丸・大きさ ◎` : `${round}・大きさ ◎`;
  };
  /**
   * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: round ★2, round
   * and big (across the dotted ring) and as round as まん丸 ★3, a box, a country or a hole ★1 (Harbans's jokes all).
   */
  const rate = (record: ShapeDragRecord): MiniGameRating => {
    const measures = shapeMeasures(shapeOfRecord(record, tuning, shapes), tuning);
    const outcome = shapeClassify(measures, shapes);
    const stars = outcome !== "round" ? 1 : perfect(measures) ? 3 : 2;
    const scoreJa = score(measures, outcome);
    return scoreJa ? { stars, scoreJa } : { stars };
  };
  const auto = rotiAuto({ windows, tuning, shapes });
  return {
    numbers, tuning, hand, windows, shapes, note, roundness, perfect, score,
    rules: rotiWithWarmup({ ...shapeDragRules<RotiParams, RotiOutcome>(tuning, shapes, auto), rate }),
  };
}

/**
 * Practice's roti (`warmup`, which only the definition's practice sets; 2026-11-16, the user's decision: practice is short,
 * simple and no rehearsal of the real play): a play of its own that teaches the stroke and nothing else. A smaller ball,
 * no Harbans (no hand, no turns, no skid, no beat), no tear, no dotted ring, no clock: two strokes (the band counts them
 * down), the arrow's way and then across it (Warmup.tsx); the second ends it at once (a few seconds, against the real
 * beat's 16), and an untouched practice ends by itself at 6 s (endMs from its start; one stroke and 「できた」 end it too). A stroke over the dough pushes it the same whatever its length past a short one (forgiving). Its
 * numbers are its own, whatever Debug's room edits. Its outcome is never shown or taken: round when the two strokes
 * crossed (rolled two ways, near square), else some country (without his turns it makes no box, and it never tears). No ★.
 */
export const ROTI_WARMUP_TUNING: ShapeDragTuning = {
  startRadius: 0.09,
  sides: 48,
  gain: 0.4,
  maxPush: 0.09,
  band: 0.4,
  minStroke: 0.04,
  turnDeg: 0,
  timeMs: null,
  maxStrokes: 2,
  minStrokesToFinish: 1,
  keyStroke: 0.45,
  endMs: 6000,
};
export const ROTI_WARMUP_SHAPES: ShapeClassifier<RotiOutcome> = {
  classes: [{ outcome: "round", atLeast: { strokes: 2, roundness: 0.75 } }],
  fallback: "country",
};
/**
 * 「おまかせ」's practice records: up the board then across it (round), up twice (some country). おまかせ never plays
 * practice (the host offers none then); a box or a hole, which practice never makes, takes the country one.
 */
export const ROTI_WARMUP_AUTO: Record<RotiOutcome, ShapeDragRecord> = (() => {
  const country = [centreStroke(UP, 0.5), centreStroke(UP, 0.5)];
  return { round: [centreStroke(UP, 0.5), centreStroke(0, 0.5)], country, truck_bed: country, torn: country };
})();
export const ROTI_WARMUP: { tuning: ShapeDragTuning; shapes: ShapeClassifier<RotiOutcome>; rules: RotiRules } = {
  tuning: ROTI_WARMUP_TUNING,
  shapes: ROTI_WARMUP_SHAPES,
  rules: { ...shapeDragRules<RotiParams, RotiOutcome>(ROTI_WARMUP_TUNING, ROTI_WARMUP_SHAPES, ROTI_WARMUP_AUTO), rate: () => null },
};

/** The rules for a play's params: practice's (ROTI_WARMUP) when they say `warmup`, else the roti's own (`real`). */
function rotiWithWarmup(real: RotiRules): RotiRules {
  const pick = (params: RotiParams) => (isRotiWarmup(params) ? ROTI_WARMUP.rules : real);
  return {
    outcomeOf: (record, params) => pick(params).outcomeOf(record, params),
    autoRecord: (outcome, params) => pick(params).autoRecord(outcome, params),
    rate: (record, params) => pick(params).rate?.(record, params) ?? null,
  };
}

/** The story's roti. */
export const ROTI_GAME = rotiGame();
export const ROTI_TUNING = ROTI_GAME.tuning;
export const ROTI_SHAPES = ROTI_GAME.shapes;
export const ROTI_AUTO = rotiAuto(ROTI_GAME);
export const ROTI_HAND = ROTI_GAME.hand;
export const ROTI_WINDOWS = ROTI_GAME.windows;
export const ROTI_ROUND = { roundness: ROTI_NUMBERS.roundness, area: ROTI_NUMBERS.roundArea } as const;
export const ROTI_BIG_SPAN = ROTI_NUMBERS.bigSpan;
export const rotiNote = ROTI_GAME.note;
export const rotiRoundness = ROTI_GAME.roundness;
export const rotiDetail = ROTI_GAME.score;
export const rotiRules = ROTI_GAME.rules;
