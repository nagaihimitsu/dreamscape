import { describe, expect, it } from "vitest";
import {
  balance,
  battleQuizzes,
  battles,
  getCityContent,
  journeyConfig as allJourneyConfig,
  landmarks,
  type JourneyConfig,
} from "../src/content";
import { validateJourney } from "./journey-validation";
import { journeySchema, type RewardRule } from "../src/content/journey-schemas";

// The validator receives one city at a time, as it does in content-pipeline.
const city = getCityContent("milano").city;
const episodes = allJourneyConfig.episodes.filter((episode) => episode.cityId === city.id);
const episodeIds = new Set(episodes.map((episode) => episode.id));
const storyBattles = allJourneyConfig.storyBattles.filter((entry) => {
  const battle = battles.find((battle) => battle.id === entry.battleId);
  return landmarks.some((landmark) => landmark.id === battle?.landmarkId && landmark.cityId === city.id);
});
const storyBattleIds = new Set(storyBattles.map((entry) => entry.battleId));
const journeyConfig: JourneyConfig = { ...allJourneyConfig, episodes, storyBattles,
  rewards: allJourneyConfig.rewards.filter((rule) => rule.episodeId !== undefined
    ? episodeIds.has(rule.episodeId) : rule.battleId !== undefined && storyBattleIds.has(rule.battleId)) };

function check(journey: JourneyConfig) {
  validateJourney(journey, city, balance.apCap, landmarks, battles, battleQuizzes);
}

function withSpecialReward(trigger: RewardRule["trigger"] = "battle_score") {
  const journey = structuredClone(journeyConfig);
  const battleId = journey.storyBattles[0].battleId;
  journey.rewards = journey.rewards.filter((rule) => rule.battleId !== battleId);
  const reward: RewardRule = { id: "special_test_reward", battleId, trigger, ap: 1,
    minScore: trigger === "battle_score" ? 2 : null, titleJa: "特殊戦の報酬" };
  journey.rewards.push(reward);
  return { journey, reward };
}

describe("story battle references in the journey", () => {
  it("accepts the published route", () => {
    expect(() => check(journeyConfig)).not.toThrow();
  });

  it.each(["guide_read", "battle_score", "episode_clear"] as const)("accepts a special battle %s reward", (trigger) => {
    expect(() => check(withSpecialReward(trigger).journey)).not.toThrow();
  });

  it("requires exactly one reward target", () => {
    const { journey, reward } = withSpecialReward();
    reward.episodeId = journey.episodes[0].id;
    expect(journeySchema.safeParse(journey).success).toBe(false);
    delete reward.episodeId;
    delete reward.battleId;
    expect(journeySchema.safeParse(journey).success).toBe(false);
  });

  it.each(["missing_battle", "milano_duomo_01"])("rejects special rewards targeting %s", (battleId) => {
    const { journey, reward } = withSpecialReward();
    reward.battleId = battleId;
    expect(() => check(journey)).toThrow(/Unknown reward story battle/);
  });

  it("rejects unreachable scores and rewards over the AP cap for a special battle", () => {
    const { journey, reward } = withSpecialReward();
    const battle = battles.find((item) => item.id === reward.battleId)!;
    reward.minScore = battleQuizzes[battle.quizId].questions.length + 1;
    expect(() => check(journey)).toThrow(/Unreachable score reward/);
    reward.minScore = 2;
    reward.ap = balance.apCap + 1;
    expect(() => check(journey)).toThrow(/Journey reward exceeds AP cap/);
  });

  it("rejects completion rewards that duplicate the existing special entitlement", () => {
    const { journey, reward } = withSpecialReward("battle_complete");
    expect(() => check(journey)).toThrow(/Duplicate story battle reward trigger/);
    reward.id = journey.storyBattles[0].completionReward!.id;
    expect(() => check(journey)).toThrow(/Duplicate journey reward ID/);
  });

  it("does not allow a special battle to grant the city-clear reward", () => {
    const { journey } = withSpecialReward("city_clear");
    expect(() => check(journey)).toThrow(/Reward trigger does not fit the story battle/);
  });

  it("does not accept a special battle with a landmark belonging to another city", () => {
    const { journey, reward } = withSpecialReward();
    const battle = battles.find((item) => item.id === reward.battleId)!;
    const otherCityLandmarks = landmarks.map((landmark) => landmark.id === battle.landmarkId
      ? { ...landmark, cityId: "other_city" } : landmark);
    expect(() => validateJourney(journey, city, balance.apCap, otherCityLandmarks, battles, battleQuizzes))
      .toThrow(/Invalid story battle/);
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

  it("lets a city without first-clear AP leave the episode-clear reward undecided without weakening Milan", () => {
    const prototype = { ...city, id: "new_city", firstClearReward: { rewardSourceId: "new_city_placeholder", ap: 0 } };
    const journey = structuredClone(journeyConfig);
    journey.episodes.forEach((episode) => { episode.cityId = "new_city"; });
    const oldClear = journey.rewards.find((rule) => rule.trigger === "episode_clear")!;
    journey.rewards = journey.rewards.filter((rule) => rule.trigger !== "episode_clear");
    const localLandmarks = landmarks.map((landmark) => ({ ...landmark, cityId: "new_city" }));
    const localBattles = battles.map((battle) => battle.cityId === "milano" ? { ...battle, cityId: "new_city" } : battle);
    const run = () => validateJourney(journey, prototype, balance.apCap, localLandmarks, localBattles, battleQuizzes);
    expect(run).not.toThrow();
    journey.rewards.push({ ...oldClear, id: "new_episode_reward" });
    expect(run).not.toThrow();
    journey.rewards.push({ ...oldClear, id: "duplicate_episode_reward" });
    expect(run).toThrow(/Episode needs one episode_clear reward/);
    const milanWithoutFirstClear = { ...journeyConfig, rewards: journeyConfig.rewards.filter((rule) => rule.trigger !== "episode_clear") };
    expect(() => check(milanWithoutFirstClear)).toThrow(/Episode needs one episode_clear reward/);
  });
});
