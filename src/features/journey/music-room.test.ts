import { describe, expect, it } from "vitest";
import { readLineId } from "../../components/read-skip";
import { cityContents, episodes, landmarks, scenes } from "../../content";
import sceneAudioJson from "../../content/generated/scene-audio.json";
import { mergeMusicPlay } from "../../content/music";
import { sceneAudioSchema, type SceneAudio } from "../../content/scene-audio";
import { heardTracks, heardVoices, musicRoomOpen, readStoryKey, sceneAddresses, sceneCompleted, sceneGroup, type RoomGame, type RoomScene, type SceneNames } from "./music-room";

const SCENE_AUDIO_INDEX = sceneAudioSchema.parse(sceneAudioJson);

// 旅の音楽室 (2026-11-13): what the player has heard, from the scenes completed and the places visited only.

const game = (extra: Partial<RoomGame> = {}): RoomGame => ({
  seenEncounterIds: [], completedTourIds: [], completedGuideIds: [], battleRecords: [], playedDateIds: [], viewedEpilogueCityIds: [],
  activeEpilogue: null, currentCityId: "ta_city", completedCityIds: [], ...extra,
});
const scene = (id: string, extra: Partial<RoomScene> = {}): RoomScene =>
  ({ id, kind: "talk", cityId: "ta_city", at: [], story: { storyId: "places/ta_tower", knot: id }, knots: [id], ...extra });
const nowhere = () => false;

