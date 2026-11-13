import { describe, expect, it } from "vitest";
import { DOUBLE_TAP_WINDOW_MS } from "./double-tap";
import { IGNORED_TAP_MS, ringRepeats } from "./ignored-tap";

// The ring of an ignored tap (2026-11-13): one ring for a burst of pointer events, short enough to be gone soon after
// the moment taps are ignored.

describe("an ignored tap's ring", () => {
  it("shows for the first tap and for taps apart, not for one a burst repeats", () => {
    expect(ringRepeats(null, 1000)).toBe(false);
    expect(ringRepeats(1000, 1050)).toBe(true);
    expect(ringRepeats(1000, 1200)).toBe(false);
    // A clock that went back (another page's time origin) never hides one.
    expect(ringRepeats(1000, 900)).toBe(false);
  });

  it("is gone within a moment of the ignored taps' window", () => {
    expect(IGNORED_TAP_MS).toBeLessThanOrEqual(DOUBLE_TAP_WINDOW_MS + 100);
  });
});
