import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";
import { validateJourney } from "../../scripts/journey-validation";
import { journeySchema } from "./journey-schemas";
import { battleCatalogSchema, trialProgressionSchema } from "./schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { balance, battleQuizzes } from ".";
import journeyData from "../../content/progression/journey.json";
import cityData from "../../content/cities/milano.json";
import trialData from "../../content/romance/trial_progression.json";
import battleData from "../../content/battles/catalog.json";
import tourismData from "../../content/tourism/catalog.json";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-journey-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

async function changeJourney(change: (data: typeof journeyData) => void) {
  const data = structuredClone(journeyData);
  change(data);
  await writeFile(
    path.join(fixture, "content/progression/journey.json"),
    JSON.stringify(data),
  );
}

/** Reward and route checks do not need to recompile every unrelated Ink file. */
function checkJourney(change: (data: typeof journeyData) => void): void {
  const data = structuredClone(journeyData);
  change(data);
  validateJourney(
    journeySchema.parse(data),
    cityData,
    balance.apCap,
    tourismCatalogSchema.parse(tourismData).landmarks,
    battleCatalogSchema.parse(battleData).battles,
    battleQuizzes,
    trialProgressionSchema.parse(trialData).milestones,
  );
}

describe("integrated journey content contract", () => {
  it("connects four ordered landmarks and a separate city finale while retaining the legacy reward", async () => {
    const result = await buildContent(fixture, false);
    expect(result.journey.entryEpisodeId).toBe("milano_duomo_episode");
    const stops = result.journey.episodes.filter(
      (episode) => episode.kind !== "city_finale",
    );
    expect(stops.map((episode) => episode.landmarkId)).toEqual([
      "duomo_milano", "galleria_vittorio_emanuele_ii", "last_supper", "castello_sforzesco",
    ]);
    expect(result.journey.storyBattles.map((entry) => entry.battleId)).toEqual([
      "milano_la_scala_b01", "milano_brera_c01",
    ]);
    const finale = result.journey.episodes.find(
      (episode) => episode.kind === "city_finale",
    )!;
    expect(finale.landmarkId).toBeNull();
    expect(finale.requiredEpisodeIds).toEqual(
      stops.map((episode) => episode.id),
    );
    expect(finale.epilogueStoryId).toBe("milano/city_epilogue_rewrite");
    const legacy = result.journey.rewards.find(
      (rule) => rule.id === cityData.firstClearReward.rewardSourceId,
    )!;
    expect(legacy).toMatchObject({
      episodeId: "milano_last_supper_episode",
      trigger: "episode_clear",
      ap: 4,
    });
    expect(
      result.journey.rewards
        .filter(
          (rule) => rule.trigger === "episode_clear" && rule.id !== legacy.id,
        )
        .every((rule) => rule.ap === 1),
    ).toBe(true);
    expect(result.tourismGuides).toBe(cityData.landmarkIdsPlanned.length);
    expect(result.epilogueScenarios).toBe(8);
  });

  it("rejects an unknown entry episode", async () => {
    await changeJourney((data) => {
      data.entryEpisodeId = "missing_episode";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown entry episode",
    );
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

  it.each(["cityId", "legacyChapterId", "landmarkId", "battleId"] as const)(
    "rejects an unknown episode %s",
    async (field) => {
      await changeJourney((data) => {
        data.episodes[0][field] = "missing";
      });
      await expect(buildContent(fixture, false)).rejects.toThrow();
    },
  );

  it("requires every reward to reference a registered episode", async () => {
    await changeJourney((data) => {
      data.rewards.push({
        ...data.rewards[0],
        id: "orphan_reward",
        episodeId: "missing",
      });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown reward episode",
    );
  });

  it("rejects duplicate reward IDs and collisions with supplemental trial rewards", async () => {
    await changeJourney((data) => {
      data.rewards[1].id = data.rewards[0].id;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate journey reward ID",
    );
    await changeJourney((data) => {
      data.rewards[0].id = trialData.milestones[0].rewardSourceId;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate journey/trial reward ID",
    );
  });

  it("allows the existing chapter reward only as an equal-valued episode clear alias", async () => {
    const clear = journeyData.rewards.find(
      (rule) => rule.trigger === "episode_clear",
    )!;
    expect(clear.id).toBe(cityData.firstClearReward.rewardSourceId);
    expect(clear.ap).toBe(cityData.firstClearReward.ap);
    await changeJourney((data) => {
      data.rewards[3].id = "new_chapter_reward";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Missing legacy chapter reward alias",
    );
    await changeJourney((data) => {
      data.rewards[3].ap++;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Legacy chapter reward",
    );
    await changeJourney((data) => {
      data.rewards[0].id = cityData.firstClearReward.rewardSourceId;
      data.rewards[3].id = "different_reward";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Legacy chapter reward",
    );
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
    for (const amount of [0, -1, 1.5, 13]) {
      expect(() => checkJourney((data) => {
        data.rewards[0].ap = amount;
      })).toThrow();
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

  it("keeps city completion, mandatory discoveries and affection out of the trial integration contract", async () => {
    await changeJourney((data) => {
      data.episodes[0].kind = "city_clear";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    const forbidden = {
      ...journeyData,
      episodes: [
        {
          ...journeyData.episodes[0],
          requiredDiscoveredClueIds: ["last_supper_light"],
        },
      ],
    };
    await writeFile(
      path.join(fixture, "content/progression/journey.json"),
      JSON.stringify(forbidden),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await writeFile(
      path.join(fixture, "content/progression/journey.json"),
      JSON.stringify({
        ...journeyData,
        rewards: journeyData.rewards.map((rule) => ({
          ...rule,
          affectionDelta: 1,
        })),
      }),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("keeps episode descriptions in editable Japanese data", async () => {
    await changeJourney((data) => {
      data.episodes[0].clearDescriptionJa = "The city is complete.";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected Japanese journey text",
    );
  });
});
