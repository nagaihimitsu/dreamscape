import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { dates, stories } from "../../../src/content/index";
import { splitStoryAddress } from "../../../src/content/story-address";
import type { RelationshipTone } from "../../../src/domain/romance-tone";

describe("relationship tone in the Brera conversation", () => {
  it("shows the present relationship and the result together in the Brera date's conversation", () => {
    // A knot of the Brera place file: its file's story, started at the knot as the game starts it.
    const { storyId, path: knot } = splitStoryAddress(dates.find((entry) => entry.id === "milano_brera_date_01")!.storyId);
    const run = (tone: RelationshipTone, result: "positive" | "negative") => {
      const story = new Story(stories[storyId]);
      if (knot !== undefined) story.ChoosePathString(knot);
      story.variablesState.$("player_name", "たいち");
      story.variablesState.$("heroine_name", "あゆみ");
      story.variablesState.$("relationship_tone", tone);
      story.variablesState.$("relationship_tone_before", tone);
      story.variablesState.$("relationship_tone_after", tone);
      while (story.canContinue) story.Continue();
      expect(story.currentChoices).toHaveLength(3);
      story.variablesState.$("romance_result", "positive");
      story.ChooseChoiceIndex(0);
      while (story.canContinue) story.Continue();
      expect(story.currentChoices).toHaveLength(3);
      story.variablesState.$("romance_result", result);
      story.ChooseChoiceIndex(0);
      let response = "";
      while (story.canContinue) response += story.Continue();
      return response;
    };
    const reserved = run("reserved", "positive");
    const romantic = run("romantic_tension", "positive");
    const strained = run("strained", "negative");
    const guarded = run("guarded_attraction", "negative");
    expect(reserved).toContain("私もそうしてほしい");
    expect(romantic).toContain("私もそうしてほしい");
    expect(strained).toContain("答えるまで待たせるのも難しい");
    expect(guarded).toContain("答えるまで待たせるのも難しい");
    expect(romantic).toContain("台詞を選び終えた口元");
    expect(guarded).toContain("台詞を選び終えた口元");
    expect(reserved).not.toContain("台詞を選び終えた口元");
    expect(strained).not.toContain("台詞を選び終えた口元");
    expect(new Set([reserved, romantic, strained, guarded]).size).toBe(4);
  });
});
