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

  it("lets a new city leave the legacy episode-clear reward undecided without weakening Milan", () => {
    const prototype = { ...city, id: "new_city", firstClearReward: { rewardSourceId: "new_city_placeholder", ap: 0 } };
    const journey = structuredClone(journeyConfig);
    journey.episodes.forEach((episode) => { episode.cityId = "new_city"; episode.legacyChapterId = "new_city"; });
    const oldClear = journey.rewards.find((rule) => rule.trigger === "episode_clear")!;
    journey.rewards = journey.rewards.filter((rule) => rule.trigger !== "episode_clear");
    const localLandmarks = landmarks.map((landmark) => ({ ...landmark, cityId: "new_city" }));
    const localBattles = battles.map((battle) => battle.cityId === "milano" ? { ...battle, cityId: "new_city" } : battle);
    const run = () => validateJourney(journey, prototype, balance.apCap, localLandmarks, localBattles, battleQuizzes, trialMilestones);
    expect(run).not.toThrow();
    journey.rewards.push({ ...oldClear, id: "new_episode_reward" });
    expect(run).not.toThrow();
    journey.rewards.push({ ...oldClear, id: "duplicate_episode_reward" });
    expect(run).toThrow(/Episode needs one episode_clear reward/);
    const milanWithoutLegacy = { ...journeyConfig, rewards: journeyConfig.rewards.filter((rule) => rule.trigger !== "episode_clear") };
    expect(() => check(milanWithoutLegacy)).toThrow();
  });
});
