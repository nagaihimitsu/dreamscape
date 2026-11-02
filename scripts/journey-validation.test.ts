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
    ["unknown battle", "missing_battle"],
    ["normal A battle", "milano_last_supper_01"],
  ] as const)("rejects an %s", (_label, value) => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles[0].battleId = value;
    expect(() => check(journey)).toThrow(/Invalid story battle/);
  });

  it("rejects the same battle listed twice", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles.push({ ...journey.storyBattles[0] });
    expect(() => check(journey)).toThrow("Duplicate story battle");
  });

  it("rejects an unknown story battle prerequisite", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles[0].requiredEpisodeIds = ["missing_episode"];
    expect(() => check(journey)).toThrow("Unknown story battle prerequisite");
  });

  it("allows encounters listed in either order", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles.reverse();
    expect(() => check(journey)).not.toThrow();
  });

  it("rejects a finale as special battle prerequisite", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles[0].requiredEpisodeIds = ["milano_finale"];
    expect(() => check(journey)).toThrow("Unknown story battle prerequisite");
  });
});
