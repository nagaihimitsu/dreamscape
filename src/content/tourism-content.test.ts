import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import catalogData from "../../content/tourism/catalog.json";

let fixture: string;
const catalogPath = "content/tourism/catalog.json";
const guidePath = "content/stories/tourism/last_supper_guide.ink";
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-tourism-content-"));
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

async function changeCatalog(change: (data: typeof catalogData) => void) {
  const data = structuredClone(catalogData);
  change(data);
  await writeFile(path.join(fixture, catalogPath), JSON.stringify(data));
}
async function changeGuide(before: string, after: string) {
  const file = path.join(fixture, guidePath);
  const source = await readFile(file, "utf8");
  expect(source).toContain(before);
  await writeFile(file, source.replace(before, after));
}

describe("tourism content contract", () => {
  it("compiles one short guide, four visual discoveries and one unpositioned research card", async () => {
    const result = await buildContent(fixture);
    expect(result.routes).toBeGreaterThanOrEqual(105);
    expect(result.tourismGuides).toBe(result.tourism.landmarks.length);
    expect(
      result.tourism.clues.filter(
        (clue) => clue.landmarkId === "last_supper" && clue.kind === "hotspot",
      ),
    ).toHaveLength(4);
    expect(
      result.tourism.clues.filter(
        (clue) => clue.landmarkId === "last_supper" && clue.kind === "document",
      ),
    ).toEqual([
      expect.objectContaining({
        id: "last_supper_technique_card",
        region: null,
      }),
    ]);
    const story = new Story(
      result.stories[result.tourism.landmarks[0].guideStoryId],
    );
    story.variablesState.$("heroine_name", "紫乃");
    story.variablesState.$("player_address", "航さん");
    const lines: string[] = [];
    while (story.canContinue) lines.push(story.Continue() ?? "");
    expect(lines.join("\n")).toContain("紫乃");
    expect(lines.join("\n")).toContain("航さん");
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(story.currentChoices).toHaveLength(0);
  });

  it("requires image credits, a source, rights and a checked date", async () => {
    await changeCatalog((data) => {
      data.assets[0].licenseName = "";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeCatalog((data) => {
      data.assets[0].sourceUrl = "not-a-source";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeCatalog((data) => {
      data.assets[0].checkedAt = "unknown";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("rejects unsafe image paths and missing or non-image assets", async () => {
    await changeCatalog((data) => {
      data.assets[0].path = "../README.md";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeCatalog((data) => {
      data.assets[0].path = "assets/tourism/missing.webp";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeCatalog(() => {});
    await writeFile(
      path.join(fixture, "public", catalogData.assets[0].path),
      "not an image",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Invalid tourism image",
    );
  });

  it("rejects regions outside the image and zero-sized regions", async () => {
    await changeCatalog((data) => {
      data.clues[0].region!.x = 0.9;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "exceeds image bounds",
    );
    await changeCatalog((data) => {
      data.clues[0].region!.width = 0;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("keeps nonvisual research cards separate from image hotspots", async () => {
    await changeCatalog((data) => {
      data.clues[4].region = data.clues[0].region;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "document cards must not have one",
    );
    await changeCatalog((data) => {
      data.clues[0].region = null;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Hotspots need a region",
    );
  });

  it.each(["id", "factId"] as const)(
    "rejects duplicate clue %s",
    async (field) => {
      await changeCatalog((data) => {
        data.clues[1][field] = data.clues[0][field];
      });
      await expect(buildContent(fixture, false)).rejects.toThrow(
        "Duplicate tourism",
      );
    },
  );

  it("rejects unknown city, image, guide and battle references", async () => {
    for (const field of [
      "cityId",
      "imageAssetId",
      "guideStoryId",
      "battleId",
    ] as const) {
      await changeCatalog((data) => {
        data.landmarks[0][field] =
          field === "guideStoryId" ? "tourism/missing" : "missing";
      });
      await expect(buildContent(fixture, false)).rejects.toThrow();
    }
  });

  it("requires each clue to belong to its registered landmark", async () => {
    await changeCatalog((data) => {
      data.landmarks[0].clueIds.push("missing");
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown or mismatched tourism clue",
    );
    await changeCatalog((data) => {
      data.landmarks[0].clueIds.pop();
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unlisted tourism clue",
    );
    await changeCatalog((data) => {
      data.clues[0].landmarkId = "elsewhere";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown or mismatched tourism clue",
    );
  });

  it("checks related quiz question references without changing the quiz answers", async () => {
    await changeCatalog((data) => {
      data.clues[0].relatedQuestionIds = ["missing_question"];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown related tourism question",
    );
  });

  it("requires Japanese explanation text and a known claim classification", async () => {
    await changeCatalog((data) => {
      data.clues[0].descriptionJa = "Just look here.";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected Japanese tourism text",
    );
    await changeCatalog((data) => {
      data.clues[0].sources[0].claimType = "maybe_true";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeCatalog((data) => {
      data.clues[0].sources = [];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("requires guide variables needed for safe snapshot restoration", async () => {
    await changeGuide('VAR player_address = ""', "// removed variable");
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("forbids rewards, choices and non-Japanese prose in tourism guides", async () => {
    const original = await readFile(path.join(fixture, guidePath), "utf8");
    await writeFile(
      path.join(fixture, guidePath),
      original.replace(
        "-> END",
        "# effect: milano_cafe_first_joke\n余韻。\n-> END",
      ),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Tourism guide cannot grant effects",
    );
    await writeFile(
      path.join(fixture, guidePath),
      original.replace("-> END", "* [選ぶ]\n    次へ。\n-> END"),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Tourism guide cannot contain choices",
    );
    await writeFile(
      path.join(fixture, guidePath),
      original.replace("-> END", "Look at this painting.\n-> END"),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Tourism guide must be Japanese",
    );
  });
});
