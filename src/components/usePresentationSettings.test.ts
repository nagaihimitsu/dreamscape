import { describe, expect, it } from "vitest";
import { readPresentationSettings } from "./usePresentationSettings";

// The voice settings (2026-11-12): 「台詞の声を出す」 (`voice`) and 「声の大きさ」 (`voiceVolume`, 0 to 1).
const stored = (extra: Record<string, unknown> = {}) => JSON.stringify({ schemaVersion: 1, confirmChoices: true, reduceMotion: false, ...extra });

describe("the presentation settings' voice", () => {
  it("is on at 0.8 for settings stored without it, and with none stored", () => {
    expect(readPresentationSettings(stored())).toMatchObject({ voice: true, voiceVolume: 0.8 });
    expect(readPresentationSettings(null)).toMatchObject({ voice: true, voiceVolume: 0.8 });
  });

  it("reads what was stored, from no sound to full", () => {
    expect(readPresentationSettings(stored({ voice: false, voiceVolume: 0 }))).toMatchObject({ voice: false, voiceVolume: 0 });
    expect(readPresentationSettings(stored({ voiceVolume: 1 }))).toMatchObject({ voice: true, voiceVolume: 1 });
    expect(readPresentationSettings(stored({ voiceVolume: 0.3 }))).toMatchObject({ voiceVolume: 0.3 });
  });

  it("refuses a volume outside 0 to 1 or not a number, and a voice switch that is not true or false", () => {
    for (const extra of [{ voiceVolume: 2 }, { voiceVolume: -0.1 }, { voiceVolume: "x" }, { voiceVolume: null }, { voice: "on" }])
      expect(readPresentationSettings(stored(extra)), JSON.stringify(extra)).toBeNull();
  });
});
