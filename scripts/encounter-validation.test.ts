import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import generatedCatalog from "../src/content/generated/content/encounters/catalog.json";
import journeyData from "../src/content/generated/content/progression/journey.json";
import tourismData from "../src/content/generated/content/tourism/catalog.json";
import generatedQuizzes from "../src/content/generated/quizzes.json";
import effectsData from "../src/content/generated/content/romance/effect_catalog.json";
import presentationData from "../src/content/generated/content/romance/presentation.json";
import profileData from "../src/content/generated/content/romance/response_profiles.json";
import { encounterCatalogSchema, normalizeEncounterCatalog, type EncounterCatalog } from "../src/content/encounter-schemas";
import { journeySchema } from "../src/content/journey-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { quizSchema } from "../src/content/schemas";
import { validateItemReferences } from "../src/story/items";
import { compileInk } from "./ink-validation";
import { validateQuizEntries } from "./quiz-validation";
import { validateEncounterContent } from "./encounter-validation";
import { zodIssues } from "../tests/fixtures/zod-issues";
import { loadContentSources, storyFile } from "./content-sources";

// These tests check the encounters of a catalog (encounters/catalog.json with one-scene stories) and Milan's items
// (cityId "milano", the city of input()); other journeys in the generated catalog (e.g. the sample journey) have their own cities.
// Milan's encounters became knots of its place files on 2026-11-13 (the Galleria wish the last, without its quiz and lottery), and
// the tests read them as test data in the catalog form they had until then (tests/fixtures/catalog-encounters/). The wish has the
// tests' own ID there (test_galleria_wish); here its lottery's prize is Milan's ticket again, as in that catalog.
const milanLandmarks = new Set(tourismCatalogSchema.parse(tourismData).landmarks.filter((landmark) => landmark.cityId === "milano").map((landmark) => landmark.id));
const FIXTURE = "tests/fixtures/catalog-encounters";
const WISH = "test_galleria_wish";
const fixtureEncounters = (JSON.parse(readFileSync(path.join(FIXTURE, "catalog.json"), "utf8")) as { encounters: EncounterCatalog["encounters"] }).encounters
  .map((event) => event.quiz ? { ...event, quiz: { ...event.quiz, rewardItemId: "galleria_ticket" } } : event);
// Milan writes every encounter of its catalog in full (cityId, sources), the shape of encounterCatalogSchema (a place file's
// scene in the generated catalog is the game's own record of it, without them: left out here).
const catalogData = {
  ...generatedCatalog,
  items: generatedCatalog.items.filter((item) => item.cityId === "milano"),
  encounters: [...generatedCatalog.encounters.filter((event) => milanLandmarks.has(event.landmarkId ?? "") && !event.storyId.includes(".")), ...fixtureEncounters],
} as EncounterCatalog;
const catalog = encounterCatalogSchema.parse(catalogData);
const paths = catalog.encounters.flatMap((event) => [event.storyId, ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : [])]);
const contentSources = loadContentSources(process.cwd());
const fixtureStory = (id: string) => path.join(FIXTURE, `${id}.ink`);
const sources = Object.fromEntries(paths.map((id) => [id, readFileSync(existsSync(fixtureStory(id)) ? fixtureStory(id) : storyFile(contentSources, id)!, "utf8")]));
const stories = Object.fromEntries(Object.entries(sources).map(([id, source]) => [id, compileInk(source, `${id}.ink`)]));

function input() {
  const quiz = quizSchema.parse(generatedQuizzes.milano_main_last_supper_quiz);
  return {
    catalog: encounterCatalogSchema.parse(structuredClone(catalogData)),
    cityId: "milano",
    landmarks: tourismCatalogSchema.parse(tourismData).landmarks,
    journey: journeySchema.parse(journeyData),
    stories: { ...stories },
    quizzes: { [quiz.id]: quiz },
    responseProfileIds: profileData.profiles.map((profile) => profile.id),
    memoryIds: Object.keys(presentationData.memories),
    context: { effectIds: effectsData.effects.map((effect) => effect.id), backgroundIds: Object.keys(presentationData.backgrounds), emotionIds: Object.keys(presentationData.emotions) },
    validateQuiz: validateQuizEntries,
  };
}

