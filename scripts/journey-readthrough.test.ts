import { describe, expect, it } from "vitest";
import type { SceneAt, SceneEntry } from "../src/content/scene-schemas";
import { journeyReadthrough, visitTable, type MapEvent } from "./journey-readthrough";

// journey:readthrough's order tables (a reading aid, stage 3a/4): a `place <place>` scene is listed where the game runs it,
// at the visit, the date and the finale of that place, and `visit any` only at its own city's landmarks.

const scene = (id: string, cityId: string, at: SceneAt[], priority: SceneEntry["priority"], order = 0): SceneEntry => ({
  id, kind: "talk", cityId, story: { storyId: `places/${id}`, knot: id }, at, priority, order, repeat: "once", people: [], options: [], done: {},
  conds: [], knots: [id], fingerprint: "test", origin: "place" });
const scenes = [
  scene("x_stall", "x", [{ place: "x_square" }], -1),
  scene("x_painter", "x", [{ date: "x_date" }], -1, 1),
  scene("x_sweets", "x", [{ finale: "x" }], -2),
  scene("x_wanderer", "x", [{ visit: "any" }], 1),
  scene("y_wanderer", "y", [{ visit: "any" }], 1),
];
const events: MapEvent[] = [{ placeId: "x_square", landmarkId: "x_tower" }, { placeId: "x_square", dateId: "x_date" }, { placeId: "x_square", finaleCityId: "x" }];

describe("journey:readthrough's tables", () => {
  it("lists a place scene in the visit, date and finale tables of its place, without a heading of its own", () => {
    expect(visitTable(scenes.filter((item) => item.cityId === "x"), "x_tower", events).map((item) => item.id)).toEqual(["x_stall", "x_wanderer"]);
    const lines = journeyReadthrough({ scenes, stories: {}, landmarks: [{ id: "x_tower", cityId: "x", nameJa: "塔", battleId: "x_battle" }],
      cityIds: ["x"], events, context: { effectIds: [], backgroundIds: [], emotionIds: [] } });
    const table = (heading: string) => {
      const start = lines.indexOf(heading);
      expect(start, heading).toBeGreaterThanOrEqual(0);
      const end = lines.findIndex((line, index) => index > start && line === "");
      return lines.slice(start + 1, end).map((line) => line.trim().split(/\s+/u).slice(0, 2).join(" "));
    };
    // (y_wanderer's visit any is another city's.)
    expect(table("塔  visit x_tower")).toEqual(["-1 x_stall", "0 〔観察〕「進む」まで止まる", "0 〔バトル〕x_battle", "+1 x_wanderer", "本筋の前に流れうる差し込みの場面：1"]);
    // The same priority in two files: by the files' names (places/x_painter, then places/x_stall), as the game runs them.
    expect(table("x  date x_date")).toEqual(["-1 x_painter", "-1 x_stall", "0 〔デート〕（告白なら「交際開始」の画面）"]);
    expect(table("x  finale x")).toEqual(["-2 x_sweets", "-1 x_stall", "0 〔フィナーレのバトル〕"]);
    expect(lines.some((line) => line.startsWith("x  place"))).toBe(false);
  });
});
