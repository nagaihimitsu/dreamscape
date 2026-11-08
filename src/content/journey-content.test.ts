import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture } from "./test-fixtures";
import { validateJourney } from "../../scripts/journey-validation";
import { journeySchema, type JourneyConfig } from "./journey-schemas";
import { battleCatalogSchema } from "./schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { balance, battleQuizzes, getCities } from ".";
// Read-only data comes from the generated mirror; fixture edits use changeCatalogEntry.
import journeyData from "./generated/content/progression/journey.json";
import cityData from "./generated/content/cities/milano.json";
import battleData from "./generated/content/battles/catalog.json";
import tourismData from "./generated/content/tourism/catalog.json";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-journey-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

type JourneyTestData = Omit<typeof journeyData, "rewards"> & Pick<JourneyConfig, "rewards">;
const copyJourney = (): JourneyTestData => ({
  ...structuredClone(journeyData), rewards: journeySchema.parse(journeyData).rewards,
});

type Episode = JourneyTestData["episodes"][number];
type Reward = JourneyTestData["rewards"][number];
/** The first Milan episode and reward rules, edited wherever their content layer keeps them. */
const episodeId = "milano_duomo_episode";
const rewardIds = ["guide_last_supper_first_read", "battle_last_supper_first_complete"] as const;
function changeEpisode(change: (episode: Episode) => void) {
  return changeCatalogEntry(fixture, "progression/journey.json", "episodes", episodeId, change);
}
function changeReward(id: string, change: (reward: Reward, journey: JourneyTestData) => void) {
  return changeCatalogEntry(fixture, "progression/journey.json", "rewards", id, change);
}

/** Reward and route checks do not need to recompile every unrelated Ink file. */
function checkJourney(change: (data: JourneyTestData) => void): void {
  const data = copyJourney();
  data.episodes = data.episodes.filter((episode) => episode.cityId === cityData.id);
  const episodeIds = new Set(data.episodes.map((episode) => episode.id));
  const landmarkIds = new Set(cityData.landmarkIdsPlanned);
  data.storyBattles = data.storyBattles.filter((entry) => {
    const battle = battleData.battles.find((battle) => battle.id === entry.battleId);
    return !!battle?.landmarkId && landmarkIds.has(battle.landmarkId);
  });
  const battleIds = new Set(data.storyBattles.map((entry) => entry.battleId));
  data.rewards = data.rewards.filter((rule) => rule.episodeId !== undefined
    ? episodeIds.has(rule.episodeId) : battleIds.has(rule.battleId!));
  change(data);
  validateJourney(
    journeySchema.parse(data),
    cityData,
    balance.apCap,
    tourismCatalogSchema.parse(tourismData).landmarks,
    battleCatalogSchema.parse(battleData).battles,
    battleQuizzes,
  );
}

