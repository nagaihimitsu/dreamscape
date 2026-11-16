import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGamePlayProps, PlayClock } from "../contract";
import { centreStroke, keyStroke, shapeDragFairness, shapeMeasures, shapeOfRecord, shapeStart, type ShapeStroke } from "../engines/shape_drag/engine";
import type { ShapeDragView } from "../engines/shape_drag/EnginePlay";
import { NO_JUICE } from "../host/no-juice";
import { rotiRolling } from "./definition";
import { Play, retune } from "./play";
import {
  isRotiWarmup, ROTI_AUTO, ROTI_HAND, ROTI_NUMBERS, ROTI_TUNING, ROTI_WARMUP, ROTI_WINDOWS, rotiGame, rotiRules, type RotiOutcome, type RotiParams,
} from "./rules";
import { rotiArrowDegrees, rotiSkin } from "./Skin";
import { rotiWarmupArrow, rotiWarmupSkin } from "./Warmup";

// Practice's roti (2026-11-16, the user's decision: practice is short and simple, no rehearsal of the real play): its own
// two strokes on a smaller ball, none of Harbans's beat, and the real play as it was.

const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
/** The params practice plays with, as the host reads them (the tag's keys, then the definition's practice keys over them). */
const WARMUP: RotiParams = rotiRolling.params(context).parse({ ...rotiRolling.examples[0], ...(rotiRolling.practice ? rotiRolling.practice.params : {}) });
const OUTCOMES = rotiRolling.outcomes.map((outcome) => outcome.id);
const UP = 270;
const { tuning, shapes, rules } = ROTI_WARMUP;
const measuresOf = (record: readonly ShapeStroke[]) => shapeMeasures(shapeOfRecord(record, tuning, shapes), tuning);
/** `count` strokes, each the way practice's arrow shows, `length` long. */
function followed(count = 2, length = 0.4): ShapeStroke[] {
  const strokes: ShapeStroke[] = [];
  for (let index = 0; index < count; index++) strokes.push(centreStroke(rotiWarmupArrow(shapeOfRecord(strokes, tuning, shapes).rolls), length));
  return strokes;
}
/** The real play's chances to roll: one stroke a window of Harbans's beat, two in his long pause. */
const REAL_CHANCES = ROTI_WINDOWS.reduce((sum, window) => sum + (window.kind === "pause" ? 2 : 1), 0);

