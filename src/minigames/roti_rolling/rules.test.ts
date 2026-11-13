import { describe, expect, it } from "vitest";
import { centreStroke, shapeDragFairness, shapeMeasures, shapeOfRecord, type ShapeStroke } from "../engines/shape_drag/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { rotiRolling } from "./definition";
import { ROTI_AUTO, ROTI_SHAPES, ROTI_TUNING, rotiNote, rotiRules } from "./rules";

const UP = 270;
const times = (count: number, stroke: (index: number) => ShapeStroke) => Array.from({ length: count }, (_, index) => stroke(index));

// Edge records: nothing rolled (the time ran out), one stroke, a tap, strokes beside the board, far too many strokes.
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

  it("is fair: a tap is no stroke, keys roll, the time is long enough, a tear stays a tear", () => {
    expect(shapeDragFairness(ROTI_TUNING, ROTI_SHAPES)).toEqual([]);
  });

  it("squares the dough off when rolled up and down only (the quarter turns do the rest): Harbans's truck bed", () => {
    expect(outcome(times(6, () => centreStroke(UP, 0.5)))).toBe("truck_bed");
    expect(outcome(times(8, (index) => centreStroke(index % 2 ? 90 : UP, 0.45)))).toBe("truck_bed");
    // The keys' way: the same arrow every time.
    expect(outcome(times(7, () => centreStroke(UP, ROTI_TUNING.keyStroke)))).toBe("truck_bed");
  });

  it("rounds it when rolled a new way each time (straight and slanting strokes mixed)", () => {
    expect(outcome(times(8, (index) => centreStroke(index * 45, 0.5)))).toBe("round");
    expect(outcome(times(8, (index) => centreStroke(index % 4 < 2 ? UP : UP + 45, 0.5)))).toBe("round");
  });

  it("makes some country of a lopsided or barely rolled dough", () => {
    expect(outcome([])).toBe("country");
    expect(outcome([centreStroke(UP, 0.5)])).toBe("country");
    expect(outcome(ROTI_AUTO.country)).toBe("country");
  });

  it("tears when rolled too thin or past the board, and the play ends there", () => {
    expect(outcome(times(12, (index) => centreStroke(index * 45, 0.6)))).toBe("torn");
    expect(outcome(times(8, () => centreStroke(UP, 1)))).toBe("torn");
    const torn = shapeOfRecord(ROTI_AUTO.torn, ROTI_TUNING, ROTI_SHAPES);
    expect(torn.strokes).toBeLessThan(ROTI_AUTO.torn.length);
  });

  it("says so before a tear", () => {
    const start = shapeMeasures(shapeOfRecord([], ROTI_TUNING, ROTI_SHAPES), ROTI_TUNING);
    expect(rotiNote(start)).toBeNull();
    expect(rotiNote({ ...start, area: 9 })).toBe("生地がうすくなってきた");
    expect(rotiNote({ ...start, span: 0.9 })).toBe("板からはみ出しそう");
    // Every way to a tear passes a warning first, at the stroke before it.
    for (const record of [times(12, (index) => centreStroke(index * 45, 0.5)), times(12, () => centreStroke(UP, 0.5)), times(8, (index) => centreStroke(index % 2 ? 0 : UP, 0.5))]) {
      const torn = shapeOfRecord(record, ROTI_TUNING, ROTI_SHAPES);
      expect(rotiRules.outcomeOf(record, {})).toBe("torn");
      const before = shapeMeasures(shapeOfRecord(record.slice(0, torn.strokes - 1), ROTI_TUNING, ROTI_SHAPES), ROTI_TUNING);
      expect(rotiNote(before), JSON.stringify(before)).not.toBeNull();
    }
  });
});
