import { describe, expect, it } from "vitest";
import { pictureTopAt, zoomedPlacement } from "./figure-zoom";

/** The height of a point of the box (`at`, 0 its top) above the layer's bottom (percent) for a zoom: zoomedPlacement's CSS, evaluated. */
function heightAbove(style: ReturnType<typeof zoomedPlacement>, zoom: number, placement: { scale: number; originY: number }, at: number) {
  const [, rest, lowered] = /^calc\((-?[\d.]+)% - \(var\(--vn-zoom, 1\) - 1\) \* (-?[\d.]+)%\)$/.exec(String(style.bottom))!;
  const bottom = Number(rest) - (zoom - 1) * Number(lowered);
  const height = Number(/^calc\(([\d.]+)%/.exec(String(style.height))![1]) * zoom;
  const origin = placement.originY / 100;
  // The box's origin, then the point after the placement's scale about it (measured up from the box's bottom).
  return bottom + height * (1 - origin) + height * (origin - at) * placement.scale;
}

describe("the scene's camera (figure-zoom)", () => {
  it("begins the picture at its box's top, lower for a smaller figure", () => {
    expect(pictureTopAt()).toBe(0);
    expect(pictureTopAt(0.9)).toBeCloseTo(0.1, 3);
  });

  it("keeps the picture's top where it was while the box grows, so the head never rises (top- and bottom-origin placements)", () => {
    for (const placement of [
      { x: 50, bottom: 0, width: 80, height: 62, scale: 1.4, originX: 50, originY: 0 },
      { x: 68, bottom: 4, width: 62, height: 82, scale: 1, originX: 50, originY: 100 },
    ]) {
      for (const top of [0, 0.1]) {
        const style = zoomedPlacement(placement, top);
        const atRest = heightAbove(style, 1, placement, top);
        for (const zoom of [1.15, 1.45]) {
          expect(heightAbove(style, zoom, placement, top)).toBeCloseTo(atRest, 2);
          // The eyes (an eighth down the picture) come down, never up.
          expect(heightAbove(style, zoom, placement, top + 0.12)).toBeLessThan(heightAbove(style, 1, placement, top + 0.12));
        }
        expect(style.width).toBe(`calc(${placement.width}% * var(--vn-zoom, 1))`);
        expect(style.left).toBe(`${placement.x}%`);
      }
    }
  });
});
