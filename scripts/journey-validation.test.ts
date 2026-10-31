import { describe, expect, it } from "vitest";
import {
  balance,
  battleQuizzes,
  battles,
  city,
  journeyConfig,
  landmarks,
  trialMilestones,
  type JourneyConfig,
} from "../src/content";
import { validateJourney } from "./journey-validation";

function check(journey: JourneyConfig) {
  validateJourney(journey, city, balance.apCap, landmarks, battles, battleQuizzes, trialMilestones);
}

describe("story battle references in the journey", () => {
  it("accepts the published route", () => {
    expect(() => check(journeyConfig)).not.toThrow();
  });

  it.each([
    ["unknown battle", "battleId", "missing_battle", /Invalid story battle/],
    ["unknown preceding episode", "afterEpisodeId", "missing_episode", /Unknown or unordered story battle position/],
    ["unknown following episode", "beforeEpisodeId", "missing_episode", /Unknown or unordered story battle position/],
    ["normal A battle", "battleId", "milano_last_supper_01", /Invalid story battle/],
  ] as const)("rejects an %s", (_label, field, value, message) => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles[0][field] = value;
    expect(() => check(journey)).toThrow(message);
  });

  it("rejects the same battle listed twice", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles.push({ ...journey.storyBattles[0] });
    expect(() => check(journey)).toThrow("Duplicate story battle");
  });

  it("rejects a story battle placed after its following episode", () => {
    const journey = structuredClone(journeyConfig);
    const encounter = journey.storyBattles[0];
    [encounter.afterEpisodeId, encounter.beforeEpisodeId] = [encounter.beforeEpisodeId, encounter.afterEpisodeId];
    expect(() => check(journey)).toThrow("Unknown or unordered story battle position");
  });

  it("rejects encounters listed in reverse route order", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles.reverse();
    expect(() => check(journey)).toThrow("Unknown or unordered story battle position");
  });

  it("rejects an encounter that skips an episode", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles[0].beforeEpisodeId = "milano_finale";
    expect(() => check(journey)).toThrow("Unknown or unordered story battle position");
  });
});
