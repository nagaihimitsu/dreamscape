import { z } from "zod";
import wordData from "./generated/content/learning/word-meanings.json";
import { wordMeaningsSchema } from "./word-meanings";
import detailsData from "./generated/content/learning/details.json";
import { learningDetailsSchema } from "./learning-details";
import learningData from "./generated/content/learning/translations.json";
import { learningCatalogSchema } from "./learning-schema";
import localWordData from "./generated/content/learning/local-words.json";
import { localWordsCatalogSchema, type LocalWord } from "./local-words";
import battleData from "./generated/content/battles/catalog.json";
import journeyData from "./generated/content/progression/journey.json";
import { getAllRewardRules, journeySchema } from "./journey-schemas";
import tourismData from "./generated/content/tourism/catalog.json";
import { tourismCatalogSchema } from "./tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "./travel-schemas";
import sharedPartData from "./generated/shared-part.json";
import { bundledParts, partLoaders } from "./journey-part-files";
import generatedTours from "./generated/tours.json";
import { tourCatalogSchema, type Tour } from "./tour-schemas";
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
import { dialogueExpressionCatalogSchema } from "./dialogue-expressions";
import sceneConditionData from "./generated/scene-conditions.json";
import sceneData from "./generated/scenes.json";
import storyStateData from "./generated/content/progression/story.json";
import { generatedScenesSchema, storyStateCatalogSchema, type SceneEntry } from "./scene-schemas";
import albumImageData from "./generated/album-images.json";
import { albumImageListSchema, type AlbumImage } from "./album-images";
import miniGameArtData from "./generated/minigame-art.json";
import { miniGameArtListSchema, type MiniGameArt } from "../minigames/art";
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
/** The words of the countries visited, of every journey (learning/local-words.json; `# local_word:` teaches one). */
export const localWords: readonly LocalWord[] = localWordsCatalogSchema.parse(localWordData).words;
export const battles = battleCatalogSchema.parse(battleData).battles;
export const journeyConfig = journeySchema.parse(journeyData);
export const episodes = journeyConfig.episodes;
export const rewardRules = journeyConfig.rewards;
/** The scenes content:build listed (place files, one-scene files' heads, today's encounter catalogs; scene-schemas.ts). */
const generatedScenes = generatedScenesSchema.parse(sceneData);
export const scenes: readonly SceneEntry[] = generatedScenes.scenes;
/** The AP rules content:build made for the tags that give AP (`scene_tag`). */
export const sceneRewardRules = generatedScenes.rewards;
export const allRewardRules = getAllRewardRules(journeyConfig, sceneRewardRules);
/** The declared story state: flags, people and named conditions (progression/story.json). */
export const storyState = storyStateCatalogSchema.parse(storyStateData);
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
// A city's travel file (places, routes, events) comes with its journey's part (below).
const cityFiles: Record<string, unknown> = import.meta.glob("./generated/content/cities/*.json", { eager: true, import: "default" });
const settingsFiles: Record<string, unknown> = import.meta.glob("./generated/content/travel/*-settings.json", { eager: true, import: "default" });
export type CityContent = {
  city: ReturnType<typeof citySchema.parse>;
  travel: ReturnType<typeof travelCatalogSchema.parse>;
  travelSettings: ReturnType<typeof travelSettingsSchema.parse>;
};
/** The cities of the journeys whose content is loaded (loadJourneyContent below), by city ID. */
export const cityContents: Record<string, CityContent> = Object.create(null);
function registerCity(cityId: string, travelData: unknown): void {
  const city = citySchema.parse(cityFiles[`./generated/content/cities/${cityId}.json`]);
  if (city.id !== cityId || cityContents[city.id])
    throw new Error(`Invalid or duplicate city registration: ${cityId}`);
  const travel = travelCatalogSchema.parse(travelData);
  const travelSettings = travelSettingsSchema.parse(settingsFiles[`./generated/content/travel/${city.id}-settings.json`]);
  if (travel.cityId !== city.id || !travel.places.some((place) => place.id === travelSettings.hotelPlaceId))
    throw new Error(`Invalid city travel registration: ${city.id}`);
  cityContents[city.id] = { city, travel, travelSettings };
}
/** The loaded cities in the order of their IDs (whichever journey's part came first). */
export function getCities(): CityContent["city"][] {
  return Object.values(cityContents).map((content) => content.city).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
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
/** The quizzes of the journeys whose content is loaded, by quiz ID. */
export const battleQuizzes: Record<string, QuizDefinition> = Object.create(null);
/**
 * Every journey's tours (`tours/<tourId>.json`; tour design stage 2a). Fixture tours of the unit tests
 * are added here and removed again (src/dev/test-tours.ts), like the fixture cities.
 */
export const tours: Tour[] = tourCatalogSchema.parse(generatedTours);
/** The tours of a city, in file order. */
export function getCityTours(cityId: string): Tour[] {
  return tours.filter((tour) => tour.cityId === cityId);
}
export function getTour(tourId: string): Tour | undefined {
  return tours.find((tour) => tour.id === tourId);
}
export const progression = progressionSchema.parse(progressionData);
export const dates = dateCatalogSchema.parse(dateData).dates;
export const dateDestinations = dateDestinationsSchema.parse(destinationData).destinations;
export const effects = effectCatalogSchema.parse(effectData).effects;
export const responseProfiles = responseProfileCatalogSchema.parse(responseProfileData).profiles;
export const balance = balanceSchema.parse(balanceData);
export const presentation = presentationSchema.parse(presentationData);
export const dialogueReactions = dialogueReactionCatalogSchema.parse(dialogueReactionData);
export const dialogueExpressions = dialogueExpressionCatalogSchema.parse(dialogueExpressionData);
/** The compiled stories of the journeys whose content is loaded, by story ID. */
export const stories: Record<string, string> = Object.create(null);

/**
 * A journey's part of the content (content:build, scripts/content-outputs.ts journeyParts): the stories, quizzes and
 * cities' travel of its folder, the bulk of the content. A production build makes each part a file of its own that the
 * page loads when the journey opens (loadJourneyContent; src/app/JourneyContentGate.tsx), so the title and a journey
 * download no other journey's part. The core layer's part (normally empty) comes with the game.
 */
const journeyPartSchema = z.object({
  marker: z.string(),
  journeyId: z.string(),
  stories: z.record(z.string(), z.string()),
  quizzes: z.record(z.string(), z.unknown()),
  travel: z.record(z.string(), z.unknown()),
}).strict();
const loadedParts = new Set<string>();
function addJourneyPart(data: unknown, journeyId?: string): void {
  const part = journeyPartSchema.parse(data);
  if (journeyId !== undefined && part.journeyId !== journeyId) throw new Error(`Journey content mismatch: ${journeyId}`);
  if (loadedParts.has(part.journeyId)) return;
  for (const [id, quiz] of Object.entries(part.quizzes)) battleQuizzes[id] = quizSchema.parse(quiz);
  for (const [cityId, travel] of Object.entries(part.travel)) registerCity(cityId, travel);
  Object.assign(stories, part.stories);
  loadedParts.add(part.journeyId);
}
addJourneyPart(sharedPartData);
// The parts that come with the game: none in a production build, every one on the development server and in the unit
// tests (journey-part-files.ts), which then read any journey's content at once.
for (const data of Object.values(bundledParts)) addJourneyPart(data);
const partFile = (journeyId: string) => `./generated/journey-parts/${journeyId}.json`;
const pendingParts = new Map<string, Promise<void>>();
/** Whether the journey's content is loaded: its stories, quizzes and cities can be read. */
export function journeyContentLoaded(journeyId: string): boolean {
  return loadedParts.has(journeyId);
}
/**
 * Load the journey's content (once; a failed load can be tried again). Rejects for a journey without a part, and when
 * its file cannot be loaded (offline, or a newer version of the game replaced it on the server).
 */
export function loadJourneyContent(journeyId: string): Promise<void> {
  if (loadedParts.has(journeyId)) return Promise.resolve();
  const load = partLoaders[partFile(journeyId)];
  if (!load) return Promise.reject(new Error(`Unknown journey content: ${journeyId}`));
  let pending = pendingParts.get(journeyId);
  if (!pending) {
    pending = load().then((data) => addJourneyPart(data, journeyId)).finally(() => pendingParts.delete(journeyId));
    pendingParts.set(journeyId, pending);
  }
  return pending;
}
/** Load the content of every journey (Debug and the asset preview, which open any journey's scenes). */
export async function loadAllJourneyContent(): Promise<void> {
  await Promise.all(Object.keys(partLoaders).map((file) => loadJourneyContent(file.slice(file.lastIndexOf("/") + 1, -".json".length))));
}

/** The album's illustrations of every journey (content:build lists each journey's public/assets/album/; album-images.ts). */
export const albumImages: readonly AlbumImage[] = albumImageListSchema.parse(albumImageData);
/** The album image a line's `# photo:` or `# recall:` names, by its ID. */
export function getAlbumImage(imageId: string): AlbumImage | undefined {
  return albumImages.find((image) => image.id === imageId);
}
/** The scenes' `cond("…")` texts (per story) and the condition each text stands for (content:build, scripts/scene-conditions.ts). */
export const sceneConditions = sceneConditionsSchema.parse(sceneConditionData);
/** The mini-games' pictures of every layer (content:build lists each public/assets/minigames/; src/minigames/art.ts). */
export const miniGameArt: readonly MiniGameArt[] = miniGameArtListSchema.parse(miniGameArtData);
export const tagContext = {
  effectIds: effects.map((effect) => effect.id),
  backgroundIds: Object.keys(presentation.backgrounds),
  emotionIds: Object.keys(presentation.emotions),
  /** The images a line's `# photo:` and `# recall:` may name: the album images of every journey. */
  photoIds: albumImages.map((image) => image.id),
  localWordIds: localWords.map((word) => word.id),
  /** The people a line's `# speaker: <person ID>` may name (progression/story.json people of every journey). */
  personIds: storyState.people.map((person) => person.id),
  /** The pictures a # minigame:'s art.<slot> may name (ID → served path). */
  miniGameArt: Object.fromEntries(miniGameArt.map((image) => [image.id, image.path])) as Readonly<Record<string, string>>,
  /** The tourism photos a # minigame:'s backdrop slot may name (ID → served path; docs/13 2.12). */
  miniGamePhotos: Object.fromEntries(tourismAssets.map((asset) => [asset.id, asset.path])) as Readonly<Record<string, string>>,
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
export type { AlbumImage } from "./album-images";
export type { LocalWord } from "./local-words";
export type { Tour, TourStep, TourLeg, TourEventStep, TourOffer } from "./tour-schemas";
export type {
  EpisodeDefinition,
  StoryBattle,
  RewardRule,
  JourneyConfig,
} from "./journey-schemas";

export { encounters } from "./encounters";
