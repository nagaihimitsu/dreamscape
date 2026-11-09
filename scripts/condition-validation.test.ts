import { describe, expect, it } from "vitest";
import type { Condition } from "../src/content/condition-schemas";
import { checkConditions, conditionErrors, dateConditionOwners, entryRuleConditionOwners, type ConditionContent } from "./condition-validation";

/** A two-city journey (alpha → beta) and a one-city journey (gamma), in memory. */
const content: ConditionContent = {
  journeys: [
    { id: "two", cities: [{ id: "alpha" }, { id: "beta" }], transportModes: [{ id: "tram" }] },
    { id: "one", cities: [{ id: "gamma" }], transportModes: [] },
  ],
  cities: [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }],
  episodes: [
    { id: "alpha_episode", cityId: "alpha", landmarkId: "alpha_tower" },
    { id: "beta_episode", cityId: "beta", landmarkId: "beta_gate" },
  ],
  battles: [{ id: "alpha_battle", landmarkId: "alpha_tower" }, { id: "beta_finale", cityId: "beta", landmarkId: null }],
  landmarks: [{ id: "alpha_tower", cityId: "alpha" }, { id: "beta_gate", cityId: "beta" }],
  encounters: [{ id: "alpha_meeting", cityId: "alpha", landmarkId: "alpha_tower" }],
  items: [{ id: "alpha_key", cityId: "alpha" }, { id: "beta_coin", cityId: "beta" }, { id: "gamma_shell", cityId: "gamma" }],
  dates: [{ id: "alpha_date", chapterId: "alpha" }, { id: "beta_date", chapterId: "beta" }],
};
/** The errors of one condition on a date of `cityId`. */
const errorsOf = (when: Condition, cityId = "beta") =>
  conditionErrors(content, dateConditionOwners({ dates: [{ id: "probe", chapterId: cityId, when }] }));

describe("condition build checks", () => {
  it("accepts conditions that name existing content readable where they are checked", () => {
    const when: Condition = { all: [
      { episodesCompleted: { city: "beta", atLeast: 1 } }, { episodeCompleted: "alpha_episode" }, { cityCompleted: "alpha" },
      { battlePlayed: "alpha_battle" }, { landmarkVisited: "alpha_tower" }, { guideRead: "beta_gate" },
      { encounterCompleted: "alpha_meeting" }, { encounterSeen: "alpha_meeting" }, { datePlayed: "alpha_date" },
      { epilogueViewed: "alpha" }, { rides: { mode: "tram", atLeast: 1 } }, { rented: "tram" },
      // An item of an earlier city: its history is read later; held only in its own city.
      { item: { id: "alpha_key", is: "left_behind" } }, { item: { id: "alpha_key", is: "gifted" } }, { item: { id: "beta_coin", is: "held" } },
      { time: "night" }, { cityDay: { atLeast: 2 } },
    ] };
    expect(errorsOf(when)).toEqual([]);
    expect(() => checkConditions(content, dateConditionOwners({ dates: [{ id: "probe", chapterId: "beta", when, until: { not: when } }] })))
      .not.toThrow();
  });

  it.each([
    [{ episodeCompleted: "missing" }, "Unknown episode in a condition of date probe (when): missing"],
    [{ episodesCompleted: { city: "missing", atLeast: 1 } }, "Unknown city in a condition of date probe (when): missing"],
    [{ cityCompleted: "missing" }, "Unknown city in a condition of date probe (when): missing"],
    [{ epilogueViewed: "missing" }, "Unknown city in a condition of date probe (when): missing"],
    [{ battlePlayed: "missing" }, "Unknown battle in a condition of date probe (when): missing"],
    [{ landmarkVisited: "missing" }, "Unknown landmark in a condition of date probe (when): missing"],
    [{ guideRead: "missing" }, "Unknown landmark in a condition of date probe (when): missing"],
    [{ encounterSeen: "missing" }, "Unknown encounter in a condition of date probe (when): missing"],
    [{ datePlayed: "missing" }, "Unknown date in a condition of date probe (when): missing"],
    [{ item: { id: "missing", is: "obtained" } }, "Unknown item in a condition of date probe (when): missing"],
  ] as [Condition, string][])("refuses an unknown name: %j", (leaf, message) => {
    expect(errorsOf({ not: { any: [{ time: "day" }, leaf] } })).toEqual([message]);
  });

  it("refuses walking and a transport mode the owner's journey does not declare", () => {
    expect(errorsOf({ rides: { mode: "walk", atLeast: 1 } })[0]).toMatch(/^Walking is not counted or rented in a condition of date probe/);
    expect(errorsOf({ rented: "tram" }, "gamma")).toEqual([
      "Undeclared transport mode in a condition of date probe (when): tram (declare it in the journey's transportModes)",
    ]);
  });

  it("refuses an item status that can never be read where the condition is checked", () => {
    expect(errorsOf({ item: { id: "alpha_key", is: "held" } })[0]).toMatch(/^An item of another city is never held/);
    expect(errorsOf({ item: { id: "beta_coin", is: "left_behind" } })[0]).toMatch(/^An item is left behind only after leaving its city/);
    expect(errorsOf({ item: { id: "beta_coin", is: "left_behind" } }, "alpha")[0]).toMatch(/^An item is left behind only after leaving its city/);
    expect(errorsOf({ item: { id: "gamma_shell", is: "left_behind" } })[0]).toMatch(/^An item is left behind only after leaving its city/);
    // Other statuses of another city's item are history and may be read anywhere.
    expect(errorsOf({ item: { id: "beta_coin", is: "used" } }, "alpha")).toEqual([]);
  });

  it("checks an entry rule's when in its encounter's city", () => {
    const owners = entryRuleConditionOwners(content, [
      { encounterId: "alpha_meeting", when: { all: [{ battlePlayed: "alpha_battle" }, { item: { id: "alpha_key", is: "held" } }] } },
      { encounterId: "alpha_meeting" },
      { encounterId: "missing_meeting", when: { episodeCompleted: "missing" } },
    ]);
    expect(owners).toHaveLength(1);
    expect(conditionErrors(content, owners)).toEqual([]);
    expect(conditionErrors(content, entryRuleConditionOwners(content, [{ encounterId: "alpha_meeting", when: { item: { id: "beta_coin", is: "held" } } }])))
      .toEqual([expect.stringMatching(/^An item of another city is never held in a condition of the entry rule of encounter alpha_meeting \(when\)/)]);
    expect(conditionErrors(content, entryRuleConditionOwners(content, [{ encounterId: "alpha_meeting", when: { not: { landmarkVisited: "nowhere" } } }])))
      .toEqual(["Unknown landmark in a condition of the entry rule of encounter alpha_meeting (when): nowhere"]);
  });

  it("checks until as well as when and lists every problem at once", () => {
    const owners = dateConditionOwners({ dates: [{ id: "probe", chapterId: "beta", when: { cityCompleted: "nowhere" }, until: { datePlayed: "nothing" } }] });
    expect(() => checkConditions(content, owners)).toThrow(
      "Unknown city in a condition of date probe (when): nowhere\nUnknown date in a condition of date probe (until): nothing");
  });
});
