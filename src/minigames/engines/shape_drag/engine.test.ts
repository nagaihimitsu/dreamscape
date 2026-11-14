import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  centreStroke, convexHull, keyStroke, polygonArea, regularPolygon, shapeClassify, shapeDragFairness, shapeDragRules, shapeDragTuningSchema,
  shapeEnds, shapeHandAt, shapeHandWindows, shapeHeavy, shapeMeasures, shapeOfRecord, shapeRoll, shapeSkids, shapeStart, shapeTurn, strokeTimes,
  type ShapeClassifier, type ShapeDragTuning, type ShapeHand, type ShapeStroke,
} from "./engine";
import { shapeHandView } from "./EnginePlay";

// The shape_drag engine's rules in its own words (docs/13 6.2): the geometry of a stroke, the measures, the classes, and
// fairness. A skin's test passes its tuning and shapes through shapeDragFairness.
const tuning: ShapeDragTuning = {
  startRadius: 0.13, sides: 48, gain: 0.2, maxPush: 0.14, band: 0.4, minStroke: 0.04, turnDeg: 90,
  timeMs: 15000, maxStrokes: null, minStrokesToFinish: 1, keyStroke: 0.45,
};
type Shape = "round" | "box" | "odd" | "torn";
const shapes: ShapeClassifier<Shape> = {
  classes: [
    { outcome: "torn", atLeast: { area: 10.5 }, ends: true },
    { outcome: "round", atLeast: { roundness: 0.88, area: 3 } },
    { outcome: "box", atLeast: { boxiness: 0.9 } },
  ],
  fallback: "odd",
};
const roll = (strokes: readonly ShapeStroke[], given: ShapeDragTuning = tuning) => strokes.reduce((state, stroke) => shapeRoll(state, stroke, given), shapeStart(given));
const measure = (strokes: readonly ShapeStroke[], given: ShapeDragTuning = tuning) => shapeMeasures(roll(strokes, given), given);
const times = (count: number, stroke: (index: number) => ShapeStroke) => Array.from({ length: count }, (_, index) => stroke(index));
const UP = 270;

