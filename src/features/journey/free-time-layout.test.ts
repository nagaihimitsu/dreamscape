import { describe, expect, it } from "vitest";
import { mapSticks, stuckListArea } from "./free-time-layout";

describe("free time's sticky map", () => {
  it("leaves the list area of the spec's arithmetic (§3.4)", () => {
    expect(stuckListArea({ viewport: 568, hud: 96, band: 60, sideBySide: false })).toBe(264);
    expect(stuckListArea({ viewport: 460, hud: 96, band: 60, sideBySide: false })).toBe(156);
    expect(stuckListArea({ viewport: 553, hud: 96, band: 60, sideBySide: false })).toBe(249);
  });

  it("sticks while about two rows stay visible, and not below", () => {
    expect(mapSticks({ viewport: 460, hud: 96, band: 60, sideBySide: false })).toBe(true);
    expect(mapSticks({ viewport: 460, hud: 150, band: 80, sideBySide: false })).toBe(false);
    expect(mapSticks({ viewport: 453, hud: 96, band: 60, sideBySide: false })).toBe(false);
  });

  it("side by side, counts the whole height beside the map", () => {
    expect(stuckListArea({ viewport: 375, hud: 52, band: 60, sideBySide: true })).toBe(263);
    expect(mapSticks({ viewport: 320, hud: 52, band: 60, sideBySide: true })).toBe(true);
  });
});
