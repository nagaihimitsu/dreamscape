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

// The music settings (2026-11-12): 「BGMを流す」 (`bgm`) and 「BGMの大きさ」 (`bgmVolume`, 0 to 1).
describe("the presentation settings' music", () => {
  it("are on at 0.4 for settings stored without them, and with none stored", () => {
    expect(readPresentationSettings(stored())).toMatchObject({ bgm: true, bgmVolume: 0.4 });
    expect(readPresentationSettings(null)).toMatchObject({ bgm: true, bgmVolume: 0.4 });
  });

  it("read what was stored, beside the sound effects' own", () => {
    expect(readPresentationSettings(stored({ bgm: false, bgmVolume: 0 }))).toMatchObject({ bgm: false, bgmVolume: 0, se: true, seVolume: 0.7 });
    expect(readPresentationSettings(stored({ bgmVolume: 1, seVolume: 0.2 }))).toMatchObject({ bgm: true, bgmVolume: 1, seVolume: 0.2 });
  });

  it("refuse a volume outside 0 to 1 or not a number, and a switch that is not true or false", () => {
    for (const extra of [{ bgmVolume: 1.5 }, { bgmVolume: -1 }, { bgmVolume: "0.5" }, { bgmVolume: Number.NaN }, { bgm: 1 }])
      expect(readPresentationSettings(stored(extra)), JSON.stringify(extra)).toBeNull();
  });
});

// The vibration setting (2026-11-13): 「振動する」 (`vibration`), offered where the browser can vibrate.
describe("the presentation settings' vibration", () => {
  it("is on for settings stored without it, and with none stored", () => {
    expect(readPresentationSettings(stored())).toMatchObject({ vibration: true });
    expect(readPresentationSettings(null)).toMatchObject({ vibration: true });
  });

  it("reads what was stored, beside the sounds' own", () => {
    expect(readPresentationSettings(stored({ vibration: false }))).toMatchObject({ vibration: false, se: true, bgm: true });
    expect(readPresentationSettings(stored({ vibration: true, se: false }))).toMatchObject({ vibration: true, se: false });
  });

  it("refuses a switch that is not true or false", () => {
    for (const extra of [{ vibration: "on" }, { vibration: 1 }, { vibration: null }])
      expect(readPresentationSettings(stored(extra)), JSON.stringify(extra)).toBeNull();
  });
});

// The ambience setting (2026-11-13): 「環境音を流す」 (`ambience`), beside the music's; its level is half of 「BGMの大きさ」.
describe("the presentation settings' ambience", () => {
  it("is on for settings stored without it, and with none stored", () => {
    expect(readPresentationSettings(stored())).toMatchObject({ ambience: true });
    expect(readPresentationSettings(null)).toMatchObject({ ambience: true });
  });

  it("reads what was stored, apart from the music's own switch", () => {
    expect(readPresentationSettings(stored({ ambience: false }))).toMatchObject({ ambience: false, bgm: true, bgmVolume: 0.4 });
    expect(readPresentationSettings(stored({ ambience: true, bgm: false }))).toMatchObject({ ambience: true, bgm: false });
  });

  it("refuses a switch that is not true or false", () => {
    for (const extra of [{ ambience: "on" }, { ambience: 0 }, { ambience: null }])
      expect(readPresentationSettings(stored(extra)), JSON.stringify(extra)).toBeNull();
  });
});
