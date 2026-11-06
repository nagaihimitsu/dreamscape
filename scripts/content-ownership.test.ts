import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { changeCatalogEntry, prepareContentFixture } from "../src/content/test-fixtures";
import { checkContentOwnership } from "./content-ownership";
import { buildContent } from "./content-pipeline";
import { loadContentSources } from "./content-sources";

let root: string;
const write = (relative: string, data: unknown) => {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data));
};
const manifest = (id: string, order: number, cities: string[]) =>
  write(`content/journeys/${id}/manifest.json`, { schemaVersion: 1, order, id, cities: cities.map((city) => ({ id: city })) });
const city = (layer: string, id: string, extra: Record<string, unknown> = {}, travel: Record<string, unknown> = {}) => {
  write(`${layer}/cities/${id}.json`, { id, ...extra });
  write(`${layer}/travel/${id}.json`, { cityId: id, places: [], events: [], ...travel });
  write(`${layer}/travel/${id}-settings.json`, {});
};
const mi = "content/journeys/milano";
const gt = "content/journeys/golden_triangle";
const uz = "content/journeys/uzbekistan";
const check = () => checkContentOwnership(loadContentSources(root));

/**
 * Core: the shared background and date effect. Milan (with its landmark and
 * story), Golden Triangle (Delhi) and Uzbekistan (Tashkent) each have their
 * own entries that use their own content and the core layer.
 */
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "dreamscape-ownership-"));
  manifest("milano", 10, ["milano"]);
  manifest("golden_triangle", 20, ["delhi", "agra"]);
  manifest("uzbekistan", 30, ["tashkent"]);
  city(mi, "milano");
  city(gt, "delhi", { arrivalStoryId: "arrivals/delhi", landmarkIdsPlanned: ["delhi_red_fort"] },
    { places: [{ id: "delhi_red_fort", cityId: "delhi", backgroundAssetId: "gt_bg_red_fort", landmarkIds: ["delhi_red_fort"] }],
      events: [{ id: "gt_delhi_episode", cityId: "delhi" }] });
  city(uz, "tashkent");
  write(`${mi}/tourism/catalog.json`, { schemaVersion: 1, assets: [{ id: "duomo_photo" }], landmarks: [{ id: "duomo", cityId: "milano" }] });
  write(`${gt}/tourism/catalog.json`, { schemaVersion: 1,
    assets: [{ id: "gt_img_red_fort" }],
    landmarks: [{ id: "delhi_red_fort", cityId: "delhi", imageAssetId: "gt_img_red_fort", guideStoryId: "tourism/gt_red_fort" }],
    clues: [{ id: "gt_clue", landmarkId: "delhi_red_fort", relatedQuestionIds: ["gt_question"] }] });
  write("content/romance/presentation.json", { schemaVersion: 1, backgrounds: { default_scene: {} }, memories: {} });
  write(`${mi}/romance/presentation.json`, { schemaVersion: 1, backgrounds: { milano_cafe: {} } });
  write(`${gt}/romance/presentation.json`, { schemaVersion: 1, backgrounds: { gt_bg_red_fort: { imageAssetId: "gt_img_red_fort" } } });
  write(`${uz}/romance/presentation.json`, { schemaVersion: 1, backgrounds: { uz_bg_registan: {} } });
  write("content/romance/effect_catalog.json", { schemaVersion: 1, effects: [{ id: "common_date_first_playful" }] });
  write(`${gt}/romance/effect_catalog.json`, { schemaVersion: 1, effects: [{ id: "gt_effect", memoryId: "gt_memory" }] });
  write(`${gt}/romance/date_catalog.json`, { schemaVersion: 1, dates: [{
    id: "gt_date", chapterId: "delhi", storyId: "dates/gt_date", backgroundAssetId: "default_scene",
    requiredCompletedChapters: ["delhi"], requiredCompletedEpisodeIds: ["gt_delhi_episode"],
  }] });
  write(`${gt}/progression/journey.json`, { schemaVersion: 1,
    episodes: [{ id: "gt_delhi_episode", cityId: "delhi", landmarkId: "delhi_red_fort", battleId: "gt_battle" }],
    rewards: [{ id: "gt_reward", episodeId: "gt_delhi_episode" }] });
  write(`${gt}/battles/catalog.json`, { schemaVersion: 1, battles: [{
    id: "gt_battle", landmarkId: "delhi_red_fort", storyId: "battles/gt_battle", quizId: "gt_quiz", backgroundAssetId: "gt_bg_red_fort",
  }] });
  write(`${gt}/learning/translations.json`, { schemaVersion: 1, questions: { gt_question: {} } });
  write(`${gt}/quizzes/gt_quiz.json`, { id: "gt_quiz", landmarkId: "delhi_red_fort", questions: [{ id: "gt_question" }] });
  write(`${mi}/stories/milano/cafe.ink`, "# background: milano_cafe\nHello\n");
  write(`${gt}/stories/dates/gt_date.ink`, "# background: default_scene\n* [Hi # effect: common_date_first_playful]\n* [Ho # effect: gt_effect]\n");
  write(`${gt}/stories/battles/gt_battle.ink`, "# background: gt_bg_red_fort\n");
  write(`${gt}/stories/tourism/gt_red_fort.ink`, "Guide\n");
  write(`${gt}/stories/arrivals/delhi.ink`, "Arrival\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("checkContentOwnership", () => {
  it("accepts journey folders that use their own content and the core layer", () => {
    expect(() => check()).not.toThrow();
  });

  it("leaves unknown IDs to the content pipeline", () => {
    write(`${gt}/romance/date_catalog.json`, { schemaVersion: 1, dates: [{
      id: "gt_date", chapterId: "nowhere", storyId: "dates/missing", backgroundAssetId: "missing_bg",
    }] });
    expect(() => check()).not.toThrow();
  });

  it("allows a journey's own cities only in its folder", () => {
    city(gt, "tashkent_copy");
    expect(() => check()).toThrow(
      "City file outside its journey: content/journeys/golden_triangle/cities/tashkent_copy.json " +
      "(tashkent_copy is not listed in content/journeys/golden_triangle/manifest.json)");
  });

  it("rejects entries that describe another layer's city, directly or through a landmark", () => {
    write(`${gt}/romance/date_destinations.json`, { schemaVersion: 1, destinations: [{ id: "gt_destination", cityId: "tashkent" }] });
    expect(() => check()).toThrow(
      'Content entry outside its layer\'s cities: content/journeys/golden_triangle/romance/date_destinations.json ' +
      'destinations["gt_destination"] cityId "tashkent" is a city of content/journeys/uzbekistan/cities/tashkent.json; ' +
      "content/journeys/golden_triangle/ may only describe the cities of its manifest (delhi, agra).");
    write(`${gt}/romance/date_destinations.json`, { schemaVersion: 1, destinations: [] });
    // A journey's own landmark placed in another journey's city also taints every entry that uses it.
    write(`${gt}/tourism/catalog.json`, { schemaVersion: 1, landmarks: [{ id: "gt_misplaced", cityId: "milano" }] });
    write(`${gt}/battles/catalog.json`, { schemaVersion: 1, battles: [{ id: "gt_battle", landmarkId: "gt_misplaced" }] });
    expect(() => check()).toThrow(
      'content/journeys/golden_triangle/battles/catalog.json battles["gt_battle"] landmarkId "gt_misplaced" (city) "milano" ' +
      "is a city of content/journeys/milano/cities/milano.json");
  });

  it("rejects references to another journey's content with both files", () => {
    write(`${gt}/romance/date_catalog.json`, { schemaVersion: 1, dates: [{ id: "gt_date", chapterId: "delhi", backgroundAssetId: "uz_bg_registan" }] });
    expect(() => check()).toThrow(
      'Reference to another layer: content/journeys/golden_triangle/romance/date_catalog.json dates["gt_date"] backgroundAssetId ' +
      '"uz_bg_registan" is the background defined in content/journeys/uzbekistan/romance/presentation.json; ' +
      "a journey folder may only refer to its own content and the core layer.");
  });

  it("keeps the core layer free of references to journey content and cities", () => {
    write("content/romance/presentation.json", { schemaVersion: 1, backgrounds: { default_scene: { imageAssetId: "gt_img_red_fort" } }, memories: {} });
    write("content/presentation/characters.json", { schemaVersion: 1, wardrobe: { cities: { delhi: {} } } });
    const error = (() => {
      try {
        check();
      } catch (caught) {
        return (caught as Error).message;
      }
    })();
    // Every violation is listed at once.
    expect(error?.split("\n")).toEqual([
      'Content entry outside its layer\'s cities: content/presentation/characters.json wardrobe.cities.delhi city ID "delhi" ' +
      "is a city of content/journeys/golden_triangle/cities/delhi.json; the core layer is shared by every journey and may not describe a city.",
      'Reference to another layer: content/romance/presentation.json backgrounds.default_scene imageAssetId "gt_img_red_fort" ' +
      "is the asset defined in content/journeys/golden_triangle/tourism/catalog.json; the core layer may only refer to core content.",
    ]);
  });

  it("checks Ink tags, translation keys, quiz, city and travel files of a journey", () => {
    write(`${uz}/romance/effect_catalog.json`, { schemaVersion: 1, effects: [{ id: "uz_effect" }] });
    write(`${uz}/quizzes/uz_quiz.json`, { id: "uz_quiz", landmarkId: "duomo", questions: [{ id: "uz_question" }] });
    write(`${gt}/stories/dates/gt_date.ink`, "# background: uz_bg_registan\n* [Hi # effect: uz_effect]\n");
    write(`${gt}/learning/translations.json`, { schemaVersion: 1, questions: { gt_question: {}, uz_question: {} } });
    city(gt, "agra", { nextCityId: "tashkent" }, { places: [{ id: "agra_fort", backgroundAssetId: "uz_bg_registan" }] });
    expect(() => check()).toThrow(new Error([
      'Reference to another layer: content/journeys/golden_triangle/learning/translations.json questions.uz_question question ID "uz_question" ' +
      "is the question defined in content/journeys/uzbekistan/quizzes/uz_quiz.json; a journey folder may only refer to its own content and the core layer.",
      'Content entry outside its layer\'s cities: content/journeys/golden_triangle/cities/agra.json nextCityId "tashkent" is a city of ' +
      "content/journeys/uzbekistan/cities/tashkent.json; content/journeys/golden_triangle/ may only describe the cities of its manifest (delhi, agra).",
      'Reference to another layer: content/journeys/golden_triangle/travel/agra.json places["agra_fort"] backgroundAssetId "uz_bg_registan" ' +
      "is the background defined in content/journeys/uzbekistan/romance/presentation.json; a journey folder may only refer to its own content and the core layer.",
      'Reference to another layer: content/journeys/uzbekistan/quizzes/uz_quiz.json landmarkId "duomo" is the landmark defined in ' +
      "content/journeys/milano/tourism/catalog.json; a journey folder may only refer to its own content and the core layer.",
      'Reference to another layer: content/journeys/golden_triangle/stories/dates/gt_date.ink #background "uz_bg_registan" is the background ' +
      "defined in content/journeys/uzbekistan/romance/presentation.json; a journey folder may only refer to its own content and the core layer.",
      'Reference to another layer: content/journeys/golden_triangle/stories/dates/gt_date.ink #effect "uz_effect" is the effect defined in ' +
      "content/journeys/uzbekistan/romance/effect_catalog.json; a journey folder may only refer to its own content and the core layer.",
    ].join("\n")));
  });

  it("checks each English-note question and the story it opens in the question's journey", () => {
    write(`${gt}/stories/learning/gt_english.ink`, "Note\n");
    write(`${uz}/stories/learning/uz_english.ink`, "Note\n");
    write(`${uz}/quizzes/uz_quiz.json`, { id: "uz_quiz", questions: [{ id: "uz_question" }] });
    write(`${uz}/learning/details.json`, { schemaVersion: 1, questions: { uz_question: { storyId: "learning/uz_english" } } });
    // Two journeys each provide details for their own questions, with their own stories.
    write(`${gt}/learning/details.json`, { schemaVersion: 1, questions: { gt_question: { storyId: "learning/gt_english" } } });
    expect(() => check()).not.toThrow();
    // Every question is checked on its own: one uses another journey's story, one is another journey's question.
    write(`${uz}/learning/details.json`, { schemaVersion: 1, questions: {} });
    write(`${gt}/learning/details.json`, { schemaVersion: 1, questions: {
      gt_question: { storyId: "learning/uz_english" }, uz_question: { storyId: "learning/gt_english" },
    } });
    expect(() => check()).toThrow(new Error([
      'Reference to another layer: content/journeys/golden_triangle/learning/details.json questions.gt_question storyId "learning/uz_english" ' +
      "is the story defined in content/journeys/uzbekistan/stories/learning/uz_english.ink; a journey folder may only refer to its own content and the core layer.",
      'Reference to another layer: content/journeys/golden_triangle/learning/details.json questions.uz_question question ID "uz_question" ' +
      "is the question defined in content/journeys/uzbekistan/quizzes/uz_quiz.json; a journey folder may only refer to its own content and the core layer.",
    ].join("\n")));
  });

  it("keeps cities, travel, stories, quizzes and journey catalogs out of the core layer", () => {
    city("content", "agra");
    write("content/stories/milano/walk.ink", "Walk\n");
    write("content/quizzes/milano_quiz.json", { id: "milano_quiz", questions: [] });
    write("content/romance/date_catalog.json", { schemaVersion: 1, dates: [{ id: "milano_date", chapterId: "milano" }] });
    const where = "cities, travel, stories, quizzes and journey catalogs belong in content/journeys/<journeyId>/.";
    expect(() => check()).toThrow(new Error([
      `Journey content in the core layer: content/cities/agra.json; ${where}`,
      `Journey content in the core layer: content/travel/agra.json; ${where}`,
      `Journey content in the core layer: content/travel/agra-settings.json; ${where}`,
      `Journey content in the core layer: content/stories/milano/walk.ink; ${where}`,
      `Journey content in the core layer: content/quizzes/milano_quiz.json; ${where}`,
      `Journey content in the core layer: content/romance/date_catalog.json; ${where}`,
      'Content entry outside its layer\'s cities: content/romance/date_catalog.json dates["milano_date"] chapterId "milano" ' +
      "is a city of content/journeys/milano/cities/milano.json; the core layer is shared by every journey and may not describe a city.",
    ].join("\n")));
  });

  it("checks a city's story background in its travel settings", () => {
    write(`${gt}/travel/delhi-settings.json`, { storyBackgroundAssetId: "uz_bg_registan" });
    expect(() => check()).toThrow(
      'Reference to another layer: content/journeys/golden_triangle/travel/delhi-settings.json storyBackgroundAssetId "uz_bg_registan" ' +
      "is the background defined in content/journeys/uzbekistan/romance/presentation.json; a journey folder may only refer to its own content and the core layer.");
    // The shared default is usable by every journey; Milan's cafe belongs to Milan.
    write(`${gt}/travel/delhi-settings.json`, { storyBackgroundAssetId: "default_scene" });
    expect(() => check()).not.toThrow();
    write(`${gt}/travel/delhi-settings.json`, { storyBackgroundAssetId: "milano_cafe" });
    expect(() => check()).toThrow(
      'Reference to another layer: content/journeys/golden_triangle/travel/delhi-settings.json storyBackgroundAssetId "milano_cafe" ' +
      "is the background defined in content/journeys/milano/romance/presentation.json; a journey folder may only refer to its own content and the core layer.");
  });
});

describe("content:build", () => {
  it("stops at a reference to another journey's content, naming both files", async () => {
    const fixture = mkdtempSync(path.join(tmpdir(), "dreamscape-ownership-build-"));
    try {
      await prepareContentFixture(fixture);
      await changeCatalogEntry(fixture, "romance/date_catalog.json", "dates", "gt_delhi_date_india_gate", (date: { backgroundAssetId: string }) => {
        date.backgroundAssetId = "uz_bg_samarkand_registan";
      });
      await expect(buildContent(fixture, false)).rejects.toThrow(
        'Reference to another layer: content/journeys/golden_triangle/romance/date_catalog.json dates["gt_delhi_date_india_gate"] ' +
        'backgroundAssetId "uz_bg_samarkand_registan" is the background defined in content/journeys/uzbekistan/romance/presentation.json');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
