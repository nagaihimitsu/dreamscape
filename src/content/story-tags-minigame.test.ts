import { describe, expect, it } from "vitest";
import { parseStoryTags } from "./tags";
import { MINI_GAMES, miniGameChoice, miniGameOptionId, parseMiniGameTag } from "./mini-games";

const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"] };

// A line's # minigame: (2026-11-13 user decision): the choice set after it is played, not chosen.
describe("a line's # minigame:", () => {
  it("reads the game, the outcome 「おまかせ」 gives (the game's own unless the tag names one) and an option prefix", () => {
    expect(parseStoryTags(["speaker: heroine", "minigame: cricket_batting"], context)).toEqual({
      speaker: "heroine", minigame: { id: "cricket_batting", auto: MINI_GAMES.cricket_batting.auto }, effects: [],
    });
    expect(parseMiniGameTag("cricket_batting auto over_wall")).toEqual({ id: "cricket_batting", auto: "over_wall" });
    expect(parseMiniGameTag("cricket_batting prefix again auto edge")).toEqual({ id: "cricket_batting", auto: "edge", prefix: "again" });
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("minigame");
  });

  it("refuses an unknown game or outcome, other words, a malformed prefix and a repeated tag", () => {
    expect(() => parseMiniGameTag("tennis")).toThrow("Unknown minigame: tennis");
    expect(() => parseMiniGameTag("cricket_batting auto home_run")).toThrow("Unknown outcome of the minigame cricket_batting: auto home_run (its outcomes: six, over_wall, edge, bowled, no_swing)");
    for (const value of ["cricket_batting auto", "cricket_batting fast", "cricket_batting auto six auto edge", "cricket_batting prefix"])
      expect(() => parseMiniGameTag(value), value).toThrow("Invalid minigame tag");
    expect(() => parseMiniGameTag("cricket_batting prefix Again")).toThrow("Invalid minigame prefix: Again");
    expect(() => parseMiniGameTag("cricket_batting prefix a_b")).toThrow("Invalid minigame prefix");
    expect(() => parseStoryTags(["minigame: cricket_batting", "minigame: cricket_batting"], context)).toThrow("Duplicate minigame tag");
  });

  it("is refused where content:build says no mini-game can run, allowed where it can or nothing says", () => {
    expect(() => parseStoryTags(["minigame: cricket_batting"], { ...context, miniGames: false })).toThrow("a mini-game runs in a date written in a place file");
    expect(parseStoryTags(["minigame: cricket_batting"], { ...context, miniGames: true }).minigame?.id).toBe("cricket_batting");
  });

  it("takes the choice whose option ID is the outcome's, after the prefix when the tag has one", () => {
    const choices = [{ index: 0, optionId: "six" }, { index: 1, optionId: "again_six" }, { index: 2 }];
    expect(miniGameOptionId({}, "six")).toBe("six");
    expect(miniGameOptionId({ prefix: "again" }, "no_swing")).toBe("again_no_swing");
    expect(miniGameChoice(choices, {}, "six")?.index).toBe(0);
    expect(miniGameChoice(choices, { prefix: "again" }, "six")?.index).toBe(1);
    expect(miniGameChoice(choices, {}, "edge")).toBeUndefined();
  });
});
