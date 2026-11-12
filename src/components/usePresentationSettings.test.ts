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

// The sound effect settings (2026-11-12): 「効果音を出す」 (`se`) and 「効果音の大きさ」 (`seVolume`, 0 to 1).
describe("the presentation settings' sound effects", () => {
  it("are on at 0.7 for settings stored without them, and with none stored", () => {
    expect(readPresentationSettings(stored())).toMatchObject({ se: true, seVolume: 0.7 });
    expect(readPresentationSettings(null)).toMatchObject({ se: true, seVolume: 0.7 });
  });

  it("read what was stored, beside the voice's own", () => {
    expect(readPresentationSettings(stored({ se: false, seVolume: 0 }))).toMatchObject({ se: false, seVolume: 0, voice: true, voiceVolume: 0.8 });
    expect(readPresentationSettings(stored({ seVolume: 1, voiceVolume: 0.2 }))).toMatchObject({ se: true, seVolume: 1, voiceVolume: 0.2 });
  });

  it("refuse a volume outside 0 to 1 or not a number, and a switch that is not true or false", () => {
    for (const extra of [{ seVolume: 1.5 }, { seVolume: -1 }, { seVolume: "0.5" }, { seVolume: Number.NaN }, { se: 1 }])
      expect(readPresentationSettings(stored(extra)), JSON.stringify(extra)).toBeNull();
  });
});
