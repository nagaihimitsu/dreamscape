import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import sharp from "sharp";
import { buildContent } from "../../scripts/content-pipeline";
import dateData from "../../content/romance/date_catalog.json";
import battleData from "../../content/battles/catalog.json";
import tourismData from "../../content/tourism/catalog.json";
import reasoningIntroData from "../../content/presentation/reasoning-intros.json";
import encounterData from "../../content/encounters/catalog.json";
import archivedEncounterData from "../../content/legacy/milano_fa0e7e0/encounters/catalog.json";
import archivedBattleData from "../../content/legacy/milano_fa0e7e0/battles/catalog.json";
import archivedTourismData from "../../content/legacy/milano_fa0e7e0/tourism/catalog.json";
import archivedJourneyData from "../../content/legacy/milano_fa0e7e0/progression/journey.json";
import { parseStoryTags } from "./tags";
import { prepareContentFixture } from "./test-fixtures";

let fixture: string;
const storyFile = "content/stories/milano/cafe_01.ink";
const dateFile = "content/romance/date_catalog.json";

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

async function replace(file: string, from: string, to: string) {
  const target = path.join(fixture, file);
  const original = await readFile(target, "utf8");
  expect(original).toContain(from);
  await writeFile(target, original.replace(from, to));
}

async function changeDates(change: (data: typeof dateData) => void) {
  const data: typeof dateData = JSON.parse(
    await readFile(path.join(fixture, dateFile), "utf8"),
  );
  change(data);
  await writeFile(path.join(fixture, dateFile), JSON.stringify(data));
}

