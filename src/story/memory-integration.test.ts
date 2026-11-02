import { describe, expect, it } from "vitest";
import { beginStory, continueStory, validateStorySnapshot, type StoryStep } from "./runtime";

describe("confession memory callback", () => {
  it.each([false, true])("recalls the earlier date only when actually recorded: %s", (hasMemory) => {
    const memories = hasMemory ? ["sound_memory_maurizio_date_sound"] : [];
    let step: StoryStep = beginStory("milano/sound_confession_01", "航", "澪", {
      player_address: "航さん", romance_stage: 1, ending_reached: false,
    }, memories);
    const lines: string[] = [];
    for (let count = 0; count < 25; count++) {
      lines.push(step.frame.text);
      validateStorySnapshot("milano/sound_confession_01", step.storyState, step.frame, {
        playerName: "航", heroineName: "澪", choiceCount: 0,
      }, memories);
      if (step.frame.choices.length || step.frame.ended) break;
      step = continueStory("milano/sound_confession_01", step.storyState, step.frame, memories);
    }
    expect(step.frame.choices).toHaveLength(3);
    expect(lines.some((line) => line.includes("待ち合わせるの、私けっこう好きです"))).toBe(hasMemory);
  });
});
