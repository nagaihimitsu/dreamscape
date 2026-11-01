import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import catalogData from "../content/encounters/catalog.json";
import journeyData from "../content/progression/journey.json";
import tourismData from "../content/tourism/catalog.json";
import quizData from "../content/quizzes/last_supper_B1.json";
import effectsData from "../content/romance/effect_catalog.json";
import presentationData from "../content/romance/presentation.json";
import profileData from "../content/romance/response_profiles.json";
import { encounterCatalogSchema } from "../src/content/encounter-schemas";
import { journeySchema } from "../src/content/journey-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { quizSchema } from "../src/content/schemas";
import { validateItemReferences } from "../src/story/items";
import { compileInk, validateQuizEntries } from "./content-pipeline";
import { validateEncounterContent } from "./encounter-validation";

const catalog = encounterCatalogSchema.parse(catalogData);
const paths = catalog.encounters.flatMap((event) => [event.storyId, ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : [])]);
const sources = Object.fromEntries(paths.map((id) => [id, readFileSync(path.resolve(`content/stories/${id}.ink`), "utf8")]));
const stories = Object.fromEntries(Object.entries(sources).map(([id, source]) => [id, compileInk(source, `${id}.ink`)]));

function input() {
  const quiz = quizSchema.parse(quizData);
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
    const gift = data.catalog.encounters.find((event) => event.id === "galleria_gift")!;
    gift.options[0].giftItemId = "missing_item";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter item");
    gift.options[0].giftItemId = "galleria_souvenir";
    gift.options[0].requiresItemId = "galleria_ticket";
    expect(() => validateEncounterContent(data)).toThrow("matching requirement");
    gift.options[0].requiresItemId = "galleria_souvenir";
    data.catalog.encounters.find((event) => event.id === "galleria_cafe")!.completionItemId = "galleria_ticket";
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

    const cafe = data.catalog.encounters.find((event) => event.id === "galleria_cafe")!;
    const originalCompletion = cafe.completionItemId;
    cafe.completionItemId = "foreign_item";
    expect(() => validateEncounterContent(data)).toThrow("Encounter completion item city mismatch");
    cafe.completionItemId = originalCompletion;

    const gift = data.catalog.encounters.find((event) => event.id === "galleria_gift")!;
    for (const field of ["requiresItemId", "consumeItemId", "giftItemId"] as const) {
      const option = gift.options[0];
      const previous = option[field];
      option[field] = "foreign_item";
      expect(() => validateEncounterContent(data)).toThrow("Encounter item city mismatch");
      option[field] = previous;
    }

    const fortune = data.catalog.encounters.find((event) => event.id === "galleria_fortune")!;
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
    const gift = data.catalog.encounters.find((event) => event.id === "galleria_gift")!;
    delete gift.options[0].giftItemId;
    delete gift.options[1].giftItemId;
    expect(() => validateEncounterContent(data)).toThrow("Encounter item has no use in its city: galleria_souvenir/milano");
    gift.options[0].giftItemId = "galleria_souvenir";
    expect(() => validateEncounterContent(data)).not.toThrow();

    const outing = data.catalog.encounters.find((event) => event.id === "galleria_outing")!;
    delete outing.options[0].consumeItemId;
    expect(() => validateEncounterContent(data)).toThrow("Encounter item has no use in its city: galleria_ticket/milano");
    outing.options[0].consumeItemId = "galleria_ticket";
    expect(() => validateEncounterContent(data)).not.toThrow();
  });

  it("rejects wrong city, place, story, AP reward or response profile", () => {
    const data = input();
    const event = data.catalog.encounters.find((item) => item.id === "galleria_fortune")!;
    event.cityId = "missing_city";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter city");
    event.cityId = "milano";
    event.landmarkId = "missing_landmark";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter landmark");
    event.landmarkId = "galleria_vittorio_emanuele_ii";
    event.alternativeApRewardId = "missing_reward";
    expect(() => validateEncounterContent(data)).toThrow("Invalid encounter alternative reward");
    event.alternativeApRewardId = "victory_galleria_first";
    event.quiz!.wonStoryId = "encounters/missing";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter story");
    event.quiz!.wonStoryId = "encounters/galleria_quiz_won";
    data.catalog.encounters.find((item) => item.id === "galleria_gift")!.options[0].responseProfileId = "missing_profile";
    expect(() => validateEncounterContent(data)).toThrow("Unknown encounter response profile");
  });

  it("rejects repeatable paid choices, deferred effects and duplicate quiz questions", () => {
    const data = input();
    const fortune = data.catalog.encounters.find((event) => event.id === "galleria_fortune")!;
    fortune.options[0].costEuro = 4;
    expect(() => validateEncounterContent(data)).toThrow("Repeatable encounter must be a free quiz");
    fortune.options[0].costEuro = 0;
    const gift = data.catalog.encounters.find((event) => event.id === "galleria_gift")!;
    gift.options[2].costEuro = 1;
    expect(() => validateEncounterContent(data)).toThrow("Deferred encounter choice must have no cost or effects");
    gift.options[2].costEuro = 0;
    fortune.quiz!.question.id = Object.values(data.quizzes)[0].questions[0].id;
    expect(() => validateEncounterContent(data)).toThrow("Duplicate production quiz question ID");
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

  it("rejects an unsafe integer for the initial budget, cost or completion payment", () => {
    const initial = structuredClone(catalogData);
    initial.initialBudget = Number.MAX_SAFE_INTEGER + 1;
    expect(encounterCatalogSchema.safeParse(initial).success).toBe(false);

    const price = structuredClone(catalogData);
    price.encounters[0].options[0].costEuro = Number.MAX_SAFE_INTEGER + 1;
    expect(encounterCatalogSchema.safeParse(price).success).toBe(false);

    const reward = structuredClone(catalogData);
    reward.encounters[0].completionMoneyEuro = Number.MAX_SAFE_INTEGER + 1;
    expect(encounterCatalogSchema.safeParse(reward).success).toBe(false);
  });

  it("rejects mismatched English choices and Ink effects", () => {
    const data = input();
    const event = data.catalog.encounters.find((item) => item.id === "galleria_cafe")!;
    const source = sources[event.storyId];
    data.stories[event.storyId] = compileInk(source.replace("Two coffees, please.", "Something else, please."));
    expect(() => validateEncounterContent(data)).toThrow("Encounter choice does not match data");
    data.stories[event.storyId] = compileInk(source.replace("# speaker: narrator", `# effect: ${data.context.effectIds[0]}\n# speaker: narrator`));
    expect(() => validateEncounterContent(data)).toThrow("Encounter story cannot apply Ink effects");
  });

  it("rejects dynamic or unknown item queries and unrecognised statuses", () => {
    expect(validateItemReferences('EXTERNAL has_item_status(id, status)\n{has_item_status("galleria_souvenir", "gifted"): はい}', ["galleria_souvenir"])).toEqual(["galleria_souvenir"]);
    for (const call of ['has_item_status(item, "held")', 'has_item_status("unknown", "held")', 'has_item_status("galleria_souvenir", "sold")'])
      expect(() => validateItemReferences(call, ["galleria_souvenir"])).toThrow("known literal item and status");
  });
});
