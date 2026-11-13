import { readFileSync } from "node:fs";
import path from "node:path";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { getAllRewardRules, journeySchema } from "../src/content/journey-schemas";
import { generatedScenesSchema } from "../src/content/scene-schemas";
import { balanceSchema, dateCatalogSchema, presentationSchema, progressionSchema, responseProfileCatalogSchema } from "../src/content/schemas";
import { tourCatalogSchema } from "../src/content/tour-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { MIRROR_DIRECTORY } from "./content-layout";
import { optionMatters, walkOptionPaths, type BalanceInput } from "./journey-balance";

/**
 * The balance report's input for each journey of the last content:build (src/content/generated/; the sample after
 * content:build -- --with-sample), or for `journeyId` alone: read by `npm run balance:report` and by the tests that hold a
 * journey's budget to its rule (tests/journeys/golden_triangle/budget.test.ts). Throws a message for the person when the
 * journey is not in the build.
 */
export function balanceInputs(root: string, journeyId?: string): BalanceInput[] {
  const generated = path.join(root, path.dirname(MIRROR_DIRECTORY));
  const read = (file: string): unknown => JSON.parse(readFileSync(path.join(generated, file), "utf8"));
  const catalog = journeyCatalogSchema.parse(read("content/journeys/catalog.json"));
  const journeys = journeyId ? catalog.journeys.filter((journey) => journey.id === journeyId) : catalog.journeys;
  if (!journeys.length) throw new Error(`最後の content:build に旅行編「${journeyId}」がありません。登録されている旅行編: ${catalog.journeys.map((journey) => journey.id).join(", ")}`);
  const scenes = generatedScenesSchema.parse(read("scenes.json"));
  const stories = read("stories.json") as Record<string, string>;
  const progression = journeySchema.parse(read("content/progression/journey.json"));
  // The items only (the merged catalog keeps the encounters in their authoring form).
  const items = (read("content/encounters/catalog.json") as { items: { id: string; nameJa: string }[] }).items;
  const memoryIds = Object.keys(presentationSchema.parse(read("content/romance/presentation.json")).memories);
  const itemIds = items.map((item) => item.id);
  const shared = {
    tours: tourCatalogSchema.parse(read("tours.json")), episodes: progression.episodes, rewards: getAllRewardRules(progression, scenes.rewards),
    dates: dateCatalogSchema.parse(read("content/romance/date_catalog.json")).dates, romance: progressionSchema.parse(read("content/romance/progression.json")),
    profiles: responseProfileCatalogSchema.parse(read("content/romance/response_profiles.json")).profiles,
    apCap: balanceSchema.parse(read("content/romance/balance.json")).apCap, items,
  };
  return journeys.map((journey) => {
    const cityIds = new Set(journey.cities.map((city) => city.id));
    const own = scenes.scenes.filter((scene) => cityIds.has(scene.cityId));
    // Only the scenes whose choices change money, AP or the relationship are walked for their choice points.
    const paths = Object.fromEntries(own.filter((scene) => scene.options.some(optionMatters) && stories[scene.story.storyId]).map((scene) =>
      [scene.id, walkOptionPaths({ compiled: stories[scene.story.storyId], start: scene.story.knot, conds: scene.conds,
        romance: scene.options.some((option) => option.profile), itemIds, memoryIds })]));
    return {
      ...shared, journey, scenes: own, paths,
      cities: journey.cities.map(({ id }) => {
        const travel = travelCatalogSchema.parse(read(`content/travel/${id}.json`));
        const settings = travelSettingsSchema.parse(read(`content/travel/${id}-settings.json`));
        return { cityId: id, initialBudget: settings.initialBudget, hotelPlaceId: settings.hotelPlaceId, lodgingCost: settings.lodgingCost, rentals: settings.rentals,
          places: travel.places, events: travel.events, routes: travel.routes };
      }),
    };
  });
}
