import { describe, expect, it } from "vitest";
import { mergeMusicPlay, type MusicPlay } from "../content/music";
import { freeTimePeriod, sceneMusic, type MusicGame, type MusicScreen } from "./scene-music";

// Which music plays (2026-11-12): the screen GameApp shows, the journey's play, the scene's # bgm: and the ducks.

const play: MusicPlay = mergeMusicPlay({
  title: "title_theme",
  freeTime: { morning: "free_morning", day: "free_day", night: "free_night" },
  night: "night_theme",
  place: "place_theme",
  arrival: "arrival_theme",
  epilogue: "farewell_theme",
  endRoll: "end_roll_theme",
}, { places: { tj_fort: "tj_fort_theme" } });

const frame = (extra: { bgm?: string; quiet?: string } = {}) => extra;
const game = (extra: Partial<MusicGame> = {}, minute = 10 * 60, currentPlaceId = "tj_hotel"): MusicGame => ({
  travel: { minute, currentPlaceId },
  activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null,
  ...extra,
});
const shown = (current: MusicGame | null, extra: Partial<MusicScreen> = {}): MusicScreen => ({
  game: current, endRoll: false, nightVisual: false, riding: false, packing: false, romanceEnding: false, nightScreen: false, ...extra,
});
const music = (current: MusicGame | null, extra: Partial<MusicScreen> = {}) => sceneMusic(play, shown(current, extra));

describe("the screen's music", () => {
  it("plays the title's track before a game, nothing without a music list", () => {
    expect(music(null)).toEqual({ track: "title_theme", duck: "none" });
    expect(sceneMusic(null, shown(null))).toEqual({ track: null, duck: "none" });
    expect(sceneMusic(undefined, shown(game()))).toEqual({ track: null, duck: "none" });
  });

  it("plays free time's three tracks by the game clock, wrapping past midnight", () => {
    const at = (hours: number, minutes = 0) => music(game({}, hours * 60 + minutes)).track;
    expect(at(4, 59)).toBe("free_night");
    expect(at(5)).toBe("free_morning");
    expect(at(11, 59)).toBe("free_morning");
    expect(at(12)).toBe("free_day");
    expect(at(17, 59)).toBe("free_day");
    expect(at(18)).toBe("free_night");
    expect(at(24, 30)).toBe("free_night");
    expect(freeTimePeriod(24 * 60 + 5 * 60)).toBe("morning");
    expect(freeTimePeriod(Number.NaN)).toBe("day");
  });

  it("plays the end roll's and the night's tracks over every screen, and keeps the track on the packing and 「交際開始」", () => {
    const battle = game({ activeBattle: { phase: "question", frame: null } });
    expect(music(battle, { endRoll: true })).toEqual({ track: "end_roll_theme", duck: "none" });
    expect(music(game(), { nightVisual: true })).toEqual({ track: "night_theme", duck: "none" });
    expect(music(game(), { nightScreen: true })).toEqual({ track: "night_theme", duck: "none" });
    expect(music(game(), { packing: true })).toEqual({ track: undefined, duck: "none" });
    expect(music(game(), { romanceEnding: true })).toEqual({ track: undefined, duck: "none" });
    // The end roll comes first; the packing and a night's visual come before the screen under them.
    expect(music(game(), { endRoll: true, nightVisual: true }).track).toBe("end_roll_theme");
    expect(music(battle, { packing: true }).track).toBeUndefined();
  });

  it("plays the place's own track in a scene, else the usual place track, and the scene's # bgm: over both", () => {
    const at = (placeId: string, extra: Partial<MusicGame>) => music(game(extra, 10 * 60, placeId)).track;
    expect(at("tj_fort", { activeTourism: { phase: "guide", frame: frame() } })).toBe("tj_fort_theme");
    expect(at("tj_market", { activeTourism: { phase: "exploring", frame: null } })).toBe("place_theme");
    expect(at("tj_fort", { activeDate: { frame: frame({ bgm: "mood_theme" }) } })).toBe("mood_theme");
    expect(at("tj_fort", { activeEncounter: { phase: "story", frame: frame({ bgm: "stop" }) } })).toBeNull();
    expect(at("tj_fort", { activeBattle: { phase: "dialogue", frame: frame() } })).toBe("tj_fort_theme");
    // A battle without its frame (a call, the result) keeps its # bgm:.
    expect(at("tj_fort", { activeBattle: { phase: "question", frame: null, bgm: "quiz_theme" } })).toBe("quiz_theme");
    expect(at("tj_fort", { activeBattle: { phase: "result", frame: null, bgm: "stop" } })).toBeNull();
    // An observation opened from a battle keeps the battle's music.
    expect(at("tj_fort", { activeTourism: { phase: "exploring", frame: null }, activeBattle: { phase: "dialogue", frame: frame({ bgm: "quiz_theme" }) } }))
      .toBe("quiz_theme");
  });

  it("plays an arrival's and an epilogue's tracks, a tour leg's place, and a scene's # bgm: over them", () => {
    const epilogue = (kind: string | undefined, bgm?: string) =>
      music(game({ activeEpilogue: { ...(kind ? { kind } : {}), logoComplete: true, frame: frame(bgm ? { bgm } : {}) } }, 10 * 60, "tj_fort")).track;
    expect(epilogue("arrival")).toBe("arrival_theme");
    expect(epilogue(undefined)).toBe("farewell_theme");
    expect(epilogue("tour_leg")).toBe("tj_fort_theme");
    expect(epilogue("arrival", "mood_theme")).toBe("mood_theme");
    expect(epilogue(undefined, "stop")).toBeNull();
  });

  it("shows the screens in GameApp's order: an encounter over the epilogue, the tourism over a battle", () => {
    const both = game({ activeEncounter: { phase: "story", frame: frame({ bgm: "encounter_theme" }) },
      activeEpilogue: { frame: frame({ bgm: "mood_theme" }) } });
    expect(music(both).track).toBe("encounter_theme");
    expect(music(game({ activeDate: { frame: frame() } }), { nightScreen: true }).track).toBe("place_theme");
  });
});

