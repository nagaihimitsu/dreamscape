import { describe, expect, it } from "vitest";
import { centreStroke, shapeDragFairness, shapeHeavy, shapeMeasures, shapeOfRecord, shapeRoll, shapeSkids, shapeStart, type ShapeStroke } from "../engines/shape_drag/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { rotiRolling } from "./definition";
import {
  ROTI_AUTO, ROTI_BEAT, ROTI_BIG_SPAN, ROTI_GAME, ROTI_HAND, ROTI_NUMBERS, ROTI_SHAPES, ROTI_TUNING, ROTI_WAYS, ROTI_WINDOWS, rotiDetail, rotiGame,
  rotiNextWay, rotiNote, rotiRolledWays, rotiRoundness, rotiRules,
} from "./rules";

const UP = 270;
const measuresOf = (record: readonly ShapeStroke[]) => shapeMeasures(shapeOfRecord(record, ROTI_TUNING, ROTI_SHAPES), ROTI_TUNING);
/** A stroke in a window of Harbans's beat (a calm one, 300 ms after it opens). */
const inWindow = (stroke: ShapeStroke, index: number, after = 300): ShapeStroke =>
  ({ ...stroke, downMs: ROTI_WINDOWS[index].from + after, upMs: ROTI_WINDOWS[index].from + after + 250 });
/** One stroke each window, the arrow's way (`length` long), or the screen's way `degrees` when given. */
function play({ length = 0.5, degrees, windows = ROTI_WINDOWS.length }: { length?: number; degrees?: number; windows?: number } = {}): ShapeStroke[] {
  const strokes: ShapeStroke[] = [];
  for (let index = 0; index < windows; index++) {
    const at = ROTI_WINDOWS[index].from + 300;
    const state = shapeOfRecord(strokes, ROTI_TUNING, ROTI_SHAPES, at);
    strokes.push(inWindow(centreStroke(degrees ?? rotiNextWay(state.rolls) + state.turned, length), index));
  }
  return strokes;
}

// Edge records: nothing rolled, one stroke, a tap, strokes beside the board, far too many strokes (no times: all at 0).
describeMiniGameRules(rotiRolling, rotiRules, {
  records: [
    [],
    [centreStroke(UP, 0.5)],
    [{ from: { x: 0.5, y: 0.5 }, to: { x: 0.5, y: 0.5 } }],
    [{ from: { x: 0, y: 0 }, to: { x: 0, y: 1 } }, { from: { x: 1, y: 1 }, to: { x: 0.98, y: 0 } }],
    Array.from({ length: 40 }, (_, index) => centreStroke(index * 37, 0.6)),
    [{ ...centreStroke(UP, 0.5), downMs: Number.NaN, upMs: -5 }],
  ],
});

describe("Harbans's beat", () => {
  it("is fair: windows a reaction and a stroke long, his hand seen coming, a tap is no stroke, keys roll", () => {
    expect(shapeDragFairness(ROTI_TUNING, ROTI_SHAPES)).toEqual([]);
    expect(ROTI_TUNING.turnDeg).toBe(0);
    expect(ROTI_TUNING.timeMs).toBeNull();
    expect(ROTI_TUNING.maxStrokes).toBeNull();
    // About 16 seconds from スタート (the instruction card's 約17秒).
    expect(ROTI_HAND.endMs).toBeGreaterThan(15000);
    expect(ROTI_HAND.endMs).toBeLessThan(17500);
    expect(Math.round(ROTI_HAND.endMs / 1000)).toBeLessThanOrEqual(rotiRolling.durationSec!);
  });

  it("changes as it goes: a calm opening, the twist (a long pause, a quick pair, a feint, a breath), a hot climax", () => {
    expect(ROTI_WINDOWS.map((window) => window.kind)).toEqual(["open", "open", "open", "pause", "quick", "quick", "breath", "hot", "hot", "hot"]);
    const length = (kind: string) => ROTI_WINDOWS.find((window) => window.kind === kind)!.to - ROTI_WINDOWS.find((window) => window.kind === kind)!.from;
    expect(length("pause")).toBeGreaterThan(length("open"));
    expect(length("open")).toBeGreaterThan(length("quick"));
    expect(length("quick")).toBeGreaterThan(length("hot"));
    // His visits: a quarter turn each, but the feint after the quick pair turns nothing.
    expect(ROTI_HAND.turns.map((item) => item.deg)).toEqual(ROTI_BEAT.slice(0, -1).map((beat) => (beat.then === "feint" ? 0 : 90)));
    expect(ROTI_HAND.turns.filter((item) => item.deg === 0)).toHaveLength(1);
  });

  it("skids a stroke into his hand (lopsided and weaker), not one in a window", () => {
    const visit = ROTI_HAND.turns[0].at;
    const into = { ...centreStroke(UP, 0.5), downMs: visit - 100, upMs: visit + 50 };
    expect(shapeSkids(into, ROTI_HAND)).toBe(true);
    expect(shapeSkids(inWindow(centreStroke(UP, 0.5), 0), ROTI_HAND)).toBe(false);
    expect(measuresOf([into]).area).toBeLessThan(measuresOf([inWindow(centreStroke(UP, 0.5), 0)]).area);
    // Every window has room for a reaction and a stroke between his visits.
    for (const window of ROTI_WINDOWS) expect(window.to - window.from).toBeGreaterThanOrEqual(650);
  });

  it("builds the same roti from its numbers, and another from edited ones (Debug's room)", () => {
    expect(rotiGame(ROTI_NUMBERS).tuning).toEqual(ROTI_TUNING);
    const slower = rotiGame({ ...ROTI_NUMBERS, hotMs: 1000, roundness: 0.9 });
    expect(slower.hand.endMs).toBe(ROTI_HAND.endMs + 3 * 260);
    expect(shapeDragFairness(slower.tuning, slower.shapes)).toEqual([]);
    expect(slower.shapes.classes.find((item) => item.outcome === "round")?.atLeast?.roundness).toBe(0.9);
    // Too short a window in the room is named as unfair (the room says so; it still plays).
    const rushed = rotiGame({ ...ROTI_NUMBERS, hotMs: 300 });
    expect(shapeDragFairness(rushed.tuning, rushed.shapes).join()).toContain("window");
  });
});