describe("integrated journey content contract", () => {
  it("connects four ordered landmarks and a separate city finale with Milan's first-clear reward", async () => {
    const result = await buildContent(fixture, false);
    const stops = result.journey.episodes.filter(
      (episode) => episode.cityId === cityData.id && episode.kind !== "city_finale",
    );
    expect(stops.map((episode) => episode.landmarkId)).toEqual([
      "duomo_milano", "galleria_vittorio_emanuele_ii", "last_supper", "castello_sforzesco",
    ]);
    // Milan's entries only: other journeys add their own story battles and rewards.
    const milanLandmarks = new Set(result.tourism.landmarks.filter((landmark) => landmark.cityId === cityData.id).map((landmark) => landmark.id));
    const milanBattles = new Set(result.battles.filter((battle) => battle.landmarkId ? milanLandmarks.has(battle.landmarkId) : battle.cityId === cityData.id)
      .map((battle) => battle.id));
    const milanEpisodes = new Set(result.journey.episodes.filter((episode) => episode.cityId === cityData.id).map((episode) => episode.id));
    expect(result.journey.storyBattles.map((entry) => entry.battleId).filter((id) => milanBattles.has(id))).toEqual([
      "milano_la_scala_b01", "milano_brera_c01",
    ]);
    const finale = result.journey.episodes.find(
      (episode) => episode.cityId === cityData.id && episode.kind === "city_finale",
    )!;
    expect(finale.landmarkId).toBeNull();
    expect(finale.requiredEpisodeIds).toEqual(
      stops.map((episode) => episode.id),
    );
    expect(finale.epilogueStoryId).toBe("epilogues/milano");
    const firstClear = result.journey.rewards.find(
      (rule) => rule.id === cityData.firstClearReward.rewardSourceId,
    )!;
    expect(firstClear).toMatchObject({
      episodeId: "milano_last_supper_episode",
      trigger: "episode_clear",
      ap: 4,
    });
    const otherClears = result.journey.rewards.filter(
      (rule) => rule.trigger === "episode_clear" && rule.id !== firstClear.id && milanEpisodes.has(rule.episodeId!),
    );
    expect(otherClears.length).toBeGreaterThan(0);
    expect(otherClears.every((rule) => rule.ap === 1)).toBe(true);
    expect(result.tourismGuides).toBe(result.tourism.landmarks.length);
    const cityConversations = result.journey.episodes.filter((episode) => episode.epilogueStoryId).length +
      getCities().filter((city) => city.arrivalStoryId).length;
    expect(result.epilogueScenarios).toBe(8 * cityConversations);
  });

  it("requires a city's first episode to start without prerequisites", () => {
    expect(() => checkJourney((data) => {
      data.episodes[0].requiredEpisodeIds = [data.episodes[1].id];
    })).toThrow("Entry episode must begin the route without prerequisites");
  });

  it("rejects duplicate episodes and ambiguous shared battles", () => {
    expect(() => checkJourney((data) => {
      data.episodes.push({ ...data.episodes[0] });
    })).toThrow(
      "Duplicate episode ID",
    );
    expect(() => checkJourney((data) => {
      data.episodes.push({ ...data.episodes[0], id: "another_episode" });
    })).toThrow(
      "Duplicate episode battle",
    );
  });

  it.each([
    // A date that requires this episode is checked against the episode's city first.
    ["cityId", "Unknown date prerequisite episode: milano_san_satiro_date_01/milano_duomo_episode"],
    ["landmarkId", "Episode tourism/battle mismatch: milano_duomo_episode"],
    ["battleId", "Episode tourism/battle mismatch: milano_duomo_episode"],
  ] as const)(
    "rejects an unknown episode %s",
    async (field, message) => {
      await changeEpisode((episode) => {
        episode[field] = "missing";
      });
      await expect(buildContent(fixture, false)).rejects.toThrow(message);
    },
  );

  it("requires episode rewards to reference a registered episode", async () => {
    await changeReward(rewardIds[0], (reward, journey) => {
      journey.rewards.push({
        ...reward,
        id: "orphan_reward",
        episodeId: "missing",
      });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown reward episode",
    );
  });

  it("requires special rewards to reference a registered special battle", async () => {
    await changeReward("guide_scala_first", (rule) => {
      expect(rule.battleId).toBeDefined();
      rule.battleId = "missing_special_battle";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown reward story battle");
  });

  it("rejects duplicate reward IDs", async () => {
    await changeReward(rewardIds[1], (rule) => {
      rule.id = rewardIds[0];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate journey reward ID",
    );
  });

  it("allows the first-clear reward only as an equal-valued episode clear rule", () => {
    const clear = journeyData.rewards.find((rule) => rule.id === cityData.firstClearReward.rewardSourceId)!;
    expect(clear.ap).toBe(cityData.firstClearReward.ap);
    expect(() => checkJourney((data) => {
      data.rewards[3].id = "new_chapter_reward";
    })).toThrow("Missing first-clear reward rule");
    expect(() => checkJourney((data) => {
      data.rewards[3].ap++;
    })).toThrow("First-clear reward must keep its ID, trigger and amount");
    expect(() => checkJourney((data) => {
      data.rewards[0].id = cityData.firstClearReward.rewardSourceId;
      data.rewards[3].id = "different_reward";
    })).toThrow("First-clear reward must keep its ID, trigger and amount");
  });

  it("requires one rule for each supported completion boundary", () => {
    expect(() => checkJourney((data) => {
      data.rewards.splice(3, 1);
    })).toThrow(
      "Episode needs one episode_clear reward",
    );
    expect(() => checkJourney((data) => {
      data.rewards.push({ ...data.rewards[0], id: "another_guide_reward" });
    })).toThrow(
      "Episode needs one guide_read reward",
    );
  });

  it("rejects invalid AP and score thresholds without imposing a winning chapter condition", () => {
    for (const [amount, message] of [
      [0, "Too small: expected number to be >0"],
      [-1, "Too small: expected number to be >0"],
      [1.5, "Invalid input: expected int, received number"],
      [13, "Journey reward exceeds AP cap: guide_last_supper_first_read"],
    ] as const) {
      expect(() => checkJourney((data) => {
        data.rewards[0].ap = amount;
      })).toThrow(message);
    }
    expect(() => checkJourney((data) => {
      data.rewards[2].minScore = 4;
    })).toThrow(
      "Unreachable score reward",
    );
    expect(() => checkJourney((data) => {
      data.rewards[1].minScore = 1;
    })).toThrow(
      "Only score rewards",
    );
    expect(() => checkJourney((data) => {
      data.rewards[2].minScore = null;
    })).toThrow(
      "Only score rewards",
    );
  });

  it("keeps city completion, mandatory discoveries and affection out of the journey integration contract", async () => {
    await changeEpisode((episode) => {
      (episode as { kind: string }).kind = "city_clear";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"kind"[\s\S]*Invalid option/);
    await changeEpisode((episode) => {
      Object.assign(episode, { requiredDiscoveredClueIds: ["last_supper_light"] });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Unrecognized key: .*requiredDiscoveredClueIds/);
    await changeReward(rewardIds[0], (rule) => {
      Object.assign(rule, { affectionDelta: 1 });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Unrecognized key: .*affectionDelta/);
  });

  it("keeps episode descriptions in editable Japanese data", async () => {
    await changeEpisode((episode) => {
      episode.clearDescriptionJa = "The city is complete.";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected Japanese journey text",
    );
  });
});
