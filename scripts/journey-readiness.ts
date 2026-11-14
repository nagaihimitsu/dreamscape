import { splitStoryAddress, STORY_ADDRESS_PATTERN } from "../src/content/story-address";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { citySchema, battleCatalogSchema, dateCatalogSchema, presentationSchema, quizSchema } from "../src/content/schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { journeySchema } from "../src/content/journey-schemas";
import type { Journey } from "../src/content/journey-catalog";
import { hasObservation, tourismCatalogSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { learningCatalogSchema, questionSource } from "../src/content/learning-schema";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SAMPLE_JOURNEY_ID } from "./content-layout";
import { journeyCatalogOf, journeyFolderPath, loadContentSources, parseCatalog, requireCity, type ContentSources } from "./content-sources";
import { servedFile } from "./public-assets";
import { cityTransitPath, cityTransitPlan } from "./journey-transit";
import { inspectCityTransit } from "./transit-ledger";
import { describeSampleLeftovers, SAMPLE_SETTINGS, sampleLeftovers, type SampleLeftover } from "./sample-journey";

/** Report from real catalog entries; no additional hand-maintained content list. */
export type JourneyReadinessInput = {
  journey: z.infer<typeof journeySchema>;
  trip: Journey;
  cities: Array<{
    city: z.infer<typeof citySchema>;
    travel: z.infer<typeof travelCatalogSchema>;
    settings: z.infer<typeof travelSettingsSchema>;
    /** Decisions of the city's transit ledger still `inconclusive` (0 without a ledger; content:build checks the rest). */
    inconclusiveTransit?: number;
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
  /** Sample content left in the journey's folder (`folder` relative to the repository, the files inside it); none for the sample itself. */
  sampleLeftovers: { folder: string; leftovers: SampleLeftover[] };
};

export type JourneyReadinessIssue = { code: string; detail: string };
export type JourneyEventReadiness = { id: string; cityId: string; category: "main" | "date"; placeId: string; issues: JourneyReadinessIssue[] };
export type JourneyCityReadiness = { cityId: string; events: JourneyEventReadiness[]; issues: JourneyReadinessIssue[] };
/** `notes`: the sample's settings a journey:new copy still has (sampleSettingNotes); they never make it unready. */
export type JourneyReadinessReport = {
  journeyId: string; ready: boolean; readyForPromotion: boolean; issues: JourneyReadinessIssue[]; notes: JourneyReadinessIssue[]; cities: JourneyCityReadiness[];
};

/** Check actual authored references and binaries, not a manually maintained ready flag. */
export function inspectJourneyReadiness(input: JourneyReadinessInput): JourneyReadinessReport {
  const issues: JourneyReadinessIssue[] = [];
  const problem = (list: JourneyReadinessIssue[], code: string, detail: string) => { list.push({ code, detail }); };
  const { trip } = input;
  if (!trip.cityPlan) throw new Error(`旅行編「${trip.id}」の manifest.json に都市の計画（cityPlan）がないため、準備を確かめられません（journey:readiness は cityPlan を持つ旅行編を確かめます）。`);
  if (trip.status !== "available") problem(issues, "journey_unavailable", "旅行編は準備中です。");
  // A journey copied from the sample (journey:new) keeps its fictional sources, images and texts until they are replaced.
  for (const line of describeSampleLeftovers(input.sampleLeftovers.folder, input.sampleLeftovers.leftovers)) problem(issues, "sample_content_left", line);
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
    if (content.inconclusiveTransit)
      problem(cityIssues, "transit_inconclusive", `交通判断台帳に「特定できず」の判断が${content.inconclusiveTransit}件あります: ${cityId}（調べて available・not_suitable・not_applicable に決めてください）`);
    if (city.id !== travel.cityId || !travel.places.some((place) => place.id === settings.hotelPlaceId))
      problem(cityIssues, "travel_owner_mismatch", `都市・滞在先が不一致: ${cityId}`);
    if (settings.lodgingCost !== trip.cityPlan!.lodgingCost) problem(cityIssues, "lodging_mismatch", `宿泊費が旅行編の設定と不一致: ${cityId}`);
    for (const place of travel.places) {
      if (place.cityId !== cityId || seenPlaceIds.has(place.id)) problem(cityIssues, "place_mismatch", `地点の都市・IDが不正: ${place.id}`);
      seenPlaceIds.add(place.id);
      if (place.id === settings.hotelPlaceId) checkImage(place.backgroundId, cityIssues, true);
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
    // The plan's dateCount counts the dates at a destination (normal dates); a special date (confession, reassurance…)
    // has no destination and runs at a place of its city, beside them (Milan's at the canal, India's on the hotel roof).
    const specialDate = (eventId: string) => {
      const date = input.dates.find((item) => item.id === eventId);
      return !!date && date.kind !== "normal" && !date.destinationId;
    };
    for (const category of ["main", "date"] as const) {
      const expected = category === "main" ? trip.cityPlan!.mainTourismCount : trip.cityPlan!.dateCount;
      const actual = category === "main" ? mainEvents.length
        : travel.events.filter((event) => event.category === "date" && !specialDate(event.id)).length;
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
      else checkImage(place.backgroundId, eventIssues);
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
          if (landmark.guideStoryId && !input.storyExists(landmark.guideStoryId)) problem(eventIssues, "guide_story_missing", `観光案内の脚本が未登録: ${landmark.guideStoryId}`);
          const asset = input.tourism.assets.find((item) => item.id === landmark.imageAssetId);
          if (!asset || asset.isPlaceholder || !input.assetExists(asset.path)) problem(eventIssues, "observation_image_missing", `観察用画像が未完成: ${event.placeId}`);
          // A landmark without an observation (observation: false, the author's choice per place) needs no clues.
          if (hasObservation(landmark) && !landmark.clueIds.length) problem(eventIssues, "observations_missing", `観察ポイント・資料が未登録: ${event.placeId}`);
          for (const clueId of landmark.clueIds) if (!input.tourism.clues.some((clue) => clue.id === clueId && clue.landmarkId === landmark.id))
            problem(eventIssues, "observation_mismatch", `観察ポイントの参照が不一致: ${clueId}`);
        }
      } else {
        const date = input.dates.find((item) => item.id === event.id);
        if (!date) problem(eventIssues, "date_missing", `デート定義が未登録: ${event.id}`);
        else if (specialDate(event.id)) {
          if (date.chapterId !== cityId || !place) problem(eventIssues, "destination_mismatch", `デートの都市・地点が不一致: ${event.id}`);
          if (date.backgroundId !== place?.backgroundId) checkImage(date.backgroundId, eventIssues);
          if (!input.storyExists(date.storyId)) problem(eventIssues, "date_story_missing", `デート脚本が未登録: ${date.storyId}`);
        } else {
          const destination = input.destinations.find((item) => item.id === date.destinationId);
          if (!destination || destination.cityId !== cityId || date.chapterId !== cityId || !place?.destinationIds?.includes(destination.id))
            problem(eventIssues, "destination_mismatch", `デート行き先・都市が未登録または不一致: ${event.id}`);
          else if (destination.backgroundId !== date.backgroundId) problem(eventIssues, "date_background_mismatch", `デート背景が不一致: ${event.id}`);
          if (date.backgroundId !== place?.backgroundId) checkImage(date.backgroundId, eventIssues);
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
      // A finale with `when` (stage 2b) names its own condition; the build's progression check covers it.
      if (!final.when && (final.requiredEpisodeIds.length !== mainIds.length || mainIds.some((id) => !final.requiredEpisodeIds.includes(id))))
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
  return { journeyId: trip.id, readyForPromotion, ready: readyForPromotion && issues.length === 0 && cities.every((city) => city.issues.length === 0 && city.events.every((event) => event.issues.length === 0)),
    issues, notes: sampleSettingNotes(input), cities };
}

/**
 * The sample's settings left in a journey (SAMPLE_SETTINGS; a journey:new copy
 * starts with them): a city's country code XX, places at sea near 0,0, the
 * sample's currency and budget. Notes, not issues: the files' texts and images
 * are the sample leftovers that stop a release.
 */
function sampleSettingNotes(input: JourneyReadinessInput): JourneyReadinessIssue[] {
  const notes: JourneyReadinessIssue[] = [];
  const nearZero = (value: number) => Math.abs(value) < SAMPLE_SETTINGS.maxCoordinate;
  for (const { city, travel } of input.cities) {
    if (city.countryCode === SAMPLE_SETTINGS.countryCode)
      notes.push({ code: "sample_country_code", detail: `国コードが見本のまま（${SAMPLE_SETTINGS.countryCode}）です: 都市 ${city.id} の cities/${city.id}.json の countryCode` });
    const atSea = travel.places.filter((place) => nearZero(place.latitude) && nearZero(place.longitude)).length;
    if (atSea)
      notes.push({ code: "sample_coordinates", detail: `座標が見本のまま（海上の 0,0 付近）です: 都市 ${city.id} の${atSea}地点（travel/${city.id}.json の latitude・longitude）` });
  }
  if (input.trip.currency.code === SAMPLE_SETTINGS.currencyCode && input.trip.initialBudget === SAMPLE_SETTINGS.initialBudget)
    notes.push({ code: "sample_money", detail: `通貨と開始資金が見本のまま（${SAMPLE_SETTINGS.currencyCode}・${SAMPLE_SETTINGS.initialBudget}）です: ` +
      "manifest.json の currency・initialBudget（この旅に合わせて決めた値なら、そのままでかまいません）" });
  return notes;
}

export function loadJourneyReadiness(root: string, journeyId: string): JourneyReadinessInput {
  return journeyReadinessInput(loadContentSources(root), journeyId);
}

/** The readiness input of a journey of loaded sources (e.g. sources with the sample journey). */
export function journeyReadinessInput(sources: ContentSources, journeyId: string): JourneyReadinessInput {
  const catalog = journeyCatalogOf(sources);
  const trip = catalog.journeys.find((item) => item.id === journeyId);
  if (!trip) throw new Error(`旅行編「${journeyId}」は登録されていません（content/journeys/<旅行編ID>/manifest.json）。` +
    `登録されている旅行編: ${catalog.journeys.map((item) => item.id).join(", ") || "なし"}（Unknown journey）。`);
  const cities = trip.cities.map(({ id }) => {
    const files = requireCity(sources, id);
    const travel = travelCatalogSchema.parse(files.travel);
    const { modes } = cityTransitPlan(sources, id);
    const transit = files.transit === undefined || !modes.length ? undefined : inspectCityTransit(travel, files.transit, modes, cityTransitPath(sources, id));
    return { city: citySchema.parse(files.data), travel, settings: travelSettingsSchema.parse(files.settings),
      inconclusiveTransit: transit ? Object.values(transit.counts).reduce((sum, byStatus) => sum + byStatus.inconclusive, 0) : 0 };
  });
  const quizzes = sources.quizFiles.filter((quiz) => !quiz.example).map((quiz) => quizSchema.parse(quiz.data));
  const storyIds = new Set(sources.storyFiles.map((story) => story.id));
  return { trip, cities, quizzes, sampleLeftovers: journeySampleLeftovers(sources, journeyId), journey: parseCatalog(sources, journeySchema, "progression/journey.json"),
    tourism: parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json"),
    backgrounds: parseCatalog(sources, presentationSchema, "romance/presentation.json").backgrounds,
    dates: parseCatalog(sources, dateCatalogSchema, "romance/date_catalog.json").dates,
    destinations: parseCatalog(sources, dateDestinationsSchema, "romance/date_destinations.json").destinations,
    battles: parseCatalog(sources, battleCatalogSchema, "battles/catalog.json").battles,
    translations: parseCatalog(sources, learningCatalogSchema, "learning/translations.json").questions,
    // A place file's knot (stage 3a): its file exists and has the knot (=== name ===).
    storyExists: (id) => {
      const { storyId, path: knot } = splitStoryAddress(id);
      if (!STORY_ADDRESS_PATTERN.test(id) || !storyIds.has(storyId)) return false;
      const source = sources.storyFiles.find((story) => story.id === storyId)!.source;
      return knot === undefined || new RegExp(`^\\s*={2,}\\s*${knot.split(".")[0]}\\b`, "mu").test(source);
    },
    assetExists: (assetPath) => servedFile(sources.publicFiles, assetPath) !== undefined };
}

/**
 * The sample content left in a journey's own folder (sample-journey.ts): the
 * data files as loaded, the images (only listed by the loader) read from disk.
 */
function journeySampleLeftovers(sources: ContentSources, journeyId: string): JourneyReadinessInput["sampleLeftovers"] {
  const folder = journeyFolderPath(sources.tree, journeyId);
  if (journeyId === SAMPLE_JOURNEY_ID) return { folder, leftovers: [] };
  const files = new Map([...sources.tree.files].filter(([treePath]) => treePath.startsWith(`${folder}/`)).map(([treePath, bytes]) => {
    const file = path.join(sources.root, treePath);
    return [treePath.slice(folder.length + 1), bytes ?? (existsSync(file) ? readFileSync(file) : null)];
  }));
  return { folder, leftovers: sampleLeftovers(files) };
}
