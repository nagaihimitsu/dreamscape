import { describe, expect, it } from "vitest";
import { searchFairness, type SearchAction, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { parasolSearch } from "./definition";
import {
  PARASOL_CHILDREN, PARASOL_CUSTOMERS, PARASOL_IDLE_MS, PARASOL_SPOTS, PARASOL_TOMATO_CHILD, PARASOL_TUNING, parasolActive, parasolFairness, parasolRules,
  parasolSetup, parasolTargets,
  type ParasolParams, type ParasolPlace,
} from "./rules";
import {
  PARASOL_CUSTOMER_FIELD, PARASOL_FIELD, PARASOL_STREET_EDGE, parasolChildAt, parasolGestures, parasolHoldings, parasolKinds, parasolPosition,
} from "./Skin";
import { fairness } from "./play";

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
      expect(parasolSetup({ at }).rounds.map((round) => [round.spots, round.targets])).toEqual([[13, [hers]], [7, [arguing]], [5, [tomato]]]);
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
      // Round 2: one arguing (hers), two more with their arms up; round 3: one tomato, a red ball and a red flower too.
      const gestures = parasolGestures(at, seed);
      expect(gestures[parasolTargets({ at })[1]]).toBe("argue");
      expect(gestures.filter((gesture) => gesture === "argue")).toHaveLength(1);
      expect(new Set(gestures)).toEqual(new Set(["argue", "ask", "laugh", "wave", "basket", "cheer", "stretch"]));
      const holdings = parasolHoldings(seed);
      expect(holdings[PARASOL_TOMATO_CHILD]).toBe("tomato");
      expect(new Set(holdings)).toEqual(new Set(["tomato", "kite", "ball", "red_ball", "flower"]));
      // The two who walk with the tomato child hold the red look-alikes.
      expect(new Set([holdings[0], holdings[2]])).toEqual(new Set(["red_ball", "flower"]));
    }
    // The seed changes the street's look (and only its look).
    expect([1, 2, 3, 4].some((seed) => JSON.stringify(parasolKinds("middle", seed)) !== JSON.stringify(parasolKinds("middle", 0)))).toBe(true);
  });

  it("is a fair search: eight seconds of looking in each round before she points, four after a round left to her", () => {
    for (const at of PLACES) expect(searchFairness(parasolSetup({ at }))).toEqual([]);
    expect(PARASOL_IDLE_MS).toBe(8000);
    expect(parasolSetup(middle).idleAfterLeftMs).toBe(4000);
    const schema = parasolSearch.params({ effectIds: [], backgroundIds: [], emotionIds: [] });
    expect(schema.parse({})).toEqual({ at: "middle", rounds: 3 });
    expect(schema.parse({ at: "left", rounds: "1" })).toEqual({ at: "left", rounds: 1 });
    expect(() => schema.parse({ at: "far" })).toThrow();
    expect(() => schema.parse({ rounds: "4" })).toThrow();
  });

  it("plays fewer rounds when the tag says so; the practice is the whole look at the left stall", () => {
    const one: ParasolParams = { at: "left", rounds: 1 };
    expect(parasolSetup(one).rounds).toHaveLength(1);
    expect(searchFairness(parasolSetup(one))).toEqual([]);
    expect(parasolRules.outcomeOf(record([stall("near_2")]), one)).toBe("found");
    expect(parasolRules.outcomeOf(record([ask]), one)).toBe("pointed");
    for (const outcome of ["found", "found_slow", "pointed"] as const) expect(parasolRules.outcomeOf(parasolRules.autoRecord(outcome, one), one)).toBe(outcome);
    // The practice teaches the bursts, the feints and the handover too: all three rounds, where the story's look is not.
    expect(parasolSearch.practice).toEqual({ params: { at: "left" } });
  });

  it("has the tomato child walk off at the round's own time: she points it out, and only round 3 has one", () => {
    const [first, second, third] = parasolSetup(middle).rounds;
    expect([first.limitMs, second.limitMs, third.limitMs]).toEqual([undefined, undefined, PARASOL_TUNING.walkOffMs]);
    expect(outcome([stall("near_3"), customer("near_3"), { gone: true }])).toBe("pointed");
    // A walk-off where a round has no own time does nothing (never sent by the play).
    expect(outcome([{ gone: true }, stall("near_3"), ...rest()])).toBe("found");
  });

  it("brings the argument in bursts, a feint first: the arms go up with no ₹ before the first burst, and between them", () => {
    const t = PARASOL_TUNING;
    // The glad customer's arms go up first, before any ₹; then the burst; the calmer gestures show all along.
    expect(parasolActive("cheer", t.feintGladMs + 1)).toBe(true);
    expect(parasolActive("argue", t.feintGladMs + 1)).toBe(false);
    expect(t.feintGladMs + t.feintForMs).toBeLessThanOrEqual(t.argueFirstMs);
    expect(parasolActive("argue", t.argueFirstMs)).toBe(true);
    expect(parasolActive("argue", t.argueFirstMs + t.argueForMs)).toBe(false);
    expect(parasolActive("argue", t.argueFirstMs + t.argueEveryMs + 1)).toBe(true);
    for (const gesture of ["ask", "laugh", "basket"] as const) expect(parasolActive(gesture, 0)).toBe(true);
    // Every gesture that feints shows a while within the idle limit, and the argument shows at least twice before it.
    for (const gesture of ["cheer", "wave", "stretch"] as const) expect(Array.from({ length: 80 }, (_, step) => parasolActive(gesture, step * 100)).some(Boolean), gesture).toBe(true);
    expect(Array.from({ length: t.idleMs / 100 }, (_, step) => parasolActive("argue", step * 100)).filter((on, step, all) => on && !all[step - 1]).length).toBeGreaterThanOrEqual(2);
  });

  it("calls a tuning unfair where a tell flickers, the first burst comes too late, or the children walk off at once", () => {
    expect(parasolFairness(PARASOL_TUNING)).toEqual([]);
    expect(fairness(PARASOL_TUNING)).toEqual([]);
    expect(parasolFairness({ ...PARASOL_TUNING, argueForMs: 200 }).join()).toContain("argueForMs 200");
    expect(parasolFairness({ ...PARASOL_TUNING, argueFirstMs: 7500 }).join()).toContain("idle limit");
    expect(parasolFairness({ ...PARASOL_TUNING, walkOffMs: 3000 }).join()).toContain("handover and the walk-off");
    expect(fairness({ ...PARASOL_TUNING, walkOffMs: 3000 }).join()).toContain("limitMs 3000");
  });

  it("rates the look for the result card in step with the outcome: ★3 quick and clean, ★2 found, ★1 found slowly, none pointed", () => {
    const middle: ParasolParams = { at: "middle" };
    const all = (endMs: number | undefined, ...wrong: SearchAction[]): SearchRecord => ({ actions: [...wrong, stall("near_3"), customer("near_3"), child(PARASOL_TOMATO_CHILD)], lapse: null, endMs });
    expect(parasolRules.rate?.(all(4900), middle)).toEqual({ stars: 3, scoreJa: "4.9秒で見つけた" });
    // ★3 asks for the whole look within 5.1 s (about 3 in 10 average players: bot.test.ts); a slower clean look is ★2.
    expect(PARASOL_TUNING.starMsPerRound * 3).toBe(5100);
    // A ★2 says what ★3 asks (2026-11-14 playtest); the tenths round up, so a time past the bar never reads as the bar.
    expect(parasolRules.rate?.(all(PARASOL_TUNING.starMsPerRound * 3 + 1), middle)).toEqual({ stars: 2, scoreJa: "5.2秒（★3は5.1秒まで）" });
    expect(parasolRules.rate?.(all(12400), middle)?.stars).toBe(2);
    // With wrong looks, the score says how many (what took the ★ off).
    expect(parasolRules.rate?.(all(4000, stall("far_1")), middle)).toEqual({ stars: 2, scoreJa: "4.0秒・見間違い 1（★3は見間違いなし）" });
    expect(parasolRules.rate?.(all(6000, stall("far_1")), middle)).toEqual({ stars: 2, scoreJa: "6.0秒・見間違い 1（★3は見間違いなしで5.1秒まで）" });
    expect(parasolRules.rate?.(all(4600, stall("far_1"), stall("far_2")), middle)).toEqual({ stars: 1, scoreJa: "4.6秒・見間違い 2" });
    expect(parasolRules.rate?.(all(undefined), middle)).toEqual({ stars: 2 });
    expect(parasolRules.rate?.(record([ask, ask, ask]), middle)).toBeNull();
    expect(parasolRules.rate?.(record([stall("near_3"), ask, child(PARASOL_TOMATO_CHILD)]), middle)).toBeNull();
    // One round: ★3 within one round's time.
    expect(parasolRules.rate?.({ actions: [stall("near_2")], lapse: null, endMs: 1600 }, { at: "left", rounds: 1 })?.stars).toBe(3);
    expect(parasolRules.rate?.({ actions: [stall("near_2")], lapse: null, endMs: 4000 }, { at: "left", rounds: 1 })?.stars).toBe(2);
    // Every outcome's ★ follows the outcome (the template checks rate does not throw).
    for (const outcome of ["found", "found_slow"] as const) expect(parasolRules.rate?.(parasolRules.autoRecord(outcome, middle), middle)).not.toBeNull();
    expect(parasolRules.rate?.(parasolRules.autoRecord("pointed", middle), middle)).toBeNull();
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

  it("keeps rounds 1 and 2's buttons 52px apart, the walkers too, and inside the window", () => {
    for (const window of windows) {
      apart(PARASOL_FIELD, window);
      apart(PARASOL_CUSTOMER_FIELD, window);
    }
  });

  it("walks round 3's children 52px apart, the tomato child from her stall to the side street's mouth as the round's time runs out", () => {
    for (const window of windows) for (const at of PLACES) for (let ms = 0; ms <= PARASOL_TUNING.walkOffMs; ms += 100) {
      const here = PARASOL_CHILDREN.map((_, index) => parasolChildAt(index, at, ms));
      const shown = here.map((place, index) => ({ ...place, index })).filter((place) => !place.gone);
      for (let a = 0; a < shown.length; a++) for (let b = a + 1; b < shown.length; b++) {
        const gap = Math.hypot(((shown[a].x - shown[b].x) / 100) * window.width, ((shown[a].y - shown[b].y) / 100) * window.height);
        expect(gap, `${at} ${ms}ms: ${shown[a].index}–${shown[b].index} on ${window.width}`).toBeGreaterThanOrEqual(52);
      }
      // A child still there is in the window (walking out of it at the side street's mouth).
      for (const place of shown) expect(place.x).toBeGreaterThanOrEqual(PARASOL_STREET_EDGE);
      for (const place of shown) expect(place.x).toBeLessThanOrEqual(100 - PARASOL_STREET_EDGE);
    }
    for (const at of PLACES) {
      const stallX = PARASOL_FIELD[PARASOL_SPOTS[parasolTargets({ at })[0]]].x;
      // In front of her stall for the handover, all five clear of the window's edges then; at the edge as the time runs out.
      expect(parasolChildAt(PARASOL_TOMATO_CHILD, at, PARASOL_TUNING.handoverMs).x).toBe(stallX);
      for (let index = 0; index < PARASOL_CHILDREN.length; index++) {
        const start = parasolChildAt(index, at, 0);
        expect((start.x / 100) * 268, `${at} ${index}`).toBeGreaterThanOrEqual(26);
        expect((start.x / 100) * 268, `${at} ${index}`).toBeLessThanOrEqual(268 - 26);
      }
      const end = parasolChildAt(PARASOL_TOMATO_CHILD, at, PARASOL_TUNING.walkOffMs);
      expect(end.gone).toBe(true);
      expect(Math.min(end.x, 100 - end.x)).toBeCloseTo(PARASOL_STREET_EDGE);
      expect(parasolChildAt(PARASOL_TOMATO_CHILD, at, PARASOL_TUNING.walkOffMs - 1).gone).toBe(false);
    }
  });

  it("stands the old parasol and the customers still (only the walkers and the children move)", () => {
    for (const at of PLACES) {
      const place = PARASOL_FIELD[PARASOL_SPOTS[parasolTargets({ at })[0]]];
      expect(place.walk).toBeUndefined();
      expect(parasolPosition(place, 12345)).toEqual({ x: place.x, y: place.y, sway: 0 });
    }
    for (const place of Object.values(PARASOL_CUSTOMER_FIELD)) expect(place.walk).toBeUndefined();
    expect(Object.keys(PARASOL_CUSTOMER_FIELD)).toEqual([...PARASOL_CUSTOMERS]);
  });
});
