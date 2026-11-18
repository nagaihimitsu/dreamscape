import { describe, expect, it } from "vitest";
import { sceneGivenClues, type SceneEntry } from "../src/content/scene-schemas";
import { checkSceneReferences, mergeCatalogChoiceTags, type SceneReferences } from "./scene-table";

// A clue heard in conversation (2026-11-18) in content:build's scene table: the clues a choice's # clue: and a head's
// # on_done: clue name exist and belong to the scene's journey (A2), a one-scene catalog encounter's # clue: joins its
// catalog option, and the scenes that give a clue are one set (the save check, the clue book).

const scene = (change: Partial<SceneEntry> = {}): SceneEntry => ({
  id: "smp_x_talk", kind: "talk", cityId: "x_town", story: { storyId: "places/smp_x_town", knot: "smp_x_talk" }, at: [{ visit: "x_tower" }],
  priority: -1, order: 0, repeat: "once", people: [], options: [], done: {}, conds: [], knots: ["smp_x_talk"], fingerprint: "f", origin: "place", ...change,
});
const refs: SceneReferences = {
  items: new Map(), flags: new Set(), people: new Set(), memories: new Set(), profiles: new Set(), effects: new Set(),
  clues: new Map([["x_clue", "trip_x"], ["y_clue", "trip_y"]]),
  journeyOfCity: (cityId) => (cityId === "x_town" ? "trip_x" : undefined),
};

describe("the clues of the scene table", () => {
  it("accept a clue of the scene's journey on a choice and at the end, and stop an unknown one or another journey's", () => {
    expect(() => checkSceneReferences(scene({ options: [{ id: "ask", knot: "smp_x_talk", clues: ["x_clue"] }], done: { clues: ["x_clue"] } }), refs))
      .not.toThrow();
    expect(() => checkSceneReferences(scene({ options: [{ id: "ask", knot: "smp_x_talk", clues: ["no_clue"] }] }), refs))
      .toThrow("Unknown clue in the choice ask (# clue:) of places/smp_x_town (smp_x_talk): no_clue (register it in tourism/catalog.json clues)");
    expect(() => checkSceneReferences(scene({ done: { clues: ["y_clue"] } }), refs))
      .toThrow("A clue of another journey in # on_done: clue of places/smp_x_town (smp_x_talk): y_clue belongs to trip_y, the scene to trip_x");
  });

  it("join a one-scene catalog encounter's # clue: to its catalog option", () => {
    const catalog = scene({ origin: "catalog", options: [{ id: "ask", knot: "smp_x_talk", money: -10 }, { id: "nod", knot: "smp_x_talk" }] });
    expect(mergeCatalogChoiceTags(catalog, [{ id: "ask", knot: "smp_x_talk", clues: ["x_clue"] }]).options)
      .toEqual([{ id: "ask", knot: "smp_x_talk", money: -10, clues: ["x_clue"] }, { id: "nod", knot: "smp_x_talk" }]);
  });

  it("are one set of every scene's # clue: and # on_done: clue", () => {
    expect([...sceneGivenClues([
      scene({ options: [{ id: "ask", knot: "smp_x_talk", clues: ["a", "b"] }, { id: "nod", knot: "smp_x_talk" }] }),
      scene({ id: "smp_x_other", done: { clues: ["b", "c"] } }),
      scene({ id: "smp_x_plain" }),
    ])].sort()).toEqual(["a", "b", "c"]);
  });
});
