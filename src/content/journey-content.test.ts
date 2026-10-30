import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import journeyData from "../../content/progression/journey.json";
import cityData from "../../content/cities/milano.json";
import trialData from "../../content/romance/trial_progression.json";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-journey-content-"));
  await cp(path.resolve("content"), path.join(fixture, "content"), {
    recursive: true,
  });
  await cp(path.resolve("public"), path.join(fixture, "public"), {
    recursive: true,
  });
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

describe("integrated journey content contract", () => {
  it("connects the existing tourism and battle as one trial episode with four finite rewards", async () => {
    const result = await buildContent(fixture, false);
    expect(result.journey.episodes[0]).toMatchObject({
      id: result.journey.entryEpisodeId,
      kind: "trial_episode",
      landmarkId: result.tourism.landmarks[0].id,
      battleId: result.battles[0].id,
      legacyChapterId: cityData.id,
    });
    expect(
      result.journey.rewards.map((rule) => [
        rule.trigger,
        rule.ap,
        rule.minScore,
      ]),
    ).toEqual([
      ["guide_read", 1, null],
      ["battle_complete", 1, null],
      ["battle_score", 1, 2],
      ["episode_clear", 4, null],
    ]);
    expect(result.routes).toBe(105);
    expect(result.tourismGuides).toBe(1);
  });

  it("rejects an unknown entry episode", async () => {
    await changeJourney((data) => {
      data.entryEpisodeId = "missing_episode";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown entry episode",
    );
  });

  it("rejects duplicate episodes and ambiguous shared battles", async () => {
    await changeJourney((data) => {
      data.episodes.push({ ...data.episodes[0] });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate episode ID",
    );
    await changeJourney((data) => {
      data.episodes.push({ ...data.episodes[0], id: "another_episode" });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
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

  it("requires one rule for each supported completion boundary", async () => {
    await changeJourney((data) => {
      data.rewards.pop();
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Episode needs one episode_clear reward",
    );
    await changeJourney((data) => {
      data.rewards.push({ ...data.rewards[0], id: "another_guide_reward" });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Episode needs one guide_read reward",
    );
  });

  it("rejects invalid AP and score thresholds without imposing a winning chapter condition", async () => {
    for (const amount of [0, -1, 1.5, 13]) {
      await changeJourney((data) => {
        data.rewards[0].ap = amount;
      });
      await expect(buildContent(fixture, false)).rejects.toThrow();
    }
    await changeJourney((data) => {
      data.rewards[2].minScore = 4;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unreachable score reward",
    );
    await changeJourney((data) => {
      data.rewards[1].minScore = 1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Only score rewards",
    );
    await changeJourney((data) => {
      data.rewards[2].minScore = null;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
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
