import { describe, expect, it } from "vitest";
import { countLines, fitScale } from "./fit-text";

describe("fitScale", () => {
  // Words that need `width` pixels at 1px a pixel of size, in a heading `room` wide: as many lines as it takes.
  const lines = (width: number, room: number, basePx: number) => (scale: number) => Math.ceil((width * scale * basePx) / room);

  it("keeps the heading's size when the words fit on one line", () => {
    expect(fitScale(20, lines(10, 288, 20), { minScale: 0.8, maxLines: 2 })).toBe(1);
  });

  it("shrinks to the largest whole pixel that keeps one line, not below minScale", () => {
    // 17 characters: 340px at 20px, 272px at 16px, in 288px.
    expect(fitScale(20, lines(17, 288, 20), { minScale: 0.8, maxLines: 2 })).toBe(16 / 20);
  });

  it("takes two lines at the full size when one line would need a size below minScale", () => {
    expect(fitScale(20, lines(24, 288, 20), { minScale: 0.8, maxLines: 2 })).toBe(1);
  });

  it("shrinks to keep two lines, and takes the smallest when nothing fits", () => {
    expect(fitScale(20, lines(32, 288, 20), { minScale: 0.8, maxLines: 2 })).toBe(18 / 20);
    expect(fitScale(20, lines(60, 288, 20), { minScale: 0.8, maxLines: 2 })).toBe(16 / 20);
  });

  it("measures a few times only", () => {
    let measured = 0;
    const count = lines(17, 288, 20);
    fitScale(20, (scale) => { measured += 1; return count(scale); }, { minScale: 0.5, maxLines: 2 });
    expect(measured).toBeLessThanOrEqual(5);
  });
});

describe("countLines", () => {
  it("counts the boxes' lines, leaving out empty boxes", () => {
    expect(countLines([])).toBe(0);
    expect(countLines([{ top: 10, width: 40, height: 27 }, { top: 10.5, width: 30, height: 27 }, { top: 10, width: 0, height: 27 }])).toBe(1);
    expect(countLines([{ top: 37, width: 40, height: 27 }, { top: 10, width: 40, height: 27 }, { top: 11, width: 20, height: 27 }])).toBe(2);
  });
});