describe("the shape_drag geometry", () => {
  it("starts as a disc: area 1, round, as boxy as a disc", () => {
    const start = shapeMeasures(shapeStart(tuning), tuning);
    expect(start.area).toBeCloseTo(1, 6);
    expect(start.strokes).toBe(0);
    expect(start.roundness).toBeGreaterThan(0.99);
    expect(start.boxiness).toBeCloseTo(Math.PI / 4, 1);
    expect(start.span).toBeCloseTo(0.26, 2);
  });

  it("stretches a disc the way a pin does: longer the way it rolls, with straight sides (a stadium), by the push", () => {
    const once = roll([centreStroke(UP, 0.5)], { ...tuning, turnDeg: 0 });
    const points = once.points;
    const tall = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
    const wide = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
    // A stroke of half the board pushes 0.2 × 0.5 = 0.1: the disc (0.26 across) becomes 0.36 tall, still 0.26 wide.
    expect(tall).toBeCloseTo(0.36, 3);
    expect(wide).toBeCloseTo(0.26, 2);
    // A stadium's area: the disc and the rectangle the push swept.
    expect(polygonArea(points) / polygonArea(regularPolygon(48, 0.13))).toBeCloseTo((Math.PI * 0.13 ** 2 + 0.26 * 0.1) / (Math.PI * 0.13 ** 2), 1);
    // The shape stays centred on the board.
    const middle = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    expect(Math.abs(middle.x / points.length)).toBeLessThan(0.02);
  });

  it("turns the shape after each stroke", () => {
    const flat = roll([centreStroke(UP, 0.5)], { ...tuning, turnDeg: 0 });
    const turned = roll([centreStroke(UP, 0.5)], { ...tuning, turnDeg: 90 });
    const extent = (points: readonly { x: number; y: number }[], axis: "x" | "y") => Math.max(...points.map((point) => point[axis])) - Math.min(...points.map((point) => point[axis]));
    expect(extent(turned.points, "x")).toBeCloseTo(extent(flat.points, "y"), 6);
    expect(extent(turned.points, "y")).toBeCloseTo(extent(flat.points, "x"), 6);
  });

  it("ignores taps and strokes whose strip misses the shape (not counted)", () => {
    const start = shapeStart(tuning);
    expect(shapeRoll(start, { from: { x: 0.5, y: 0.5 }, to: { x: 0.52, y: 0.5 } }, tuning)).toBe(start);
    expect(shapeRoll(start, { from: { x: 0.02, y: 0.9 }, to: { x: 0.02, y: 0.3 } }, { ...tuning, band: 0.2 })).toBe(start);
    expect(shapeRoll(start, { from: { x: Number.NaN, y: 0.5 }, to: { x: 0.5, y: 0.5 } }, tuning)).toBe(start);
    expect(shapeRoll(start, centreStroke(UP, 0.5), tuning).strokes).toBe(1);
  });

  it("pushes one side out when the pin runs along it (a lopsided shape)", () => {
    const narrow = { ...tuning, band: 0.08, turnDeg: 0 };
    const side = { from: { x: 0.58, y: 0.7 }, to: { x: 0.58, y: 0.2 } };
    const points = roll([side], narrow).points;
    const top = (keep: (x: number) => boolean) => Math.min(...points.filter((point) => keep(point.x)).map((point) => point.y));
    // The right side (where the pin ran) reaches higher than the left.
    expect(top((x) => x > 0.06)).toBeLessThan(top((x) => x < -0.06) - 0.03);
  });

  it("caps a stroke's push", () => {
    const long = measure([centreStroke(UP, 1.4)], { ...tuning, turnDeg: 0 });
    const capped = measure([centreStroke(UP, 0.7)], { ...tuning, turnDeg: 0 });
    expect(long.span).toBeCloseTo(capped.span, 6);
  });

  it("never shrinks the area or the span, so an ending class stays reached", () => {
    const ways = [UP, 0, 45, 200, 130, 300, 15, 90, 250, 170];
    let state = shapeStart(tuning);
    let before = shapeMeasures(state, tuning);
    for (const [index, degrees] of ways.entries()) {
      state = shapeRoll(state, centreStroke(degrees, 0.2 + (index % 4) * 0.15), tuning);
      const after = shapeMeasures(state, tuning);
      expect(after.area).toBeGreaterThanOrEqual(before.area - 1e-9);
      expect(after.span).toBeGreaterThanOrEqual(before.span - 1e-9);
      before = after;
    }
  });

  it("gives the same shape for the same strokes", () => {
    const strokes = [centreStroke(UP, 0.5), centreStroke(30, 0.4), { from: { x: 0.3, y: 0.6 }, to: { x: 0.7, y: 0.4 } }];
    expect(roll(strokes).points).toEqual(roll(strokes).points);
  });

  it("keeps a hull convex and drops corners on a straight line", () => {
    const hull = convexHull([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0.5, y: 0.5 }]);
    expect(hull).toHaveLength(4);
  });
});

