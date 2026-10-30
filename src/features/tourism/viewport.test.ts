import { describe, expect, it } from "vitest";
import {
  constrainView,
  fittedSize,
  focusRegion,
  INITIAL_VIEW,
  MAX_SCALE,
  regionCenter,
  transformGesture,
} from "./viewport";

const image = { width: 2400, height: 1200 };
const mobile = { width: 320, height: 240 };

describe("observation viewport geometry", () => {
  it("fits a wide painting without cropping and centers its shorter axis", () => {
    expect(fittedSize(image, mobile)).toEqual({ width: 320, height: 160 });
    expect(constrainView({ scale: 1, x: 100, y: -100 }, image, mobile)).toEqual(
      INITIAL_VIEW,
    );
  });

  it("bounds oversized image edges and zoom limits after arbitrarily large drags", () => {
    expect(
      constrainView({ scale: 2, x: 10000, y: -10000 }, image, mobile),
    ).toEqual({ scale: 2, x: 160, y: -40 });
    expect(
      constrainView({ scale: 100, x: 10000, y: 10000 }, image, mobile),
    ).toEqual({ scale: MAX_SCALE, x: 640, y: 280 });
    expect(constrainView({ scale: 0.3, x: 20, y: 30 }, image, mobile)).toEqual(
      INITIAL_VIEW,
    );
  });

  it("keeps a pointed image location under the same point while zooming", () => {
    const view = transformGesture(
      INITIAL_VIEW,
      image,
      mobile,
      { x: 240, y: 120 },
      { x: 240, y: 120 },
      2,
    );
    expect(view).toEqual({ scale: 2, x: -80, y: 0 });
    expect(
      regionCenter(
        { x: 0.7, y: 0.45, width: 0.1, height: 0.1 },
        view,
        image,
        mobile,
      ),
    ).toEqual({ x: 240, y: 120 });
  });

  it("combines pinch midpoint movement and zoom without accumulating a jump", () => {
    const view = transformGesture(
      INITIAL_VIEW,
      image,
      mobile,
      { x: 160, y: 120 },
      { x: 190, y: 135 },
      3,
    );
    expect(view).toEqual({ scale: 3, x: 30, y: 15 });
    const singleFinger = transformGesture(
      view,
      image,
      mobile,
      { x: 230, y: 135 },
      { x: 240, y: 135 },
      1,
    );
    expect(singleFinger).toEqual({ scale: 3, x: 40, y: 15 });
  });

  it("focuses a middle detail at the viewport center while respecting max zoom", () => {
    const region = { x: 0.6, y: 0.4, width: 0.08, height: 0.1 };
    const view = focusRegion(region, image, mobile);
    expect(view.scale).toBe(MAX_SCALE);
    const center = regionCenter(region, view, image, mobile);
    expect(center.x).toBeCloseTo(160);
    expect(center.y).toBeCloseTo(120);
  });

  it("focuses edge details as closely as possible without revealing empty edges", () => {
    const region = { x: 0, y: 0, width: 0.1, height: 0.1 };
    const view = focusRegion(region, image, mobile);
    expect(view).toEqual({ scale: 5, x: 640, y: 280 });
    const center = regionCenter(region, view, image, mobile);
    expect(center.x).toBeGreaterThan(0);
    expect(center.y).toBeGreaterThan(0);
  });

  it("clamps the current position after viewport orientation or size changes", () => {
    const portrait = constrainView({ scale: 2, x: 160, y: 40 }, image, {
      width: 240,
      height: 320,
    });
    expect(portrait).toEqual({ scale: 2, x: 120, y: 0 });
    const wide = constrainView(portrait, image, { width: 720, height: 200 });
    expect(wide).toEqual({ scale: 2, x: 40, y: 0 });
  });

  it("places the same relative detail correctly at mobile and desktop sizes", () => {
    const region = { x: 0.2, y: 0.4, width: 0.1, height: 0.2 };
    expect(regionCenter(region, INITIAL_VIEW, image, mobile)).toEqual({
      x: 80,
      y: 120,
    });
    expect(
      regionCenter(region, INITIAL_VIEW, image, { width: 800, height: 600 }),
    ).toEqual({ x: 200, y: 300 });
  });
});
