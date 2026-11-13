import { describe, expect, it } from "vitest";
import { SYSTEM_SOUND_IDS } from "../content/sounds";
import { sceneTimeTint } from "../features/journey/time-of-day";
import {
  ambiencePlaces, audioGroups, backgroundChoices, budgetStep, filterVoiceGroups, itemToGain, itemToGive, layerLabelJa,
  missingSystemSounds, ROOM_TINTS, roomSound, voiceGroups,
} from "./effects-room";

// Debug's 「音と演出の見本」 (2026-11-13): its lists and what it asks of the music and the ambience.

const layer = (id: string, own: Partial<Record<"sounds" | "music" | "ambience" | "voices", string[]>> = {}) =>
  ({ id, sounds: [], music: [], ambience: [], voices: [], ...own });
const names: Record<string, string> = { trip_a: "Aの旅" };

describe("the room's lists", () => {
  it("names the shared layer 共通 and a journey by its name, else its ID", () => {
    const nameOf = (id: string) => names[id];
    expect(layerLabelJa("core", nameOf)).toBe("共通");
    expect(layerLabelJa("trip_a", nameOf)).toBe("Aの旅");
    expect(layerLabelJa("trip_b", nameOf)).toBe("trip_b");
  });

  it("lists one kind by layer, 共通 first, without the layers that have none, each entry with its use", () => {
    const layers = [layer("core", { sounds: ["ui_tap", "save"] }), layer("trip_a", { music: ["ta_song"] }), layer("trip_b", { sounds: ["tb_bell"] })];
    const useOf = new Map([["ui_tap", "ボタンを押したとき"], ["tb_bell", "鐘"]]);
    const labelOf = (id: string) => layerLabelJa(id, (journeyId) => names[journeyId]);
    expect(audioGroups(layers, "sounds", useOf, labelOf)).toEqual([
      { layerId: "core", labelJa: "共通", entries: [{ id: "ui_tap", useJa: "ボタンを押したとき" }, { id: "save" }] },
      { layerId: "trip_b", labelJa: "trip_b", entries: [{ id: "tb_bell", useJa: "鐘" }] },
    ]);
    expect(audioGroups(layers, "music", useOf, labelOf)).toEqual([{ layerId: "trip_a", labelJa: "Aの旅", entries: [{ id: "ta_song" }] }]);
    expect(audioGroups(layers, "ambience", useOf, labelOf)).toEqual([]);
  });

  it("names the system sounds no list registers", () => {
    expect(missingSystemSounds(SYSTEM_SOUND_IDS)).toEqual([]);
    expect(missingSystemSounds(SYSTEM_SOUND_IDS.filter((id) => id !== "stamp" && id !== "ui_tap"))).toEqual(["ui_tap", "stamp"]);
  });

  it("names the places that play each ambience track, each once", () => {
    const placeNames: Record<string, string> = { ta_fort: "砦", ta_garden: "庭", ta_gate: "門", tb_fort: "砦" };
    const places = ambiencePlaces({
      trip_a: { places: { ta_fort: "wind", ta_garden: "birds", ta_gate: "wind" } },
      trip_b: { places: { tb_fort: "wind", ta_fort: "wind" } },
    }, (id) => placeNames[id] ?? id);
    expect([...places]).toEqual([["wind", ["砦", "門"]], ["birds", ["庭"]]]);
  });

  it("groups a journey's voices by scene, in order, and keeps an unnumbered ID as its own group", () => {
    const groups = voiceGroups(["gt_b_002", "gt_a_001", "gt_b_001", "gt_solo", "gt_a_010"]);
    expect(groups).toEqual([
      { prefix: "gt_a", voices: [{ id: "gt_a_001", labelJa: "001" }, { id: "gt_a_010", labelJa: "010" }] },
      { prefix: "gt_b", voices: [{ id: "gt_b_001", labelJa: "001" }, { id: "gt_b_002", labelJa: "002" }] },
      { prefix: "gt_solo", voices: [{ id: "gt_solo", labelJa: "gt_solo" }] },
    ]);
    expect(filterVoiceGroups(groups, "")).toEqual(groups);
    expect(filterVoiceGroups(groups, " GT_B ")).toEqual([groups[1]]);
    expect(filterVoiceGroups(groups, "_010")).toEqual([{ prefix: "gt_a", voices: [{ id: "gt_a_010", labelJa: "010" }] }]);
    expect(filterVoiceGroups(groups, "nothing")).toEqual([]);
  });
});

describe("what the room asks of the music and the ambience", () => {
  it("lowers both as chosen, and under a ride lowers the music and silences the ambience, as the game does", () => {
    expect(roomSound({ music: "song", ambience: "wind", duck: "quiz", riding: false }))
      .toEqual({ music: { track: "song", duck: "quiz" }, ambience: { track: "wind", duck: "quiz" } });
    expect(roomSound({ music: "song", ambience: "wind", duck: "none", riding: true }))
      .toEqual({ music: { track: "song", duck: "travel" }, ambience: { track: null, duck: "none" } });
    expect(roomSound({ music: null, ambience: "wind", duck: "travel", riding: false }))
      .toEqual({ music: { track: null, duck: "travel" }, ambience: { track: null, duck: "none" } });
    expect(roomSound({ music: null, ambience: null, duck: "none", riding: false }))
      .toEqual({ music: { track: null, duck: "none" }, ambience: { track: null, duck: "none" } });
  });
});

describe("the sample stage and header", () => {
  it("shows a colour at morning, evening and night, none at midday or switched off", () => {
    const tint = (id: string) => {
      const item = ROOM_TINTS.find((entry) => entry.id === id)!;
      return sceneTimeTint(item.minute, item.off);
    };
    const none = "rgba(0, 0, 0, 0)";
    expect(tint("day")).toBe(none);
    expect(tint("off")).toBe(none);
    for (const id of ["morning", "evening", "night"]) expect(tint(id)).not.toBe(none);
  });

  it("offers the city's own background first, then its places', each once, or every background when it names none", () => {
    const backgrounds = { hotel: { nameJa: "ホテル" }, fort: { nameJa: "砦" }, street: { nameJa: "通り" } };
    expect(backgroundChoices([{ backgroundId: "fort" }, {}, { backgroundId: "hotel" }, { backgroundId: "gone" }], "hotel", backgrounds))
      .toEqual([{ id: "hotel", nameJa: "ホテル" }, { id: "fort", nameJa: "砦" }]);
    expect(backgroundChoices([], undefined, backgrounds).map((item) => item.id)).toEqual(["hotel", "fort", "street"]);
  });

  it("gains the first item not held and gives away the first one held", () => {
    const ids = ["a", "b", "c"];
    expect(itemToGain(ids, {})).toBe("a");
    expect(itemToGain(ids, { a: "held", b: "gifted" })).toBe("b");
    expect(itemToGain(ids, { a: "held", b: "held", c: "held" })).toBeUndefined();
    expect(itemToGive(ids, { a: "gifted", b: "held" })).toBe("b");
    expect(itemToGive(ids, {})).toBeUndefined();
  });

  it("moves the budget by a quarter, at least 1", () => {
    expect(budgetStep(2000)).toBe(500);
    expect(budgetStep(1)).toBe(1);
    expect(budgetStep(0)).toBe(1);
  });
});
