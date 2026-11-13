import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { getAllRewardRules, journeySchema } from "../src/content/journey-schemas";
import { generatedScenesSchema } from "../src/content/scene-schemas";
import { balanceSchema, dateCatalogSchema, presentationSchema, progressionSchema, responseProfileCatalogSchema } from "../src/content/schemas";
import { tourCatalogSchema } from "../src/content/tour-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { errorText } from "./cli-error";
import { MIRROR_DIRECTORY } from "./content-layout";
import { formatJourneyBalance, journeyBalance, optionMatters, walkOptionPaths, type BalanceInput } from "./journey-balance";

// npm run balance:report -- [--journey <journeyId>] [--out <file>]: every source and sink of money, AP and the
// relationship values of a journey (all journeys without --journey), city by city, from the last content:build
// (src/content/generated/; the sample: content:build -- --with-sample). A developer tool for the balance pass
// (journey-balance.ts); it checks nothing. Markdown on the standard output, or into the --out file.
const usage = "使い方: npm run balance:report -- [--journey 旅行編ID] [--out 書き出すファイル]（先に npm run content:build）";
try {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const [flag, value] = [args[index], args[index + 1]];
    if ((flag !== "--journey" && flag !== "--out") || !value || value.startsWith("--") || options[flag]) throw new Error(usage);
    options[flag] = value;
  }
  const root = process.cwd();
  const generated = path.join(root, path.dirname(MIRROR_DIRECTORY));
  const read = (file: string): unknown => JSON.parse(readFileSync(path.join(generated, file), "utf8"));
  const catalog = journeyCatalogSchema.parse(read("content/journeys/catalog.json"));
  const journeys = options["--journey"] ? catalog.journeys.filter((journey) => journey.id === options["--journey"]) : catalog.journeys;
  if (!journeys.length) throw new Error(`最後の content:build に旅行編「${options["--journey"]}」がありません。登録されている旅行編: ${catalog.journeys.map((journey) => journey.id).join(", ")}`);
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
  const lines: string[] = [];
  for (const journey of journeys) {
    const cityIds = new Set(journey.cities.map((city) => city.id));
    const own = scenes.scenes.filter((scene) => cityIds.has(scene.cityId));
    // Only the scenes whose choices change money, AP or the relationship are walked for their choice points.
    const paths = Object.fromEntries(own.filter((scene) => scene.options.some(optionMatters) && stories[scene.story.storyId]).map((scene) =>
      [scene.id, walkOptionPaths({ compiled: stories[scene.story.storyId], start: scene.story.knot, conds: scene.conds,
        romance: scene.options.some((option) => option.profile), itemIds, memoryIds })]));
    const input: BalanceInput = {
      ...shared, journey, scenes: own, paths,
      cities: journey.cities.map(({ id }) => {
        const travel = travelCatalogSchema.parse(read(`content/travel/${id}.json`));
        const settings = travelSettingsSchema.parse(read(`content/travel/${id}-settings.json`));
        return { cityId: id, initialBudget: settings.initialBudget, hotelPlaceId: settings.hotelPlaceId, lodgingCost: settings.lodgingCost, rentals: settings.rentals,
          places: travel.places, events: travel.events, routes: travel.routes };
      }),
    };
    lines.push(...formatJourneyBalance(input, journeyBalance(input)), "");
  }
  const text = lines.join("\n");
  if (options["--out"]) {
    const file = path.resolve(root, options["--out"]);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    console.log(`書き出しました: ${file}`);
  } else console.log(text);
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
