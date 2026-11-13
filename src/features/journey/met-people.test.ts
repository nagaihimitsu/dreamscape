// 旅の記録's 「出会った人」 (2026-11-11 user decision; widened 2026-11-13): the people met so far, from the scenes completed
// and the quizzes played, by city in journey order. The sample journey's fictional 見本の街 declares リリ and トーマ; its
// quizzes' partners are トーマ (the same person), サラ, イオ and ハンナ.
import { describe, expect, it } from "vitest";
import { battles, getCityContent, storyState } from "../../content";
import { cityStart } from "../../dev/scenario-builders";
import { meets } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { declaresPeople, metPeopleGroups } from "./met-people";

const SAMPLE = "mihon";
const seen = (ids: string[]): GameState => ({ ...cityStart(SAMPLE, ["航", "澪"]), seenEncounterIds: ids });
const person = (id: string) => storyState.people.find((item) => item.id === id)!;
const played = (state: GameState, battleIds: string[]): GameState =>
  ({ ...state, battleRecords: battleIds.map((battleId) => ({ battleId, attempts: 1, firstScore: 1, bestScore: 1, lastScore: 1 })) });
const names = (state: GameState) => metPeopleGroups(state).map((group) => [group.cityId, group.people.map((item) => item.nameJa)]);

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

  it("lists everyone the met condition holds for", () => {
    for (const ids of [[], ["smp_mihon_bookmark_stall"], ["smp_mihon_clock_gears"], ["smp_mihon_clock_gears", "smp_mihon_bookmark_stall"]]) {
      const state = seen(ids);
      const listed = metPeopleGroups(state).flatMap((group) => group.people.map((item) => item.id));
      expect(listed).toEqual(expect.arrayContaining(storyState.people.filter((item) => meets(state, { met: item.id })).map((item) => item.id)));
    }
  });

  it("counts each quiz's partner once played: a declared person by the shared name, else the quiz's own, with its role", () => {
    // The clock tower's partner is トーマ, already declared; the market's is サラ, a partner of that quiz only.
    const groups = metPeopleGroups(played(seen([]), ["smp_mihon_main_clock_tower_battle", "smp_mihon_special_b_market", "smp_mihon_main_clock_tower_battle"]));
    const market = battles.find((battle) => battle.id === "smp_mihon_special_b_market")!;
    expect(groups[0].people).toEqual([
      { id: "smp_mihon_toma", nameJa: "トーマ", descriptionJa: person("smp_mihon_toma").descriptionJa },
      { id: "quiz:smp_mihon_special_b_market", nameJa: market.enemyNameJa, descriptionJa: market.enemyTitleJa },
    ]);
    // Met in a talk too, トーマ stays one person.
    expect(names(played(seen(["smp_mihon_clock_gears"]), ["smp_mihon_main_clock_tower_battle"]))).toEqual([[SAMPLE, ["トーマ"]]]);
  });

  it("counts the people of an arrival once past it and of an epilogue read, and a quiz partner whose portrait is a person", () => {
    // The Golden Triangle: Kamla at Delhi's arrival; Aman in Delhi's epilogue and as its finale's partner (his portrait).
    const delhi = cityStart("delhi");
    expect(names(delhi)).toEqual([["delhi", ["カムラ"]]]);
    expect(names(played(delhi, ["gt_delhi_finale_battle"]))).toEqual([["delhi", ["カムラ", "アマン"]]]);
    expect(names({ ...delhi, viewedEpilogueCityIds: ["delhi"] })).toEqual([["delhi", ["カムラ", "アマン"]]]);
    // A quiz partner who is no declared person: by the quiz's name and role.
    const redFort = battles.find((battle) => battle.id === "gt_delhi_main_red_fort_battle")!;
    expect(metPeopleGroups(played(delhi, ["gt_delhi_main_red_fort_battle"]))[0].people[1])
      .toEqual({ id: "quiz:gt_delhi_main_red_fort_battle", nameJa: redFort.enemyNameJa, descriptionJa: redFort.enemyTitleJa });
  });

  it("never reads a relationship value", () => {
    const state = played(seen(["smp_mihon_bookmark_stall"]), ["smp_mihon_special_b_market"]);
    expect(metPeopleGroups({ ...state, affection: 99, trust: 99, spark: 99 })).toEqual(metPeopleGroups(state));
  });

  it("fills the names set into a description, falls back to the role, and leaves out one not written", () => {
    const lili = person("smp_mihon_lili");
    const { descriptionJa: written, titleJa: role } = lili;
    lili.descriptionJa = "{heroine_name}にしおりをくれた女の子";
    try {
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))[0].people[0].descriptionJa).toBe("澪にしおりをくれた女の子");
      delete lili.descriptionJa;
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))[0].people[0].descriptionJa).toBe(role);
      delete lili.titleJa;
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))[0].people[0]).toEqual({ id: "smp_mihon_lili", nameJa: "リリ" });
    } finally {
      lili.descriptionJa = written;
      lili.titleJa = role;
    }
  });

  it("says when the journey has no one to meet", () => {
    const declared = storyState.people.splice(0);
    const quizzes = battles.splice(0);
    try {
      expect(declaresPeople(seen([]))).toBe(false);
      expect(metPeopleGroups(seen(["smp_mihon_bookmark_stall"]))).toEqual([]);
    } finally {
      storyState.people.push(...declared);
      battles.push(...quizzes);
    }
  });
});
