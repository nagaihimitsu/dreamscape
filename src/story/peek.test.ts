import { describe, expect, it } from "vitest";
import { beginStory, continueStory, peekStory, selectStoryChoice, type StoryStep } from "./runtime";

// Reading a story ahead for the background loading (2026-11-13, src/media/preload-ahead.ts): the lines it gives are the
// ones the game reads next, and after a choice the ones the game reads once it is made. Milan's Duomo guide (a run of
// lines) and Milan's confession (a line, then three choices).
const GUIDE = "places/milano_duomo.duomo_milano_guide";
const CONFESSION = "places/milano_darsena.milano_confession_01";
const VARIABLES = { player_address: "航さん", romance_stage: 1, ending_reached: false };
const conditions = () => false;
const begin = (address: string) => beginStory(address, "航", "澪", VARIABLES, [], {}, undefined, conditions);
const next = (address: string, step: StoryStep) => continueStory(address, step.storyState, step.frame, [], {}, {}, conditions);

describe("peekStory", () => {
  it("reads the next lines as the game will, without changing the saved state", () => {
    const start = begin(GUIDE);
    const reach = { lines: 4, choices: 0, choiceLines: 0 };
    const peek = peekStory(GUIDE, start.storyState, start.frame, [], {}, conditions, reach);
    expect(peek.lines).toHaveLength(4);
    expect(peek.choices).toEqual([]);
    let step = start;
    for (const frame of peek.lines) {
      step = next(GUIDE, step);
      expect(frame).toEqual(step.frame);
    }
    // The same state read ahead again gives the same lines: the first reading saved nothing.
    expect(peekStory(GUIDE, start.storyState, start.frame, [], {}, conditions, reach)).toEqual(peek);
  });

  it("reads up to the choices, then the first lines after each of them as if it were made", () => {
    const start = begin(CONFESSION);
    const atChoices = next(CONFESSION, start);
    expect(atChoices.frame.choices).toHaveLength(3);
    const peek = peekStory(CONFESSION, start.storyState, start.frame, [], {}, conditions, { lines: 4, choices: 2, choiceLines: 1 });
    expect(peek.lines).toEqual([atChoices.frame]);
    // Two of the three choices are read (`choices`), a line each.
    expect(peek.choices).toHaveLength(2);
    peek.choices.forEach((lines, index) => {
      const chosen = selectStoryChoice(CONFESSION, atChoices.storyState, atChoices.frame, atChoices.frame.choices[index].index, [], {}, {}, {}, conditions);
      expect(lines).toEqual([chosen.frame]);
    });
  });

  it("reads the choices of the line on screen when it stops at them", () => {
    const atChoices = next(CONFESSION, begin(CONFESSION));
    const peek = peekStory(CONFESSION, atChoices.storyState, atChoices.frame, [], {}, conditions, { lines: 4, choices: 4, choiceLines: 2 });
    expect(peek.lines).toEqual([]);
    expect(peek.choices).toHaveLength(3);
  });

  it("gives nothing for a story it cannot read", () => {
    const start = begin(GUIDE);
    expect(peekStory(GUIDE, "{}", start.frame, [], {}, conditions, { lines: 3, choices: 3, choiceLines: 1 })).toEqual({ lines: [], choices: [] });
  });
});