describe("journey currency rules", () => {
  it("takes amounts in the journey's currency (cost, completionMoney) and refuses the Euro-only names v14 removed", () => {
    type Loose = { encounters: Array<Record<string, unknown> & { options: Array<Record<string, unknown>> }> };
    const data = structuredClone(catalogData) as unknown as Loose;
    const eventIndex = data.encounters.findIndex((entry) => entry.options.some((option) => option.cost !== undefined));
    const event = data.encounters[eventIndex];
    const optionIndex = event.options.findIndex((option) => option.cost !== undefined);
    expect(eventIndex).toBeGreaterThanOrEqual(0);
    event.completionMoney = 3;
    expect(encounterCatalogSchema.safeParse(data).success).toBe(true);
    const old = structuredClone(data);
    old.encounters[eventIndex].options[optionIndex].costEuro = old.encounters[eventIndex].options[optionIndex].cost;
    delete old.encounters[eventIndex].options[optionIndex].cost;
    expect(() => encounterCatalogSchema.parse(old)).toThrow(zodIssues(
      { code: "unrecognized_keys", path: ["encounters", eventIndex, "options", optionIndex], keys: ["costEuro"] }));
    const oldPayment = structuredClone(data);
    oldPayment.encounters[eventIndex].completionMoneyEuro = 3;
    delete oldPayment.encounters[eventIndex].completionMoney;
    expect(() => encounterCatalogSchema.parse(oldPayment)).toThrow(zodIssues(
      { code: "unrecognized_keys", path: ["encounters", eventIndex], keys: ["completionMoneyEuro"] }));
  });
});

describe("encounter catalog fields", () => {
  it("refuses the `availability` field v14 removed: every encounter is met at its observation (decision 7)", () => {
    for (const value of ["tourism", "dormant"]) {
      const data = structuredClone(catalogData) as unknown as { encounters: Array<Record<string, unknown>> };
      data.encounters[0].availability = value;
      expect(() => encounterCatalogSchema.parse(data), value).toThrow(zodIssues(
        { code: "unrecognized_keys", path: ["encounters", 0], keys: ["availability"] }));
      expect(() => normalizeEncounterCatalog(data, tourismCatalogSchema.parse(tourismData).landmarks), value).toThrow(zodIssues(
        { code: "unrecognized_keys", path: ["encounters", 0], keys: ["availability"] }));
    }
  });
});

