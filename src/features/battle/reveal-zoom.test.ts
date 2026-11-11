import { describe, expect, it } from "vitest";
import { REVEAL_MAX_SCALE, revealZoom } from "./reveal-zoom";

type Region = { x: number; y: number; width: number; height: number };
/** Where a point of the photo (a fraction of it) shows in the frame once zoomed. */
const shown = (point: number, origin: number, scale: number) => origin + scale * (point - origin);

describe("the reveal's zoom toward a question's region", () => {
  it("zooms toward a small region and centres it, no further than the most it zooms", () => {
    const zoom = revealZoom({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 });
    expect(zoom.scale).toBe(REVEAL_MAX_SCALE);
    expect(zoom.originX).toBeCloseTo(0.5);
    expect(zoom.originY).toBeCloseTo(0.5);
    // The sample's clock face (the hotspot's region): its centre comes to the frame's centre.
    const face = { x: 0.41, y: 0.23, width: 0.18, height: 0.26 };
    const sample = revealZoom(face);
    expect(shown(face.x + face.width / 2, sample.originX, sample.scale)).toBeCloseTo(0.5);
    expect(shown(face.y + face.height / 2, sample.originY, sample.scale)).toBeCloseTo(0.5);
  });

  it("only outlines a region that already fills most of the photo", () => {
    expect(revealZoom({ x: 0.1, y: 0.1, width: 0.8, height: 0.5 }).scale).toBe(1);
    expect(revealZoom({ x: 0, y: 0, width: 1, height: 1 }).scale).toBe(1);
  });

  it("keeps the zoomed photo over the whole frame and the whole region in it, at the edges too", () => {
    const regions: Region[] = [
      { x: 0, y: 0, width: 0.1, height: 0.1 },
      { x: 0.9, y: 0.85, width: 0.1, height: 0.15 },
      { x: 0, y: 0.6, width: 0.3, height: 0.4 },
      { x: 0.7, y: 0, width: 0.3, height: 0.05 },
      { x: 0.45, y: 0.2, width: 0.02, height: 0.6 },
    ];
    for (const region of regions) {
      const { scale, originX, originY } = revealZoom(region);
      expect(scale).toBeGreaterThanOrEqual(1);
      expect(scale).toBeLessThanOrEqual(REVEAL_MAX_SCALE);
      for (const [start, size, origin] of [[region.x, region.width, originX], [region.y, region.height, originY]]) {
        expect(origin).toBeGreaterThanOrEqual(0);
        expect(origin).toBeLessThanOrEqual(1);
        expect(shown(0, origin, scale)).toBeLessThanOrEqual(0);
        expect(shown(1, origin, scale)).toBeGreaterThanOrEqual(1);
        expect(shown(start, origin, scale)).toBeGreaterThanOrEqual(-1e-9);
        expect(shown(start + size, origin, scale)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});