describe("the music lowered", () => {
  it("lowers and muffles a quiz's question part, not its conversation, with the scene's track or a writer's", () => {
    for (const phase of ["question", "feedback", "reasoning", "result"])
      expect(music(game({ activeBattle: { phase, frame: null } })).duck).toBe("quiz");
    expect(music(game({ activeBattle: { phase: "dialogue", frame: frame() } })).duck).toBe("none");
    // A writer's track (# bgm:) does not change the lowering.
    expect(music(game({ activeBattle: { phase: "question", frame: null, bgm: "quiz_theme" } }))).toEqual({ track: "quiz_theme", duck: "quiz" });
    expect(music(game({ activeBattle: { phase: "dialogue", frame: frame({ bgm: "quiz_theme" }) } }))).toEqual({ track: "quiz_theme", duck: "none" });
    for (const phase of ["quiz", "feedback"]) expect(music(game({ activeEncounter: { phase, frame: frame() } })).duck).toBe("quiz");
    for (const phase of ["story", "outcome"]) expect(music(game({ activeEncounter: { phase, frame: frame() } })).duck).toBe("none");
    // An observation over a battle is not its question.
    expect(music(game({ activeTourism: { phase: "exploring", frame: null }, activeBattle: { phase: "question", frame: null } })).duck).toBe("none");
  });

  it("lowers a # quiet: line on screen, and everything under a ride's visual first", () => {
    expect(music(game({ activeDate: { frame: frame({ quiet: "scene" }) } })).duck).toBe("quiet");
    expect(music(game({ activeBattle: { phase: "dialogue", frame: frame({ quiet: "line" }) } })).duck).toBe("quiet");
    // A frame kept under a call or an arrival's title card is not on screen.
    expect(music(game({ activeTourism: { phase: "exploring", frame: frame({ quiet: "scene" }) } })).duck).toBe("none");
    expect(music(game({ activeEpilogue: { kind: "arrival", logoComplete: false, frame: frame({ quiet: "scene" }) } })).duck).toBe("none");
    expect(music(game({ activeEncounter: { phase: "quiz", frame: frame({ quiet: "scene" }) } })).duck).toBe("quiz");
    expect(music(game({ activeBattle: { phase: "question", frame: null } }), { riding: true }).duck).toBe("travel");
    expect(music(game(), { riding: true })).toEqual({ track: "free_morning", duck: "travel" });
    expect(music(game(), { packing: true, riding: true })).toEqual({ track: undefined, duck: "travel" });
  });
});

describe("a journey's play over the shared one", () => {
  it("replaces each key it sets, free time as a whole, and adds its places", () => {
    const { places: _places, ...shared } = play;
    expect(mergeMusicPlay(shared, undefined)).toEqual({ ...shared, places: {} });
    expect(mergeMusicPlay(shared, { place: "tj_city", freeTime: { morning: "a", day: "b", night: "c" }, places: { tj_fort: "tj_fort_theme" } }))
      .toEqual({ ...shared, place: "tj_city", freeTime: { morning: "a", day: "b", night: "c" }, places: { tj_fort: "tj_fort_theme" } });
    // A key written as undefined (left out) keeps the shared track.
    expect(mergeMusicPlay(shared, { arrival: undefined }).arrival).toBe("arrival_theme");
  });
});
