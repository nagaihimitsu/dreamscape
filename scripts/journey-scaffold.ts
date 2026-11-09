import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { battleSchema, citySchema, dateSchema, effectSchema, presentationSchema } from "../src/content/schemas";
import { episodeSchema, rewardRuleSchema } from "../src/content/journey-schemas";
import { landmarkSchema, tourismClueSchema, tourismCatalogSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, travelEventSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { journeyCatalogOf, loadContentSources, parseCatalog, requireCity } from "./content-sources";
import { getJourneyAuthoringProfile } from "./journey-authoring";
import { requireServedFile } from "./public-assets";

// Narrative metadata belongs to the not-yet-written scenario. No empty string
// or fictional opponent is promoted to a production catalog.
const words = z.string().trim().min(1);
const scene = z.object({ titleJa: words, descriptionJa: words, clearTitleJa: words, clearDescriptionJa: words,
  enemyNameJa: words, enemyTitleJa: words, enemyDescriptionJa: words }).strict();
const date = z.object({ titleJa: words, descriptionJa: words, memoryTitleJa: words, memoryDescriptionJa: words }).strict();
export const journeyNarrativeSchema = z.object({
  main: z.record(z.string(), scene), dates: z.record(z.string(), date),
  finales: z.record(z.string(), scene.extend({ placeId: words, activityMinutes: z.number().int().positive() }).strict()),
}).strict();

type CityTravel = z.infer<typeof travelCatalogSchema>;
export type JourneyScaffoldInput = {
  cities: CityTravel[];
  eventPrefix: string;
  imageAssetIds: Record<string, string>;
  plannedLandmarks: Record<string, string[]>;
  observations: z.infer<typeof tourismClueSchema>[];
  destinations: z.infer<typeof dateDestinationsSchema>["destinations"];
  cityClearAp: number;
};

/** Derive every stable ID from the existing authored travel event and place. */
const profiles = ["attentive", "playful", "honest", "bold", "provocative"] as const;
export function journeyRequirements(input: JourneyScaffoldInput, selectedCityIds = input.cities.map((city) => city.cityId)) {
  if (!selectedCityIds.length || new Set(selectedCityIds).size !== selectedCityIds.length ||
      selectedCityIds.some((id) => !input.cities.some((city) => city.cityId === id)))
    throw new Error("journey:scaffold: --city の都市がこの旅行編にないか、都市の選び方が正しくありません。");
  return input.cities.filter((city) => selectedCityIds.includes(city.cityId)).map((travel) => ({ cityId: travel.cityId,
    // IDs come from the registered main-event namespace, excluding a later
    // finale or special battle even when it shares an attraction.
    main: travel.events.filter((event) => event.category === "main" && event.id.startsWith(`${input.eventPrefix}_${travel.cityId}_main_`) &&
      input.plannedLandmarks[travel.cityId]?.includes(event.placeId)).map((event) => ({
      eventId: event.id, landmarkId: event.placeId, battleId: `${event.id}_battle`, quizId: `${event.id}_quiz`,
      guideStoryId: `tourism/${input.eventPrefix}_${event.placeId}_guide`, battleStoryId: `battles/${event.id}`,
    })),
    // The dates at a destination (normal dates); a special date at another place (India's hotel roof) is no scaffold date.
    dates: travel.events.filter((event) => event.category === "date" && event.id.startsWith(`${input.eventPrefix}_${travel.cityId}_date_`) &&
      !!travel.places.find((place) => place.id === event.placeId)?.destinationIds?.includes(event.placeId)).map((event) => ({
      eventId: event.id, destinationId: event.placeId, storyId: `dates/${event.id}`, memoryId: `${event.id}_memory`,
      effectIds: Object.fromEntries((["first", "second"] as const).map((round) => [round,
        Object.fromEntries(profiles.map((profile) => [profile, `${event.id}_${round}_${profile}`]))])),
    })),
    finale: { eventId: `${input.eventPrefix}_${travel.cityId}_finale`, battleId: `${input.eventPrefix}_${travel.cityId}_finale_battle`,
      quizId: `${input.eventPrefix}_${travel.cityId}_finale_quiz`, battleStoryId: `battles/${input.eventPrefix}_${travel.cityId}_finale`,
      epilogueStoryId: `epilogues/${travel.cityId}` },
  }));
}

/** Build existing catalog entries only from supplied scenario metadata.
 * Story and quiz files are not fabricated or written here. The caller must run
 * the existing full content validation before publishing the fragments.
 */
export function buildJourneyFragments(input: JourneyScaffoldInput, rawNarrative: unknown, selectedCityIds?: string[]) {
  const narrative = journeyNarrativeSchema.parse(rawNarrative);
  const episodes: z.infer<typeof episodeSchema>[] = [];
  const rewards: z.infer<typeof rewardRuleSchema>[] = [];
  const battles: z.infer<typeof battleSchema>[] = [];
  const dates: z.output<typeof dateSchema>[] = [];
  const landmarks: z.infer<typeof landmarkSchema>[] = [];
  const finaleEvents: z.infer<typeof travelEventSchema>[] = [];
  const clues: z.infer<typeof tourismClueSchema>[] = [];
  const effects: z.infer<typeof effectSchema>[] = [];
  const memories: Record<string, { titleJa: string; descriptionJa: string }> = {};
  const requirements = journeyRequirements(input, selectedCityIds);
  for (const plan of requirements) {
    const planned = input.plannedLandmarks[plan.cityId];
    if (!planned || plan.main.length !== planned.length || new Set(plan.main.map((entry) => entry.landmarkId)).size !== planned.length)
      throw new Error(`journey:scaffold: 都市 ${plan.cityId} の本筋の観光（地図の main の出来事）が、都市の landmarkIdsPlanned と合いません。`);
  }
  const expectedMain = requirements.flatMap((city) => city.main.map((item) => item.eventId));
  const expectedDates = requirements.flatMap((city) => city.dates.map((item) => item.eventId));
  const exactKeys = (actual: Record<string, unknown>, expected: string[], name: string) => {
    if (Object.keys(actual).length !== expected.length || expected.some((id) => !Object.hasOwn(actual, id)))
      throw new Error(`journey:scaffold: 脚本の情報の ${name} には、登録した ID をちょうど全部書きます（足りないか余分な ID があります）。`);
  };
  exactKeys(narrative.main, expectedMain, "main");
  exactKeys(narrative.dates, expectedDates, "dates");
  exactKeys(narrative.finales, requirements.map((item) => item.cityId), "finales");
  const addRewards = (episodeId: string, finale: boolean) => {
    const rules = finale ? [["battle_complete", 1, null], ["battle_score", 1, 3], ["city_clear", input.cityClearAp, null]] as const
      : [["guide_read", 1, null], ["battle_complete", 1, null], ["battle_score", 1, 2], ["episode_clear", 1, null]] as const;
    for (const [trigger, ap, minScore] of rules) rewards.push(rewardRuleSchema.parse({
      id: `${episodeId}_${trigger}`, episodeId, trigger, ap, minScore,
      titleJa: trigger === "city_clear" ? "都市を初めてクリア" : trigger === "guide_read" ? "観光案内を初めて読了" : trigger === "battle_score" ? "初めて規定数に正解" : trigger === "episode_clear" ? "観光を初めてクリア" : "対決を初めて完了",
    }));
  };
  for (const plan of requirements) {
    const travel = input.cities.find((city) => city.cityId === plan.cityId)!;
    for (const item of plan.main) {
      const event = travel.events.find((entry) => entry.id === item.eventId)!;
      const place = travel.places.find((entry) => entry.id === item.landmarkId);
      if (!place) throw new Error(`journey:scaffold: 観光地の地点が travel にありません: ${item.landmarkId}`);
      const script = narrative.main[item.eventId];
      const ownClues = input.observations.filter((clue) => clue.landmarkId === place.id).map((clue) => tourismClueSchema.parse(clue));
      if (!ownClues.length) throw new Error(`journey:scaffold: 観光地 ${place.id} の観察ポイントが観察資料にありません。`);
      clues.push(...ownClues);
      landmarks.push(landmarkSchema.parse({ id: place.id, cityId: plan.cityId, nameJa: place.nameJa, nameEn: place.nameEn,
        descriptionJa: script.descriptionJa, imageAssetId: input.imageAssetIds[place.id], guideStoryId: item.guideStoryId,
        battleId: item.battleId, clueIds: ownClues.map((clue) => clue.id) }));
      episodes.push(episodeSchema.parse({ id: event.id, kind: "episode", cityId: plan.cityId, landmarkId: place.id,
        battleId: item.battleId, requiredEpisodeIds: [], titleJa: script.titleJa,
        descriptionJa: script.descriptionJa, clearTitleJa: script.clearTitleJa, clearDescriptionJa: script.clearDescriptionJa }));
      battles.push(battleSchema.parse({ id: item.battleId, titleJa: script.titleJa, descriptionJa: script.descriptionJa,
        landmarkId: place.id, enemyNameJa: script.enemyNameJa, enemyTitleJa: script.enemyTitleJa,
        enemyDescriptionJa: script.enemyDescriptionJa, storyId: item.battleStoryId, quizId: item.quizId,
        backgroundId: place.backgroundId, portrait: "abstract", scenes: { intro: "intro", afterRounds: ["after_1", "after_2"], outro: "outro" } }));
      addRewards(event.id, false);
    }
    for (const item of plan.dates) {
      const event = travel.events.find((entry) => entry.id === item.eventId)!;
      const place = travel.places.find((entry) => entry.id === event.placeId);
      const destination = input.destinations.find((entry) => entry.id === item.destinationId && entry.cityId === plan.cityId);
      if (!place || !destination || !place.destinationIds?.includes(destination.id) || destination.backgroundId !== place.backgroundId)
        throw new Error(`journey:scaffold: デート先 ${item.destinationId} が、その地点の destinationIds にないか、背景が地点と違います。`);
      const script = narrative.dates[item.eventId];
      memories[item.memoryId] = { titleJa: script.memoryTitleJa, descriptionJa: script.memoryDescriptionJa };
      for (const round of ["first", "second"] as const) for (const profile of profiles) {
        effects.push(effectSchema.parse({ id: `${item.eventId}_${round}_${profile}`, affectionDelta: 0,
          responseProfileId: profile, memoryId: item.memoryId }));
      }
      dates.push(dateSchema.parse({ id: item.eventId, kind: "normal", chapterId: plan.cityId,
        titleJa: script.titleJa, descriptionJa: script.descriptionJa, apCost: event.apCost, storyId: item.storyId,
        when: { episodesCompleted: { city: plan.cityId, atLeast: 1 } }, destinationId: destination.id, backgroundId: place.backgroundId,
        choiceCount: 2, effectCount: 2 }));
    }
    const script = narrative.finales[plan.cityId];
    const place = travel.places.find((entry) => entry.id === script.placeId);
    if (!place || !travel.events.some((entry) => entry.placeId === place.id))
      throw new Error(`journey:scaffold: 都市 ${plan.cityId} のフィナーレの placeId には、地図の出来事がある地点を書きます。`);
    episodes.push(episodeSchema.parse({ id: plan.finale.eventId, kind: "city_finale", cityId: plan.cityId, landmarkId: null,
      battleId: plan.finale.battleId, requiredEpisodeIds: plan.main.map((item) => item.eventId),
      epilogueStoryId: plan.finale.epilogueStoryId, titleJa: script.titleJa, descriptionJa: script.descriptionJa,
      clearTitleJa: script.clearTitleJa, clearDescriptionJa: script.clearDescriptionJa }));
    battles.push(battleSchema.parse({ id: plan.finale.battleId, scope: "city_finale", cityId: plan.cityId, landmarkId: null,
      titleJa: script.titleJa, descriptionJa: script.descriptionJa, enemyNameJa: script.enemyNameJa, enemyTitleJa: script.enemyTitleJa,
      enemyDescriptionJa: script.enemyDescriptionJa, storyId: plan.finale.battleStoryId, quizId: plan.finale.quizId,
      backgroundId: place.backgroundId, portrait: "abstract", scenes: { intro: "intro", afterRounds: ["after_1", "after_2", "after_3", "after_4"], outro: "outro" } }));
    const destinationEvents = travel.events.filter((event) => event.placeId === place.id);
    const costs = new Set(destinationEvents.map((event) => event.admissionCost ?? 0));
    if (costs.size !== 1) throw new Error(`journey:scaffold: 地点 ${place.id} の出来事の入場料（admissionCost）がそろっていません。`);
    const admissionCost = [...costs][0];
    finaleEvents.push(travelEventSchema.parse({ id: plan.finale.eventId, cityId: plan.cityId, placeId: place.id,
      category: "main", titleJa: script.titleJa, activityMinutes: script.activityMinutes, apCost: 0,
      ...(admissionCost ? { admissionCost } : {}), contentStatus: "pending_content" }));
    addRewards(plan.finale.eventId, true);
  }
  return { episodes, rewards, battles, dates, landmarks, clues, finaleEvents, effects, memories };
}

/** `sources`: the loaded content, when the caller already has it. */
export function loadJourneyScaffold(root: string, journeyId: string, sources = loadContentSources(root)): JourneyScaffoldInput {
  const profile = getJourneyAuthoringProfile(root, journeyId);
  const json = (file: string): unknown => JSON.parse(readFileSync(path.resolve(root, file), "utf8"));
  const journey = journeyCatalogOf(sources).journeys.find((item) => item.id === journeyId);
  if (!journey?.cityPlan) throw new Error("journey:scaffold: 旅行編の manifest.json に都市の計画（cityPlan）がありません。");
  const cities = journey.cities.map(({ id }) => travelCatalogSchema.parse(requireCity(sources, id).travel));
  const cityData = cities.map((city) => citySchema.parse(requireCity(sources, city.cityId).data));
  const plannedLandmarks = Object.fromEntries(cityData.map((city) => [city.id, city.landmarkIdsPlanned]));
  // A journey made by journey:new names the file (authoring.observationFile) but has none yet.
  if (!existsSync(path.resolve(root, profile.observationFile)))
    throw new Error(`観察資料がありません: ${profile.observationFile}（manifest.json の authoring.observationFile）。journey:scaffold は、観光地ごとの JPEG または WebP の画像（仮でないもの）の記録（パスと SHA-256）と、出典を確かめた観察ポイントを観察資料に置いてから使います（authoring/JOURNEY_AUTHORING.md）。`);
  const observationsFile = z.object({ clues: z.array(tourismClueSchema), images: z.record(z.string(), z.object({ path: words, sha256: z.string().regex(/^[0-9a-f]{64}$/) })), provenance: z.record(z.string(), z.object({ needsFurtherResearch: z.boolean() }).loose()) }).loose()
    .parse(json(profile.observationFile));
  if (observationsFile.clues.some((clue) => !observationsFile.provenance[clue.id] || observationsFile.provenance[clue.id].needsFurtherResearch))
    throw new Error("journey:scaffold: 観察資料に、出典の確認（provenance）がないか、まだ調べる必要がある（needsFurtherResearch）観察ポイントがあります。");
  for (const clue of observationsFile.clues) {
    // Cards are written before any question exists; links go into the released tourism catalog (docs/07 観察だけの手がかり).
    if (clue.relatedQuestionIds.length)
      throw new Error(`観察資料の観察ポイント「${clue.id}」に問題ID（relatedQuestionIds: ${clue.relatedQuestionIds.join(", ")}）が書かれています: ${profile.observationFile}。観察資料には問題IDを書かず、[] のままにします。都市を公開（journey:release -- --apply）した後、旅行編の tourism/catalog.json で、その観察ポイントを本当に使う問題にだけ問題IDを書いてください。`);
    const image = observationsFile.images[clue.landmarkId];
    if (!image || !image.path.startsWith(`${profile.imageDirectory}/`) || !/^[a-z0-9_]+\.(?:jpg|webp)$/.test(image.path.slice(profile.imageDirectory.length + 1)))
      throw new Error(`journey:scaffold: 観光地 ${clue.landmarkId} の画像の記録（images）がないか、置き場所・名前が違います（authoring.imageDirectory の下の .jpg か .webp）。`);
    const hash = createHash("sha256").update(readFileSync(requireServedFile(sources.publicFiles, image.path))).digest("hex");
    if (hash !== image.sha256) throw new Error(`journey:scaffold: 観光地 ${clue.landmarkId} の画像の中身が、観察資料に記録したもの（SHA-256）と違います。`);
  }
  const observations = observationsFile.clues;
  const destinations = parseCatalog(sources, dateDestinationsSchema, "romance/date_destinations.json").destinations;
  const { assets } = parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json");
  const { backgrounds } = parseCatalog(sources, presentationSchema, "romance/presentation.json");
  const imageAssetIds: Record<string, string> = {};
  for (const city of cities) for (const landmarkId of plannedLandmarks[city.cityId]) {
    const place = city.places.find((entry) => entry.id === landmarkId);
    const assetId = place && backgrounds[place.backgroundId]?.imageAssetId;
    const asset = assets.find((entry) => entry.id === assetId);
    if (!asset || asset.isPlaceholder || asset.path !== observationsFile.images[landmarkId]?.path)
      throw new Error(`journey:scaffold: 観光地 ${landmarkId} の背景の画像が、観察資料の画像と違うか、仮の画像のままです。`);
    imageAssetIds[landmarkId] = asset.id;
  }
  // Ensure hotel settings exist and are valid; this function never uses them as finale places.
  for (const city of cities) travelSettingsSchema.parse(requireCity(sources, city.cityId).settings);
  return { cities, plannedLandmarks, observations, destinations, cityClearAp: journey.cityPlan.cityClearAp, eventPrefix: profile.eventPrefix, imageAssetIds };
}