describe("practice's roti (warmup)", () => {
  it("is what the definition's practice reads, never a story's or an example's", () => {
    expect(WARMUP).toEqual({ warmup: "yes" });
    expect(isRotiWarmup(WARMUP)).toBe(true);
    expect(isRotiWarmup({})).toBe(false);
    expect(isRotiWarmup(undefined)).toBe(false);
    for (const example of rotiRolling.examples) expect(example).not.toHaveProperty("warmup");
    expect(rotiRolling.params(context).parse({})).toEqual({});
    expect(() => rotiRolling.params(context).parse({ warmup: "no" })).toThrow();
  });

  it("is short: two strokes on a smaller ball, against the real play's eleven chances over about 16 s", () => {
    expect(tuning.maxStrokes).toBe(2);
    expect(REAL_CHANCES).toBe(11);
    expect(ROTI_HAND.endMs).toBeGreaterThan(15000);
    // A third of the real play or less.
    expect(tuning.maxStrokes! * 3).toBeLessThanOrEqual(REAL_CHANCES);
    expect(tuning.startRadius).toBeLessThan(ROTI_NUMBERS.startRadius);
    // The play takes no stroke after its second (the engine ends it there).
    expect(shapeOfRecord(followed(6), tuning, shapes).strokes).toBe(2);
    expect(shapeDragFairness(tuning, shapes)).toEqual([]);
  });

  it("has none of the real play's twists: no hand, turns or clock, no heavy pin, no tear, no box", () => {
    expect(tuning.hand).toBeUndefined();
    expect(tuning.turnDeg).toBe(0);
    expect(tuning.timeMs).toBeNull();
    expect(tuning.heavy).toBeUndefined();
    expect(shapes.classes.some((item) => item.ends)).toBe(false);
    // Long hard strokes the same way (the real play's hole), or anything at all: round or some country, never more than two strokes.
    expect(rules.outcomeOf([centreStroke(UP, 0.9), centreStroke(UP, 0.9)], WARMUP)).toBe("country");
    let seed = 5;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let round = 0; round < 100; round++) {
      const record = Array.from({ length: 1 + Math.floor(random() * 8) }, () => centreStroke(random() * 360, random()));
      expect(["round", "country"]).toContain(rules.outcomeOf(record, WARMUP));
      expect(measuresOf(record).strokes).toBeLessThanOrEqual(2);
    }
    // Forgiving: past a short stroke, any length rolls the same.
    const short = measuresOf(followed(2, 0.3));
    const long = measuresOf(followed(2, 0.9));
    for (const measure of ["area", "span", "roundness", "boxiness"] as const) expect(long[measure]).toBeCloseTo(short[measure], 9);
  });

  it("points up the board first, then across the way it was rolled; following it (or the arrow keys) rolls an even roti", () => {
    expect(rotiWarmupArrow([])).toBe(UP);
    expect(rotiWarmupArrow([{ degrees: 90, push: 0.09, skid: false, at: 0 }])).toBe(0);
    expect(rotiWarmupArrow([{ degrees: 0, push: 0.09, skid: false, at: 0 }])).toBe(90);
    expect(rules.outcomeOf(followed(), WARMUP)).toBe("round");
    expect(rules.outcomeOf([keyStroke("ArrowUp", false, tuning)!, keyStroke("ArrowRight", false, tuning)!], WARMUP)).toBe("round");
    expect(rules.outcomeOf([centreStroke(UP, 0.5), centreStroke(UP, 0.5)], WARMUP)).toBe("country");
    expect(rules.outcomeOf(followed(1), WARMUP)).toBe("country");
    expect(rules.outcomeOf([], WARMUP)).toBe("country");
    // Not a preview: the real arrow's first way comes from the seed; practice's is up whatever the seed.
    const firstWays = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => rotiArrowDegrees(seed, { rolls: [], turned: 0 })));
    expect(firstWays.size).toBeGreaterThan(1);
  });

  it("ends by itself with a declared outcome, おまかせ's records and the edge ones too, with no ★", () => {
    const edges: ShapeStroke[][] = [
      [], [{ from: { x: 0.5, y: 0.5 }, to: { x: 0.5, y: 0.5 } }], [{ from: { x: 0, y: 0 }, to: { x: 0, y: 1 } }],
      Array.from({ length: 40 }, (_, index) => centreStroke(index * 37, 0.6)), [{ ...centreStroke(UP, 0.5), downMs: Number.NaN, upMs: -5 }],
    ];
    for (const outcome of OUTCOMES) {
      expect(() => rotiRules.autoRecord(outcome, WARMUP)).not.toThrow();
      const record = rotiRules.autoRecord(outcome, WARMUP);
      expect(record.length).toBeLessThanOrEqual(tuning.maxStrokes!);
      expect(OUTCOMES).toContain(rotiRules.outcomeOf(record, WARMUP));
      expect(rotiRules.rate!(record, WARMUP)).toBeNull();
    }
    expect(rotiRules.outcomeOf(rotiRules.autoRecord("round", WARMUP), WARMUP)).toBe("round");
    expect(rotiRules.outcomeOf(rotiRules.autoRecord("country", WARMUP), WARMUP)).toBe("country");
    for (const record of edges) {
      const outcome = rotiRules.outcomeOf(record, WARMUP);
      expect(OUTCOMES).toContain(outcome);
      expect(rotiRules.outcomeOf(record, WARMUP)).toBe(outcome);
      expect(rotiRules.rate!(record, WARMUP)).toBeNull();
    }
    // Its second stroke is the engine's stroke limit: the play ends there by itself.
    expect(measuresOf(followed()).strokes).toBe(tuning.maxStrokes);
  });

  it("leaves the real play as it was without warmup, and keeps its own numbers in Debug's room", () => {
    for (const outcome of OUTCOMES) {
      expect(rotiRules.autoRecord(outcome, {})).toEqual(ROTI_AUTO[outcome]);
      expect(rotiRules.outcomeOf(ROTI_AUTO[outcome], {})).toBe(outcome);
    }
    expect(rotiRules.rate!(ROTI_AUTO.round, {})).toMatchObject({ stars: 3 });
    expect(rotiGame(ROTI_NUMBERS).tuning).toEqual(ROTI_TUNING);
    // The same strokes are practice's own roti with warmup: the real hole is no hole there.
    expect(rotiRules.outcomeOf(ROTI_AUTO.torn, WARMUP)).not.toBe("torn");
    const edited = { ...ROTI_NUMBERS, hotMs: 1000, roundness: 0.9 };
    const room = retune(edited).rules;
    for (const outcome of OUTCOMES) {
      expect(room.autoRecord(outcome, WARMUP)).toBe(rules.autoRecord(outcome, WARMUP));
      expect(room.autoRecord(outcome, {})).toEqual(rotiGame(edited).rules.autoRecord(outcome, {}));
    }
  });
});

