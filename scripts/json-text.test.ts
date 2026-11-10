import { describe, expect, it } from "vitest";
import { jsonText, jsonTextKeeping, withKeyOrderOf } from "./json-text";

const lines = (text: string) => text.split("\n");
/** The lines of `after` that differ from `before` at the same position. */
const changedLines = (before: string, after: string) => lines(after).filter((line, index) => line !== lines(before)[index]);

describe("JSON files the tools write keep their text and key order", () => {
  it("keeps the exact text when the data is the same, whatever the new value's key order", () => {
    const before = '{"b": 1, "a": [ {"id": "x", "z": 1} ]}\n';
    expect(jsonTextKeeping(before, { a: [{ z: 1, id: "x" }], b: 1 })).toBe(before);
    expect(jsonTextKeeping(null, { a: 1 })).toBe('{\n  "a": 1\n}\n');
  });

  it("writes a changed value in the file's key order, so only the changed line differs", () => {
    // A file whose keys are not in the schema's order (a parse returns the schema's order).
    const file = { cityId: "test_city", places: [{ id: "p_a", nameJa: "地点A", sources: [], landmarkIds: ["l_a"] }, { id: "p_b", nameJa: "地点B", sources: [] }],
      routes: [{ fromPlaceId: "p_a", toPlaceId: "p_b", mode: "walk", minutes: 10, cost: 0 }] };
    const before = jsonText(file);
    const parsed = { cityId: "test_city", places: [{ id: "p_a", nameJa: "地点A", landmarkIds: ["l_a"], sources: [] }, { id: "p_b", nameJa: "地点B", sources: [] }],
      routes: [{ fromPlaceId: "p_a", toPlaceId: "p_b", mode: "walk", cost: 0, minutes: 11 }] };
    const after = jsonTextKeeping(before, parsed);
    expect(changedLines(before, after)).toEqual(['      "minutes": 11,']);
    expect(JSON.parse(after)).toEqual(parsed);
  });

  it("puts new keys after the known ones, and gives an added array entry its neighbours' order", () => {
    expect(Object.keys(withKeyOrderOf({ b: 1, a: 2 }, { c: 3, a: 2, b: 1 }) as object)).toEqual(["b", "a", "c"]);
    const previous = [{ id: "one", b: 1, a: 1 }, { id: "two", a: 2, b: 2 }];
    // Matched by id when entries move; an added entry takes the last entry's order; one without an id, its index.
    const keys = (value: unknown) => (value as object[]).map((entry) => Object.keys(entry).join(","));
    expect(keys(withKeyOrderOf(previous, [{ b: 2, id: "two", a: 2 }, { a: 1, b: 1, id: "one" }, { b: 3, a: 3, id: "three" }])))
      .toEqual(["id,a,b", "id,b,a", "id,a,b"]);
    expect(keys(withKeyOrderOf(previous, [{ a: 9, id: "nine", b: 9 }, { b: 8, a: 8 }]))).toEqual(["id,b,a", "a,b"]);
    // Without ids (routes, transit decisions): an unchanged entry keeps its own order wherever it moves, a changed one
    // takes the order of the entry with the same direction and mode.
    const routes = { routes: [
      { fromPlaceId: "a", toPlaceId: "b", mode: "walk", cost: 0, sources: [], estimation: "game_model" },
      { fromPlaceId: "b", toPlaceId: "a", mode: "walk", cost: 0, estimation: "game_model", sources: [] },
      { fromPlaceId: "a", toPlaceId: "c", mode: "taxi", cost: 5, sources: [], estimation: "game_model" },
    ] };
    const before = jsonText(routes);
    // The parse returns the schema's order (sources before estimation) for every route.
    const parsed = (route: Record<string, unknown>) => ({ fromPlaceId: route.fromPlaceId, toPlaceId: route.toPlaceId, mode: route.mode,
      cost: route.cost, sources: route.sources, estimation: route.estimation });
    const deleted = jsonTextKeeping(before, { routes: routes.routes.slice(1).map(parsed) });
    expect(deleted).toBe(jsonText({ routes: routes.routes.slice(1) }));
    const edited = jsonTextKeeping(before, { routes: [routes.routes[1], { ...routes.routes[2], cost: 6 }].map(parsed) });
    expect(edited).toBe(jsonText({ routes: [routes.routes[1], { ...routes.routes[2], cost: 6 }] }));
    // Entries with neither an id nor a direction: an unchanged one keeps its order after the first is deleted.
    expect(keys(withKeyOrderOf([{ x: 1, b: 1, a: 1 }, { x: 2, a: 2, b: 2 }], [{ x: 2, b: 2, a: 2 }]))).toEqual(["x,a,b"]);
    // Values that are not objects stay as they are.
    expect(withKeyOrderOf({ a: [1, 2] }, { a: "text" })).toEqual({ a: "text" });
  });
});
