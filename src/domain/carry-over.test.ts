import { describe, expect, it } from "vitest";
import { createGame, validateGameState, type GameState } from "./game";
import { battles, landmarks } from "../content";
import { getJourneyForCity } from "../content/journeys";
import { carryOver, pastBattleIds } from "./carry-over";

const JOURNEY = "sample_trip";
const fresh = () => createGame("ハル", "ミナ", { journeyId: JOURNEY });
const cityOf = (state: GameState) => state.currentCityId;
const journeyBattles = (state: GameState) => battles.filter((battle) =>
  getJourneyForCity((battle.landmarkId ? landmarks.find((item) => item.id === battle.landmarkId)?.cityId : battle.cityId) ?? "")?.id === JOURNEY);

describe("「もう一度この旅を」 keeps what was collected (carry-over.ts)", () => {
  it("keeps the album, 旅の図鑑 and the quizzes of 英語ノート, and nothing else", () => {
    const base = fresh();
    const [first, second] = journeyBattles(base);
    const photo = { imageId: "x", caption: undefined, cityId: cityOf(base), day: 3, minute: 600, placeId: "p", storyId: "s" };
    const finished = {
      ...base, revision: 80, ap: 1, completedCityIds: [cityOf(base)], album: [photo], glossary: ["a", "b"],
      battleRecords: [{ battleId: second.id } as GameState["battleRecords"][number]], pastBattleIds: [first.id],
    } as GameState;
    const start = { ...fresh(), album: [{ ...photo, day: 1 }, { ...photo, imageId: "y" }], glossary: ["b", "c"] };
    const next = carryOver(finished, start);
    expect(next.album.map((item) => [item.imageId, item.day])).toEqual([["x", 3], ["y", 3]]);
    expect(next.glossary).toEqual(["a", "b", "c"]);
    expect(pastBattleIds(next)).toEqual([first.id, second.id]);
    expect(next).toMatchObject({ revision: start.revision, ap: start.ap, completedCityIds: [], battleRecords: [] });
  });

  it("adds nothing to a journey that collected nothing", () => {
    const next = carryOver(fresh(), fresh());
    expect(next.pastBattleIds).toBeUndefined();
    expect(next.album).toEqual([]);
  });

  it("does not load quizzes of earlier journeys that are not this journey's", () => {
    const state = fresh();
    expect(() => validateGameState({ ...state, pastBattleIds: ["no_such_battle"] })).toThrow();
    expect(() => validateGameState({ ...state, pastBattleIds: [journeyBattles(state)[0].id] })).not.toThrow();
  });
});
