import { describe, expect, it } from "vitest";
import { dateSchema } from "./schemas";

const minimal = {
  id: "milano_new_date",
  chapterId: "milano",
  titleJa: "新しい場所",
  storyId: "milano/new_date",
  backgroundId: "milano_walk_landmark",
};

describe("ordinary date defaults", () => {
  it("turns a small catalog entry into a playable normal date", () => {
    const date = dateSchema.parse(minimal);
    expect(date).toMatchObject({
      ...minimal,
      kind: "normal",
      apCost: 2,
      minRomanceStage: 1,
      minAffection: 0,
      choiceCount: 2,
      effectCount: 2,
      rewardOnlyOnce: true,
      repeatable: false,
      needsDeferred: false,
      allowAfterEnding: true,
      validationContexts: [{ romanceStage: 1, confessionReady: false }],
    });
    expect(date.when).toBeUndefined();
    expect(date.until).toBeUndefined();
  });

  it("keeps an explicitly configured existing date's conditions", () => {
    const date = dateSchema.parse({
      ...minimal,
      apCost: 3,
      minRomanceStage: 2,
      when: { episodeCompleted: "milano_galleria_episode" },
      until: { any: [{ episodeCompleted: "milano_last_supper_episode" }, { cityCompleted: "milano" }] },
      destinationId: "milano_brera",
      allowAfterEnding: false,
    });
    expect(date.apCost).toBe(3);
    expect(date.minRomanceStage).toBe(2);
    expect(date.when).toEqual({ episodeCompleted: "milano_galleria_episode" });
    expect(date.until).toEqual({ any: [{ episodeCompleted: "milano_last_supper_episode" }, { cityCompleted: "milano" }] });
    expect(date.allowAfterEnding).toBe(false);
  });

  it("gives a date without when no progress condition, and refuses the old progress fields and malformed conditions", () => {
    expect(dateSchema.parse(minimal).when).toBeUndefined();
    for (const old of ["requiredCompletedChapters", "requiredCompletedCityIds", "requiredCompletedEpisodeIds", "forbiddenCompletedEpisodeIds", "requiredPlayedDateIds"]) {
      const result = dateSchema.safeParse({ ...minimal, [old]: [] });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/Unrecognized key/);
    }
    const malformed = dateSchema.safeParse({ ...minimal, when: { all: [] } });
    expect(malformed.error?.issues.map((issue) => [issue.message, issue.path])).toEqual([["A condition list must be a non-empty array", ["when", "all"]]]);
  });

  it("rejects a validation context that repeats another one, whatever the field order", () => {
    const contexts = [
      { romanceStage: 4, confessionReady: true, endingReached: true },
      { endingReached: true, romanceStage: 4, confessionReady: true },
    ];
    const result = dateSchema.safeParse({ ...minimal, validationContexts: contexts });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(["Duplicate validation context"]);
    // Contexts that differ in any field stay allowed.
    expect(dateSchema.safeParse({ ...minimal, validationContexts: [contexts[0], { ...contexts[1], endingReached: false }] }).success).toBe(true);
  });
});