describe("content build acceptance", () => {
  it("validates the real production catalog and registered artwork", async () => {
    await expect(buildContent(path.resolve("."), false)).resolves.toBeDefined();
  }, 120000);
  it("rejects a registered but missing background image", async () => {
    const file = path.join(fixture, "content/romance/presentation.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.backgrounds.milano_cafe.imagePath = "assets/missing-background.png";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing background image: milano_cafe/assets/missing-background.png");
  });
  it("accepts a credited shared photo and rejects a missing or ambiguous background asset", async () => {
    const file = path.join(fixture, "content/romance/presentation.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.backgrounds.milano_cafe.imageAssetId = "galleria_milano_photo";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    data.backgrounds.milano_cafe.imageAssetId = "missing_background_asset";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown background image asset: milano_cafe/missing_background_asset");
    data.backgrounds.milano_cafe.imageAssetId = "galleria_milano_photo";
    data.backgrounds.milano_cafe.imagePath = "assets/tourism/galleria-milano.webp";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Background cannot specify both imagePath and imageAssetId: milano_cafe");
  }, 120000);
  it("rejects an undefined character ID and a registered but missing image", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    // Isolate the required-character check from wardrobe's own references.
    delete data.wardrobe;
    data.characters[0].id = "unknown";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown required character ID: heroine");
    data.characters[0].id = "heroine";
    data.characters[0].imagePath = "assets/missing.png";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing character image: heroine/assets/missing.png");
  });
  it("rejects an unknown battle in the artwork assignment", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.battleCharacters = { missing_battle: "enemy" };
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown battle ID in character assignment: missing_battle");
  });
  it("rejects registered missing costume art without requiring unregistered expressions", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.characters[0].costumes.find((costume: { id: string }) => costume.id === "south_europe_01").poses[0].expressions.neutral = "assets/characters/heroine/missing.png";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing character image: heroine/south_europe_01/standing_01/neutral/assets/characters/heroine/missing.png");
  });
  it("accepts delivered neutral and smile art and enforces the shared canvas", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    const expressions = data.characters[0].costumes.find((costume: { id: string }) => costume.id === "south_europe_01").poses[0].expressions;
    const dir = "assets/characters/heroine/south_europe_01/standing_01";
    await mkdir(path.join(fixture, "public", dir), { recursive: true });
    const render = (width: number) => sharp({
      create: { width, height: 1536, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
    }).png().toBuffer();
    expressions.neutral = `${dir}/neutral.png`;
    await writeFile(path.join(fixture, "public", expressions.neutral), await render(1024));
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    expressions.smile = `${dir}/smile.png`;
    await writeFile(path.join(fixture, "public", expressions.smile), await render(1024));
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    await writeFile(path.join(fixture, "public", expressions.smile), await render(512));
    await expect(buildContent(fixture, false)).rejects.toThrow("dimensions do not match canvas 1024x1536");
  });
  it("checks the basic costume and pose references without requiring finished images", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    const heroine = data.characters.find((character: { id: string }) => character.id === "heroine");
    expect(heroine.defaultCostume).toBe("default_01");
    expect(heroine.defaultPose).toBe("standing_01");
    expect(heroine.costumes.find((costume: { id: string }) => costume.id === "default_01").poses[0].expressions).toEqual({});
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    heroine.defaultCostume = "missing_costume";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown default costume: heroine/missing_costume");
    heroine.defaultCostume = "default_01";
    heroine.defaultPose = "missing_pose";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown default pose: heroine/default_01/missing_pose");
    delete heroine.defaultCostume;
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Default pose needs a costume: heroine");
  });
  it("accepts all expression IDs and validates every registered image", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    const heroine = data.characters.find((character: { id: string }) => character.id === "heroine");
    const pose = heroine.costumes.find((costume: { id: string }) => costume.id === "default_01").poses[0];
    const expressionIds = ["neutral", "smile", "happy", "shy", "shy_deep", "surprised", "surprised_big", "worried", "serious", "teasing", "teasing_big", "exasperated"];
    expect(data.expressionIds).toEqual(expect.arrayContaining(expressionIds));
    expect(pose.canvas).toEqual({ width: 1024, height: 1536 });
    // A tiny canvas keeps this reference/registration test fast. Actual 1024×1536
    // dimensions and transparency are exercised by the shared-canvas test above.
    pose.canvas = { width: 8, height: 12 };
    const dir = "assets/characters/heroine/default_01/standing_01";
    await mkdir(path.join(fixture, "public", dir), { recursive: true });
    const imagePath = `${dir}/fixture.png`;
    const image = await sharp({ create: { width: 8, height: 12, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    await writeFile(path.join(fixture, "public", imagePath), image);
    for (const id of expressionIds) pose.expressions[id] = imagePath;
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    pose.expressions.teasing_big = `${dir}/missing.png`;
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow(`Missing character image: heroine/default_01/standing_01/teasing_big/${dir}/missing.png`);
  });
  it("checks the wardrobe city against real city data and its country", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.wardrobe.cities.missing_city = { country: "IT" };
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown city in character wardrobe: missing_city");
    delete data.wardrobe.cities.missing_city;
    data.wardrobe.countries.FR = { region: "south_europe" };
    data.wardrobe.cities.milano.country = "FR";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Character wardrobe country mismatch: milano/FR (expected IT)");
  });
  it("rejects a wardrobe scene assignment that no playable scene uses", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.wardrobe.scenes.missing_scene = { costume: "south_europe_01" };
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown scene in character wardrobe: missing_scene");
  });
  it("compiles every declared scenario context and route", async () => {
    const result = await buildContent(fixture);
    expect(result.routes).toBe(
      dateData.dates.reduce(
        (sum, date) =>
          sum + (date.kind === "confession" ? 3 : 6) ** date.choiceCount * date.validationContexts.length,
        0,
      ),
    );
    const generated = JSON.parse(
      await readFile(
        path.join(fixture, "src/content/generated/stories.json"),
        "utf8",
      ),
    );
    expect(Object.keys(generated).sort()).toEqual(
      [...new Set([
        "learning/english",
        ...dateData.dates.map((date) => date.storyId),
        ...dateData.dates.flatMap((date) => "legacyStoryIds" in date ? date.legacyStoryIds ?? [] : []),
        ...battleData.battles.map((battle) => battle.storyId),
        ...archivedBattleData.battles.map((battle) => battle.storyId).filter((id) => id in generated),
        ...reasoningIntroData.entries.map((entry) => entry.storyId),
        ...encounterData.encounters.flatMap((event) => [
          event.storyId,
          ...("quiz" in event && event.quiz
            ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId]
            : []),
        ]),
        ...archivedEncounterData.encounters.flatMap((event) => [
          event.storyId,
          ...("quiz" in event && event.quiz
            ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId]
            : []),
        ]).filter((id) => id in generated),
        ...tourismData.landmarks.map((landmark) => landmark.guideStoryId),
        ...archivedTourismData.landmarks.map((landmark) => landmark.guideStoryId).filter((id) => id in generated),
        ...result.journey.episodes.flatMap((episode) =>
          episode.epilogueStoryId ? [episode.epilogueStoryId] : [],
        ),
        ...archivedJourneyData.episodes.flatMap((episode) =>
          "epilogueStoryId" in episode && episode.epilogueStoryId && episode.epilogueStoryId in generated ? [episode.epilogueStoryId] : [],
        ),
      ])].sort(),
    );
  });

  it("reflects edited Ink prose in runtime without a UI source change", async () => {
    await replace(
      storyFile,
      "運河沿いの小さなカフェ。",
      "窓辺に、二人分のコーヒー。",
    );
    const result = await buildContent(fixture, false);
    const story = new Story(result.stories["milano/cafe_01"]);
    expect(story.Continue()).toContain("窓辺に、二人分のコーヒー。");
  });

  it("rejects an unknown story reference", async () => {
    await changeDates((data) => {
      data.dates[0].storyId = "milano/missing";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown storyId",
    );
  });

  it("rejects duplicate stable date IDs", async () => {
    await changeDates((data) => {
      data.dates.push({ ...data.dates[0] });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate dateId",
    );
  });

  it("rejects a normal date configured for replay", async () => {
    await changeDates((data) => {
      data.dates[0].repeatable = true;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "One-time event is repeatable: milano_cafe_01",
    );
  });

  it("rejects undefined effects even on a non-default branch", async () => {
    await replace(
      storyFile,
      "effect: milano_cafe_second_honest",
      "effect: undefined_effect",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown effect",
    );
  });

  it("rejects unrecognized tags instead of treating them as code", async () => {
    await replace(storyFile, "# emotion: shy", "# javascript: alert(1)");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown story tag",
    );
  });

  it("rejects unknown background IDs", async () => {
    await replace(storyFile, "background: milano_cafe", "background: nowhere");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown background",
    );
  });

  it("fails on broken Ink instead of emitting a stale story", async () => {
    await replace(storyFile, "-> start", "-> missing_knot");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Ink compilation failed",
    );
  });

  it("rejects branches with fewer than three choices", async () => {
    await replace(
      storyFile,
      "* [「明日はどこへ行きたい？」]",
      "* {false} [「明日はどこへ行きたい？」]",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected three choices",
    );
  });

  it("rejects routes ending before the second choice", async () => {
    await replace(storyFile, "-> after_first", "-> END");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected 2 choice moments",
    );
  });

  it("rejects malformed JSON syntax", async () => {
    await writeFile(path.join(fixture, dateFile), '{"dates":');
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Cannot read JSON",
    );
  });

  it("rejects valid JSON with invalid schema", async () => {
    await changeDates((data) => {
      data.dates[0].apCost = -1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("requires the name variables expected by the runtime", async () => {
    await replace(
      "content/stories/milano/invitation_01.ink",
      'VAR player_name = ""',
      "// player name accidentally removed",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Missing required Ink variable: player_name",
    );
  });

  it("rejects relationship rewards attached to confession outcomes", async () => {
    const file = path.join(fixture, "content/romance/effect_catalog.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    const outcome = data.effects.find(
      (effect: { id: string }) => effect.id === "milano_confession_accepted",
    );
    for (const field of ["affectionDelta", "trustDelta", "sparkDelta"]) {
      outcome[field] = 1;
      await writeFile(file, JSON.stringify(data));
      await expect(buildContent(fixture, false)).rejects.toThrow(
        "Confession outcome cannot award relationship points",
      );
      outcome[field] = 0;
    }
  });

  it("validates special events with one choice instead of demanding nine routes", async () => {
    const result = await buildContent(fixture, false);
    const invitation = result.dates.find((date) => date.kind === "special")!;
    expect(invitation.choiceCount).toBe(1);
    const story = new Story(result.stories[invitation.storyId]);
    while (story.canContinue) story.Continue();
    expect(story.currentChoices).toHaveLength(3);
  });

  it("rejects a stage tied to a specific date", async () => {
    await replace(
      "content/romance/progression.json",
      '"stage": 2,',
      '"stage": 2, "requiredPlayedDateIds": ["milano_walk_01"],',
    );
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("rejects a normal date requiring another date", async () => {
    await changeDates((data) => {
      (data.dates[0].requiredPlayedDateIds as string[]).push("milano_walk_01");
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Normal dates cannot require other dates",
    );
  });

  it("rejects a paid special event", async () => {
    await changeDates((data) => {
      data.dates.find((date) => date.kind === "special")!.apCost = 1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Special events must be free",
    );
  });

  it("rejects invalid confession readiness branches", async () => {
    await replace(
      "content/stories/milano/confession_01.ink",
      "{confession_ready:",
      "{true:",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Confession accepts before readiness",
    );
  });

  it("rejects missing outcome events in confession", async () => {
    await replace(
      "content/stories/milano/confession_01.ink",
      "# effect: milano_confession_accepted",
      "# effect: milano_invitation_chosen_joke",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Confession must resolve exactly one outcome",
    );
  });

  it("rejects outcome effects in a normal date", async () => {
    await replace(
      storyFile,
      "# effect: milano_cafe_first_joke",
      "# effect: milano_confession_deferred",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Only confession",
    );
  });

  it("rejects duplicate milestone reward source IDs", async () => {
    await replace(
      "content/romance/trial_progression.json",
      '"trial_after_walk_reward"',
      '"trial_after_cafe_reward"',
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate reward source",
    );
  });

  it("still validates the unpublished quiz sample", async () => {
    await replace(
      "content/quizzes/last_supper_B1.sample.json",
      '"correctOptionId": "A"',
      '"correctOptionId": "D"',
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Invalid correct option",
    );
  });
});

describe("safe Ink metadata", () => {
  const context = {
    effectIds: ["chosen"],
    backgroundIds: ["cafe"],
    emotionIds: ["shy"],
  };

  it("reads allowlisted metadata for lines and selected choice tags", () => {
    expect(
      parseStoryTags(
        [
          "speaker: heroine",
          "background: cafe",
          "emotion: shy",
          "effect: chosen",
        ],
        context,
      ),
    ).toEqual({
      speaker: "heroine",
      background: "cafe",
      emotion: "shy",
      effects: ["chosen"],
    });
  });

  it("rejects conflicting speaker tags", () => {
    expect(() =>
      parseStoryTags(["speaker: heroine", "speaker: player"], context),
    ).toThrow("Duplicate speaker");
  });
});
