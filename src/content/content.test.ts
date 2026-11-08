import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import sharp from "sharp";
import { buildContent } from "../../scripts/content-pipeline";
import { compileInk, validateStory } from "../../scripts/ink-validation";
import { MIRROR_DIRECTORY } from "../../scripts/content-layout";
import { listFiles } from "../../scripts/content-sources";
import { effects, presentation } from "./index";
import dateData from "./generated/content/romance/date_catalog.json";
import { normalizeEncounterCatalog } from "./encounter-schemas";
import { reasoningIntroCatalogSchema } from "./reasoning-intros";
import { battleCatalogSchema, citySchema, dateCatalogSchema } from "./schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { parseStoryTags } from "./tags";
import { changeCatalogEntry, prepareContentFixture, quizSourceFile, registerOwnArtwork, storySourceFile } from "./test-fixtures";

let fixture: string;
const storyFile = storySourceFile("milano/sound_cafe_01");
const dateFile = "content/journeys/milano/romance/date_catalog.json";

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

type DateEntry = (typeof dateData)["dates"][number];
/** Change one date, by ID, in the layer file that defines it. */
function changeDate(id: string, change: (date: DateEntry, catalog: typeof dateData) => void) {
  return changeCatalogEntry<DateEntry>(fixture, "romance/date_catalog.json", "dates", id, change);
}

