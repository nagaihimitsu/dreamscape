import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { citySchema, battleCatalogSchema, dateCatalogSchema, presentationSchema, quizSchema } from "../src/content/schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { journeySchema } from "../src/content/journey-schemas";
import type { Journey } from "../src/content/journey-catalog";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { learningCatalogSchema, questionSource } from "../src/content/learning-schema";
import { journeyCatalogOf, loadContentSources, parseCatalog, requireCity } from "./content-sources";
import { servedFile } from "./public-assets";

/** Report from real catalog entries; no additional hand-maintained content list. */
export type JourneyReadinessInput = {
  journey: z.infer<typeof journeySchema>;
  trip: Journey;
  cities: Array<{
    city: z.infer<typeof citySchema>;
    travel: z.infer<typeof travelCatalogSchema>;
    settings: z.infer<typeof travelSettingsSchema>;
  }>;
  tourism: z.infer<typeof tourismCatalogSchema>;
  backgrounds: z.infer<typeof presentationSchema>["backgrounds"];
  dates: z.output<typeof dateCatalogSchema>["dates"];
  destinations: z.infer<typeof dateDestinationsSchema>["destinations"];
  battles: z.infer<typeof battleCatalogSchema>["battles"];
  quizzes: Array<z.infer<typeof quizSchema>>;
  translations: z.infer<typeof learningCatalogSchema>["questions"];
  storyExists: (id: string) => boolean;
  assetExists: (assetPath: string) => boolean;
};

export type JourneyReadinessIssue = { code: string; detail: string };
export type JourneyEventReadiness = { id: string; cityId: string; category: "main" | "date"; placeId: string; issues: JourneyReadinessIssue[] };
export type JourneyCityReadiness = { cityId: string; events: JourneyEventReadiness[]; issues: JourneyReadinessIssue[] };
export type JourneyReadinessReport = { journeyId: string; ready: boolean; readyForPromotion: boolean; issues: JourneyReadinessIssue[]; cities: JourneyCityReadiness[] };

