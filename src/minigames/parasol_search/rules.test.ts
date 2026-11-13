import { describe, expect, it } from "vitest";
import { searchFairness, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { parasolSearch } from "./definition";
import { PARASOL_SPOTS, parasolRules, parasolSetup, type ParasolParams, type ParasolPlace } from "./rules";
import { PARASOL_FIELD, parasolKinds, parasolPosition } from "./Skin";

const record = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null): SearchRecord => ({ actions, lapse });
const spot = (name: (typeof PARASOL_SPOTS)[number]) => ({ spot: PARASOL_SPOTS.indexOf(name) });

describeMiniGameRules(parasolSearch, parasolRules, { records: [
  record([]), record([], "timeout"), record([], "idle"), record([{ spot: 0 }]), record([{ spot: 40 }, { button: "call" }]),
  record([{ button: "ask" }]), record([{ spot: 0 }, { spot: 1 }, { spot: 2 }], "idle"),
] });

describe("the parasol's rules", () => {
  const middle: ParasolParams = { at: "middle" };
  const outcome = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null, params = middle) => parasolRules.outcomeOf(record(actions, lapse), params);

  it("finds the old parasol at once, after one wrong umbrella, or after more", () => {
    expect(outcome([spot("near_middle")])).toBe("found");
    expect(outcome([spot("far_2"), spot("near_middle")])).toBe("found");
    expect(outcome([spot("far_2"), spot("near_left"), spot("near_middle")])).toBe("found_slow");
    // An umbrella looked at twice counts once.
    expect(outcome([spot("far_2"), spot("far_2"), spot("near_middle")])).toBe("found");
    // A wrong umbrella alone does not end the look (a record that stops there reads as doing nothing).
    expect(outcome([spot("near_middle")], null, { at: "left" })).toBe("pointed");
    expect(outcome([spot("near_middle"), spot("near_left")], null, { at: "left" })).toBe("found");
  });

  it("has her point it out with 「どこ？」 or when the player does nothing, even after looking", () => {
    expect(outcome([{ button: "ask" }])).toBe("pointed");
    expect(outcome([spot("far_1"), { button: "ask" }])).toBe("pointed");
    expect(outcome([], "idle")).toBe("pointed");
    expect(outcome([spot("far_1"), spot("road_left")], "idle")).toBe("pointed");
  });

  it("puts the old parasol where the tag says, on the near pavement", () => {
    for (const at of ["left", "middle", "right"] as ParasolPlace[]) {
      const target = parasolSetup({ at }).targets[0];
      expect(PARASOL_SPOTS[target]).toBe(`near_${at}`);
      expect(outcome([{ spot: target }], null, { at })).toBe("found");
      expect(parasolKinds(at)[PARASOL_SPOTS[target]]).toBe("old");
      // One old parasol with vegetables; the others are what the street had.
      expect(Object.values(parasolKinds(at)).filter((kind) => kind === "old")).toHaveLength(1);
      expect(new Set(Object.values(parasolKinds(at))).size).toBe(PARASOL_SPOTS.length);
    }
  });

  it("is a fair search: nine umbrellas, eight seconds of looking before she points", () => {
    for (const at of ["left", "middle", "right"] as ParasolPlace[]) expect(searchFairness(parasolSetup({ at }))).toEqual([]);
    const schema = parasolSearch.params({ effectIds: [], backgroundIds: [], emotionIds: [] });
    expect(schema.parse({})).toEqual({ at: "middle" });
    expect(() => schema.parse({ at: "far" })).toThrow();
  });
});

describe("the parasol's street", () => {
  it("keeps the umbrellas 44px apart, walkers too, on the smallest window a battle leaves (300×172 on a 320×568 phone)", () => {
    const window = { width: 300, height: 172 };
    for (let ms = 0; ms <= 60000; ms += 250) {
      const at = PARASOL_SPOTS.map((name) => parasolPosition(PARASOL_FIELD[name], ms)).map(({ x, y }) => ({ x: (x / 100) * window.width, y: (y / 100) * window.height }));
      for (let a = 0; a < at.length; a += 1) for (let b = a + 1; b < at.length; b += 1)
        expect(Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y), `${PARASOL_SPOTS[a]}–${PARASOL_SPOTS[b]} at ${ms}ms`).toBeGreaterThanOrEqual(44);
      // Inside the window, clear of its edges (half a button).
      for (const point of at) {
        expect(point.x).toBeGreaterThanOrEqual(22);
        expect(point.x).toBeLessThanOrEqual(window.width - 22);
      }
    }
  });

  it("stands the old parasol still (only the walkers move)", () => {
    for (const at of ["left", "middle", "right"] as const) {
      const place = PARASOL_FIELD[`near_${at}`];
      expect(place.walk).toBeUndefined();
      expect(parasolPosition(place, 12345)).toEqual({ x: place.x, y: place.y, sway: 0 });
    }
  });
});
