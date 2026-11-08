import { describe, expect, it } from "vitest";
import { zodIssues } from "../../tests/fixtures/zod-issues";
import ruleData from "./generated/content/encounters/entry-rules.json";
import { encounters } from "./encounters";
import { journeyConfig } from "./index";
import { encounterEntryRulesSchema, validateEncounterEntryRules } from "./encounter-entry-rules";
import { createGame } from "../domain/game";
import { encounterOffered } from "../../tests/fixtures/encounter-moment";

describe("location-based encounters", () => {
  it("validates entry IDs, places and completion milestones", () => {
    const rules = encounterEntryRulesSchema.parse(ruleData);
    expect(() => validateEncounterEntryRules(rules, encounters.encounters, journeyConfig)).not.toThrow();
    expect(() => encounterEntryRulesSchema.parse({ ...rules, entries: [...rules.entries, rules.entries[0]] })).toThrow(zodIssues({ code: "custom", message: "Duplicate encounter entry rule" }));
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...rules.entries[0], landmarkId: "last_supper" }] }, encounters.encounters, journeyConfig)).toThrow("Unknown or mismatched encounter entry: duomo_string/last_supper");
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...rules.entries[0], completedEpisodeId: "unknown_episode" }] }, encounters.encounters, journeyConfig)).toThrow("Unknown encounter entry episode: duomo_string/unknown_episode");
    // Only the Galleria fortune (an encounter with a quiz) defers its quiz until the landmark battle.
    expect(rules.entries.filter((entry) => entry.quizAfterLandmarkBattle).map((entry) => entry.encounterId)).toEqual(["galleria_fortune"]);
    const duomo = rules.entries.find((entry) => entry.encounterId === "duomo_string")!;
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...duomo, quizAfterLandmarkBattle: true }] }, encounters.encounters, journeyConfig))
      .toThrow("A quiz after the landmark battle needs an encounter with a quiz: duomo_string");
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
