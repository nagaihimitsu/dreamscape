import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture, replaceFixtureFile, storySourceFile } from "./test-fixtures";
import catalogData from "./generated/content/tourism/catalog.json";
import type { TourismCatalog } from "./tourism-schemas";
import { resolvePublicFile } from "../../scripts/public-assets";

let fixture: string;
const guidePath = storySourceFile("tourism/milano_last_supper_guide");
// The Last Supper landmark, its first clues and an image asset.
const assetId = "darsena_finale_photo";
const landmarkId = "last_supper";
const clueIds = ["last_supper_perspective", "last_supper_apostle_groups", "last_supper_technique_card"] as const;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-tourism-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

type Asset = TourismCatalog["assets"][number];
type Landmark = TourismCatalog["landmarks"][number];
type Clue = TourismCatalog["clues"][number];
/** Change one tourism entry, starting again from the repository's catalog. */
function changeEntry(key: "assets", id: string, change: (entry: Asset, catalog: TourismCatalog) => void): Promise<void>;
function changeEntry(key: "landmarks", id: string, change: (entry: Landmark, catalog: TourismCatalog) => void): Promise<void>;
function changeEntry(key: "clues", id: string, change: (entry: Clue, catalog: TourismCatalog) => void): Promise<void>;
function changeEntry(key: string, id: string, change: (entry: never, catalog: TourismCatalog) => void) {
  return changeCatalogEntry(fixture, "tourism/catalog.json", key, id, change);
}
const clue = (catalog: TourismCatalog, id: string) => catalog.clues.find((entry) => entry.id === id)!;
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
    // The current guide does not address the player in every scene, but the
    // user-selected name remains available to any line that uses it.
    expect(story.variablesState.$("player_address")).toBe("航さん");
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(story.currentChoices).toHaveLength(0);

  });

  it("requires image credits, a source, rights and a checked date", async () => {
    await changeEntry("assets", assetId, (asset) => {
      asset.licenseName = "";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"licenseName"[\s\S]*Too small: expected string to have >=1 characters/);
    await changeEntry("assets", assetId, (asset) => {
      asset.sourceUrl = "not-a-source";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"sourceUrl"[\s\S]*Invalid URL/);
    await changeEntry("assets", assetId, (asset) => {
      asset.checkedAt = "unknown";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"checkedAt"[\s\S]*Invalid ISO date/);
  });

  it("rejects image dimensions that disagree with the registered file", async () => {
    await changeEntry("assets", assetId, (asset) => {
      asset.width += 1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("Tourism image dimensions do not match");
  });

  it("rejects unsafe image paths and missing or non-image assets", async () => {
    await changeEntry("assets", assetId, (asset) => {
      asset.path = "../README.md";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/must match pattern \/\^assets/);
    await changeEntry("assets", assetId, (asset) => {
      asset.path = "assets/tourism/missing.webp";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("Missing public file: assets/tourism/missing.webp (searched public/ and content/journeys/milano/public/)");
    await changeEntry("assets", assetId, () => {});
    await replaceFixtureFile(
      resolvePublicFile(fixture, catalogData.assets.find((asset) => asset.id === assetId)!.path),
      "not an image",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Invalid tourism image",
    );
  });

  it("rejects regions outside the image and zero-sized regions", async () => {
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.region!.x = 0.9;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "exceeds image bounds",
    );
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.region!.width = 0;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"width"[\s\S]*Too small: expected number to be >0/);
  });

  it("keeps nonvisual research cards separate from image hotspots", async () => {
    await changeEntry("clues", clueIds[2], (card, catalog) => {
      card.region = clue(catalog, clueIds[0]).region;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "document cards must not have one",
    );
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.region = null;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Hotspots need a region",
    );
  });

  it.each(["id", "factId"] as const)(
    "rejects duplicate clue %s",
    async (field) => {
      await changeEntry("clues", clueIds[1], (second, catalog) => {
        second[field] = clue(catalog, clueIds[0])[field];
      });
      await expect(buildContent(fixture, false)).rejects.toThrow(
        "Duplicate tourism",
      );
    },
  );

  it("rejects unknown city, image, guide and battle references", async () => {
    for (const [field, message] of [
      ["cityId", "Unknown tourism city/landmark"],
      ["imageAssetId", "Unknown tourism imageAssetId: last_supper"],
      ["guideStoryId", "Unknown tourism guideStoryId: tourism/missing"],
      ["battleId", "Tourism battle landmark mismatch: last_supper"],
    ] as const) {
      await changeEntry("landmarks", landmarkId, (landmark) => {
        landmark[field] =
          field === "guideStoryId" ? "tourism/missing" : "missing";
      });
      await expect(buildContent(fixture, false)).rejects.toThrow(message);
    }
  });

  it("requires each clue to belong to its registered landmark", async () => {
    await changeEntry("landmarks", landmarkId, (landmark) => {
      landmark.clueIds.push("missing");
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown or mismatched tourism clue",
    );
    await changeEntry("landmarks", landmarkId, (landmark) => {
      landmark.clueIds.pop();
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unlisted tourism clue",
    );
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.landmarkId = "elsewhere";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown or mismatched tourism clue",
    );
  });

  it("checks related quiz question references without changing the quiz answers", async () => {
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.relatedQuestionIds = ["missing_question"];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown related tourism question",
    );
  });

  it("requires Japanese explanation text and a known claim classification", async () => {
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.descriptionJa = "Just look here.";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected Japanese tourism text",
    );
    await changeEntry("clues", clueIds[0], (clue) => {
      (clue.sources[0] as { claimType: string }).claimType = "maybe_true";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"claimType"[\s\S]*Invalid option/);
    await changeEntry("clues", clueIds[0], (clue) => {
      clue.sources = [];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"sources"[\s\S]*Too small: expected array to have >=1 items/);
  });

  it("requires guide variables needed for safe snapshot restoration", async () => {
    await changeGuide('VAR player_address = ""', "// removed variable");
    await expect(buildContent(fixture, false)).rejects.toThrow("(landmark last_supper): Missing tourism guide variable: player_address");
  });

  it("forbids rewards, choices and non-Japanese prose in tourism guides", async () => {
    const original = await readFile(path.join(fixture, guidePath), "utf8");
    await writeFile(
      path.join(fixture, guidePath),
      original.replace(
        "-> END",
        "# effect: common_date_first_playful\n余韻。\n-> END",
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