/** Check actual authored references and binaries, not a manually maintained ready flag. */
export function inspectJourneyReadiness(input: JourneyReadinessInput): JourneyReadinessReport {
  const issues: JourneyReadinessIssue[] = [];
  const problem = (list: JourneyReadinessIssue[], code: string, detail: string) => { list.push({ code, detail }); };
  const { trip } = input;
  if (!trip.cityPlan) throw new Error("Journey plan is missing");
  if (trip.status !== "available") problem(issues, "journey_unavailable", "旅行編は準備中です。");
  const seenEventIds = new Set<string>();
  const seenPlaceIds = new Set<string>();
  const checkImage = (backgroundId: string, list: JourneyReadinessIssue[], allowNeutral = false) => {
    const background = input.backgrounds[backgroundId];
    if (!background) return problem(list, "background_missing", `背景が未登録: ${backgroundId}`);
    // The hotel is fictional: a neutral background avoids implying a real
    // building or falsely attributing a public landmark photo to it.
    if (allowNeutral && background.fallback === "neutral" && !background.imageAssetId && !background.imagePath) return;
    const asset = input.tourism.assets.find((entry) => entry.id === background.imageAssetId);
    if (!asset || asset.isPlaceholder || !input.assetExists(asset.path))
      problem(list, "image_missing", `画像・出典台帳・実ファイルが未完成: ${backgroundId}`);
  };
  const checkBattle = (battleId: string, landmarkId: string | null, cityId: string, list: JourneyReadinessIssue[]) => {
    const battle = input.battles.find((item) => item.id === battleId);
    if (!battle) return problem(list, "battle_missing", `バトル定義が未登録: ${battleId}`);
    if (landmarkId === null ? battle.scope !== "city_finale" || battle.cityId !== cityId : battle.landmarkId !== landmarkId)
      problem(list, "battle_owner_mismatch", `バトルの都市・観光地が不一致: ${battleId}`);
    if (!input.storyExists(battle.storyId)) problem(list, "battle_story_missing", `バトル脚本が未登録: ${battle.storyId}`);
    const quiz = input.quizzes.find((item) => item.id === battle.quizId);
    if (!quiz) problem(list, "quiz_missing", `クイズが未登録: ${battle.quizId}`);
    else if (landmarkId === null ? quiz.scope !== "city_finale" || quiz.cityId !== cityId : quiz.landmarkId !== landmarkId)
      problem(list, "quiz_owner_mismatch", `クイズの都市・観光地が不一致: ${battle.quizId}`);
    if (quiz) for (const question of quiz.questions) {
      const translation = input.translations[question.id];
      if (!translation) problem(list, "quiz_translation_missing", `クイズの和訳が未登録: ${question.id}`);
      else if (!isDeepStrictEqual(translation.source, questionSource(question)))
        problem(list, "quiz_translation_mismatch", `クイズと和訳元文が不一致: ${question.id}`);
    }
  };
  const cities = trip.cities.map(({ id: cityId }) => {
    const cityIssues: JourneyReadinessIssue[] = [];
    const content = input.cities.find((item) => item.city.id === cityId);
    if (!content) {
      problem(cityIssues, "city_missing", `都市データが未登録: ${cityId}`);
      return { cityId, issues: cityIssues, events: [] };
    }
    const { city, travel, settings } = content;
    if (city.productionStatus !== "complete") problem(cityIssues, "city_incomplete", `都市は制作中: ${cityId}`);
    if (city.id !== travel.cityId || !travel.places.some((place) => place.id === settings.hotelPlaceId))
      problem(cityIssues, "travel_owner_mismatch", `都市・滞在先が不一致: ${cityId}`);
    if (settings.lodgingCost !== trip.cityPlan!.lodgingCost) problem(cityIssues, "lodging_mismatch", `宿泊費が旅行編の設定と不一致: ${cityId}`);
    for (const place of travel.places) {
      if (place.cityId !== cityId || seenPlaceIds.has(place.id)) problem(cityIssues, "place_mismatch", `地点の都市・IDが不正: ${place.id}`);
      seenPlaceIds.add(place.id);
      if (place.id === settings.hotelPlaceId) checkImage(place.backgroundAssetId, cityIssues, true);
    }
    const specialIds = new Set(input.journey.storyBattles.filter((entry) => {
      const battle = input.battles.find((item) => item.id === entry.battleId);
      return !!battle?.landmarkId && input.tourism.landmarks.some((landmark) => landmark.id === battle.landmarkId && landmark.cityId === cityId);
    }).map((entry) => entry.battleId));
    const finales = input.journey.episodes.filter((episode) => episode.cityId === cityId && episode.kind === "city_finale");
    const mainEvents = travel.events.filter((event) => event.category === "main" && !specialIds.has(event.id) && !finales.some((finale) => finale.id === event.id));
    for (const specialId of specialIds) {
      if (!travel.events.some((event) => event.category === "main" && event.id === specialId))
        problem(cityIssues, "special_event_missing", `特殊戦の地点が未登録: ${specialId}`);
    }
    for (const category of ["main", "date"] as const) {
      const expected = category === "main" ? trip.cityPlan!.mainTourismCount : trip.cityPlan!.dateCount;
      const actual = category === "main" ? mainEvents.length : travel.events.filter((event) => event.category === "date").length;
      if (actual !== expected)
        problem(cityIssues, "event_count_mismatch", `${cityId} の ${category} は${expected}件必要です。`);
    }
    const events = travel.events.map((event): JourneyEventReadiness => {
      const eventIssues: JourneyReadinessIssue[] = [];
      if (event.contentStatus === "pending_content") problem(eventIssues, "event_pending", `イベントは制作中: ${event.id}`);
      if (event.cityId !== cityId || seenEventIds.has(event.id)) problem(eventIssues, "event_mismatch", `イベントの都市・IDが不正: ${event.id}`);
      seenEventIds.add(event.id);
      const place = travel.places.find((item) => item.id === event.placeId);
      if (!place) problem(eventIssues, "place_missing", `地点が未登録: ${event.placeId}`);
      else checkImage(place.backgroundAssetId, eventIssues);
      if (event.category === "main" && finales.some((item) => item.id === event.id)) {
        // Finale references, reward and quiz are checked once at city level.
      } else if (event.category === "main" && specialIds.has(event.id)) {
        const special = input.battles.find((item) => item.id === event.id);
        if (!special?.landmarkId || !place?.landmarkIds?.includes(special.landmarkId))
          problem(eventIssues, "special_place_mismatch", `特殊戦の観光地・地点が不一致: ${event.id}`);
        if (special?.landmarkId) checkBattle(special.id, special.landmarkId, cityId, eventIssues);
      } else if (event.category === "main") {
        const episode = input.journey.episodes.find((item) => item.id === event.id);
        if (!episode) problem(eventIssues, "episode_missing", `観光エピソードが未登録: ${event.id}`);
        else {
          if (episode.cityId !== cityId || episode.landmarkId !== event.placeId || episode.kind === "city_finale")
            problem(eventIssues, "episode_owner_mismatch", `エピソードの都市・観光地が不一致: ${event.id}`);
          if (episode.requiredEpisodeIds.length) problem(eventIssues, "tourism_order_restricted", `観光順序に前提があります: ${event.id}`);
          checkBattle(episode.battleId, event.placeId, cityId, eventIssues);
        }
        const landmark = input.tourism.landmarks.find((item) => item.id === event.placeId);
        if (!landmark) problem(eventIssues, "landmark_missing", `観光地・観察定義が未登録: ${event.placeId}`);
        else {
          if (landmark.cityId !== cityId || (episode && landmark.battleId !== episode.battleId) || !place?.landmarkIds?.includes(landmark.id))
            problem(eventIssues, "landmark_owner_mismatch", `観光地・バトル・地点の参照が不一致: ${event.placeId}`);
          if (!input.storyExists(landmark.guideStoryId)) problem(eventIssues, "guide_story_missing", `観光案内の脚本が未登録: ${landmark.guideStoryId}`);
          const asset = input.tourism.assets.find((item) => item.id === landmark.imageAssetId);
          if (!asset || asset.isPlaceholder || !input.assetExists(asset.path)) problem(eventIssues, "observation_image_missing", `観察用画像が未完成: ${event.placeId}`);
          if (!landmark.clueIds.length) problem(eventIssues, "observations_missing", `観察ポイント・資料が未登録: ${event.placeId}`);
          for (const clueId of landmark.clueIds) if (!input.tourism.clues.some((clue) => clue.id === clueId && clue.landmarkId === landmark.id))
            problem(eventIssues, "observation_mismatch", `観察ポイントの参照が不一致: ${clueId}`);
        }
      } else {
        const date = input.dates.find((item) => item.id === event.id);
        if (!date) problem(eventIssues, "date_missing", `デート定義が未登録: ${event.id}`);
        else {
          const destination = input.destinations.find((item) => item.id === date.destinationId);
          if (!destination || destination.cityId !== cityId || date.chapterId !== cityId || !place?.destinationIds?.includes(destination.id))
            problem(eventIssues, "destination_mismatch", `デート行き先・都市が未登録または不一致: ${event.id}`);
          else if (destination.backgroundAssetId !== date.backgroundAssetId) problem(eventIssues, "date_background_mismatch", `デート背景が不一致: ${event.id}`);
          if (date.backgroundAssetId !== place?.backgroundAssetId) checkImage(date.backgroundAssetId, eventIssues);
          if (!input.storyExists(date.storyId)) problem(eventIssues, "date_story_missing", `デート脚本が未登録: ${date.storyId}`);
        }
      }
      return { id: event.id, cityId, category: event.category, placeId: event.placeId, issues: eventIssues };
    });
    const finale = finales;
    if (finale.length !== 1) problem(cityIssues, "finale_missing", `都市フィナーレが未登録: ${cityId}`);
    else {
      const final = finale[0];
      const mainIds = mainEvents.map((event) => event.id);
      if (final.requiredEpisodeIds.length !== mainIds.length || mainIds.some((id) => !final.requiredEpisodeIds.includes(id)))
        problem(cityIssues, "finale_prerequisites_mismatch", `フィナーレに全観光の条件がありません: ${cityId}`);
      if (!travel.events.some((event) => event.id === final.id && event.category === "main"))
        problem(cityIssues, "finale_event_missing", `フィナーレの地点が未登録: ${cityId}`);
      if (!final.epilogueStoryId || !input.storyExists(final.epilogueStoryId)) problem(cityIssues, "epilogue_missing", `エピローグが未登録: ${cityId}`);
      const reward = input.journey.rewards.filter((item) => item.episodeId === final.id && item.trigger === "city_clear");
      if (reward.length !== 1 || reward[0].ap !== trip.cityPlan!.cityClearAp) problem(cityIssues, "city_reward_mismatch", `都市クリア報酬が不一致: ${cityId}`);
      checkBattle(final.battleId, null, cityId, cityIssues);
    }
    return { cityId, issues: cityIssues, events };
  });
  const readyForPromotion = issues.every((issue) => issue.code === "journey_unavailable") &&
    cities.every((city) => city.issues.every((issue) => issue.code === "city_incomplete") && city.events.every((event) => event.issues.every((issue) => issue.code === "event_pending")));
  return { journeyId: trip.id, readyForPromotion, ready: readyForPromotion && issues.length === 0 && cities.every((city) => city.issues.length === 0 && city.events.every((event) => event.issues.length === 0)), issues, cities };
}

