import { describe, expect, it } from "vitest";
import { zodIssues } from "../../tests/fixtures/zod-issues";
import ruleData from "./generated/content/encounters/entry-rules.json";
import { encounters } from "./encounters";
import { encounterEntryRulesSchema, validateEncounterEntryRules } from "./encounter-entry-rules";
import { createGame } from "../domain/game";
import { encounterOffered } from "../../tests/fixtures/encounter-moment";

describe("location-based encounters", () => {
  it("parses version 2 rules and refuses what no game can use", () => {
    const rules = encounterEntryRulesSchema.parse(ruleData);
    expect(rules.schemaVersion).toBe(2);
    expect(() => validateEncounterEntryRules(rules, encounters.encounters)).not.toThrow();
    expect(() => encounterEntryRulesSchema.parse({ ...rules, entries: [...rules.entries, rules.entries[0]] })).toThrow(zodIssues({ code: "custom", message: "Duplicate encounter entry rule" }));
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...rules.entries[0], encounterId: "unknown_encounter" }] }, encounters.encounters))
      .toThrow("Unknown encounter entry: unknown_encounter");
    // Only the Galleria fortune (an encounter with a quiz) defers its quiz until the landmark battle.
    expect(rules.entries.filter((entry) => entry.quizAfterLandmarkBattle).map((entry) => entry.encounterId)).toEqual(["galleria_fortune"]);
    const duomo = rules.entries.find((entry) => entry.encounterId === "duomo_string")!;
    expect(duomo).toEqual({ encounterId: "duomo_string", at: ["observe"], when: { episodeCompleted: "milano_duomo_episode" } });
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...duomo, quizAfterLandmarkBattle: true }] }, encounters.encounters))
      .toThrow("A quiz after the landmark battle needs an encounter with a quiz: duomo_string");
    // `at` is optional (= observe) and takes only the observation for now; `when` is optional too.
    expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ encounterId: "duomo_string" }] }).success).toBe(true);
    for (const at of [["afterBattle"], [], ["observe", "observe"], "observe"]) {
      const result = encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ ...duomo, at }] });
      expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Encounters are met only while observing for now: at must be ["observe"] (other moments come at stage 3)']);
    }
    expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ ...duomo, when: { flag: "x" } }] }).error?.issues[0].message)
      .toBe('Condition part "flag" is not available yet (stage 3)');
    // Version 1 and its fields are refused.
    expect(encounterEntryRulesSchema.safeParse({ ...rules, schemaVersion: 1 }).success).toBe(false);
    for (const old of [{ landmarkId: "duomo_milano" }, { storyId: "encounters/milano_duomo_string" }, { completedEpisodeId: "milano_duomo_episode" }, { completedStoryBattleId: "milano_la_scala_b01" }])
      expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ ...duomo, ...old }] }).error?.issues[0].message).toMatch(/Unrecognized key/);
  });

  it("offers duomo_string in the Duomo's observation after its episode and scala_mint after La Scala's battle, and keeps the Galleria's later encounters closed", () => {
    const fresh = createGame("たいち", "あゆみ");
    const afterDuomo = { ...fresh, completedEpisodeIds: ["milano_duomo_episode"] };
    expect(encounterOffered(fresh, "duomo_string")).toEqual({ available: false, reason: "この場所を訪れたあとに出会えます。" });
    expect(encounterOffered(afterDuomo, "duomo_string")).toEqual({ available: true, reason: "" });
    for (const id of ["galleria_print", "galleria_ticket_press", "scala_mint"])
      expect(encounterOffered(afterDuomo, id), id).toEqual({ available: false, reason: "この場所を訪れたあとに出会えます。" });
    // The fortune teller's quiz waits for the Galleria battle (quizAfterLandmarkBattle): her story is met in the first observation.
    expect(encounterOffered(afterDuomo, "galleria_fortune")).toEqual({ available: true, reason: "" });

    const afterScala = { ...afterDuomo, battleRecords: [{ battleId: "milano_la_scala_b01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }] };
    expect(encounterOffered(afterScala, "scala_mint")).toEqual({ available: true, reason: "" });
  });
});