describe("the shape_drag measures and classes", () => {
  it("squares the dough off when rolled one way over and over with quarter turns, and rounds it when rolled many ways", () => {
    const box = measure(times(6, (index) => centreStroke(index % 2 ? 90 : UP, 0.5)));
    expect(box.boxiness).toBeGreaterThan(0.9);
    expect(shapeClassify(box, shapes)).toBe("box");
    const round = measure(times(8, (index) => centreStroke(index * 45, 0.5)));
    expect(round.roundness).toBeGreaterThan(0.9);
    expect(shapeClassify(round, shapes)).toBe("round");
    // Rolling up and right in turn, with quarter turns, always rolls the same way of the dough: a long strip.
    const strip = measure(times(4, (index) => centreStroke(index % 2 ? 0 : UP, 0.5)));
    expect(strip.roundness).toBeLessThan(0.5);
    expect(shapeClassify(strip, shapes)).toBe("box");
  });

  it("calls a shape odd when it is neither round nor boxy, and the unrolled ball too", () => {
    expect(shapeClassify(measure([centreStroke(UP, 0.5), centreStroke(30, 0.5), centreStroke(150, 0.3)]), shapes)).toBe("odd");
    expect(shapeClassify(measure([]), shapes)).toBe("odd");
  });

  it("ends the play once the shape is in an ending class, and the record's later strokes change nothing", () => {
    const long = times(12, () => centreStroke(UP, 0.9));
    const state = shapeOfRecord(long, tuning, shapes);
    expect(shapeEnds(shapeMeasures(state, tuning), shapes)).toBe(true);
    expect(state.strokes).toBeLessThan(12);
    expect(shapeOfRecord(long.slice(0, state.strokes), tuning, shapes).points).toEqual(state.points);
    // A stroke limit stops the record too.
    expect(shapeOfRecord(long, { ...tuning, maxStrokes: 2 }, shapes).strokes).toBe(2);
  });

  it("reads a broken record as far as it is whole", () => {
    expect(shapeOfRecord(null as never, tuning, shapes).strokes).toBe(0);
    expect(shapeOfRecord([null as never, centreStroke(UP, 0.5)], tuning, shapes).strokes).toBe(1);
  });

  it("gives a skin its outcomes through its classes, and 「おまかせ」 its own records", () => {
    const auto = { round: times(8, (index) => centreStroke(index * 45, 0.5)), box: [centreStroke(UP, 0.5), centreStroke(90, 0.5), centreStroke(UP, 0.5)], odd: [], torn: times(12, () => centreStroke(UP, 0.9)) };
    const rules = shapeDragRules<object, Shape>(tuning, shapes, auto);
    for (const outcome of ["round", "box", "odd", "torn"] as const) expect(rules.outcomeOf(rules.autoRecord(outcome, {}), {}), outcome).toBe(outcome);
    expect(() => rules.autoRecord("nothing" as Shape, {})).toThrow();
  });

  it("pushes less with a heavy pin once the shape is big enough (any of its sizes), the same as before until then", () => {
    const heavy: ShapeDragTuning = { ...tuning, heavy: { gain: 0.1, atLeast: { area: 4, span: 0.9 } } };
    const small = shapeOfRecord([centreStroke(UP, 0.5)], heavy, shapes);
    expect(shapeHeavy(small, heavy)).toBe(false);
    expect(shapeRoll(small, centreStroke(0, 0.5), heavy)).toEqual(shapeRoll(small, centreStroke(0, 0.5), tuning));
    const big = shapeOfRecord(Array.from({ length: 6 }, (_, index) => centreStroke(index * 45, 0.5)), tuning, shapes);
    expect(shapeHeavy(big, heavy)).toBe(true);
    expect(shapeHeavy(big, tuning)).toBe(false);
    expect(polygonArea(shapeRoll(big, centreStroke(0, 0.5), heavy).points)).toBeLessThan(polygonArea(shapeRoll(big, centreStroke(0, 0.5), tuning).points));
  });

  it("rolls through the centre with the arrows, and the diagonal with Shift", () => {
    expect(keyStroke("ArrowUp", false, tuning)).toEqual(centreStroke(UP, tuning.keyStroke));
    expect(keyStroke("ArrowUp", true, tuning)).toEqual(centreStroke(UP + 45, tuning.keyStroke));
    expect(keyStroke("ArrowRight", false, tuning)).toEqual(centreStroke(0, tuning.keyStroke));
    expect(keyStroke("a", false, tuning)).toBeNull();
  });
});

