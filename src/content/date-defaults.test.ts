import { describe, expect, it } from "vitest";
import { dateSchema } from "./schemas";

const minimal = {
  id: "milano_new_date",
  chapterId: "milano",
  titleJa: "新しい場所",
  storyId: "milano/new_date",
  backgroundAssetId: "milano_walk_landmark",
};

describe("ordinary date defaults", () => {
  it("turns a small catalog entry into a playable normal date", () => {
    const date = dateSchema.parse(minimal);
    expect(date).toMatchObject({
      ...minimal,
      kind: "normal",
      requiredCompletedChapters: ["milano"],
      requiredPlayedDateIds: [],
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
  });

  it("keeps an explicitly configured existing date's conditions", () => {
    const date = dateSchema.parse({
      ...minimal,
      apCost: 3,
      minRomanceStage: 2,
      requiredCompletedChapters: [],
      requiredCompletedEpisodeIds: ["milano_galleria_episode"],
      destinationId: "milano_brera",
      allowAfterEnding: false,
    });
    expect(date.apCost).toBe(3);
    expect(date.minRomanceStage).toBe(2);
    expect(date.requiredCompletedChapters).toEqual([]);
    expect(date.allowAfterEnding).toBe(false);
  });

  it("does not silently turn an explicitly empty prerequisite into a city clear", () => {
    expect(dateSchema.safeParse({ ...minimal, requiredCompletedChapters: [] }).success).toBe(false);
  });
});
