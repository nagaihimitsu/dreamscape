import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import dateData from "../../content/romance/date_catalog.json";
import battleData from "../../content/battles/catalog.json";
import tourismData from "../../content/tourism/catalog.json";
import { parseStoryTags } from "./tags";

let fixture: string;
const storyFile = "content/stories/milano/cafe_01.ink";
const dateFile = "content/romance/date_catalog.json";

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-content-"));
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
  it("rejects a registered but missing background image", async () => {
    const file = path.join(fixture, "content/romance/presentation.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.backgrounds.milano_cafe.imagePath = "assets/missing-background.png";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing background image: milano_cafe/assets/missing-background.png");
  });
  it("rejects an undefined character ID and a registered but missing image", async () => {
    const file = path.join(fixture, "content/presentation/characters.json");
    const data = JSON.parse(await readFile(file, "utf8"));
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
  it("compiles every declared scenario context and route", async () => {
    const result = await buildContent(fixture);
    expect(result.routes).toBe(
      dateData.dates.reduce(
        (sum, date) =>
          sum + 3 ** date.choiceCount * date.validationContexts.length,
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
      [
        "learning/english",
        ...dateData.dates.map((date) => date.storyId),
        ...battleData.battles.map((battle) => battle.storyId),
        ...tourismData.landmarks.map((landmark) => landmark.guideStoryId),
        ...result.journey.episodes.flatMap((episode) =>
          episode.epilogueStoryId ? [episode.epilogueStoryId] : [],
        ),
      ].sort(),
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

  it("rejects affection rewards attached to confession outcomes", async () => {
    const file = path.join(fixture, "content/romance/effect_catalog.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.effects.find(
      (effect: { id: string }) => effect.id === "milano_confession_accepted",
    ).affectionDelta = 1;
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Confession outcome cannot award affection",
    );
  });

  it("validates special events with one choice instead of demanding nine routes", async () => {
    const result = await buildContent(fixture, false);
    const invitation = result.dates.find((date) => date.kind === "special")!;
    expect(invitation.choiceCount).toBe(1);
    const story = new Story(result.stories[invitation.storyId]);
    while (story.canContinue) story.Continue();
    expect(story.currentChoices).toHaveLength(3);
  });

  it("rejects an unknown relationship prerequisite", async () => {
    await replace(
      "content/romance/progression.json",
      '"milano_walk_01"',
      '"unknown_date"',
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown stage prerequisite",
    );
  });

  it("rejects cyclic date prerequisites", async () => {
    await changeDates((data) => {
      data.dates[0].requiredPlayedDateIds = ["milano_walk_01"];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Cyclic date prerequisites",
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