describe("content build acceptance", () => {
  it("validates the real production catalog and registered artwork", async () => {
    await expect(buildContent(path.resolve("."), false)).resolves.toBeDefined();
  }, 120000);
  it("rejects a served file that two public folders provide", async () => {
    // The game serves one assembled folder, so a journey may not shadow a shared file.
    const copy = path.join(fixture, "content/journeys/milano/public/assets/items/item.svg");
    await writeFile(copy, await readFile(path.join(fixture, "public/assets/items/item.svg")));
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Public file assets/items/item.svg exists in more than one public folder: public/assets/items/item.svg and content/journeys/milano/public/assets/items/item.svg");
  });
  it("serves a journey's title art from its public folder and rejects a missing image", async () => {
    // A stray file in the journey folder is a warning: the build goes on and returns it.
    await writeFile(path.join(fixture, "content/journeys/milano/notes.txt"), "memo\n");
    const manifestFile = path.join(fixture, "content/journeys/milano/manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    const image = path.join(fixture, "content/journeys/milano/public/assets/title/milano.webp");
    await mkdir(path.dirname(image), { recursive: true });
    await sharp({ create: { width: 1760, height: 560, channels: 3, background: "#e6d8bb" } }).webp().toFile(image);
    const titleArt = { imagePath: "assets/title/milano.webp", captionJa: "ミラノ ／ 運河の午後" };
    await writeFile(manifestFile, JSON.stringify({ ...manifest, titleArt }));
    // Title art is the author's own illustration: served only once the journey lists it as own artwork.
    await expect(buildContent(fixture, false)).rejects.toThrow("出典のない画像：content/journeys/milano/public/assets/title/milano.webp。");
    await registerOwnArtwork(fixture, "content/journeys/milano", [titleArt.imagePath]);
    const result = await buildContent(fixture);
    expect(result.warnings).toContainEqual({ kind: "unknown-file",
      message: expect.stringContaining("Unknown file in a journey folder: content/journeys/milano/notes.txt ") });
    const catalog = JSON.parse(await readFile(path.join(fixture, "src/content/generated/content/journeys/catalog.json"), "utf8"));
    expect(catalog.journeys.find((journey: { id: string }) => journey.id === "milano").titleArt).toEqual(titleArt);
    expect(await readFile(path.join(fixture, "src/content/generated/public/assets/title/milano.webp"))).toEqual(await readFile(image));
    await writeFile(manifestFile, JSON.stringify({ ...manifest, titleArt: { ...titleArt, imagePath: "assets/title/missing.webp" } }));
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing title art image: milano/assets/title/missing.webp (place it in content/journeys/milano/public/)");
  }, 120000);
  it("rejects a registered but missing background image", async () => {
    const file = path.join(fixture, "content/romance/presentation.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.backgrounds.default_scene.imagePath = "assets/missing-background.png";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing background image: default_scene/assets/missing-background.png");
  });
  it("accepts a credited shared photo and rejects a missing or ambiguous background asset", async () => {
    // A Milan background without an image (the core default may not use a journey's photo).
    type Background = { imageAssetId?: string; imagePath?: string };
    const changeWalk = (change: (background: Background) => void) =>
      changeCatalogEntry<Background>(fixture, "romance/presentation.json", "backgrounds", "milano_walk", change);
    await changeWalk((background) => {
      expect(background.imageAssetId).toBeUndefined();
      background.imageAssetId = "galleria_milano_photo";
    });
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    await changeWalk((background) => { background.imageAssetId = "missing_background_asset"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown background image asset: milano_walk/missing_background_asset");
    await changeWalk((background) => {
      background.imageAssetId = "galleria_milano_photo";
      background.imagePath = "assets/tourism/galleria-milano.webp";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("Background cannot specify both imagePath and imageAssetId: milano_walk");
  }, 120000);
  it("rejects an undefined character ID and a registered but missing image", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    // Isolate the required-character check from wardrobe's own references
    // (Milan's fragment holds only its wardrobe city).
    delete data.wardrobe;
    await rm(path.join(fixture, "content/journeys/milano/presentation/characters.json"));
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
    await registerOwnArtwork(fixture, "content", [expressions.neutral]);
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    expressions.smile = `${dir}/smile.png`;
    await writeFile(path.join(fixture, "public", expressions.smile), await render(1024));
    await writeFile(file, JSON.stringify(data));
    await registerOwnArtwork(fixture, "content", [expressions.smile]);
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
    await registerOwnArtwork(fixture, "content", [imagePath]);
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    pose.expressions.teasing_big = `${dir}/missing.png`;
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow(`Missing character image: heroine/default_01/standing_01/teasing_big/${dir}/missing.png`);
  });
  it("checks the wardrobe city against real city data and its country", async () => {
    // Countries are shared (core); each journey assigns its own cities.
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    const milanoFile = path.join(fixture, "content/journeys/milano/presentation/characters.json");
    const milano = JSON.parse(await readFile(milanoFile, "utf8"));
    milano.wardrobe.cities.missing_city = { country: "IT" };
    await writeFile(milanoFile, JSON.stringify(milano));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown city in character wardrobe: missing_city");
    delete milano.wardrobe.cities.missing_city;
    data.wardrobe.countries.FR = { region: "south_europe" };
    milano.wardrobe.cities.milano.country = "FR";
    await writeFile(file, JSON.stringify(data));
    await writeFile(milanoFile, JSON.stringify(milano));
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
    // Compare with the fixture's own generated mirror: the repository's generated
    // output may hold other journeys (the unit tests build it with the sample journey).
    const mirror = async (relative: string) => JSON.parse(await readFile(path.join(fixture, MIRROR_DIRECTORY, relative), "utf8"));
    const dates = dateCatalogSchema.parse(await mirror("romance/date_catalog.json")).dates;
    expect(result.routes).toBe(
      dates.reduce(
        (sum, date) =>
          sum + (date.kind === "confession" ? 3 : 6) ** date.choiceCount * date.validationContexts.length,
        0,
      ),
    );
    const encounterCatalog = normalizeEncounterCatalog(await mirror("encounters/catalog.json"), result.tourism.landmarks);
    const cities = await Promise.all(listFiles(path.join(fixture, MIRROR_DIRECTORY, "cities"))
      .map(async (file) => citySchema.parse(await mirror(`cities/${file}`))));
    const generated = JSON.parse(
      await readFile(
        path.join(fixture, "src/content/generated/stories.json"),
        "utf8",
      ),
    );
    expect(Object.keys(generated).sort()).toEqual(
      [...new Set([
        "learning/sound_english",
        ...dates.map((date) => date.storyId),
        ...battleCatalogSchema.parse(await mirror("battles/catalog.json")).battles.map((battle) => battle.storyId),
        ...reasoningIntroCatalogSchema.parse(await mirror("presentation/reasoning-intros.json")).entries.map((entry) => entry.storyId),
        ...encounterCatalog.encounters.flatMap((event) => [
          event.storyId,
          ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : []),
        ]),
        ...tourismCatalogSchema.parse(await mirror("tourism/catalog.json")).landmarks.map((landmark) => landmark.guideStoryId),
        ...cities.flatMap((city) => city.arrivalStoryId ? [city.arrivalStoryId] : []),
        ...result.journey.episodes.flatMap((episode) =>
          episode.epilogueStoryId ? [episode.epilogueStoryId] : [],
        ),
      ])].sort(),
    );
  });

  it("reflects edited Ink prose in runtime without a UI source change", async () => {
    await replace(
      storyFile,
      "ロースタリーの焙煎を見ていたら",
      "窓辺に、二人分のコーヒー。",
    );
    const result = await buildContent(fixture, false);
    const story = new Story(result.stories["milano/sound_cafe_01"]);
    expect(story.Continue()).toContain("窓辺に、二人分のコーヒー。");
  });

  it("rejects an unknown story reference", async () => {
    await changeDate("milano_cafe_01", (date) => {
      date.storyId = "milano/missing";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown storyId",
    );
  });

  it("rejects duplicate stable date IDs", async () => {
    await changeDate("milano_cafe_01", (date, catalog) => {
      catalog.dates.push({ ...date });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate dateId",
    );
  });

  it("rejects a normal date configured for replay", async () => {
    await changeDate("milano_cafe_01", (date) => {
      date.repeatable = true;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "One-time event is repeatable: milano_cafe_01",
    );
  });

  it("rejects undefined effects even on a non-default branch", async () => {
    await replace(
      storyFile,
      "effect: sound_cafe_01_2_3",
      "effect: undefined_effect",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown effect",
    );
  });

  it("rejects unrecognized tags instead of treating them as code", async () => {
    await replace(storyFile, "# emotion: teasing", "# javascript: alert(1)");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown story tag",
    );
  });

  it("rejects unknown background IDs", async () => {
    await replace(storyFile, "background: milano_starbucks_roastery_date", "background: nowhere");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown background",
    );
  });

  it("fails on broken Ink instead of emitting a stale story", async () => {
    await replace(storyFile, "-> join_1", "-> missing_knot");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Ink compilation failed",
    );
  });

  it("rejects branches with fewer than three choices", async () => {
    await replace(
      storyFile,
      "* [「その一口目、実況しようか」]",
      "* {false} [「その一口目、実況しようか」]",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected three choices",
    );
  });

  it("rejects routes ending before the second choice", async () => {
    await replace(storyFile, "-> join_1", "-> END");
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
    await changeDate("milano_cafe_01", (date) => {
      date.apCost = -1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"apCost"[\s\S]*Too small: expected number to be >=0/);
  });

  it("requires the name variables expected by the runtime", async () => {
    await replace(
      storySourceFile("milano/sound_invitation_01"),
      'VAR player_name = ""',
      "// player name accidentally removed",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Missing required Ink variable: player_name",
    );
  });

  it("rejects relationship rewards attached to confession outcomes", async () => {
    for (const field of ["affectionDelta", "trustDelta", "sparkDelta"]) {
      // Each change starts again from the repository's file: one field at a time.
      await changeCatalogEntry<Record<string, unknown>>(fixture, "romance/effect_catalog.json", "effects", "milano_confession_accepted",
        (outcome) => { outcome[field] = 1; });
      await expect(buildContent(fixture, false)).rejects.toThrow(
        "Confession outcome cannot award relationship points",
      );
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
    await expect(buildContent(fixture, false)).rejects.toThrow(/Unrecognized key: .*requiredPlayedDateIds/);
  });

  it("rejects a normal date requiring another date", async () => {
    await changeDate("milano_cafe_01", (date) => {
      (date.requiredPlayedDateIds as string[]).push("milano_walk_01");
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Normal dates cannot require other dates",
    );
  });

  it("rejects a paid special event", async () => {
    await changeDate("milano_invitation_01", (date) => {
      expect(date.kind).toBe("special");
      date.apCost = 1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Special events must be free",
    );
  });

  it("rejects invalid confession readiness branches", async () => {
    await replace(
      storySourceFile("milano/sound_confession_01"),
      'confession_result == "accepted":',
      "true:",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Confession accepts before readiness",
    );
  });

  it("rejects missing outcome events in confession", async () => {
    await replace(
      storySourceFile("milano/sound_confession_01"),
      "# effect: milano_confession_accepted",
      "# effect: sound_invitation_01_1_1",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Confession must resolve exactly one outcome",
    );
  });

  it("rejects outcome effects in a normal date", async () => {
    const source = await readFile(path.join(fixture, storyFile), "utf8");
    const changed = source.replace("# effect: common_date_first_playful", "# effect: milano_confession_deferred");
    expect(changed).not.toBe(source);
    const compiled = compileInk(changed);
    const context = {
      effectIds: effects.map((effect) => effect.id),
      backgroundIds: Object.keys(presentation.backgrounds),
      emotionIds: Object.keys(presentation.emotions),
    };
    expect(() => validateStory(compiled, context, { choiceCount: 2, effectCount: 2, kind: "normal" }, {}, effects))
      .toThrow("Only confession can apply a confession outcome");
  });

  it("rejects duplicate city first-clear reward source IDs", async () => {
    await replace(
      "content/journeys/golden_triangle/cities/agra.json",
      '"agra_legacy_episode_placeholder"',
      '"delhi_legacy_episode_placeholder"',
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate reward source",
    );
  });

  it("still validates the example quiz, which is never played", async () => {
    await replace(
      quizSourceFile("milano_last_supper_b1_example"),
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
