// 旅の記録's 「出会った人」 (2026-11-11 user decision): the people of progression/story.json met so far (the `met` rule),
// by city in journey order, in the order first met. The sample journey's fictional 見本の街 declares リリ and トーマ.
import { describe, expect, it } from "vitest";
import { getCityContent, storyState } from "../../content";
import { cityStart } from "../../dev/scenario-builders";
import { meets } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { declaresPeople, metPeopleGroups } from "./met-people";

const SAMPLE = "mihon";
const seen = (ids: string[]): GameState => ({ ...cityStart(SAMPLE, ["航", "澪"]), seenEncounterIds: ids });
const person = (id: string) => storyState.people.find((item) => item.id === id)!;

describe("the people met on the journey", () => {
  it("lists no one before a scene naming a person is seen", () => {
    expect(declaresPeople(seen([]))).toBe(true);
    expect(metPeopleGroups(seen([]))).toEqual([]);
  });

  it("groups the people met by city, in the order first met, with their names and descriptions only", () => {
    // トーマ's talk after observing the clock tower, then リリ's bookmark stall, then トーマ's bell again.
    const groups = metPeopleGroups(seen(["smp_mihon_clock_gears", "smp_mihon_bookmark_stall", "smp_mihon_clock_bell"]));
    expect(groups).toEqual([{ cityId: SAMPLE, cityNameJa: getCityContent(SAMPLE).city.nameJa, people: [
      { id: "smp_mihon_toma", nameJa: "トーマ", descriptionJa: person("smp_mihon_toma").descriptionJa },
      { id: "smp_mihon_lili", nameJa: "リリ", descriptionJa: person("smp_mihon_lili").descriptionJa },
    ] }]);
    for (const met of groups.flatMap((group) => group.people)) expect(Object.keys(met).sort()).toEqual(["descriptionJa", "id", "nameJa"]);
  });

  it("agrees with the met condition for everyone declared", () => {
    for (const ids of [[], ["smp_mihon_bookmark_stall"], ["smp_mihon_clock_gears"], ["smp_mihon_clock_gears", "smp_mihon_bookmark_stall"]]) {
      const state = seen(ids);
      const listed = metPeopleGroups(state).flatMap((group) => group.people.map((item) => item.id));
      expect(listed.sort()).toEqual(storyState.people.filter((item) => meets(state, { met: item.id })).map((item) => item.id).sort());
    }
  });

  it("fills the names set into a description, and leaves out one not written", () => {
    const lili = person("smp_mihon_lili");
    const written = lili.descriptionJa;
    lili.descriptionJa = "{heroine_name}にしおりをくれた女の子";
    try {
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))[0].people[0].descriptionJa).toBe("澪にしおりをくれた女の子");
      delete lili.descriptionJa;
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))[0].people[0]).toEqual({ id: "smp_mihon_lili", nameJa: "リリ" });
    } finally {
      lili.descriptionJa = written;
    }
  });

  it("says when the journey declares no one", () => {
    const declared = storyState.people.splice(0);
    try {
      expect(declaresPeople(seen([]))).toBe(false);
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))).toEqual([]);
    } finally {
      storyState.people.push(...declared);
    }
  });
});
