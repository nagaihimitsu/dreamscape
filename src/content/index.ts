import wordData from "./generated/content/learning/word-meanings.json";
import { wordMeaningsSchema } from "./word-meanings";
import detailsData from "./generated/content/learning/details.json";
import { learningDetailsSchema } from "./learning-details";
import learningData from "./generated/content/learning/translations.json";
import { learningCatalogSchema } from "./learning-schema";
import battleData from "./generated/content/battles/catalog.json";
import journeyData from "./generated/content/progression/journey.json";
import { getAllRewardRules, journeySchema } from "./journey-schemas";
import tourismData from "./generated/content/tourism/catalog.json";
import { tourismCatalogSchema } from "./tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "./travel-schemas";
import generatedQuizzes from "./generated/quizzes.json";
import progressionData from "./generated/content/romance/progression.json";
import dateData from "./generated/content/romance/date_catalog.json";
import destinationData from "./generated/content/romance/date_destinations.json";
import { dateDestinationsSchema } from "./date-destinations";
import effectData from "./generated/content/romance/effect_catalog.json";
import responseProfileData from "./generated/content/romance/response_profiles.json";
import balanceData from "./generated/content/romance/balance.json";
import presentationData from "./generated/content/romance/presentation.json";
import dialogueExpressionData from "./generated/content/presentation/dialogue-expressions.json";
import dialogueReactionData from "./generated/content/presentation/dialogue-reactions.json";
import { dialogueReactionCatalogSchema } from "./dialogue-reactions";
import reasoningIntroData from "./generated/content/presentation/reasoning-intros.json";
import { reasoningIntroCatalogSchema } from "./reasoning-intros";
import { dialogueExpressionCatalogSchema } from "./dialogue-expressions";
import generatedStories from "./generated/stories.json";
import sceneConditionData from "./generated/scene-conditions.json";
import { sceneConditionsSchema } from "./condition-schemas";
import {
  battleCatalogSchema,
  quizSchema,
  type QuizDefinition,
  progressionSchema,
  balanceSchema,
  citySchema,
  dateCatalogSchema,
  effectCatalogSchema,
  responseProfileCatalogSchema,
  presentationSchema,
} from "./schemas";

export const wordMeanings = wordMeaningsSchema.parse(wordData).words;
export const learningDetails = learningDetailsSchema.parse(detailsData);
export const learningTranslations =
  learningCatalogSchema.parse(learningData).questions;
export const battles = battleCatalogSchema.parse(battleData).battles;
export const journeyConfig = journeySchema.parse(journeyData);
export const episodes = journeyConfig.episodes;
export const rewardRules = journeyConfig.rewards;
export const allRewardRules = getAllRewardRules(journeyConfig);
const tourism = tourismCatalogSchema.parse(tourismData);
export const landmarks = tourism.landmarks;
export const tourismAssets = tourism.assets;
export const tourismClues = tourism.clues;
// City files, including each unpublished prototype, are the single registration source.
// The content pipeline validates them and copies them into the generated mirror,
// so adding a city does not require a separate runtime list.
// Runtime content is imported only from ./generated/ (written by `npm run content:build`).
// No type argument on import.meta.glob: Vitest's file-system module cache leaves a
// module uncached only when its text contains "import.meta.glob(", and a cached
// copy would keep an old city list after a build adds or removes a city.
const cityFiles: Record<string, unknown> = import.meta.glob("./generated/content/cities/*.json", { eager: true, import: "default" });
const travelFiles: Record<string, unknown> = import.meta.glob("./generated/content/travel/*.json", { eager: true, import: "default" });
export type CityContent = {
  city: ReturnType<typeof citySchema.parse>;
  travel: ReturnType<typeof travelCatalogSchema.parse>;
  travelSettings: ReturnType<typeof travelSettingsSchema.parse>;
};
export const cityContents: Record<string, CityContent> = Object.create(null);
for (const [file, data] of Object.entries(cityFiles)) {
  const city = citySchema.parse(data);
  if (!file.endsWith(`/${city.id}.json`) || cityContents[city.id])
    throw new Error(`Invalid or duplicate city registration: ${file}`);
  const travel = travelCatalogSchema.parse(travelFiles[`./generated/content/travel/${city.id}.json`]);
  const travelSettings = travelSettingsSchema.parse(travelFiles[`./generated/content/travel/${city.id}-settings.json`]);
  if (travel.cityId !== city.id || !travel.places.some((place) => place.id === travelSettings.hotelPlaceId))
    throw new Error(`Invalid city travel registration: ${city.id}`);
  cityContents[city.id] = { city, travel, travelSettings };
}
export function getCities(): CityContent["city"][] {
  return Object.values(cityContents).map((content) => content.city);
}
export function getCityContent(cityId: string): CityContent {
  const content = cityContents[cityId];
  if (!content) throw new Error(`Unknown city: ${cityId}`);
  return content;
}
/**
 * The background a city's scenes start with: the city's own story background
 * (travel settings) when set, else the background of the place (or the hotel).
 */
export function getCityStoryBackground(cityId: string, placeId: string): string | undefined {
  const { travel, travelSettings } = getCityContent(cityId);
  return travelSettings.storyBackgroundId ?? (travel.places.find((place) => place.id === placeId) ??
    travel.places.find((place) => place.id === travelSettings.hotelPlaceId))?.backgroundId;
}
export const battleQuizzes: Record<string, QuizDefinition> = Object.fromEntries(
  Object.entries(generatedQuizzes).map(([id, quiz]) => [
    id,
    quizSchema.parse(quiz),
  ]),
);
export const progression = progressionSchema.parse(progressionData);
export const dates = dateCatalogSchema.parse(dateData).dates;
export const dateDestinations = dateDestinationsSchema.parse(destinationData).destinations;
export const effects = effectCatalogSchema.parse(effectData).effects;
export const responseProfiles = responseProfileCatalogSchema.parse(responseProfileData).profiles;
export const balance = balanceSchema.parse(balanceData);
export const presentation = presentationSchema.parse(presentationData);
export const dialogueReactions = dialogueReactionCatalogSchema.parse(dialogueReactionData);
export const dialogueExpressions = dialogueExpressionCatalogSchema.parse(dialogueExpressionData);
export const reasoningIntroductions: Record<string, string> = Object.fromEntries(
  reasoningIntroCatalogSchema.parse(reasoningIntroData).entries.map(({ battleId, storyId }) => [battleId, storyId]),
);
export const stories: Record<string, string> = generatedStories;
/** The scenes' `cond("…")` texts (per story) and the condition each text stands for (content:build, scripts/scene-conditions.ts). */
export const sceneConditions = sceneConditionsSchema.parse(sceneConditionData);
export const tagContext = {
  effectIds: effects.map((effect) => effect.id),
  backgroundIds: Object.keys(presentation.backgrounds),
  emotionIds: Object.keys(presentation.emotions),
};
export type {
  BattleDefinition,
  BattleReasoning,
  QuizDefinition,
  QuizQuestion,
  DateDefinition,
  EffectDefinition,
} from "./schemas";
export type {
  LandmarkDefinition,
  TourismAsset,
  TourismClue,
  ObservationRegion,
} from "./tourism-schemas";
export type { DateDestination } from "./date-destinations";
export type {
  EpisodeDefinition,
  StoryBattle,
  RewardRule,
  JourneyConfig,
} from "./journey-schemas";

export { encounters } from "./encounters";
