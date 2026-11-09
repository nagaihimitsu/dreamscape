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

describe("map conditions and guides (unified event design stage 2b)", () => {
  const finaleOf = (journey: JourneyConfig) => journey.episodes.find((episode) => episode.kind === "city_finale")!;
  const all = { all: [{ battlePlayed: "milano_duomo_01" }] };

  it("accepts a finale's when with empty prerequisites, and stops when both are written (check 7)", () => {
    const journey = structuredClone(journeyConfig);
    const finale = finaleOf(journey);
    finale.when = all;
    expect(() => check(journey)).toThrow(/Map condition written twice: episode milano_finale/);
    finale.requiredEpisodeIds = [];
    expect(() => check(journey)).not.toThrow();
    // Without when, the current rule still needs every sightseeing episode.
    delete finale.when;
    expect(() => check(journey)).toThrow(/City finale must require every sightseeing episode/);
  });

  it("stops a special battle with both when and prerequisites", () => {
    const journey = structuredClone(journeyConfig);
    journey.storyBattles[0].when = all;
    journey.storyBattles[0].requiredEpisodeIds = [journey.episodes[0].id];
    expect(() => check(journey)).toThrow(/Map condition written twice: story battle/);
    journey.storyBattles[0].requiredEpisodeIds = [];
    expect(() => check(journey)).not.toThrow();
  });

  it("gives a landmark without a guide no guide reward, and stops one written there (decision 26)", () => {
    const journey = structuredClone(journeyConfig);
    const episode = journey.episodes[0];
    const guideless = landmarks.map((landmark) => {
      if (landmark.id !== episode.landmarkId) return landmark;
      const { guideStoryId: _guide, ...rest } = landmark;
      return rest;
    });
    const run = () => validateJourney(journey, city, balance.apCap, guideless, battles, battleQuizzes);
    expect(run).toThrow(/Guide reward at a landmark without a guide: milano_duomo_episode/);
    journey.rewards = journey.rewards.filter((rule) => !(rule.episodeId === episode.id && rule.trigger === "guide_read"));
    expect(run).not.toThrow();
    // A landmark with a guide still needs its one guide reward.
    expect(() => check(journey)).toThrow(/Episode needs one guide_read reward/);
  });
});
