import { afterEach, expect, it } from "vitest";
import { compileInk } from "../../scripts/ink-validation";
import { getCityContent, getCityStoryBackground, stories } from "../content";
import { DEFAULT_BACKGROUND_ID } from "../content/default-background";
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
  // Without a city background, a scene starts with the shared default background.
  expect(beginStory(id, "航", "澪").frame.background).toBe(DEFAULT_BACKGROUND_ID);
  expect(DEFAULT_BACKGROUND_ID).toBe("default_scene");
});

it("starts a city's scenes with its story background, else with the place's (or the hotel's) background", () => {
  // Milan sets one background for all its scenes in its travel settings.
  expect(getCityContent("milano").travelSettings.storyBackgroundId).toBe("milano_cafe");
  expect(getCityStoryBackground("milano", "p_duomo")).toBe("milano_cafe");
  const { travel, travelSettings } = getCityContent("delhi");
  expect(travelSettings.storyBackgroundId).toBeUndefined();
  const place = travel.places.find((item) => item.id !== travelSettings.hotelPlaceId)!;
  const hotel = travel.places.find((item) => item.id === travelSettings.hotelPlaceId)!;
  expect(getCityStoryBackground("delhi", place.id)).toBe(place.backgroundId);
  expect(getCityStoryBackground("delhi", "unknown_place")).toBe(hotel.backgroundId);
});
