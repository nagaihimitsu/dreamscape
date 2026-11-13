import { describe, expect, it } from "vitest";
import { searchFairness, type SearchAction, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { parasolSearch } from "./definition";
import {
  PARASOL_CHILDREN, PARASOL_CUSTOMERS, PARASOL_IDLE_MS, PARASOL_SPOTS, PARASOL_TOMATO_CHILD, parasolRules, parasolSetup, parasolTargets,
  type ParasolParams, type ParasolPlace,
} from "./rules";
import { PARASOL_CHILD_FIELD, PARASOL_CUSTOMER_FIELD, PARASOL_FIELD, parasolGestures, parasolKinds, parasolPosition } from "./Skin";

const record = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null): SearchRecord => ({ actions, lapse });
const stall = (name: (typeof PARASOL_SPOTS)[number]): SearchAction => ({ spot: PARASOL_SPOTS.indexOf(name) });
const customer = (name: (typeof PARASOL_CUSTOMERS)[number]): SearchAction => ({ spot: PARASOL_CUSTOMERS.indexOf(name) });
const child = (index: number): SearchAction => ({ spot: index });
const ask: SearchAction = { button: "ask" };
const idle: SearchAction = { idle: true };
const PLACES: ParasolPlace[] = ["left", "middle", "right"];

describeMiniGameRules(parasolSearch, parasolRules, { records: [
  record([]), record([], "timeout"), record([], "idle"), record([{ spot: 0 }]), record([{ spot: 40 }, { button: "call" }]),
  record([ask]), record([{ spot: 0 }, { spot: 1 }, { spot: 2 }], "idle"), record([ask, ask, ask]), record([idle, idle, idle]),
] });

describe("the parasol's rules", () => {
  const middle: ParasolParams = { at: "middle" };
  const outcome = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null, params = middle) => parasolRules.outcomeOf(record(actions, lapse), params);
  /** Round 2 and 3 found at once (her customer, the tomato child), for the tag's `at`. */
  const rest = (at: ParasolPlace = "middle") => [{ spot: parasolTargets({ at })[1] }, child(PARASOL_TOMATO_CHILD)];

  it("looks for the three things the heroine later reports: the old parasol, the customer arguing at it, the child with the tomato", () => {
    for (const at of PLACES) {
      const [hers, arguing, tomato] = parasolTargets({ at });
      expect(PARASOL_SPOTS[hers]).toBe({ left: "near_2", middle: "near_3", right: "near_4" }[at]);
      expect(PARASOL_CUSTOMERS[arguing]).toBe(PARASOL_SPOTS[hers]);
      expect(PARASOL_CHILDREN[tomato]).toBe("child_2");
      expect(parasolSetup({ at }).rounds.map((round) => [round.spots, round.targets])).toEqual([[13, [hers]], [5, [arguing]], [3, [tomato]]]);
    }
  });

  it("finds all three with at most one wrong look in all; more is found_slow", () => {
    expect(outcome([stall("near_3"), ...rest()])).toBe("found");
    expect(outcome([stall("far_2"), stall("near_3"), ...rest()])).toBe("found");
    expect(outcome([stall("near_3"), customer("near_2"), customer("near_3"), child(0), child(1)])).toBe("found_slow");
    expect(outcome([stall("far_2"), stall("near_2"), stall("near_3"), ...rest()])).toBe("found_slow");
    // A thing looked at twice counts once.
    expect(outcome([stall("far_2"), stall("far_2"), stall("near_3"), ...rest()])).toBe("found");
    // One round found is not the end (a record that stops there reads as doing nothing, never sent by the play).
    expect(outcome([stall("near_3")])).toBe("pointed");
    expect(outcome([stall("near_2"), ...rest("left")], null, { at: "left" })).toBe("found");
  });

  it("has her point it out with 「どこ？」 or when the player does nothing in a round; the next round comes", () => {
    expect(outcome([ask, ask, ask])).toBe("pointed");
    expect(outcome([ask, ...rest()])).toBe("pointed");
    expect(outcome([stall("near_3"), customer("near_3"), ask])).toBe("pointed");
    expect(outcome([stall("near_3"), idle, child(PARASOL_TOMATO_CHILD)])).toBe("pointed");
    expect(outcome([idle, idle, idle])).toBe("pointed");
    expect(outcome([], "idle")).toBe("pointed");
  });

  it("plays 「おまかせ」 to each outcome through every round", () => {
    expect(parasolRules.autoRecord("found", middle)).toEqual(record([stall("near_3"), ...rest()]));
    expect(parasolRules.autoRecord("found_slow", middle).actions).toHaveLength(5);
    expect(parasolRules.autoRecord("pointed", middle)).toEqual(record([ask, ask, ask]));
  });

  it("puts the old parasol where the tag says, the only old parasol with vegetables, among two more old ones and two more vegetable stalls", () => {
    for (const at of PLACES) for (const seed of [0, 1, 7, 12345]) {
      const kinds = parasolKinds(at, seed);
      const hers = parasolTargets({ at })[0];
      expect(kinds[PARASOL_SPOTS[hers]], `${at} ${seed}`).toBe("old");
      expect(Object.values(kinds).filter((kind) => kind === "old")).toHaveLength(1);
      expect(new Set(Object.values(kinds)).size).toBe(PARASOL_SPOTS.length);
      for (const decoy of ["chai", "old_garland", "greens", "new_greens"]) expect(Object.values(kinds)).toContain(decoy);
      // The walkers stay walkers; only the stalls are shuffled.
      expect([kinds.road_1, kinds.road_2, kinds.road_3]).toEqual(["black", "floral", "white"]);
      expect(parasolGestures(at, seed)[parasolTargets({ at })[1]]).toBe("argue");
      expect(parasolGestures(at, seed).filter((gesture) => gesture === "argue")).toHaveLength(1);
    }
    // The seed changes the street's look (and only its look).
    expect([1, 2, 3, 4].some((seed) => JSON.stringify(parasolKinds("middle", seed)) !== JSON.stringify(parasolKinds("middle", 0)))).toBe(true);
  });

  it("is a fair search: eight seconds of looking in each round before she points", () => {
    for (const at of PLACES) expect(searchFairness(parasolSetup({ at }))).toEqual([]);
    expect(PARASOL_IDLE_MS).toBe(8000);
    const schema = parasolSearch.params({ effectIds: [], backgroundIds: [], emotionIds: [] });
    expect(schema.parse({})).toEqual({ at: "middle" });
    expect(() => schema.parse({ at: "far" })).toThrow();
  });
});

