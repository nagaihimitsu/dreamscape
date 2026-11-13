import { describe, expect, it } from "vitest";
import { setVoiceElementRate } from "./voice-element";

// Debug's speed of the voices plays a voice on an audio element so that its pitch stays (voice-element.ts).

describe("the voice element's speed", () => {
  it("keeps the pitch (the standard name and the prefixed ones) and sets the rate for this voice and the next load", () => {
    const element = { playbackRate: 1, defaultPlaybackRate: 1, preservesPitch: false };
    setVoiceElementRate(element, 1.25);
    expect(element).toEqual({
      playbackRate: 1.25, defaultPlaybackRate: 1.25, preservesPitch: true, webkitPreservesPitch: true, mozPreservesPitch: true,
    });
    setVoiceElementRate(element, 0.75);
    expect([element.playbackRate, element.defaultPlaybackRate, element.preservesPitch]).toEqual([0.75, 0.75, true]);
  });
});
