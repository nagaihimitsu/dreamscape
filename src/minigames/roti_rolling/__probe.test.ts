import { it } from "vitest";
import { centreStroke, shapeMeasures, shapeOfRecord, keyStroke } from "../engines/shape_drag/engine";
import { ROTI_WARMUP, ROTI_NUMBERS, ROTI_TUNING, ROTI_SHAPES } from "./rules";
import { rotiWarmupArrow } from "./Warmup";
it("probe", () => {
  const out: string[] = [];
  const t = ROTI_WARMUP.tuning;
  const m = (r: any) => { const s = shapeOfRecord(r, t, ROTI_WARMUP.shapes); const x = shapeMeasures(s, t); return `${x.strokes} area ${x.area.toFixed(2)} span ${x.span.toFixed(3)} round ${x.roundness.toFixed(3)} box ${x.boxiness.toFixed(3)} -> ${ROTI_WARMUP.rules.outcomeOf(r, { warmup: "yes" })}`; };
  for (const a of [0, 20, 30, 45, 60, 70, 80, 90]) out.push(`cross ${a} ${m([centreStroke(270, 0.5), centreStroke(270 + a, 0.5)])}`);
  for (const l of [0.1, 0.2, 0.3, 0.5, 0.9]) out.push(`len ${l} ${m([centreStroke(270, l), centreStroke(0, l)])}`);
  out.push(`keys ${m([keyStroke("ArrowUp", false, t)!, keyStroke("ArrowRight", false, t)!])}`);
  out.push(`one ${m([centreStroke(270, 0.5)])} none ${m([])}`);
  const rec: any[] = [];
  for (let i = 0; i < 2; i++) { const s = shapeOfRecord(rec, t, ROTI_WARMUP.shapes); rec.push(centreStroke(rotiWarmupArrow(s.rolls), 0.4)); }
  out.push(`arrow ${m(rec)}`);
  out.push(`real start span ${shapeMeasures(shapeOfRecord([], ROTI_TUNING, ROTI_SHAPES), ROTI_TUNING).span} ring ${ROTI_NUMBERS.bigSpan}`);
  require("node:fs").writeFileSync(process.env.PROBE_OUT!, out.join("\n"));
});
