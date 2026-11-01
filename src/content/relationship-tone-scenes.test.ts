import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { dates, stories } from "./index";
import type { RelationshipTone } from "../domain/romance-tone";

function breraReaction(tone: RelationshipTone, result: "positive" | "negative") {
  const date = dates.find((entry) => entry.id === "milano_brera_date_01")!;
  const story = new Story(stories[date.storyId]);
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
  it("changes the same reply according to both the reaction and present relationship", () => {
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
});
