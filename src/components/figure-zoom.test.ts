import { describe, expect, it } from "vitest";
import { DEFAULT_FACE_AT, faceAt, zoomedPlacement } from "./figure-zoom";

/** The eyes' height above the layer's bottom (percent) for a zoom: the CSS of zoomedPlacement, evaluated. */
function eyesAbove(style: ReturnType<typeof zoomedPlacement>, zoom: number, placement: { scale: number; originY: number }, face: number) {
  const [, rest, lowered] = /^calc\((-?[\d.]+)% - \(var\(--vn-zoom, 1\) - 1\) \* (-?[\d.]+)%\)$/.exec(String(style.bottom))!;
  const bottom = Number(rest) - (zoom - 1) * Number(lowered);
  const height = Number(/^calc\(([\d.]+)%/.exec(String(style.height))![1]) * zoom;
  const origin = placement.originY / 100;
  // The box's origin, then the eyes after the placement's scale about it (measured up from the box's bottom).
  return bottom + height * (1 - origin) + height * (origin - face) * placement.scale;
}

describe("the scene's camera (figure-zoom)", () => {
  it("reads the eyes from the pose's face frame, lower for a smaller figure", () => {
    expect(faceAt(null)).toBe(DEFAULT_FACE_AT);
    expect(faceAt({ face: { x: 512, y: 183, size: 302 }, canvas: { height: 1536 } })).toBeCloseTo(0.119, 3);
    expect(faceAt(null, 0.9)).toBeCloseTo(1 - (1 - DEFAULT_FACE_AT) * 0.9, 3);
  });

  it("keeps the eyes where they were while the box grows (top-origin and bottom-origin placements)", () => {
    for (const placement of [
      { x: 50, bottom: 0, width: 80, height: 62, scale: 1.4, originX: 50, originY: 0 },
      { x: 68, bottom: 4, width: 62, height: 82, scale: 1, originX: 50, originY: 100 },
    ]) {
      const style = zoomedPlacement(placement, 0.12);
      const atRest = eyesAbove(style, 1, placement, 0.12);
      for (const zoom of [1.15, 1.5]) expect(eyesAbove(style, zoom, placement, 0.12)).toBeCloseTo(atRest, 2);
      expect(style.width).toBe(`calc(${placement.width}% * var(--vn-zoom, 1))`);
      expect(style.left).toBe(`${placement.x}%`);
    }
  });
});
