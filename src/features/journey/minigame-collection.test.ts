import { describe, expect, it } from "vitest";
import { scenes } from "../../content";
import usesJson from "../../content/generated/minigame-uses.json";
import { getJourney } from "../../content/journeys";
import { miniGameUseListSchema, type MiniGameUse } from "../../minigames/uses";
import { collectionGames, lookSceneId } from "./minigame-collection";

// ミニゲーム集 (2026-11-20): every game the journey's stories play, once each, in the journey's order.

const use = (game: string, sceneId: string, extra: Partial<MiniGameUse> = {}): MiniGameUse =>
  ({ sceneId, kind: "date", storyId: "places/x", game, auto: "done", line: "", ...extra });
const cityOf = (sceneId: string) => sceneId.split(":")[0];

describe("collectionGames", () => {
  it("lists each game of the journey's cities once, in the order of the cities, then of the list", () => {
    const uses = [use("b_game", "second:s1"), use("a_game", "first:s2"), use("c_game", "other:s3"), use("d_game", "first:s4"),
      use("b_game", "first:s5")];
    expect(collectionGames(uses, cityOf, ["first", "second"]).map((entry) => [entry.use.game, entry.cityId])).toEqual([
      ["a_game", "first"], ["d_game", "first"], ["b_game", "second"],
    ]);
  });

  it("plays a game as a scene's first game (no prefix) before a scene's second one, else as its first use", () => {
    const again = use("cricket", "city:date", { prefix: "again", params: { ball: "slower" } });
    const first = use("cricket", "city:date");
    const later = use("cricket", "city:other");
    expect(collectionGames([again, first, later], cityOf, ["city"])).toEqual([{ use: first, cityId: "city" }]);
    expect(collectionGames([again], cityOf, ["city"])).toEqual([{ use: again, cityId: "city" }]);
  });

  it("leaves out a use whose scene has no city", () => {
    expect(collectionGames([use("lost", "x")], () => undefined, ["x"])).toEqual([]);
  });

  it("lists every game the India journey plays, each once, from content:build's list", () => {
    const uses = miniGameUseListSchema.parse(usesJson);
    const cityIds = getJourney("golden_triangle")?.cities.map((city) => city.id) ?? [];
    const sceneCity = (sceneId: string) => scenes.find((scene) => scene.id === sceneId)?.cityId;
    const games = collectionGames(uses, sceneCity, cityIds).map((entry) => entry.use.game);
    const india = new Set(uses.filter((item) => cityIds.includes(sceneCity(item.sceneId) ?? "")).map((item) => item.game));
    expect(games.length).toBeGreaterThan(0);
    expect(new Set(games).size).toBe(games.length);
    expect(new Set(games)).toEqual(india);
  });
});

describe("lookSceneId", () => {
  it("is the ID the scene's screen dresses her by", () => {
    expect(lookSceneId({ id: "s", main: { date: "d" } })).toBe("d");
    expect(lookSceneId({ id: "s", main: { battle: "b" } })).toBe("b");
    expect(lookSceneId({ id: "s", main: { guide: "g" } })).toBe("g");
    expect(lookSceneId({ id: "s" })).toBe("s");
  });
});
