import { afterEach, describe, expect, it } from "vitest";
import { compileInk } from "../../scripts/ink-validation";
import { stories } from "../content";
import { beginStory, nameVariables, storyVariables } from "./runtime";

// The player's name in Latin letters (2026-11-16, the Jaipur mehndi): Ink's player_name_latin, set as a story begins
// where the story declares it (every place file does, through src/story/modules.ink) and never where it does not (a
// learning story's own VARs, a test's inline Ink: inkjs refuses a variable that is not declared).

const declared = "test/latin_declared";
const undeclared = "test/latin_undeclared";
afterEach(() => {
  delete stories[declared];
  delete stories[undeclared];
});

describe("player_name_latin", () => {
  it("is the player's own spelling, else the kana name in Hepburn, else empty", () => {
    expect(nameVariables({ playerName: "たいち", heroineName: "あゆみ" }))
      .toEqual({ player_name: "たいち", heroine_name: "あゆみ", player_name_latin: "Taichi" });
    expect(nameVariables({ playerName: "太一", heroineName: "あゆみ", playerNameLatin: "taichi" }).player_name_latin).toBe("Taichi");
    expect(nameVariables({ playerName: "太一", heroineName: "あゆみ" }).player_name_latin).toBe("");
  });

  it("is set where the story declares it, so a line can branch on it", () => {
    stories[declared] = compileInk(`VAR player_name = ""
VAR player_name_latin = ""
VAR heroine_name = ""
{ player_name_latin != "":
    模様の文字は、{player_name_latin}。
- else:
    読めない文字。
}
-> END`);
    const kana = beginStory(declared, { playerName: "ゆうき", heroineName: "あゆみ" });
    expect(kana.frame.text).toBe("模様の文字は、Yuki。");
    expect(storyVariables(declared, kana.storyState, ["player_name", "player_name_latin"]))
      .toEqual({ player_name: "ゆうき", player_name_latin: "Yuki" });
    expect(beginStory(declared, { playerName: "太一", heroineName: "あゆみ", playerNameLatin: "Taichi" }).frame.text)
      .toBe("模様の文字は、Taichi。");
    expect(beginStory(declared, { playerName: "太一", heroineName: "あゆみ" }).frame.text).toBe("読めない文字。");
  });

  it("is not set where the story does not declare it", () => {
    stories[undeclared] = compileInk(`VAR player_name = ""
VAR heroine_name = ""
{player_name}の旅。
-> END`);
    const step = beginStory(undeclared, { playerName: "たいち", heroineName: "あゆみ", playerNameLatin: "Taichi" });
    expect(step.frame.text).toBe("たいちの旅。");
    expect(storyVariables(undeclared, step.storyState, ["player_name_latin"])).toEqual({ player_name_latin: undefined });
  });
});