export function loadJourneyReadiness(root: string, journeyId: string): JourneyReadinessInput {
  const sources = loadContentSources(root);
  const catalog = journeyCatalogOf(sources);
  const trip = catalog.journeys.find((item) => item.id === journeyId);
  if (!trip) throw new Error("Journey journey is missing");
  const cities = trip.cities.map(({ id }) => {
    const files = requireCity(sources, id);
    return { city: citySchema.parse(files.data), travel: travelCatalogSchema.parse(files.travel),
      settings: travelSettingsSchema.parse(files.settings) };
  });
  const quizzes = sources.quizFiles.filter((quiz) => !quiz.sample).map((quiz) => quizSchema.parse(quiz.data));
  const storyIds = new Set(sources.storyFiles.map((story) => story.id));
  return { trip, cities, quizzes, journey: parseCatalog(sources, journeySchema, "progression/journey.json"),
    tourism: parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json"),
    backgrounds: parseCatalog(sources, presentationSchema, "romance/presentation.json").backgrounds,
    dates: parseCatalog(sources, dateCatalogSchema, "romance/date_catalog.json").dates,
    destinations: parseCatalog(sources, dateDestinationsSchema, "romance/date_destinations.json").destinations,
    battles: parseCatalog(sources, battleCatalogSchema, "battles/catalog.json").battles,
    translations: parseCatalog(sources, learningCatalogSchema, "learning/translations.json").questions,
    storyExists: (id) => /^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/.test(id) && storyIds.has(id),
    assetExists: (assetPath) => servedFile(sources.publicFiles, assetPath) !== undefined };
}