describe("the music room", () => {
  it("opens once a city is cleared", () => {
    expect(musicRoomOpen({ completedCityIds: [] })).toBe(false);
    expect(musicRoomOpen({ completedCityIds: ["ta_city"] })).toBe(true);
  });

  it("counts a scene completed by its own record", () => {
    expect(sceneCompleted(scene("ta_talk"), game({ seenEncounterIds: ["ta_talk"] }), nowhere)).toBe(true);
    expect(sceneCompleted(scene("ta_talk"), game(), nowhere)).toBe(false);
    expect(sceneCompleted(scene("ta_guide", { kind: "guide", main: { guide: "ta_tower" } }), game({ completedGuideIds: ["ta_tower"] }), nowhere)).toBe(true);
    const battle = scene("ta_battle", { kind: "battle", main: { battle: "ta_battle" } });
    expect(sceneCompleted(battle, game(), nowhere)).toBe(false);
    expect(sceneCompleted(battle, game({ battleRecords: [{ battleId: "ta_battle" } as RoomGame["battleRecords"][number]] }), nowhere)).toBe(true);
    expect(sceneCompleted(scene("ta_date", { kind: "date", main: { date: "ta_date" } }), game({ playedDateIds: ["ta_date"] }), nowhere)).toBe(true);
    expect(sceneCompleted(scene("ta_end", { kind: "epilogue", main: { epilogue: "ta_city" } }), game({ viewedEpilogueCityIds: ["ta_city"] }), nowhere)).toBe(true);
    const leg = scene("ta_leg", { kind: "tour_leg", at: [{ tour: "ta_tour", step: "first" }] });
    expect(sceneCompleted(leg, game({ completedTourIds: ["ta_tour"] }), nowhere)).toBe(true);
    expect(sceneCompleted(leg, game(), nowhere)).toBe(false);
  });

  it("counts a city's arrival once the party has reached the city and is past it", () => {
    const arrival = scene("ta_arrival", { kind: "arrival", main: { arrival: "ta_city" } });
    const here = (cityId: string) => cityId === "ta_city";
    expect(sceneCompleted(arrival, game(), here)).toBe(true);
    expect(sceneCompleted(arrival, game(), nowhere)).toBe(false);
    expect(sceneCompleted(arrival, game({ activeEpilogue: { kind: "arrival" } as RoomGame["activeEpilogue"] }), here)).toBe(false);
  });

  it("reads a place scene's knots and a one-scene file", () => {
    expect(sceneAddresses({ story: { storyId: "places/ta_tower", knot: "ta_battle" }, knots: ["ta_battle", "ta_battle_claim"] }))
      .toEqual(["places/ta_tower.ta_battle", "places/ta_tower.ta_battle_claim"]);
    expect(sceneAddresses({ story: { storyId: "battles/ta_finale" }, knots: [] })).toEqual(["battles/ta_finale"]);
  });

  const audio: SceneAudio = { schemaVersion: 1, stories: {
    "places/ta_tower.ta_talk": { voices: [{ id: "ta_v1", textJa: "{heroine_name}の声" }, { id: "ta_v2", textJa: "二つめ" }], bgm: ["ta_tense"] },
    "places/ta_tower.ta_date": { voices: [{ id: "ta_v2", textJa: "二つめ" }, { id: "ta_v3", textJa: "三つめ" }], bgm: ["ta_tense", "ta_unknown"] },
  } };
  const play = mergeMusicPlay({ title: "t", freeTime: { morning: "m", day: "d", night: "n" }, night: "n", place: "ta_place", arrival: "a",
    epilogue: "e", endRoll: "r" }, { places: { ta_fort: "ta_fort_theme" } });
  const labels: Record<string, string> = { ta_place: "街の曲", ta_fort_theme: "砦の曲", ta_tense: "張りつめた曲" };

  it("lists the visited places' tracks, then the completed scenes' # bgm:, each once and only the build's tracks", () => {
    const scenes = [scene("ta_talk"), scene("ta_date")];
    expect(heardTracks({ play, visitedPlaceIds: ["ta_fort", "ta_market"], scenes, audio, labelOf: (id) => labels[id] })).toEqual([
      { id: "ta_fort_theme", labelJa: "砦の曲" }, { id: "ta_place", labelJa: "街の曲" }, { id: "ta_tense", labelJa: "張りつめた曲" },
    ]);
    expect(heardTracks({ play: null, visitedPlaceIds: ["ta_fort"], scenes: [], audio, labelOf: (id) => labels[id] })).toEqual([]);
  });

  const names = (text: string) => text.replaceAll("{heroine_name}", "さくら");
  const group = (item: RoomScene) => ({ key: item.id, labelJa: `場面 ${item.id}` });
  /** read-skip's record with these lines read: [story key, text as shown]. */
  const readOf = (lines: [string, string][]) => {
    const ids = new Set(lines.map(([key, text]) => readLineId(key, text)));
    return (id: string) => ids.has(id);
  };

  it("lists the completed scenes' voiced lines by scene, each line once, with the names filled in", () => {
    const isRead = readOf([["ta_talk", "さくらの声"], ["ta_talk", "二つめ"], ["ta_date", "二つめ"], ["ta_date", "三つめ"]]);
    const groups = heardVoices({ scenes: [scene("ta_talk"), scene("ta_date", { kind: "date", main: { date: "ta_date" } }), scene("ta_silent")],
      audio, names, group, isRead });
    expect(groups).toEqual([
      { key: "ta_talk", labelJa: "場面 ta_talk", voices: [{ id: "ta_v1", textJa: "さくらの声" }, { id: "ta_v2", textJa: "二つめ" }] },
      { key: "ta_date", labelJa: "場面 ta_date", voices: [{ id: "ta_v3", textJa: "三つめ" }] },
    ]);
  });

  it("lists only the lines this device has read: a branch not taken stays out, and a line read in another scene", () => {
    // ta_v2 was read in the date only, ta_v1 never (its branch was not taken), the names as the story showed them.
    const isRead = readOf([["ta_date", "二つめ"], ["ta_talk", "{heroine_name}の声"]]);
    const groups = heardVoices({ scenes: [scene("ta_talk"), scene("ta_date", { kind: "date", main: { date: "ta_date" } })], audio, names, group, isRead });
    expect(groups).toEqual([{ key: "ta_date", labelJa: "場面 ta_date", voices: [{ id: "ta_v2", textJa: "二つめ" }] }]);
    expect(heardVoices({ scenes: [scene("ta_talk")], audio, names, group, isRead: () => false })).toEqual([]);
  });

  const sceneNames: SceneNames = {
    city: (id) => ({ ta_city: "試験の街" })[id] ?? id, landmark: (id) => ({ ta_tower: "試験の塔" })[id] ?? id,
    place: (_city, id) => ({ ta_gate: "試験の門" })[id] ?? id, battle: (id) => ({ ta_battle: "塔の問い" })[id] ?? id,
    date: (id) => ({ ta_date: "塔の上で" })[id] ?? id, tour: (id) => ({ ta_tour: "試験のツアー" })[id] ?? id,
  };

  it("names a main part by what it is, a titled scene by its title, an untitled one by where and when it happens", () => {
    const label = (extra: Partial<RoomScene>) => sceneGroup(scene("ta_scene", extra), sceneNames).labelJa;
    // The scene table's title of a main part is its place or city only: never used.
    expect(label({ kind: "arrival", main: { arrival: "ta_city" }, title: "試験の街" })).toBe("試験の街に到着");
    expect(label({ kind: "epilogue", main: { epilogue: "ta_city" }, title: "試験の街" })).toBe("試験の街のエピローグ");
    expect(label({ kind: "guide", main: { guide: "ta_tower" }, title: "試験の塔" })).toBe("試験の塔の案内");
    expect(label({ kind: "battle", main: { battle: "ta_battle" } })).toBe("塔の問い");
    expect(label({ kind: "date", main: { date: "ta_date" } })).toBe("塔の上で");
    expect(label({ title: "鐘の話" })).toBe("鐘の話");
    expect(label({ at: [{ hotel: "any" }] })).toBe("試験の街の宿で");
    expect(label({ at: [{ depart: "ta_city" }] })).toBe("試験の街を発つ日");
    expect(label({ at: [{ arrive: "ta_city" }] })).toBe("試験の街に着いた日");
    expect(label({ at: [{ visit: "ta_tower" }] })).toBe("試験の塔で");
    expect(label({ at: [{ visit: "any" }] })).toBe("試験の街の観光地で");
    expect(label({ at: [{ place: "ta_gate" }] })).toBe("試験の門で");
    expect(label({ at: [{ ticket: "ta_gate" }] })).toBe("試験の門の窓口で");
    expect(label({ at: [{ date: "ta_date" }] })).toBe("デート「塔の上で」で");
    expect(label({ at: [{ finale: "ta_city" }] })).toBe("試験の街のフィナーレで");
    expect(label({ at: [{ epilogue: "ta_city" }] })).toBe("試験の街のエピローグで");
    expect(label({ at: [{ trip: "walk" }] })).toBe("試験の街の移動中に");
    expect(label({ kind: "tour_leg", at: [{ tour: "ta_tour", step: "out" }] })).toBe("試験のツアーで");
    expect(label({})).toBe("試験の街で");
  });

  it("puts the untitled scenes of one moment in one group, where the first stands", () => {
    const isRead = readOf([["ta_talk", "さくらの声"], ["ta_talk", "二つめ"], ["ta_date", "三つめ"]]);
    const groups = heardVoices({
      scenes: [scene("ta_talk", { at: [{ hotel: "ta_inn" }] }), scene("ta_title", { title: "鐘の話" }),
        scene("ta_date", { at: [{ hotel: "any" }], story: { storyId: "places/ta_tower", knot: "ta_date" }, knots: ["ta_date"] })],
      audio: { schemaVersion: 1, stories: {
        ...audio.stories, "places/ta_tower.ta_title": { voices: [{ id: "ta_v9", textJa: "鐘" }], bgm: [] },
      } },
      names, group: (item) => sceneGroup(item, sceneNames), isRead: (id) => isRead(id) || id === readLineId("ta_title", "鐘"),
    });
    expect(groups).toEqual([
      { key: "at:試験の街の宿で", labelJa: "試験の街の宿で",
        voices: [{ id: "ta_v1", textJa: "さくらの声" }, { id: "ta_v2", textJa: "二つめ" }, { id: "ta_v3", textJa: "三つめ" }] },
      { key: "ta_title", labelJa: "鐘の話", voices: [{ id: "ta_v9", textJa: "鐘" }] },
    ]);
  });

  it("reads each scene's lines under the story its screen gives them", () => {
    expect(readStoryKey(scene("ta_talk"))).toBe("ta_talk");
    expect(readStoryKey(scene("ta_meet", { kind: "encounter" }))).toBe("ta_meet");
    expect(readStoryKey(scene("ta_date_scene", { kind: "date", main: { date: "ta_date" } }))).toBe("ta_date");
    expect(readStoryKey(scene("ta_battle_scene", { kind: "battle", main: { battle: "ta_battle" } }))).toBe("ta_battle");
    expect(readStoryKey(scene("ta_guide", { kind: "guide", main: { guide: "ta_tower" } }))).toBe("places/ta_tower.ta_guide");
    expect(readStoryKey(scene("ta_end", { kind: "epilogue", main: { epilogue: "ta_city" }, story: { storyId: "epilogues/ta_city" } })))
      .toBe("epilogues/ta_city");
  });

  it("matches the screens' stories for every voiced scene of the build (a guide's, an epilogue's, an arrival's)", () => {
    const voiced = scenes.filter((item) => sceneAddresses(item).some((address) => SCENE_AUDIO_INDEX.stories[address]?.voices.length));
    expect(voiced.length).toBeGreaterThan(0);
    for (const item of voiced) {
      const key = readStoryKey(item);
      const main = item.main;
      if (main && "guide" in main) expect(key).toBe(landmarks.find((landmark) => landmark.id === main.guide)?.guideStoryId);
      else if (main && "epilogue" in main) expect(episodes.map((episode) => episode.epilogueStoryId)).toContain(key);
      else if (main && "arrival" in main) expect(key).toBe(cityContents[main.arrival]?.city.arrivalStoryId);
    }
  });
});
