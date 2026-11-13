import { describe, expect, it } from "vitest";
import { mergeMusicPlay } from "../../content/music";
import type { SceneAudio } from "../../content/scene-audio";
import { heardTracks, heardVoices, musicRoomOpen, sceneAddresses, sceneCompleted, type RoomGame, type RoomScene } from "./music-room";

// 旅の音楽室 (2026-11-13): what the player has heard, from the scenes completed and the places visited only.

const game = (extra: Partial<RoomGame> = {}): RoomGame => ({
  seenEncounterIds: [], completedTourIds: [], completedGuideIds: [], battleRecords: [], playedDateIds: [], viewedEpilogueCityIds: [],
  activeEpilogue: null, currentCityId: "ta_city", completedCityIds: [], ...extra,
});
const scene = (id: string, extra: Partial<RoomScene> = {}): RoomScene =>
  ({ id, kind: "talk", at: [], story: { storyId: "places/ta_tower", knot: id }, knots: [id], ...extra });
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

  it("lists the completed scenes' voiced lines by scene, each line once, with the names filled in", () => {
    const groups = heardVoices({ scenes: [scene("ta_talk"), scene("ta_date"), scene("ta_silent")], audio,
      names: (text) => text.replaceAll("{heroine_name}", "さくら"), sceneLabel: (item) => `場面 ${item.id}` });
    expect(groups).toEqual([
      { sceneId: "ta_talk", labelJa: "場面 ta_talk", voices: [{ id: "ta_v1", textJa: "さくらの声" }, { id: "ta_v2", textJa: "二つめ" }] },
      { sceneId: "ta_date", labelJa: "場面 ta_date", voices: [{ id: "ta_v3", textJa: "三つめ" }] },
    ]);
  });
});
