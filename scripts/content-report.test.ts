import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatJourneyContents,
  journeyContents,
  unknownJourneyFiles,
  unprefixedIds,
  UNPREFIXED_ID_EXCEPTIONS,
  unusedPublicFiles,
} from "./content-report";
import { contentSourcesFromTree, contentTreeFromFiles, loadContentSources } from "./content-sources";

// The build report works on loaded sources only: small content trees in
// memory (nothing below `root` exists), plus the repository's own content.

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const folder = (id: string) => `content/journeys/${id}`;
/** A journey folder with one city and, with a prefix, an authoring profile. */
function journey(id: string, order: number, cityId: string, prefix?: string): Record<string, string | null> {
  return {
    [`${folder(id)}/manifest.json`]: json({ schemaVersion: 1, order, id, status: "preparing", cities: [{ id: cityId, nameJa: "テスト市" }],
      ...(prefix ? { authoring: { eventPrefix: prefix } } : {}) }),
    [`${folder(id)}/cities/${cityId}.json`]: json({ id: cityId, firstClearReward: { rewardSourceId: `${prefix ?? id}_${cityId}_clear` } }),
    [`${folder(id)}/travel/${cityId}.json`]: json({ cityId, places: [], events: [] }),
    [`${folder(id)}/travel/${cityId}-settings.json`]: json({}),
  };
}
const load = (files: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, files));
const messages = (warnings: { message: string }[]) => warnings.map((warning) => warning.message);

describe("unknown files in journey folders", () => {
  it("names files that content:build neither reads nor serves, except notes", () => {
    const sources = load({
      ...journey("trip_a", 10, "a_city"),
      [`${folder("trip_a")}/README.md`]: null,
      [`${folder("trip_a")}/research/notes.md`]: null,
      [`${folder("trip_a")}/notes.txt`]: null,
      [`${folder("trip_a")}/tourism/spot.webp`]: null,
      [`${folder("trip_a")}/public/assets/tourism/spot.webp`]: null,
      "content/romance/notes.txt": null,
    });
    expect(messages(unknownJourneyFiles(sources))).toEqual([
      "Unknown file in a journey folder: content/journeys/trip_a/notes.txt (content:build reads only .json and .ink files " +
      "and serves public/assets/; keep notes as .md, images in public/assets/, other material in authoring/journeys/trip_a/)",
      `Unknown file in a journey folder: content/journeys/trip_a/tourism/spot.webp (content:build reads only .json and .ink files ` +
      "and serves public/assets/; keep notes as .md, images in public/assets/, other material in authoring/journeys/trip_a/)",
    ]);
  });
});

describe("unused public files", () => {
  it("names served files that neither content nor the code refers to", () => {
    const sources = load({
      ...journey("trip_a", 10, "a_city"),
      [`${folder("trip_a")}/manifest.json`]: json({ schemaVersion: 1, order: 10, id: "trip_a", cities: [{ id: "a_city" }],
        titleArt: { imagePath: "assets/title/trip_a.webp", captionJa: "旅" } }),
      [`${folder("trip_a")}/tourism/catalog.json`]: json({ schemaVersion: 1, assets: [{ id: "spot_photo", path: "assets/tourism/./spot.webp" }] }),
      [`${folder("trip_a")}/encounters/catalog.json`]: json({ schemaVersion: 1, items: [{ id: "ticket", iconPath: "assets/items/ticket.svg" }] }),
      [`${folder("trip_a")}/public/assets/tourism/spot.webp`]: null,
      [`${folder("trip_a")}/public/assets/tourism/spot.LICENSE.txt`]: null,
      [`${folder("trip_a")}/public/assets/title/trip_a.webp`]: null,
      [`${folder("trip_a")}/public/assets/items/ticket.svg`]: null,
      // The root public/: the game's code uses the effects and the default item icon; index.html links the browser icons.
      "public/assets/effects/heart.svg": null,
      "public/assets/items/item.svg": null,
      "public/assets/items/old_ticket.svg": null,
      "public/favicon-16.png": null,
    });
    expect(messages(unusedPublicFiles(sources))).toEqual([
      "Unused public file: public/assets/items/old_ticket.svg " +
      "(neither content nor the game's code refers to assets/items/old_ticket.svg; it would be published without being used)",
      "Unused public file: content/journeys/trip_a/public/assets/tourism/spot.LICENSE.txt " +
      "(neither content nor the game's code refers to assets/tourism/spot.LICENSE.txt; it would be published without being used)",
    ]);
  });
});