describe("practice's field", () => {
  const start = shapeStart(tuning);
  const view: ShapeDragView = {
    points: start.points, pin: null, measures: shapeMeasures(start, tuning), strokes: 0, outcome: null, lastStroke: null, idle: false, turned: 0, rolls: [], hand: null,
  };
  const props = (change: Partial<ShapeDragView> = {}, person?: ReturnType<typeof createElement>) => ({
    params: WARMUP, still: false, seed: 7, cast: { heroine: null, ...(person ? { person } : {}) }, names: { player: "主人公", heroine: "ヒロイン" }, art: {},
    view: { ...view, ...change },
  });

  it("draws the same board, dough and pin with an arrow that does not burn down; no ring, hand, turning sign, tava glow or words", () => {
    const board = renderToStaticMarkup(createElement(rotiWarmupSkin.Board, props()));
    expect(board).toContain('data-warmup="true"');
    expect(board).toContain("mg-roti-rolling-board-face");
    expect(board).toContain('data-testid="roti-dough"');
    expect(board).toContain("mg-roti-rolling-pin-body");
    expect(board).toContain(`data-degrees="${UP}"`);
    for (const absent of ["mg-roti-rolling-target", "roti-hand", "roti-wait", "mg-roti-rolling-hole"]) expect(board).not.toContain(absent);
    expect(renderToStaticMarkup(createElement(rotiWarmupSkin.Board, props({ outcome: "round" })))).not.toContain("roti-arrow");
    expect(renderToStaticMarkup(createElement(rotiWarmupSkin.Board, props({ idle: true })))).toContain("mg-roti-rolling-finger");
    const backdrop = renderToStaticMarkup(createElement(rotiWarmupSkin.Backdrop, props({ strokes: 1, rolls: [{ degrees: 90, push: 0.09, skid: false, at: 0 }] }, createElement("i", { "data-testid": "harbans" }))));
    expect(backdrop).toContain('data-testid="harbans"');
    expect(backdrop).toContain('data-testid="roti-tava"');
    expect(backdrop).not.toContain('data-hot="true"');
    expect(backdrop).not.toContain("roti-word");
    // No meter, no warning, no hand's sounds; its hint says nothing of Harbans.
    expect(rotiWarmupSkin.meter).toBeUndefined();
    expect(rotiWarmupSkin.noteJa({ ...view.measures, span: 0.9, area: 20 }, view)).toBeNull();
    expect(rotiWarmupSkin.handSounds).toBeUndefined();
    expect(rotiWarmupSkin.hintJa).not.toContain("ハルバンス");
  });

  it("is what the play draws with practice's params, retuned or not; the real roti otherwise", () => {
    const clock: PlayClock = { now: () => 0, at: () => 0, onFrame: () => () => undefined, after: () => () => undefined };
    const render = (PlayOf: typeof Play, params: RotiParams) => renderToStaticMarkup(createElement(PlayOf, {
      params, auto: null, available: OUTCOMES, still: false, seed: 7, clock, cast: { heroine: null }, names: { player: "主人公", heroine: "ヒロイン" }, art: {},
      sound: () => undefined, vibrate: () => undefined, status: () => undefined, decided: () => undefined, end: () => undefined, practice: isRotiWarmup(params),
      juice: NO_JUICE, react: () => undefined,
    } satisfies MiniGamePlayProps<RotiParams, RotiOutcome>));
    for (const PlayOf of [Play, retune({ ...ROTI_NUMBERS, hotMs: 1000 }).Play]) {
      const warmup = render(PlayOf, WARMUP);
      expect(warmup).toContain('data-warmup="true"');
      expect(warmup).toContain(rotiWarmupSkin.hintJa);
      expect(warmup).not.toContain('data-testid="minigame-meter"');
      const real = render(PlayOf, {});
      expect(real).not.toContain("data-warmup");
      expect(real).toContain(rotiSkin.hintJa);
      expect(real).toContain('data-testid="minigame-meter"');
      expect(real).toContain("mg-roti-rolling-target");
    }
  });
});
