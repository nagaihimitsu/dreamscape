import { describe, expect, it } from "vitest";
import { mergeAmbiencePlay, type AmbienceJourneyPlay } from "../content/ambience";
import { ambienceVolume } from "./ambience";
import { sceneAmbience } from "./scene-ambience";
import type { MusicGame, MusicScreen } from "./scene-music";

// Which ambience plays (環境音, 2026-11-13): the scene's # ambience:, else its place's own (play.places), else none, in
// story scenes only, lowered as the music is.

const play: AmbienceJourneyPlay = mergeAmbiencePlay(undefined, { places: { tj_market: "tj_amb_bazaar", tj_park: "amb_birds_park" } });
const game = (extra: Partial<MusicGame> = {}, currentPlaceId = "tj_market"): MusicGame => ({
  travel: { minute: 10 * 60, currentPlaceId },
  activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null,
  ...extra,
});
const shown = (current: MusicGame | null, extra: Partial<MusicScreen> = {}): MusicScreen => ({
  game: current, endRoll: false, nightVisual: false, riding: false, packing: false, romanceEnding: false, nightScreen: false, ...extra,
});
const ambience = (current: MusicGame | null, extra: Partial<MusicScreen> = {}) => sceneAmbience(play, shown(current, extra));
const none = { track: null, duck: "none" };

describe("the screen's ambience", () => {
  it("plays nothing outside a story scene: the title, free time, the night screen and 「交際開始」", () => {
    expect(ambience(null)).toEqual(none);
    expect(ambience(game())).toEqual(none);
    expect(ambience(game(), { nightScreen: true })).toEqual(none);
    expect(ambience(game(), { romanceEnding: true })).toEqual(none);
  });

  it("plays nothing under an opening movie, the end roll, a night's visual, the packing and a ride", () => {
    const date = game({ activeDate: { frame: {} } });
    for (const extra of [{ opening: true }, { endRoll: true }, { nightVisual: true }, { packing: true }, { riding: true }])
      expect(ambience(date, extra), JSON.stringify(extra)).toEqual(none);
  });

  it("plays a scene's place's own track, and nothing at a place without one", () => {
    expect(ambience(game({ activeDate: { frame: {} } }))).toEqual({ track: "tj_amb_bazaar", duck: "none" });
    expect(ambience(game({ activeEncounter: { phase: "dialogue", frame: {} } }, "tj_park")).track).toBe("amb_birds_park");
    expect(ambience(game({ activeEpilogue: { kind: "arrival", frame: {} } }, "tj_station"))).toEqual(none);
  });

  it("plays the scene's # ambience: over the place's own, and none after # ambience: stop", () => {
    expect(ambience(game({ activeDate: { frame: { ambience: "amb_rain" } } })).track).toBe("amb_rain");
    expect(ambience(game({ activeDate: { frame: { ambience: "stop" } } }))).toEqual(none);
    expect(ambience(game({ activeTourism: { phase: "guide", frame: { ambience: "amb_wind" } } })).track).toBe("amb_wind");
    expect(ambience(game({ activeEpilogue: { kind: "epilogue", frame: { ambience: "amb_night_insects" } } }, "tj_station")).track)
      .toBe("amb_night_insects");
  });

  it("keeps a battle's # ambience: over its quiz, lowered and muffled like the music while a question is on screen", () => {
    const talk = game({ activeBattle: { phase: "dialogue", frame: { ambience: "amb_crowd_outdoor" } } });
    expect(ambience(talk)).toEqual({ track: "amb_crowd_outdoor", duck: "none" });
    const question = game({ activeBattle: { phase: "question", frame: null, ambience: "amb_crowd_outdoor" } });
    expect(ambience(question)).toEqual({ track: "amb_crowd_outdoor", duck: "quiz" });
    expect(ambience(game({ activeBattle: { phase: "result", frame: null } }))).toEqual({ track: "tj_amb_bazaar", duck: "quiz" });
    // An observation opened from the battle keeps the battle's.
    expect(ambience(game({ activeTourism: { phase: "exploring", frame: null }, activeBattle: { phase: "question", frame: null, ambience: "amb_rain" } })).track)
      .toBe("amb_rain");
  });

  it("is lowered on a quiet line, and in an encounter's quiz", () => {
    expect(ambience(game({ activeDate: { frame: { quiet: "line" } } }))).toEqual({ track: "tj_amb_bazaar", duck: "quiet" });
    expect(ambience(game({ activeEncounter: { phase: "quiz", frame: {} } })).duck).toBe("quiz");
  });

  it("plays nothing without a list", () => {
    expect(sceneAmbience(null, shown(game({ activeDate: { frame: { ambience: "amb_rain" } } })))).toEqual(none);
  });
});

describe("the ambience's places and volume", () => {
  it("merges the shared places with a journey's, the journey's own winning", () => {
    expect(mergeAmbiencePlay({ places: { a: "x", b: "y" } }, { places: { b: "z" } })).toEqual({ places: { a: "x", b: "z" } });
    expect(mergeAmbiencePlay(undefined, undefined)).toEqual({ places: {} });
  });

  it("is half the music's volume, within 0 to 1", () => {
    expect(ambienceVolume(0.4)).toBeCloseTo(0.2);
    expect(ambienceVolume(1)).toBe(0.5);
    expect(ambienceVolume(0)).toBe(0);
    expect(ambienceVolume(2)).toBe(0.5);
  });
});
