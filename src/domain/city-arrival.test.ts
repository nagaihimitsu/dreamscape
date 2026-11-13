import { describe, expect, it } from "vitest";
import { episodes, getCityContent } from "../content";
import { createGame, validateGameState, type GameState } from "./game";
import { advanceCityEpilogue, completeArrivalLogo, startCityArrival } from "./epilogue";
import { advanceCompletedJourneyCity, departToNextCity } from "./city-travel";
import { beginTravelEvent, sleepAtHotel, waitForTravel } from "./travel-game";
import { startEpisode } from "./chapter";
import { loadGame, saveGame } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";

const withoutScene = ({ revision: _revision, activeEpilogue: _scene, ...game }: GameState) => game;

describe("city arrival conversations", () => {
  it.each(["delhi", "agra", "jaipur"])("saves and resumes every %s boundary without any reward, relationship or clock change (Delhi's gives Kamla's memo at its end)", (cityId) => {
    const initial = createGame("旅人", "同行者", { journeyId: "golden_triangle" });
    const { travelSettings } = getCityContent(cityId);
    const state = { ...initial, currentCityId: cityId, travel: { ...initial.travel,
      hotelPlaceId: travelSettings.hotelPlaceId, currentPlaceId: travelSettings.hotelPlaceId } };
    const items = new Map<string, string>();
    const storage = journeyStorage({ getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => { items.set(key, value); }, removeItem: (key) => { items.delete(key); } }, "golden_triangle");
    let current = startCityArrival(state, state.revision);
    expect(current.activeEpilogue).toMatchObject({ kind: "arrival", logoComplete: false });
    expect(startCityArrival(current, current.revision)).toBe(current);
    expect(advanceCityEpilogue(current, current.revision)).toBe(current);
    expect(saveGame(storage, current).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: current });
    const logo = current;
    current = completeArrivalLogo(current, current.revision);
    expect(completeArrivalLogo(current, logo.revision)).toBe(current);
    expect(completeArrivalLogo(current, current.revision)).toBe(current);
    for (let line = 0; current.activeEpilogue; line++) {
      expect(line).toBeLessThan(20);
      // Delhi's arrival: Kamla (the knot's # person:) speaks as enemy; Agra's Samir and Jaipur's Aman by name (# speaker: <person ID>).
      const { frame } = current.activeEpilogue;
      expect(["heroine", "narrator", "enemy", "person"]).toContain(frame.speaker);
      if (frame.speaker === "person") expect(frame.speakerPersonId).toBe(({ agra: "gt_samir", jaipur: "gt_aman" } as Record<string, string>)[cityId]);
      expect(current.activeEpilogue.frame.choices).toEqual([]);
      const prior = current;
      current = advanceCityEpilogue(current, current.revision);
      expect(current.revision).toBe(prior.revision + 1);
      // The Delhi arrival's knot head gives Kamla's memo once, when the conversation ends (# on_done: item).
      const given: GameState["inventory"] = !current.activeEpilogue && cityId === "delhi" ? { gt_delhi_kamla_memo: "held" } : {};
      expect(withoutScene(current)).toEqual(withoutScene({ ...state, inventory: { ...state.inventory, ...given } }));
      expect(saveGame(storage, current).ok).toBe(true);
      const loaded = loadGame(storage);
      expect(loaded).toEqual({ status: "loaded", state: current });
      if (loaded.status === "loaded") current = loaded.state;
    }
    // Reload and the normal automatic-progress pass cannot reintroduce the arrival.
    expect(advanceCompletedJourneyCity(current, current.revision)).toBe(current);
    expect(current.viewedEpilogueCityIds).toEqual([]);
  });

  it("blocks travel, sightseeing and departure while the arrival is playing", () => {
    const original = createGame("旅人", "同行者", { journeyId: "golden_triangle" });
    const state = startCityArrival(original, original.revision);
    const episode = episodes.find((episode) => episode.cityId === "delhi" && episode.kind === "episode")!;
    expect(startEpisode(state, episode.id)).toBe(state);
    expect(beginTravelEvent(state, episode.id, "auto_rickshaw", state.revision)).toBe(state);
    expect(waitForTravel(state, 30, state.revision)).toBe(state);
    expect(sleepAtHotel(state, "walk", state.revision)).toBe(state);
    expect(departToNextCity(state, state.revision)).toBe(state);
  });

  it("leaves Milan unchanged and rejects altered arrival snapshots", () => {
    const milan = createGame();
    expect(startCityArrival(milan, milan.revision)).toBe(milan);
    const initial = createGame("旅人", "同行者", { journeyId: "golden_triangle" });
    const state = startCityArrival(initial, initial.revision);
    expect(() => validateGameState(state)).not.toThrow();
    expect(() => validateGameState({ ...state, activeEpilogue: { ...state.activeEpilogue!, contentHash: "changed" } })).toThrow("都市エピローグの途中データを確認できません。元のデータは保管されています。");
    expect(() => validateGameState({ ...state, activeEpilogue: { ...state.activeEpilogue!, logoComplete: undefined } })).toThrow("都市エピローグの途中データを確認できません。元のデータは保管されています。");
    expect(() => validateGameState({ ...state, activeEpilogue: { ...state.activeEpilogue!, kind: undefined } })).toThrow("都市エピローグの途中データを確認できません。元のデータは保管されています。");
    expect(() => validateGameState({ ...state, activeEpilogue: { ...state.activeEpilogue!, frame: { ...state.activeEpilogue!.frame, text: "書き換え" } } })).toThrow("保存された本文が一致しません。");
  });
});
