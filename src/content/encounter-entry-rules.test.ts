import { describe, expect, it } from "vitest";
import ruleData from "../../content/encounters/entry-rules.json";
import { encounters } from "./encounters";
import { journeyConfig } from "./index";
import { encounterEntryRulesSchema, validateEncounterEntryRules } from "./encounter-entry-rules";
import { createGame } from "../domain/game";
import { getEncounterAvailability } from "../domain/encounter";

describe("location-based encounters", () => {
  it("validates entry IDs, places and completion milestones", () => {
    const rules = encounterEntryRulesSchema.parse(ruleData);
    expect(() => validateEncounterEntryRules(rules, encounters.encounters, journeyConfig)).not.toThrow();
    expect(() => encounterEntryRulesSchema.parse({ ...rules, entries: [...rules.entries, rules.entries[0]] })).toThrow();
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...rules.entries[0], landmarkId: "last_supper" }] }, encounters.encounters, journeyConfig)).toThrow();
    expect(() => validateEncounterEntryRules({ ...rules, entries: [{ ...rules.entries[0], completedEpisodeId: "unknown_episode" }] }, encounters.encounters, journeyConfig)).toThrow();
  });

  it("opens the new events only after their own milestones, and keeps the old events asleep", () => {
    const fresh = createGame("たいち", "あゆみ");
    const afterDuomo = { ...fresh, completedEpisodeIds: ["milano_duomo_episode"] };
    expect(getEncounterAvailability(fresh, "duomo_string").available).toBe(false);
    expect(getEncounterAvailability(afterDuomo, "duomo_string").available).toBe(true);
    expect(getEncounterAvailability(afterDuomo, "galleria_print").available).toBe(false);
    expect(getEncounterAvailability(afterDuomo, "scala_mint").available).toBe(false);
    for (const id of ["galleria_cafe", "galleria_gift", "galleria_outing", "galleria_fortune"])
      expect(getEncounterAvailability(afterDuomo, id).available).toBe(false);

    const afterScala = { ...afterDuomo, battleRecords: [{ battleId: "milano_la_scala_b01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }] };
    expect(getEncounterAvailability(afterScala, "scala_mint").available).toBe(true);
  });
});
