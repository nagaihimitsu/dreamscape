import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { dates, stories } from "./index";
import type { RelationshipTone } from "../domain/romance-tone";

function breraReaction(tone: RelationshipTone, result: "positive" | "negative") {
  // The previous published Brera script must retain its tone-specific lines
  // for saves that were already in that conversation.
  const story = new Story(stories["milano/brera_date_02_rewrite"]);
  story.variablesState.$("player_name", "たいち");
  story.variablesState.$("heroine_name", "あゆみ");
  story.variablesState.$("relationship_tone", tone);
  story.variablesState.$("relationship_tone_before", tone);
  story.variablesState.$("relationship_tone_after", tone);
  while (story.canContinue) story.Continue();
  expect(story.currentChoices).toHaveLength(3);
  story.variablesState.$("romance_result", result);
  story.ChooseChoiceIndex(2);
  let reaction = "";
  while (story.canContinue) reaction += story.Continue();
  return reaction;
}

describe("relationship tone in the Brera conversation", () => {
  it("preserves the earlier tone-specific replies for an in-progress save", () => {
    const reserved = breraReaction("reserved", "positive");
    const romantic = breraReaction("romantic_tension", "positive");
    const strained = breraReaction("strained", "negative");
    const guarded = breraReaction("guarded_attraction", "negative");
    expect(reserved).toContain("もう一度見てみよう");
    expect(romantic).toContain("そこ、わたしも気になってた");
    expect(strained).toContain("今は、そのまま絵を見ていたい");
    expect(guarded).toContain("絵の話、だよね");
    expect(new Set([reserved, romantic, strained, guarded]).size).toBe(4);
  });

  it("shows the present relationship and the result together in the new conversation", () => {
    const currentStoryId = dates.find((entry) => entry.id === "milano_brera_date_01")!.storyId;
    const run = (tone: RelationshipTone, result: "positive" | "negative") => {
      const story = new Story(stories[currentStoryId]);
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