describe("the shape_drag fairness", () => {
  it("calls a tuning or shapes unfair when a tap would roll, keys would not, the play is too short or an ending class could end", () => {
    expect(shapeDragFairness(tuning, shapes)).toEqual([]);
    expect(shapeDragFairness({ ...tuning, minStroke: 0.01 }, shapes).join()).toContain("tap");
    expect(shapeDragFairness({ ...tuning, keyStroke: 0.02 }, shapes).join()).toContain("keys would not roll");
    expect(shapeDragFairness({ ...tuning, timeMs: 3000 }, shapes).join()).toContain("timeMs");
    // No time limit: a stroke limit ends the play (not the 「done」 button alone).
    expect(shapeDragFairness({ ...tuning, timeMs: null, maxStrokes: 8 }, shapes)).toEqual([]);
    expect(shapeDragFairness({ ...tuning, timeMs: null }, shapes).join()).toContain("neither timeMs nor maxStrokes");
    expect(shapeDragFairness({ ...tuning, heavy: { gain: 0.3, atLeast: { area: 5 } } }, shapes).join()).toContain("heavy pin's gain");
    expect(shapeDragFairness({ ...tuning, heavy: { gain: 0.1, atLeast: {} } }, shapes).join()).toContain("no size to start from");
    expect(shapeDragFairness(tuning, { ...shapes, classes: [{ outcome: "torn", atLeast: { roundness: 0.5 }, ends: true }] }).join()).toContain("can go down");
    expect(shapeDragFairness(tuning, { ...shapes, classes: [{ outcome: "torn", below: { area: 3 }, ends: true }] }).join()).toContain("upper bound");
    expect(shapeDragFairness(tuning, { ...shapes, classes: [{ outcome: "torn", atLeast: { area: 0.5 }, ends: true }] }).join()).toContain("start shape");
    expect(() => shapeDragTuningSchema.parse({ ...tuning, band: -1 })).toThrow();
    expect(shapeDragTuningSchema.parse(tuning)).toEqual(tuning);
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});

// A hand (round 3): someone else turns the shape on their own beat; strokes carry their times and are rolled in time.
describe("the shape_drag hand", () => {
  const hand: ShapeHand = {
    turns: [{ at: 1500, deg: 90 }, { at: 3000, deg: 0 }, { at: 4500, deg: 90 }], comeMs: 300, leadMs: 250, stayMs: 200, endMs: 6500,
    skid: { gain: 0.6, band: 0.08, shift: 0.15 },
  };
  const handed: ShapeDragTuning = { ...tuning, turnDeg: 0, timeMs: null, maxStrokes: null, hand };
  const at = (stroke: ShapeStroke, down: number, up = down + 200): ShapeStroke => ({ ...stroke, downMs: down, upMs: up });

  it("leaves windows between its visits, and says where it is", () => {
    expect(shapeHandWindows(hand)).toEqual([{ from: 0, to: 1250 }, { from: 1700, to: 2750 }, { from: 3200, to: 4250 }, { from: 4700, to: 6500 }]);
    expect([0, 1249, 1250, 1700, 1701, 3100, 6000].map((ms) => shapeHandAt(hand, ms))).toEqual([-1, -1, 0, 0, -1, 1, -1]);
    expect(shapeSkids(at(centreStroke(0, 0.5), 1000, 1200), hand)).toBe(false);
    expect(shapeSkids(at(centreStroke(0, 0.5), 1100, 1300), hand)).toBe(true);
    expect(shapeSkids(at(centreStroke(0, 0.5), 1600, 1800), hand)).toBe(true);
    expect(shapeSkids(at(centreStroke(0, 0.5), 1750, 1950), hand)).toBe(false);
    expect(shapeSkids(centreStroke(0, 0.5), undefined)).toBe(false);
    // A stroke without times is at 0; a key's is down and up at once.
    expect(strokeTimes(centreStroke(0, 0.5))).toEqual({ down: 0, up: 0 });
    expect(strokeTimes({ ...centreStroke(0, 0.5), upMs: 900 })).toEqual({ down: 900, up: 900 });
    expect(keyStroke("ArrowUp", false, handed, 800)).toMatchObject({ downMs: 800, upMs: 800 });
  });

  it("draws the hand coming, on the shape and away, with the window's fuse", () => {
    expect(shapeHandView(hand, 100)).toMatchObject({ visit: 0, phase: null, opening: 0 });
    expect(shapeHandView(hand, 100).openingLeft).toBeCloseTo((1250 - 100) / 1250, 6);
    expect(shapeHandView(hand, 1100)).toMatchObject({ visit: 0, phase: "coming", opening: 0, deg: 90 });
    expect(shapeHandView(hand, 1300)).toMatchObject({ visit: 0, phase: "on", opening: -1, openingLeft: 0 });
    expect(shapeHandView(hand, 3000)).toMatchObject({ visit: 1, phase: "on", deg: 0 });
    expect(shapeHandView(hand, 6000)).toMatchObject({ visit: 3, phase: null, opening: 3, leftMs: 500 });
  });

  it("turns the shape at its moments, not after each stroke, and rolls each stroke when it lifted", () => {
    const up = centreStroke(270, 0.5);
    // Two strokes the same way of the screen: the same way of the shape before its turn, across it after.
    const before = shapeOfRecord([at(up, 200), at(up, 800)], handed, shapes);
    const across = shapeOfRecord([at(up, 200), at(up, 2000)], handed, shapes);
    expect(before.turned).toBe(0);
    expect(across.turned).toBe(90);
    expect(before.rolls.map((roll) => Math.round(roll.degrees))).toEqual([90, 90]);
    expect(across.rolls.map((roll) => Math.round(roll.degrees))).toEqual([90, 0]);
    expect(shapeMeasures(before, handed).roundness).toBeLessThan(shapeMeasures(across, handed).roundness);
    // The feint turns nothing; the drawing's `untilMs` takes the turns up to then.
    expect(shapeOfRecord([], handed, shapes, 3500).turned).toBe(90);
    expect(shapeOfRecord([], handed, shapes, 99999).turned).toBe(180);
    expect(shapeTurn(shapeStart(handed), 0)).toEqual(shapeStart(handed));
  });

  it("skids a stroke that meets the hand: weaker and lopsided", () => {
    const clean = shapeOfRecord([at(centreStroke(270, 0.5), 600)], handed, shapes);
    const skid = shapeOfRecord([at(centreStroke(270, 0.5), 1200)], handed, shapes);
    expect(skid.rolls[0]).toMatchObject({ skid: true });
    expect(clean.rolls[0]).toMatchObject({ skid: false });
    expect(shapeMeasures(skid, handed).area).toBeLessThan(shapeMeasures(clean, handed).area);
    // Lopsided: its centre of mass moved (recentred, so its corners no longer mirror about the middle).
    const mirror = (points: readonly { x: number; y: number }[]) => Math.max(...points.map((point) => point.x)) + Math.min(...points.map((point) => point.x));
    expect(Math.abs(mirror(skid.points))).toBeGreaterThan(Math.abs(mirror(clean.points)) + 0.005);
  });

  it("takes no stroke after the end", () => {
    expect(shapeOfRecord([at(centreStroke(270, 0.5), 6400, 6600)], handed, shapes).strokes).toBe(0);
    expect(shapeOfRecord([at(centreStroke(270, 0.5), 6300, 6500)], handed, shapes).strokes).toBe(1);
  });

  it("is fair only with room to roll: turnDeg 0, no timeMs, the hand seen coming, windows of a reaction and a stroke", () => {
    expect(shapeDragFairness(handed, shapes)).toEqual([]);
    expect(shapeDragFairness({ ...handed, turnDeg: 90 }, shapes).join()).toContain("turnDeg 90 with a hand");
    expect(shapeDragFairness({ ...handed, timeMs: 15000 }, shapes).join()).toContain("timeMs with a hand");
    expect(shapeDragFairness({ ...handed, hand: { ...hand, comeMs: 100 } }, shapes).join()).toContain("no time to hold back");
    expect(shapeDragFairness({ ...handed, hand: { ...hand, endMs: 5000 } }, shapes).join()).toContain("endMs 5000");
    expect(shapeDragFairness({ ...handed, hand: { ...hand, turns: [{ at: 1500, deg: 90 }, { at: 2000, deg: 90 }] } }, shapes).join()).toContain("window before the hand's turn 1");
    expect(shapeDragFairness({ ...handed, hand: { ...hand, turns: [{ at: 3000, deg: 90 }, { at: 1500, deg: 90 }] } }, shapes).join()).toContain("not after the one before");
    expect(shapeDragFairness({ ...handed, hand: { ...hand, skid: { ...hand.skid, gain: 1 } } }, shapes).join()).toContain("skid's gain");
    expect(shapeDragTuningSchema.parse(handed)).toEqual(handed);
  });
});
