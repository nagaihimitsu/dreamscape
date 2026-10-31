import wordData from "../../content/learning/word-meanings.json";
import { wordMeaningsSchema } from "./word-meanings";
import detailsData from "../../content/learning/details.json";
import { learningDetailsSchema } from "./learning-details";
import learningData from "../../content/learning/translations.json";
import { learningCatalogSchema } from "./learning-schema";
import battleData from "../../content/battles/catalog.json";
import journeyData from "../../content/progression/journey.json";
import { journeySchema } from "./journey-schemas";
import tourismData from "../../content/tourism/catalog.json";
import { tourismCatalogSchema } from "./tourism-schemas";
import generatedQuizzes from "./generated/quizzes.json";
import progressionData from "../../content/romance/progression.json";
import trialData from "../../content/romance/trial_progression.json";
import dateData from "../../content/romance/date_catalog.json";
import effectData from "../../content/romance/effect_catalog.json";
import cityData from "../../content/cities/milano.json";
import balanceData from "../../content/romance/balance.json";
import presentationData from "../../content/romance/presentation.json";
import generatedStories from "./generated/stories.json";
import {
  battleCatalogSchema,
  quizSchema,
  type QuizDefinition,
  progressionSchema,
  trialProgressionSchema,
  balanceSchema,
  citySchema,
  dateCatalogSchema,
  effectCatalogSchema,
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
const tourism = tourismCatalogSchema.parse(tourismData);
export const landmarks = tourism.landmarks;
export const tourismAssets = tourism.assets;
export const tourismClues = tourism.clues;
export const battleQuizzes: Record<string, QuizDefinition> = Object.fromEntries(
  Object.entries(generatedQuizzes).map(([id, quiz]) => [
    id,
    quizSchema.parse(quiz),
  ]),
);
export const progression = progressionSchema.parse(progressionData);
export const trialMilestones =
  trialProgressionSchema.parse(trialData).milestones;
export const dates = dateCatalogSchema.parse(dateData).dates;
export const effects = effectCatalogSchema.parse(effectData).effects;
export const city = citySchema.parse(cityData);
export const balance = balanceSchema.parse(balanceData);
export const presentation = presentationSchema.parse(presentationData);
export const stories: Record<string, string> = generatedStories;
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
export type {
  EpisodeDefinition,
  RewardRule,
  JourneyConfig,
} from "./journey-schemas";
