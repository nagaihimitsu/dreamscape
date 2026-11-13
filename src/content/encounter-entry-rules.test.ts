import { describe, expect, it } from "vitest";
import { zodIssues } from "../../tests/fixtures/zod-issues";
import ruleData from "./generated/content/encounters/entry-rules.json";
import { encounters } from "./encounters";
import { encounterEntryRulesSchema, validateEncounterEntryRules, type EncounterEntryRule } from "./encounter-entry-rules";
import { createGame } from "../domain/game";
import { encounterOffered } from "../../tests/fixtures/encounter-moment";
import { catalogWish, WISH } from "../../tests/fixtures/catalog-wish";

describe("location-based encounters", () => {
  it("parses version 2 rules and refuses what no game can use", () => {
    const rules = encounterEntryRulesSchema.parse(ruleData);
    expect(rules.schemaVersion).toBe(2);
    expect(() => validateEncounterEntryRules(rules, encounters.encounters)).not.toThrow();
    expect(() => encounterEntryRulesSchema.parse({ ...rules, entries: [...rules.entries, rules.entries[0]] })).toThrow(zodIssues({ code: "custom", message: "Duplicate encounter entry rule" }));
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...rules.entries[0], encounterId: "unknown_encounter" }] }, encounters.encounters))
      .toThrow("Unknown encounter entry: unknown_encounter");
    // No published encounter has a quiz since Milan's wish became a place-file knot (2026-11-13). The catalog form still defers
    // an encounter's quiz until the landmark battle: the tests' wish in that form (tests/fixtures/catalog-wish.ts) keeps it checked.
    expect(rules.entries.filter((entry) => entry.quizAfterLandmarkBattle)).toEqual([]);
    const wishRule: EncounterEntryRule = { encounterId: WISH, at: ["observe"], when: { episodeCompleted: "milano_galleria_episode" }, quizAfterLandmarkBattle: true };
    expect(() => validateEncounterEntryRules({ ...rules, entries: [...rules.entries, wishRule] }, [...encounters.encounters, catalogWish()])).not.toThrow();
    // Milan's broken string is a place file's knot (2026-11-13): its head tags give the rule (after observe, its # when:).
    expect(rules.entries.find((entry) => entry.encounterId === "duomo_string"))
      .toEqual({ encounterId: "duomo_string", priority: "after observe", when: { episodeCompleted: "milano_duomo_episode" } });
    // A rule written in JSON (as the string's was until then).
    const duomo: EncounterEntryRule = { encounterId: "duomo_string", at: ["observe"], when: { episodeCompleted: "milano_duomo_episode" } };
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...duomo, quizAfterLandmarkBattle: true }] }, encounters.encounters))
      .toThrow("A quiz after the landmark battle needs an encounter with a quiz: duomo_string");
    // `at` is optional (= observe) and takes only the observation; `when` is optional too.
    expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ encounterId: "duomo_string" }] }).success).toBe(true);
    for (const at of [["afterBattle"], [], ["observe", "observe"], "observe"]) {
      const result = encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ ...duomo, at }] });
      expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Encounters written in JSON are met while observing: at must be ["observe"] (place an encounter elsewhere with the head tags of its Ink)']);
    }
    // The head tags' place at the landmark's visit (content:build writes it): a non-zero priority or "after observe", without `at`.
    for (const priority of [-2, 1, "after observe", "after guide", "after battle", "after date", "after logo"])
      expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ encounterId: "duomo_string", priority }] }).success, String(priority)).toBe(true);
    for (const priority of [0, 1.5, "after tour"])
      expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ encounterId: "duomo_string", priority }] }).success, String(priority)).toBe(false);
    expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ ...duomo, priority: -1 }] }).error?.issues[0].message)
      .toBe("An entry rule has either at or priority");
    expect(encounterEntryRulesSchema.safeParse({ schemaVersion: 2, entries: [{ ...duomo, when: { spell: "x" } }] }).error?.issues[0].message)
      .toBe("Unknown condition part: spell");
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
    // The Galleria's wish is met in its first observation.
    expect(encounterOffered(afterDuomo, "galleria_fortune")).toEqual({ available: true, reason: "" });

    const afterScala = { ...afterDuomo, battleRecords: [{ battleId: "milano_la_scala_b01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }] };
    expect(encounterOffered(afterScala, "scala_mint")).toEqual({ available: true, reason: "" });
  });
});
