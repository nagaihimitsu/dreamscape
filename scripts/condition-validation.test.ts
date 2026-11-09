import { describe, expect, it } from "vitest";
import type { Condition } from "../src/content/condition-schemas";
import { checkConditions, conditionErrors, conditionWarnings, dateConditionOwners, entryRuleConditionOwners, type ConditionContent } from "./condition-validation";
import { CONTENT_WARNING_LABELS } from "./content-report";

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
      // Stage 2a: a city's battle count, relationship values, money, the stage and the couple.
      { battlesPlayed: { city: "alpha", atLeast: 1 } }, { relationship: { axis: "trust", atLeast: -1 } }, { money: { atLeast: 300 } },
      { romanceStage: { atLeast: 2 } }, { couple: true },
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
    [{ battlesPlayed: { city: "missing", atLeast: 1 } }, "Unknown city in a condition of date probe (when): missing"],
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

describe("condition build warnings", () => {
  const warn = (extra: Partial<ConditionContent>, rules: Parameters<typeof conditionWarnings>[1] = []) =>
    conditionWarnings({ ...content, ...extra }, rules);

  it("warns about an observation-only encounter that needs its own landmark's episode or battle (the Milan case)", () => {
    const ownEpisode = warn({}, [{ encounterId: "alpha_meeting", at: ["observe"], when: { episodeCompleted: "alpha_episode" } }]);
    expect(ownEpisode.map((warning) => warning.kind)).toEqual(["never-offered"]);
    expect(ownEpisode[0].message).toMatch(/^Encounter never offered: alpha_meeting is looked up only while observing alpha_tower, but its entry rule's when needs episode alpha_episode/);
    expect(warn({}, [{ encounterId: "alpha_meeting", when: { all: [{ battlePlayed: "alpha_battle" }, { time: "day" }] } }])[0].message)
      .toMatch(/needs battle alpha_battle of that same landmark/);
    // The quiz that waits for the battle is not looked up by when during the observation.
    expect(warn({}, [{ encounterId: "alpha_meeting", when: { episodeCompleted: "alpha_episode" }, quizAfterLandmarkBattle: true }])).toEqual([]);
    // Another landmark's progress, or the own one only as one alternative or negated, can be met.
    const twoCityEncounter = { encounters: [...content.encounters, { id: "beta_meeting", cityId: "beta", landmarkId: "beta_gate" }] };
    expect(warn(twoCityEncounter, [{ encounterId: "beta_meeting", when: { episodeCompleted: "alpha_episode" } }])).toEqual([]);
    expect(warn({}, [{ encounterId: "alpha_meeting", when: { any: [{ episodeCompleted: "alpha_episode" }, { time: "night" }] } }])).toEqual([]);
    expect(warn({}, [{ encounterId: "alpha_meeting", when: { not: { episodeCompleted: "alpha_episode" } } }])).toEqual([]);
  });

  it("warns about a required part of a later city, but not of an earlier one", () => {
    const dates = [{ id: "alpha_date", chapterId: "alpha", when: { all: [{ episodesCompleted: { city: "alpha", atLeast: 1 } }, { episodeCompleted: "beta_episode" }] } },
      { id: "beta_date", chapterId: "beta", when: { cityCompleted: "alpha" } }];
    expect(warn({ dates })).toEqual([{ kind: "never-offered",
      message: "Condition never met where it is checked: date alpha_date (when) is read in alpha but needs episode beta_episode of the later city beta" }]);
    expect(warn({ dates: [{ id: "alpha_date", chapterId: "alpha", when: { not: { cityCompleted: "beta" } } }] })).toEqual([]);
    // A scene's cond("…") is read in the scene's city like the other conditions (stage 2a).
    const scene = { label: "the scene encounters/alpha_talk", cityId: "alpha", conditions: [{ field: 'cond("battles beta >= 1")', condition: { battlesPlayed: { city: "beta", atLeast: 1 } } }] };
    expect(conditionWarnings(content, [], [scene])).toEqual([{ kind: "never-offered", message: "Condition never met where it is checked: " +
      'the scene encounters/alpha_talk (cond("battles beta >= 1")) is read in alpha but needs city beta of the later city beta' }]);
    expect(conditionErrors(content, [{ ...scene, conditions: [{ field: "cond", condition: { item: { id: "beta_coin", is: "held" } } }] }])).toEqual([
      "An item of another city is never held in a condition of the scene encounters/alpha_talk (cond): beta_coin belongs to beta, the condition is read in alpha"]);
  });

  it("warns about a calendar part in a journey without a calendar, and about dates that wait for each other", () => {
    expect(warn({ dates: [{ id: "alpha_date", chapterId: "alpha", when: { weekday: [5, 6] } }] }).map((warning) => warning.message))
      .toEqual([expect.stringMatching(/^Calendar condition without a calendar: date alpha_date \(when\) reads journeyDay or weekday, but two has no startWeekday/)]);
    const calendar = { journeys: [{ ...content.journeys[0], startWeekday: 0 }, content.journeys[1]] };
    expect(warn({ ...calendar, dates: [{ id: "alpha_date", chapterId: "alpha", when: { journeyDay: { atLeast: 2 } } }] })).toEqual([]);
    const waiting = warn({ dates: [{ id: "alpha_date", chapterId: "alpha", when: { datePlayed: "beta_date" } },
      { id: "beta_date", chapterId: "alpha", when: { all: [{ cityDay: { atLeast: 1 } }, { datePlayed: "alpha_date" }] } }] });
    expect(waiting.map((warning) => warning.message)).toEqual([
      "Date never offered: alpha_date waits (datePlayed) for dates that wait for it in turn",
      "Date never offered: beta_date waits (datePlayed) for dates that wait for it in turn",
    ]);
  });

  it("warns about a date condition reading the time, rides or money, which the trip to the date changes", () => {
    expect(warn({ dates: [{ id: "alpha_date", chapterId: "alpha", when: { time: "night" } },
      { id: "beta_date", chapterId: "beta", until: { rides: { mode: "tram", atLeast: 3 } } },
      { id: "gamma_date", chapterId: "alpha", when: { money: { atLeast: 300 } } }] }).map((warning) => [warning.kind, warning.message.slice(0, 60)]))
      .toEqual([["date-condition-trip", "Date condition read before and after the trip: date alpha_da"],
        ["date-condition-trip", "Date condition read before and after the trip: date beta_dat"],
        ["date-condition-trip", "Date condition read before and after the trip: date gamma_da"]]);
    // Entry rules read the moment's own state: no such warning.
    expect(warn({}, [{ encounterId: "alpha_meeting", when: { time: "night" } }])).toEqual([]);
  });

  it("gives every condition warning kind a label in the build report", () => {
    expect(CONTENT_WARNING_LABELS["never-offered"]).toBe("encounter(s) or date(s) whose condition can never be met where it is checked");
    expect(CONTENT_WARNING_LABELS["date-condition-trip"]).toBe("date condition(s) reading the time, rides or money, which the trip to the date changes");
  });
});
