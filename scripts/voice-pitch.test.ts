import { describe, expect, it } from "vitest";
import { PITCH_RATE, pitchStats, semitonesBetween } from "./voice-pitch";

// voice:pitch (2026-11-17): the pitch of a recording, for casting the voices other than the heroine's. Synthetic tones
// stand in for voices (a voice's harmonics make no difference to the period the tracker finds).

/** A tone of `hz` (with two harmonics) for `seconds`, then as much silence. */
function tone(hz: number, seconds: number, silence = 0): Float32Array {
  const samples = new Float32Array(Math.round((seconds + silence) * PITCH_RATE));
  for (let index = 0; index < seconds * PITCH_RATE; index++) {
    const time = index / PITCH_RATE;
    samples[index] = 0.5 * Math.sin(2 * Math.PI * hz * time) + 0.2 * Math.sin(4 * Math.PI * hz * time) + 0.1 * Math.sin(6 * Math.PI * hz * time);
  }
  return samples;
}

describe("the pitch of a recording", () => {
  it("finds the pitch of a steady tone, low and high", () => {
    const low = pitchStats(tone(110, 1))!;
    expect(low.f0MedianHz).toBeCloseTo(110, 0);
    expect(low.semitoneRangeP10P90).toBeLessThan(0.2);
    expect(pitchStats(tone(245, 1))!.f0MedianHz).toBeCloseTo(245, 0);
  });

  it("measures only the voiced part, and says how much of the file it is", () => {
    const stats = pitchStats(tone(200, 1, 1))!;
    expect(stats.durationS).toBe(2);
    expect(stats.voicedRatio).toBeGreaterThan(0.45);
    expect(stats.voicedRatio).toBeLessThan(0.52);
  });

  it("gives the spread of a voice that moves, in semitones, without octave errors", () => {
    const moving = new Float32Array([...tone(160, 0.6), ...tone(240, 0.6)]);
    const stats = pitchStats(moving)!;
    expect(stats.f0P10Hz).toBeCloseTo(160, 0);
    expect(stats.f0P90Hz).toBeCloseTo(240, 0);
    expect(stats.semitoneRangeP10P90).toBeCloseTo(7, 0);
    // A frame an octave from the median (a tracker's octave error) is dropped.
    const withOctave = pitchStats(new Float32Array([...tone(160, 1), ...tone(330, 0.1)]))!;
    expect(withOctave.f0P90Hz).toBeLessThan(170);
  });

  it("finds nothing in silence or an empty file", () => {
    expect(pitchStats(new Float32Array(PITCH_RATE))).toBeUndefined();
    expect(pitchStats(new Float32Array(0))).toBeUndefined();
  });

  it("tells how far apart two voices are", () => {
    expect(semitonesBetween(245, 196)).toBe(3.9);
    expect(semitonesBetween(220, 440)).toBe(-12);
  });
});
