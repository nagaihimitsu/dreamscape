import { describe, expect, it } from "vitest";
import {
  conditionIssues, conditionLeaves, conditionSchema, LEAF_KINDS, leafReference, requiredLeaves, type Condition, type Leaf,
} from "./condition-schemas";

/** One well-formed example of every leaf. */
const EXAMPLES: Record<(typeof LEAF_KINDS)[number], Leaf> = {
  episodeCompleted: { episodeCompleted: "a_episode" },
  episodesCompleted: { episodesCompleted: { city: "a_city", atLeast: 1 } },
  cityCompleted: { cityCompleted: "a_city" },
  battlePlayed: { battlePlayed: "a_battle" },
  landmarkVisited: { landmarkVisited: "a_landmark" },
  guideRead: { guideRead: "a_landmark" },
  encounterCompleted: { encounterCompleted: "an_encounter" },
  encounterSeen: { encounterSeen: "an_encounter" },
  datePlayed: { datePlayed: "a_date" },
  epilogueViewed: { epilogueViewed: "a_city" },
  item: { item: { id: "an_item", is: "held" } },
  time: { time: "night" },
  cityDay: { cityDay: { atLeast: 2, atMost: 3 } },
  journeyDay: { journeyDay: { atMost: 4 } },
  weekday: { weekday: [5, 6] },
  rides: { rides: { mode: "tram", atLeast: 2 } },
  rented: { rented: "bicycle" },
};
const messages = (value: unknown) => conditionIssues(value).map((issue) => issue.message);

describe("condition schema", () => {
  it("accepts every stage-1 leaf, the combinators and their nesting", () => {
    expect(Object.keys(EXAMPLES).sort()).toEqual([...LEAF_KINDS].sort());
    for (const leaf of Object.values(EXAMPLES)) expect(conditionSchema.safeParse(leaf).success).toBe(true);
    for (const status of ["obtained", "held", "gifted", "used", "left_behind"])
      expect(messages({ item: { id: "x", is: status } })).toEqual([]);
    const nested: Condition = { all: [
      EXAMPLES.episodesCompleted,
      { any: [EXAMPLES.cityCompleted, { not: EXAMPLES.datePlayed }] },
      { atLeast: { count: 2, of: [EXAMPLES.landmarkVisited, EXAMPLES.guideRead, { all: [{ not: { not: EXAMPLES.time } }] }] } },
    ] };
    expect(conditionSchema.parse(nested)).toEqual(nested);
  });

  it("refuses unknown parts, naming the stage of a later one", () => {
    expect(messages({ flag: "x" })).toEqual(['Condition part "flag" is not available yet (stage 3)']);
    expect(messages({ money: { atLeast: 300 } })).toEqual(['Condition part "money" is not available yet (stage 2)']);
    expect(messages({ all: [{ placeVisited: "x" }] })).toEqual(["Unknown condition part: placeVisited"]);
    expect(conditionIssues({ all: [EXAMPLES.time, { met: "x" }] })[0].path).toEqual(["all", 1, "met"]);
  });

  it("refuses nodes without exactly one key, empty lists and out-of-range counts", () => {
    for (const value of [{}, { episodeCompleted: "a", cityCompleted: "b" }, [], "x", null])
      expect(messages(value)).toEqual(["A condition node has exactly one key"]);
    expect(messages({ all: [] })).toEqual(["A condition list must be a non-empty array"]);
    expect(messages({ any: EXAMPLES.time })).toEqual(["A condition list must be a non-empty array"]);
    expect(messages({ atLeast: { count: 1, of: [] } })).toContain("A condition list must be a non-empty array");
    for (const count of [0, 3, 1.5, "1"])
      expect(messages({ atLeast: { count, of: [EXAMPLES.time, EXAMPLES.rented] } }))
        .toEqual(["atLeast.count must be a whole number from 1 to the number of conditions in of"]);
    expect(messages({ atLeast: { count: 1, of: [EXAMPLES.time], extra: 1 } })).toEqual(["atLeast takes { count, of }"]);
  });

  it("checks each leaf's value", () => {
    expect(messages({ episodeCompleted: "Bad-Id" })).toHaveLength(1);
    expect(messages({ episodesCompleted: { city: "a", atLeast: 0 } })).toHaveLength(1);
    expect(messages({ item: { id: "x", is: "lost" } })).toHaveLength(1);
    expect(messages({ item: { id: "x", is: "gifted", encounter: "y" } })).toHaveLength(1);
    expect(messages({ time: "closed" })).toHaveLength(1);
    expect(messages({ cityDay: {} })).toEqual(["cityDay: A range needs atLeast or atMost"]);
    expect(messages({ cityDay: { atLeast: 3, atMost: 2 } })).toEqual(["cityDay: A range's atLeast is greater than its atMost"]);
    expect(messages({ journeyDay: { atLeast: 0 } })).toHaveLength(1);
    expect(messages({ weekday: [] })).toHaveLength(1);
    expect(messages({ weekday: [7] })).toHaveLength(1);
    expect(messages({ weekday: [1, 1] })).toEqual(["weekday: A weekday is listed twice"]);
    expect(messages({ rides: { mode: "tram", atLeast: 0 } })).toHaveLength(1);
  });
});

describe("leaves of a condition", () => {
  const a = EXAMPLES.episodeCompleted;
  const b = EXAMPLES.cityCompleted;
  const c = EXAMPLES.datePlayed;

  it("lists every leaf whatever its polarity", () => {
    expect(conditionLeaves({ all: [a, { not: b }, { atLeast: { count: 1, of: [c, a] } }] })).toEqual([a, b, c, a]);
  });

  it("finds the leaves that must be true", () => {
    expect(requiredLeaves(a)).toEqual([a]);
    expect(requiredLeaves({ all: [a, b, a] })).toEqual([a, b]);
    expect(requiredLeaves({ any: [{ all: [a, b] }, { all: [a, c] }] })).toEqual([a]);
    expect(requiredLeaves({ any: [a, b] })).toEqual([]);
    expect(requiredLeaves({ not: a })).toEqual([]);
    expect(requiredLeaves({ all: [{ not: a }, b] })).toEqual([b]);
    expect(requiredLeaves({ atLeast: { count: 2, of: [a, b] } })).toEqual([a, b]);
    expect(requiredLeaves({ atLeast: { count: 1, of: [{ all: [a, b] }, { all: [b, c] }] } })).toEqual([b]);
  });

  it("names what a leaf refers to", () => {
    expect(leafReference(EXAMPLES.episodesCompleted)).toEqual({ kind: "city", id: "a_city" });
    expect(leafReference(EXAMPLES.guideRead)).toEqual({ kind: "landmark", id: "a_landmark" });
    expect(leafReference(EXAMPLES.item)).toEqual({ kind: "item", id: "an_item" });
    expect(leafReference(EXAMPLES.rides)).toEqual({ kind: "mode", id: "tram" });
    expect(leafReference(EXAMPLES.epilogueViewed)).toEqual({ kind: "city", id: "a_city" });
    for (const situational of [EXAMPLES.time, EXAMPLES.cityDay, EXAMPLES.journeyDay, EXAMPLES.weekday])
      expect(leafReference(situational)).toBeUndefined();
  });
});