describe("encounter content validation", () => {
  it("validates every actual dialogue branch, outcome and inventory context", () => {
    expect(() => validateEncounterContent(input())).not.toThrow();
  });

  it("rejects duplicate stable event, item and choice IDs", () => {
    const data = input();
    data.catalog.encounters.push(structuredClone(data.catalog.encounters[0]));
    expect(() => validateEncounterContent(data)).toThrow("Duplicate encounter ID");
    data.catalog.encounters.pop();
    data.catalog.items.push(structuredClone(data.catalog.items[0]));
    expect(() => validateEncounterContent(data)).toThrow("Duplicate encounter item ID");
    data.catalog.items.pop();
    data.catalog.encounters[0].options[1].id = data.catalog.encounters[0].options[0].id;
    expect(() => validateEncounterContent(data)).toThrow("Duplicate encounter option ID");
  });

  it("rejects missing, mismatched and ambiguously awarded items", () => {
    const data = input();
    const gift = data.catalog.encounters.find((event) => event.id === "castello_pick")!;
    gift.options[0].giftItemId = "missing_item";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter item");
    gift.options[0].giftItemId = "blue_pick";
    gift.options[0].requiresItemId = "galleria_ticket";
    expect(() => validateEncounterContent(data)).toThrow("matching requirement");
    gift.options[0].requiresItemId = "blue_pick";
    // The ticket's source is the wish's quiz; a second source would make the award ambiguous.
    data.catalog.encounters.find((event) => event.id === "duomo_string")!.completionItemId = "galleria_ticket";
    expect(() => validateEncounterContent(data)).toThrow("Duplicate encounter item source");
  });

  it("requires a known item city and rejects cross-city grants and choices", () => {
    const data = input();
    const missingCity = { ...data.catalog.items[0], cityId: "unregistered_city" };
    data.catalog.items.push(missingCity);
    missingCity.id = "unregistered_item";
    expect(() => validateEncounterContent(data)).toThrow("Unknown item city: unregistered_item/unregistered_city");
    data.catalog.items.pop();

    // A second city exists only in this test fixture; production still has one.
    data.journey.episodes.push({ ...data.journey.episodes[0], id: "fixture_episode", cityId: "fixture_city" });
    data.catalog.items.push({ id: "foreign_item", cityId: "fixture_city", nameJa: "別の街の品", descriptionJa: "別の街で入手する品。" });

    const giver = data.catalog.encounters.find((event) => event.id === "duomo_string")!;
    const originalCompletion = giver.completionItemId;
    giver.completionItemId = "foreign_item";
    expect(() => validateEncounterContent(data)).toThrow("Encounter completion item city mismatch");
    giver.completionItemId = originalCompletion;

    const gift = data.catalog.encounters.find((event) => event.id === "castello_pick")!;
    for (const field of ["requiresItemId", "consumeItemId", "giftItemId"] as const) {
      const option = gift.options[0];
      const previous = option[field];
      option[field] = "foreign_item";
      expect(() => validateEncounterContent(data)).toThrow("Encounter item city mismatch");
      option[field] = previous;
    }

    const fortune = data.catalog.encounters.find((event) => event.id === WISH)!;
    fortune.quiz!.rewardItemId = "foreign_item";
    expect(() => validateEncounterContent(data)).toThrow("Encounter quiz item city mismatch");
  });

  it("requires the item city field", () => {
    const { cityId: _city, ...itemWithoutCity } = catalogData.items[0];
    const broken = { ...catalogData, items: [itemWithoutCity, ...catalogData.items.slice(1)] };
    expect(encounterCatalogSchema.safeParse(broken).success).toBe(false);
  });

  it("requires each item to have a gift or use opportunity in its city", () => {
    const data = input();
    for (const id of ["blue_pick", "galleria_ticket"]) {
      const uses = data.catalog.encounters.flatMap((event) => event.options.flatMap((option) =>
        (["giftItemId", "consumeItemId"] as const).filter((field) => option[field] === id).map((field) => ({ option, field }))));
      expect(uses.length).toBeGreaterThan(0);
      for (const { option, field } of uses) delete option[field];
      // Only an item that may be left behind needs a use (the item design §2.5): one not carried, in a city with a next city.
      expect(() => validateEncounterContent({ ...data, hasNextCity: true })).toThrow(`Encounter item has no use in its city: ${id}/milano`);
      expect(() => validateEncounterContent(data)).not.toThrow();
      const item = data.catalog.items.find((entry) => entry.id === id)!;
      expect(() => validateEncounterContent({ ...data, hasNextCity: true, catalog: { ...data.catalog,
        items: data.catalog.items.map((entry) => entry === item ? { ...entry, carry: "journey" as const } : entry) } })).not.toThrow();
      for (const { option, field } of uses) option[field] = id;
      expect(() => validateEncounterContent(data)).not.toThrow();
    }
  });

  it("requires each item to have a source (a completion item or a quiz prize)", () => {
    const data = input();
    const giver = data.catalog.encounters.find((event) => event.completionItemId === "blue_pick")!;
    delete giver.completionItemId;
    expect(() => validateEncounterContent(data)).toThrow("Encounter item has no source: blue_pick");
    giver.completionItemId = "blue_pick";
    expect(() => validateEncounterContent(data)).not.toThrow();
  });

  it("rejects wrong city, place, story, AP reward or response profile", () => {
    const data = input();
    const event = data.catalog.encounters.find((item) => item.id === WISH)!;
    event.cityId = "missing_city";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter city");
    event.cityId = "milano";
    event.landmarkId = "missing_landmark";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter landmark");
    event.landmarkId = "galleria_vittorio_emanuele_ii";
    event.alternativeApRewardId = "missing_reward";
    expect(() => validateEncounterContent(data)).toThrow("Invalid encounter alternative reward");
    event.alternativeApRewardId = "victory_galleria_first";
    const originalWonStoryId = event.quiz!.wonStoryId;
    event.quiz!.wonStoryId = "encounters/missing";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter story");
    event.quiz!.wonStoryId = originalWonStoryId;
    data.catalog.encounters.find((item) => item.id === "castello_pick")!.options[0].responseProfileId = "missing_profile";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter response profile");
  });

  it("allows a repeated paid choice and a paid 「また今度」 (rev. 5), but no item on a 「また今度」 of a catalog, and duplicate quiz questions", () => {
    const data = input();
    const fortune = data.catalog.encounters.find((event) => event.id === WISH)!;
    fortune.options[0].cost = 4;
    expect(() => validateEncounterContent(data)).not.toThrow();
    fortune.options[0].cost = 0;
    const gift = data.catalog.encounters.find((event) => event.id === "castello_pick")!;
    expect(gift.options[2].deferCompletion).toBe(true);
    gift.options[2].cost = 1;
    expect(() => validateEncounterContent(data)).not.toThrow();
    gift.options[2].cost = 0;
    // Today's catalog records a given item only for a completed encounter: a 「また今度」 cannot give one (the save would break).
    gift.options[2].requiresItemId = gift.options[0].requiresItemId ?? data.catalog.items[0].id;
    gift.options[2].giftItemId = gift.options[2].requiresItemId;
    expect(() => validateEncounterContent(data)).toThrow("cannot need or give an item");
    delete gift.options[2].requiresItemId;
    delete gift.options[2].giftItemId;
    fortune.quiz!.question.id = Object.values(data.quizzes)[0].questions[0].id;
    expect(() => validateEncounterContent(data)).toThrow("Duplicate production quiz question ID");
  });

  it("allows a repeatable conversation sharing an AP reward, with item, money and choice effects too (rev. 5)", () => {
    const data = input();
    const event = data.catalog.encounters.find((item) => item.id === WISH)!;
    expect(event.repeatable).toBe(true);
    expect(event.quiz?.chancePercent).toBe(25);
    expect(event.alternativeApRewardId).toBe("victory_galleria_first");
    expect(() => validateEncounterContent(data)).not.toThrow();
    for (const change of [
      () => { event.options[0].cost = 1; },
      () => { event.options[0].requiresItemId = "blue_pick"; },
      () => { event.options[0].responseProfileId = "honest"; },
      () => { event.completionMoney = 1; },
      () => { event.completionItemId = "blue_pick"; },
    ]) {
      const snapshot = structuredClone(event);
      change();
      // The rule against a repeated encounter's effects is gone; what the change breaks otherwise (its story, its items) still stops.
      expect(() => validateEncounterContent(data)).not.toThrow("Repeatable encounter");
      Object.keys(event).forEach((key) => { delete (event as Record<string, unknown>)[key]; });
      Object.assign(event, snapshot);
    }
  });

  it("requires valid sources and an actual correct option", () => {
    const broken = structuredClone(catalogData);
    broken.encounters[0].sources[0].url = "not-a-source";
    expect(encounterCatalogSchema.safeParse(broken).success).toBe(false);
    const data = input();
    const question = data.catalog.encounters.find((event) => event.quiz)!.quiz!.question;
    question.options[1].id = question.options[0].id;
    expect(() => validateEncounterContent(data)).toThrow("Duplicate quiz option ID");
  });

  it("rejects an unsafe integer for a cost or completion payment", () => {
    const price = structuredClone(catalogData);
    price.encounters[0].options[0].cost = Number.MAX_SAFE_INTEGER + 1;
    expect(encounterCatalogSchema.safeParse(price).success).toBe(false);

    const reward = structuredClone(catalogData);
    reward.encounters[0].completionMoney = Number.MAX_SAFE_INTEGER + 1;
    expect(encounterCatalogSchema.safeParse(reward).success).toBe(false);
  });

  it("takes English choices from Ink, rejects an option textEn that differs from its Ink choice, and rejects Ink effects", () => {
    const data = input();
    const event = data.catalog.encounters.find((item) => item.id === "galleria_print")!;
    const source = sources[event.storyId];
    expect(source).toContain("Show us a fresh print, please.");
    data.stories[event.storyId] = compileInk(source.replace("Show us a fresh print, please.", "Something else, please."));
    expect(() => validateEncounterContent(data)).not.toThrow();
    event.options[0].textEn = "Show us a fresh print, please.";
    expect(() => validateEncounterContent(data)).toThrow("Encounter choice does not match data");
    delete event.options[0].textEn;
    data.stories[event.storyId] = compileInk(source.replace("# speaker: narrator", `# effect: ${data.context.effectIds[0]}\n# speaker: narrator`));
    expect(() => validateEncounterContent(data)).toThrow("Encounter story cannot apply Ink effects");
  });

  it("accepts English-only lines and any number of choices (decisions 28 and 41), and warns once about a translation without Japanese", () => {
    const data = input();
    const event = data.catalog.encounters.find((item) => item.id === "galleria_print")!;
    const source = sources[event.storyId];
    // A narrator's line in English only does not stop the build.
    const english = source.replace(/ガッレリアで架空の出店[^\n]+/u, "A small stall shows a hand press in the Galleria.");
    data.stories[event.storyId] = compileInk(english);
    expect(() => validateEncounterContent(data)).not.toThrow();
    // Two choices in the story and two options in the catalog (the sample choice left out).
    const two = source.replace(/\* \[Can we look at the sample\?[\s\S]*?-> END\n/u, "");
    data.stories[event.storyId] = compileInk(two);
    event.options = event.options.filter((option) => option.id !== "sample");
    expect(() => validateEncounterContent(data)).not.toThrow();
    // Story and catalog must still name the same choices.
    data.stories[event.storyId] = compileInk(source);
    expect(() => validateEncounterContent(data)).toThrow("Encounter choices differ from its catalog options: 3 in the story, 2 in the catalog");
    // A translation without Japanese is reported once (data-language), however many contexts the check walks.
    const warnings: { kind: string; message: string }[] = [];
    data.stories[event.storyId] = compileInk(two.replace("# translation: 刷りたてを見せてください。", "# translation: A fresh print, please."));
    expect(() => validateEncounterContent({ ...data, onWarning: (warning) => warnings.push(warning) })).not.toThrow();
    expect(warnings).toEqual([{ kind: "data-language",
      message: "`# translation:` に日本語がありません：encounters/milano_galleria_print の選択肢「Show us a fresh prin…」。選択肢の訳として、そのまま出ます（止めません）。" }]);
  });

  it("rejects dynamic or unknown item queries and unrecognised statuses", () => {
    expect(validateItemReferences('EXTERNAL has_item_status(id, status)\n{has_item_status("blue_pick", "gifted"): はい}', ["blue_pick"])).toEqual(["blue_pick"]);
    for (const call of ['has_item_status(item, "held")', 'has_item_status("unknown", "held")', 'has_item_status("blue_pick", "sold")'])
      expect(() => validateItemReferences(call, ["blue_pick"])).toThrow("known literal item and status");
  });
});