describe("the roti's shapes", () => {
  const outcome = (strokes: readonly ShapeStroke[]) => rotiRules.outcomeOf(strokes, {});

  it("advises the way of the dough rolled least, in the seed's order when alike", () => {
    expect(rotiNextWay([])).toBe(0);
    expect(rotiNextWay([], [90, 0, 45, 135])).toBe(90);
    const rolls = [{ degrees: 2, push: 0.08, skid: false, at: 0 }, { degrees: 93, push: 0.08, skid: false, at: 0 }];
    expect(rotiRolledWays(rolls)).toEqual([0.08, 0, 0.08, 0]);
    expect(rotiNextWay(rolls)).toBe(45);
    expect(rotiNextWay(rolls, [135, 45, 0, 90])).toBe(135);
    expect(ROTI_WAYS).toEqual([0, 45, 90, 135]);
  });

  it("rounds it when rolled the arrow's way once a window (twice in the pause), from any order of ways", () => {
    expect(outcome(ROTI_AUTO.round)).toBe("round");
    expect(rotiRules.rate!(ROTI_AUTO.round, {})).toMatchObject({ stars: 3 });
    expect(outcome(play())).toBe("round");
    // Shorter strokes round it too, only smaller (★2); 「できた」 after six already round.
    expect(outcome(play({ length: 0.35 }))).toBe("round");
    expect(rotiRules.rate!(play({ length: 0.35 }), {})).toMatchObject({ stars: 2 });
    expect(outcome(play({ windows: 6 }))).toBe("round");
  });

  it("squares the dough off when rolled the same way of the screen every window (his quarter turns do the rest): Harbans's truck bed, before round", () => {
    expect(outcome(ROTI_AUTO.truck_bed)).toBe("truck_bed");
    expect(outcome(play({ degrees: 90, length: 0.5 }))).toBe("truck_bed");
    // A rounded box may read nearly round by the meter: the meter says it is boxy.
    expect(rotiRoundness(measuresOf(ROTI_AUTO.truck_bed)).boxy).toBe(true);
  });

  it("makes some country of a lopsided, skidded or barely rolled dough", () => {
    expect(outcome([])).toBe("country");
    expect(outcome([inWindow(centreStroke(UP, 0.5), 0)])).toBe("country");
    expect(outcome(ROTI_AUTO.country)).toBe("country");
    // The arrow's strokes all into his hand instead of the windows: smaller and less round than the same strokes in time.
    const clean = play();
    const skidded = clean.map((stroke, index) => {
      const visit = ROTI_HAND.turns[Math.min(index, ROTI_HAND.turns.length - 1)].at;
      return { ...stroke, downMs: visit - 150, upMs: visit + 50 };
    });
    expect(skidded.every((stroke) => shapeSkids(stroke, ROTI_HAND))).toBe(true);
    expect(measuresOf(skidded).area).toBeLessThan(measuresOf(clean).area);
    expect(measuresOf(skidded).roundness).toBeLessThan(measuresOf(clean).roundness);
  });

  it("tears when rolled too long, and the play ends there", () => {
    expect(outcome(ROTI_AUTO.torn)).toBe("torn");
    expect(shapeOfRecord(ROTI_AUTO.torn, ROTI_TUNING, ROTI_SHAPES).strokes).toBeLessThan(ROTI_AUTO.torn.length);
    expect(outcome(play({ length: 0.8 }))).toBe("torn");
  });

  it("says so before a tear, and the pin pushes less from then on", () => {
    const start = shapeMeasures(shapeStart(ROTI_TUNING), ROTI_TUNING);
    expect(rotiNote(start)).toBeNull();
    expect(rotiNote({ ...start, area: 12 })).toBe("生地がうすくなってきた");
    expect(rotiNote({ ...start, span: 0.8 })).toBe("板からはみ出しそう");
    // A stroke pushes at most less than the gap from the warning to the tear: every way to a tear passes a warning first.
    expect(ROTI_NUMBERS.maxPush).toBeLessThan(ROTI_NUMBERS.tearSpan - ROTI_NUMBERS.warnSpan);
    for (const record of [play({ length: 0.75 }), play({ length: 0.9 }), play({ degrees: UP, length: 0.9 })]) {
      const torn = shapeOfRecord(record, ROTI_TUNING, ROTI_SHAPES);
      expect(rotiRules.outcomeOf(record, {})).toBe("torn");
      const before = measuresOf(record.slice(0, torn.strokes - 1));
      expect(rotiNote(before), JSON.stringify(before)).not.toBeNull();
    }
    // Heavy near a tear: the same stroke pushes less.
    const near = shapeOfRecord(play({ length: 0.6, windows: 9 }), ROTI_TUNING, ROTI_SHAPES);
    expect(shapeHeavy(near, ROTI_TUNING)).toBe(true);
    const stroke = centreStroke(0, 0.6);
    const light = shapeMeasures(shapeRoll(near, stroke, { ...ROTI_TUNING, heavy: undefined }), ROTI_TUNING);
    const heavy = shapeMeasures(shapeRoll(near, stroke, ROTI_TUNING), ROTI_TUNING);
    expect(heavy.area).toBeLessThan(light.area);
  });

  it("shows how round (and big) it came out, how boxy a box, never for a hole; まん丸 only for the ★3 one (group2 N2, N3)", () => {
    const round = measuresOf(ROTI_AUTO.round);
    expect(round.span).toBeGreaterThanOrEqual(ROTI_BIG_SPAN);
    expect(round.roundness).toBeGreaterThanOrEqual(ROTI_NUMBERS.perfectRoundness);
    expect(rotiDetail(round, "round")).toBe(`丸さ ${Math.round(round.roundness * 100)}%・まん丸・大きさ ◎`);
    const small = measuresOf(play({ windows: 5 }));
    expect(rotiDetail(small, "round")).toBe(`丸さ ${Math.round(small.roundness * 100)}%`);
    // Big but egg-shaped (round enough, not まん丸): no まん丸.
    const egg = { ...round, roundness: 0.84 };
    expect(rotiDetail(egg, "round")).toBe("丸さ 84%・大きさ ◎");
    expect(ROTI_GAME.perfect(egg)).toBe(false);
    // By the percent shown: 「88%」 is always まん丸.
    expect(ROTI_GAME.perfect({ ...round, roundness: 0.8751 })).toBe(true);
    expect(ROTI_GAME.perfect({ ...round, roundness: 0.8749 })).toBe(false);
    expect(rotiDetail(round, "torn")).toBeUndefined();
    const box = measuresOf(ROTI_AUTO.truck_bed);
    expect(rotiDetail(box, "truck_bed")).toBe(`四角さ ${Math.round(box.boxiness * 100)}%`);
    expect(rotiDetail(measuresOf(ROTI_AUTO.country), "country")).toMatch(/^丸さ \d+%$/u);
  });

  it("rates in step with the outcome: まん丸 (big, 88%) ★3, other round ★2, a box, a country or a hole ★1", () => {
    const rate = (strokes: readonly ShapeStroke[]) => rotiRules.rate!(strokes, {});
    expect(rate(ROTI_AUTO.round)).toEqual({ stars: 3, scoreJa: rotiDetail(measuresOf(ROTI_AUTO.round), "round") });
    expect(rate(ROTI_AUTO.truck_bed)).toMatchObject({ stars: 1, scoreJa: expect.stringMatching(/^四角さ \d+%$/u) });
    expect(rate(ROTI_AUTO.country)).toMatchObject({ stars: 1 });
    expect(rate(ROTI_AUTO.torn)).toEqual({ stars: 1 });
    // Over many plays (one stroke a window, sloppy ways and lengths, some into his hand), a round one never has fewer ★.
    let seed = 11;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    let lowestRound = 3;
    let highestOther = 1;
    for (let round = 0; round < 200; round++) {
      const strokes: ShapeStroke[] = [];
      for (const [index, window] of ROTI_WINDOWS.entries()) {
        const late = random() < 0.15 ? 500 : 0;
        const state = shapeOfRecord(strokes, ROTI_TUNING, ROTI_SHAPES, window.from);
        const stroke = centreStroke(rotiNextWay(state.rolls) + state.turned + (random() - 0.5) * 60, 0.3 + random() * 0.45);
        strokes.push({ ...stroke, downMs: window.to - 300 + late, upMs: window.to - 80 + late });
        if (index === 9) break;
      }
      const stars = rate(strokes)?.stars ?? 0;
      if (rotiRules.outcomeOf(strokes, {}) === "round") lowestRound = Math.min(lowestRound, stars);
      else highestOther = Math.max(highestOther, stars);
    }
    expect(highestOther).toBeLessThanOrEqual(lowestRound);
  });
});
