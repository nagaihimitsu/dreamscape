import { afterEach, expect, it } from "vitest";
import { compileInk } from "../../scripts/content-pipeline";
import { stories } from "../content";
import { beginStory, continueStory } from "./runtime";

const id = "test/city_background";
afterEach(() => { delete stories[id]; });

it("uses the city's initial background until Ink explicitly changes it", () => {
  stories[id] = compileInk(`VAR player_name = ""
VAR heroine_name = ""
最初の場面。
# background: milano_galleria
次の場面。
-> END`);
  const first = beginStory(id, "航", "澪", {}, [], {}, "milano_duomo");
  expect(first.frame.background).toBe("milano_duomo");
  const second = continueStory(id, first.storyState, first.frame);
  expect(second.frame.background).toBe("milano_galleria");
  expect(beginStory(id, "航", "澪").frame.background).toBe("milano_cafe");
});
