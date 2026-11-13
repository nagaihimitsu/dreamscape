import { describe, expect, it } from "vitest";
import { centreStroke, shapeDragFairness, shapeHeavy, shapeMeasures, shapeOfRecord, shapeRoll, shapeStart, type ShapeStroke } from "../engines/shape_drag/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { rotiRolling } from "./definition";
import { ROTI_AUTO, ROTI_BIG_SPAN, ROTI_SHAPES, ROTI_TUNING, rotiDetail, rotiNote, rotiRoundness, rotiRules } from "./rules";
import { rotiArrowDegrees } from "./Skin";

const UP = 270;
const times = (count: number, stroke: (index: number) => ShapeStroke) => Array.from({ length: count }, (_, index) => stroke(index));
const measuresOf = (record: readonly ShapeStroke[]) => shapeMeasures(shapeOfRecord(record, ROTI_TUNING, ROTI_SHAPES), ROTI_TUNING);

// Edge records: nothing rolled, one stroke, a tap, strokes beside the board, far too many strokes.
describeMiniGameRules(rotiRolling, rotiRules, {
  records: [
    [],
    [centreStroke(UP, 0.5)],
    [{ from: { x: 0.5, y: 0.5 }, to: { x: 0.5, y: 0.5 } }],
    [{ from: { x: 0, y: 0 }, to: { x: 0, y: 1 } }, { from: { x: 1, y: 1 }, to: { x: 0.98, y: 0 } }],
    times(40, (index) => centreStroke(index * 37, 0.6)),
  ],
});

describe("the roti's shapes", () => {
  const outcome = (strokes: readonly ShapeStroke[]) => rotiRules.outcomeOf(strokes, {});

  it("is fair: a tap is no stroke, keys roll, 8 strokes end it, a tear stays a tear, the pin gets heavier near it", () => {
    expect(shapeDragFairness(ROTI_TUNING, ROTI_SHAPES)).toEqual([]);
    expect(ROTI_TUNING.maxStrokes).toBe(8);
    expect(ROTI_TUNING.timeMs).toBeNull();
    expect(shapeOfRecord(times(12, (index) => centreStroke(index * 45, 0.3)), ROTI_TUNING, ROTI_SHAPES).strokes).toBe(8);
  });

  it("rounds it when rolled the arrows' way (an eighth round further each time), from any first way", () => {
    for (const first of [0, 45, 90, 135, 180, 225, 270, 315]) expect(outcome(times(8, (index) => centreStroke(first + index * 45, 0.5))), `from ${first}`).toBe("round");
    // Shorter strokes round it too, only smaller; 「できた」 after four already round.
    expect(outcome(times(8, (index) => centreStroke(index * 45, 0.35)))).toBe("round");
    expect(outcome(times(4, (index) => centreStroke(index * 45, 0.5)))).toBe("round");
    // The skin's arrows: the first from the seed, then an eighth round further each stroke.
    expect(rotiArrowDegrees(7, 1) - rotiArrowDegrees(7, 0)).toSatisfy((turn: number) => turn === 45 || turn === -315);
    expect(rotiArrowDegrees(7, 0) % 45).toBe(0);
  });

  it("squares the dough off when rolled up and down only (the quarter turns do the rest): Harbans's truck bed, before round", () => {
    expect(outcome(times(6, () => centreStroke(UP, 0.5)))).toBe("truck_bed");
    expect(outcome(times(8, (index) => centreStroke(index % 2 ? 90 : UP, 0.45)))).toBe("truck_bed");
    // The keys' way: the same arrow every time.
    expect(outcome(times(7, () => centreStroke(UP, ROTI_TUNING.keyStroke)))).toBe("truck_bed");
    // A rounded box can be round enough by the meter: the meter says it is boxy.
    const box = measuresOf(times(6, () => centreStroke(UP, 0.5)));
    expect(box.roundness).toBeGreaterThanOrEqual(0.8);
    expect(rotiRoundness(box).boxy).toBe(true);
  });

  it("makes some country of a lopsided or barely rolled dough", () => {
    expect(outcome([])).toBe("country");
    expect(outcome([centreStroke(UP, 0.5)])).toBe("country");
    expect(outcome(ROTI_AUTO.country)).toBe("country");
  });

  it("tears when rolled too thin or past the board, and the play ends there", () => {
    expect(outcome(times(8, (index) => centreStroke(index * 45, 0.75)))).toBe("torn");
    expect(outcome(times(8, () => centreStroke(UP, 1)))).toBe("torn");
    const torn = shapeOfRecord(times(8, (index) => centreStroke(index * 45, 0.9)), ROTI_TUNING, ROTI_SHAPES);
    expect(torn.strokes).toBeLessThan(8);
  });

  it("says so before a tear, and the pin pushes less from then on", () => {
    const start = shapeMeasures(shapeStart(ROTI_TUNING), ROTI_TUNING);
    expect(rotiNote(start)).toBeNull();
    expect(rotiNote({ ...start, area: 9 })).toBe("生地がうすくなってきた");
    expect(rotiNote({ ...start, span: 0.9 })).toBe("板からはみ出しそう");
    // Every way to a tear passes a warning first, at the stroke before it.
    for (const record of [times(8, (index) => centreStroke(index * 45, 0.8)), times(8, () => centreStroke(UP, 0.8)), times(8, (index) => centreStroke(index % 2 ? 0 : UP, 0.5))]) {
      const torn = shapeOfRecord(record, ROTI_TUNING, ROTI_SHAPES);
      expect(rotiRules.outcomeOf(record, {})).toBe("torn");
      const before = measuresOf(record.slice(0, torn.strokes - 1));
      expect(rotiNote(before), JSON.stringify(before)).not.toBeNull();
    }
    // Heavy near a tear: the same stroke pushes less.
    const near = shapeOfRecord(times(7, (index) => centreStroke(index * 45, 0.6)), ROTI_TUNING, ROTI_SHAPES);
    expect(shapeHeavy(near, ROTI_TUNING)).toBe(true);
    const stroke = centreStroke(0, 0.6);
    const light = shapeMeasures(shapeRoll(near, stroke, { ...ROTI_TUNING, heavy: undefined }), ROTI_TUNING);
    const heavy = shapeMeasures(shapeRoll(near, stroke, ROTI_TUNING), ROTI_TUNING);
    expect(heavy.area).toBeLessThan(light.area);
  });

  it("shows how round (and big) it came out, never for a hole", () => {
    const round = measuresOf(times(8, (index) => centreStroke(index * 45, 0.5)));
    expect(round.span).toBeGreaterThanOrEqual(ROTI_BIG_SPAN);
    expect(rotiDetail(round, "round")).toBe(`丸さ ${Math.round(round.roundness * 100)}%・大きさ ◎`);
    const small = measuresOf(times(4, (index) => centreStroke(index * 45, 0.5)));
    expect(rotiDetail(small, "round")).toBe(`丸さ ${Math.round(small.roundness * 100)}%`);
    expect(rotiDetail(round, "torn")).toBeUndefined();
  });
});
