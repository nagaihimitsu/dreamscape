import { describe, expect, it } from "vitest";
import { beginStory, continueStory, validateStorySnapshot, type StoryStep } from "./runtime";

// Milan's confession (a knot of the Darsena's place file since 2026-11-13) recalls the San Maurizio date with
// cond("date milano_maurizio_date_sound"): only when that date was played (the game reads its record; here a reader stands in).
const CONFESSION = "places/milano_darsena.milano_confession_01";

describe("confession callback to an earlier date", () => {
  it.each([false, true])("recalls the earlier date only when it was actually played: %s", (played) => {
    const conditions = (text: string) => text === "date milano_maurizio_date_sound" && played;
    let step: StoryStep = beginStory(CONFESSION, "航", "澪", {
      player_address: "航さん", romance_stage: 1, ending_reached: false,
    }, [], {}, undefined, conditions);
    const lines: string[] = [];
    for (let count = 0; count < 25; count++) {
      lines.push(step.frame.text);
      validateStorySnapshot(CONFESSION, step.storyState, step.frame, {
        playerName: "航", heroineName: "澪", choiceCount: 0,
      });
      if (step.frame.choices.length || step.frame.ended) break;
      step = continueStory(CONFESSION, step.storyState, step.frame, [], {}, {}, conditions);
    }
    expect(step.frame.choices).toHaveLength(3);
    expect(lines.some((line) => line.includes("待ち合わせるの、"))).toBe(played);
  });
});