describe("the parasol's street", () => {
  /** The smallest windows: a 320×568 phone (Debug room: 268 wide; a scene: 300), as short as a battle leaves it; a 390×844 phone. */
  const windows = [{ width: 268, height: 240 }, { width: 300, height: 260 }, { width: 370, height: 455 }];
  const apart = (places: Record<string, { x: number; y: number; r: number; walk?: unknown }>, window: { width: number; height: number }) => {
    const names = Object.keys(places);
    for (let ms = 0; ms <= 60000; ms += 250) {
      const at = names.map((name) => parasolPosition(places[name] as never, ms)).map(({ x, y }) => ({ x: (x / 100) * window.width, y: (y / 100) * window.height }));
      for (let a = 0; a < at.length; a += 1) for (let b = a + 1; b < at.length; b += 1)
        expect(Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y), `${names[a]}–${names[b]} at ${ms}ms`).toBeGreaterThanOrEqual(52);
      // Inside the window, clear of its edges (half a button).
      for (const point of at) {
        expect(point.x).toBeGreaterThanOrEqual(26);
        expect(point.x).toBeLessThanOrEqual(window.width - 26);
      }
    }
  };

  it("keeps each round's buttons 52px apart, walkers and children too, and inside the window", () => {
    for (const window of windows) {
      apart(PARASOL_FIELD, window);
      apart(PARASOL_CUSTOMER_FIELD, window);
      apart(PARASOL_CHILD_FIELD, window);
    }
  });

  it("stands the old parasol and the customers still (only the walkers and the children move), the children 8 to 10 seconds a way", () => {
    for (const at of PLACES) {
      const place = PARASOL_FIELD[PARASOL_SPOTS[parasolTargets({ at })[0]]];
      expect(place.walk).toBeUndefined();
      expect(parasolPosition(place, 12345)).toEqual({ x: place.x, y: place.y, sway: 0 });
    }
    for (const place of Object.values(PARASOL_CUSTOMER_FIELD)) expect(place.walk).toBeUndefined();
    for (const place of Object.values(PARASOL_CHILD_FIELD)) expect(place.walk!.periodMs / 2).toBeGreaterThanOrEqual(8000);
    for (const place of Object.values(PARASOL_CHILD_FIELD)) expect(place.walk!.periodMs / 2).toBeLessThanOrEqual(10000);
  });
});