describe("journey ID prefixes", () => {
  const files = () => ({
    ...journey("trip_a", 10, "a_city", "ta"),
    // trip_b comes first in the merged catalogs; positions are those inside trip_a's files.
    ...journey("trip_b", 5, "b_city"),
    [`${folder("trip_a")}/cities/a_city.json`]: json({ id: "a_city", firstClearReward: { rewardSourceId: "a_city_clear" } }),
    [`${folder("trip_a")}/progression/journey.json`]: json({ schemaVersion: 1, episodes: [{ id: "ta_episode" }, { id: "episode_two" }] }),
    [`${folder("trip_a")}/romance/date_destinations.json`]: json({ schemaVersion: 1,
      destinations: [{ id: "a_city_garden" }, { id: "ta_garden" }] }),
    [`${folder("trip_a")}/romance/presentation.json`]: json({ schemaVersion: 1, backgrounds: { ta_bg: {}, garden_bg: {} } }),
    [`${folder("trip_a")}/quizzes/ta_quiz.json`]: json({ id: "ta_quiz", questions: [{ id: "ta_q1" }, { id: "q2" }] }),
    [`${folder("trip_a")}/stories/arrivals/a_city.ink`]: "Arrival\n",
    [`${folder("trip_a")}/stories/dates/ta_garden.ink`]: "Date\n",
    [`${folder("trip_a")}/stories/dates/garden.ink`]: "Date\n",
    // Journeys without authoring.eventPrefix (like Milan) are not checked.
    [`${folder("trip_b")}/progression/journey.json`]: json({ schemaVersion: 1, episodes: [{ id: "anything" }, { id: "more" }] }),
  });

  it("asks for the prefix on IDs and story names, and a city ID on places", () => {
    const convention = 'IDs of trip_a start with "ta_", its authoring.eventPrefix';
    expect(messages(unprefixedIds(load(files())))).toEqual([
      `ID without the journey prefix: content/journeys/trip_a/progression/journey.json episodes[1] "episode_two" (${convention})`,
      'ID without the journey prefix: content/journeys/trip_a/romance/date_destinations.json destinations[1] "ta_garden" ' +
      "(places of trip_a start with one of its city IDs (a_city_))",
      `ID without the journey prefix: content/journeys/trip_a/romance/presentation.json backgrounds "garden_bg" (${convention})`,
      'ID without the journey prefix: content/journeys/trip_a/stories/dates/garden.ink "dates/garden" ' +
      '(story file names of trip_a start with "ta_" or are a city ID)',
      `ID without the journey prefix: content/journeys/trip_a/quizzes/ta_quiz.json questions[1] "q2" (${convention})`,
      `ID without the journey prefix: content/journeys/trip_a/cities/a_city.json firstClearReward.rewardSourceId "a_city_clear" (${convention})`,
    ]);
  });

  it("skips the listed existing exceptions", () => {
    const sources = load({
      ...journey("luang_prabang", 10, "luang_prabang", "lpb"),
      [`${folder("luang_prabang")}/romance/presentation.json`]: json({ schemaVersion: 1, backgrounds: { luang_prabang_hotel_bg: {}, hotel_bg: {} } }),
    });
    expect(messages(unprefixedIds(sources)).map((message) => /"([^"]+)" \(/u.exec(message)?.[1])).toEqual(["hotel_bg"]);
  });
});

// Warnings never fail a test: content:build, the tests, CI and the deploy go
// on with them (docs/02). Only the exception list is kept current here, so an
// exception cannot outlive the ID it was made for.
describe("the repository's content", () => {
  const sources = loadContentSources(process.cwd());

  it("still needs every listed prefix exception", () => {
    const listed = Object.entries(UNPREFIXED_ID_EXCEPTIONS).flatMap(([journeyId, ids]) => ids.map((id) => `${journeyId}/${id}`)).sort();
    const saved = Object.fromEntries(Object.entries(UNPREFIXED_ID_EXCEPTIONS).map(([journeyId, ids]) => [journeyId, [...ids]]));
    const exceptions = UNPREFIXED_ID_EXCEPTIONS as Record<string, string[]>;
    try {
      for (const journeyId of Object.keys(exceptions)) exceptions[journeyId] = [];
      const found = new Set(unprefixedIds(sources).map((warning) => {
        const [, file, id] = /: content\/journeys\/([^/]+)\/.* "([^"]+)" \(/u.exec(warning.message)!;
        return `${file}/${id}`;
      }));
      // Other unprefixed IDs are warnings for their authors, not test failures.
      expect(listed.filter((exception) => !found.has(exception))).toEqual([]);
    } finally {
      Object.assign(exceptions, saved);
    }
  });
});

describe("what each journey provides", () => {
  it("counts each journey folder's files and catalog entries", () => {
    const sources = load({
      ...journey("trip_a", 10, "a_city", "ta"),
      ...journey("trip_b", 20, "b_city"),
      "content/romance/presentation.json": json({ schemaVersion: 1, backgrounds: { default_scene: {} }, memories: {} }),
      [`${folder("trip_a")}/romance/presentation.json`]: json({ schemaVersion: 1, backgrounds: { ta_bg: {}, ta_bg2: {} }, memories: { ta_memory: {} } }),
      [`${folder("trip_a")}/learning/translations.json`]: json({ schemaVersion: 1, questions: { ta_q1: {} } }),
      [`${folder("trip_a")}/presentation/characters.json`]: json({ schemaVersion: 1, wardrobe: { cities: { a_city: {} } } }),
      [`${folder("trip_a")}/quizzes/ta_quiz.json`]: json({ id: "ta_quiz", questions: [] }),
      [`${folder("trip_a")}/quizzes/ta_quiz.sample.json`]: json({ id: "ta_sample", questions: [] }),
      [`${folder("trip_a")}/stories/arrivals/a_city.ink`]: "Arrival\n",
      [`${folder("trip_a")}/public/assets/tourism/spot.webp`]: null,
    });
    expect(journeyContents(sources).map(formatJourneyContents)).toEqual([
      "Journey trip_a (preparing): cities 1, stories 1, quizzes 1, public files 1; translations 1, wardrobe cities 1, backgrounds 2, memories 1",
      "Journey trip_b (preparing): cities 1, stories 0, quizzes 0, public files 0",
    ]);
  });
});
