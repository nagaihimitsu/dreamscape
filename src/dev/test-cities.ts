/** In-memory fixtures used only by tests and the development-only Debug entry. */
import { splitStoryAddress } from "../content/story-address";
import {
  allRewardRules, battleQuizzes, battles, cityContents, dateDestinations, dates,
  episodes, journeyConfig, landmarks, rewardRules, stories, tourismClues,
  type BattleDefinition, type LandmarkDefinition,
} from "../content";
import { encounters } from "../content/encounters";
import { getJourney, getJourneyForCity, journeys } from "../content/journeys";
import { getAllRewardRules } from "../content/journey-schemas";
import { findDebugTemplate, type DebugTemplate, type DebugTemplateContent } from "./fixture-template";

/** The runtime catalogs, as findDebugTemplate reads them. */
function runtimeContent(): DebugTemplateContent {
  return { journeys, cityContents, episodes, battles, landmarks, tourismClues, storyBattles: journeyConfig.storyBattles,
    encounters, dates, dateDestinations };
}

/** The city the fictional test cities copy (see fixture-template.ts); throws a message for the person. */
export function debugTemplate(templateCityId?: string): DebugTemplate {
  return findDebugTemplate(runtimeContent(), templateCityId);
}

/** For the Debug screen: which city 仮の場面 copy and which scenes they lack, or why there are none. */
export function debugTemplateDescription(): { text: string; note: string } {
  try {
    const template = debugTemplate();
    return { text: `仮の場面は、${template.journey.nameJa}の${template.city.city.nameJa}を元にしたテストデータで、その都市の物語ではありません。`,
      note: template.note };
  } catch (error) {
    return { text: error instanceof Error ? error.message : "仮の場面の元になる都市を選べませんでした。", note: "" };
  }
}

/**
 * Install a fictional city that copies the template city's roles: real
 * executable scripts and quizzes under IDs of its own (`<prefix>_episode`,
 * `<prefix>_special_b`, `<cityId>/guide`, …; prefix `test` for test_city).
 * Optional roles the template lacks are left out. The shared catalogs are
 * changed in place; the returned function restores them.
 */
export function installTestCity(options: {
  cityId?: string;
  nameJa?: string;
  /** The city whose nextCityId becomes this one; default the template city, null for none. */
  previousCityId?: string | null;
  nextCityId?: string;
  /** Copy this city instead of the automatic choice (tests that use its IDs say so). */
  templateCityId?: string;
} = {}): () => void {
  const template = debugTemplate(options.templateCityId);
  const templateCityId = template.city.city.id;
  const cityId = options.cityId ?? "test_city";
  // Real prototype cities may already be registered. Preserve the exact
  // original content object when installing a temporary debug fixture.
  const originalCity = cityContents[cityId];
  const prefix = cityId === "test_city" ? "test" : cityId;
  const id = (suffix: string) => `${prefix}_${suffix}`;
  const previous = options.previousCityId === null ? undefined : cityContents[options.previousCityId ?? templateCityId];
  const previousNext = previous?.city.nextCityId;
  // Ad-hoc test cities inherit their predecessor's journey currency. Planned
  // cities of a preparing journey are already registered in the journey catalog.
  const owner = getJourneyForCity(cityId) ?? getJourneyForCity(previous?.city.id ?? templateCityId);
  const addedCity = !getJourneyForCity(cityId) && owner ? { id: cityId, nameJa: options.nameJa ?? "試験都市" } : null;
  if (addedCity) owner!.cities.push(addedCity);
  const sizes = {
    episodes: episodes.length, battles: battles.length, landmarks: landmarks.length,
    dates: dates.length, destinations: dateDestinations.length, clues: tourismClues.length,
    specials: journeyConfig.storyBattles.length, rewards: rewardRules.length, allRewards: allRewardRules.length,
    items: encounters.items.length, encounters: encounters.encounters.length,
  };
  const clone = <T>(value: T): T => structuredClone(value);
  const addedStories: string[] = [];
  const addedQuizzes: string[] = [];
  const ownStory = (sourceId: string, id: string) => {
    // A place file's knot (stage 3a) is shared as it is: its scene fingerprint belongs to its address.
    if (splitStoryAddress(sourceId).path !== undefined) return sourceId;
    stories[id] = stories[sourceId];
    addedStories.push(id);
    return id;
  };
  /** A battle with its own quiz (question IDs prefixed) and story, at a landmark or (finale) of the city. */
  const copyBattle = (source: BattleDefinition, battleId: string, landmarkId: string | null): BattleDefinition => {
    const quizId = `${prefix}_${source.quizId}`;
    const quiz = clone(battleQuizzes[source.quizId]);
    quiz.id = quizId;
    quiz.landmarkId = landmarkId;
    if ("cityId" in quiz) quiz.cityId = cityId;
    quiz.questions = quiz.questions.map((question) => ({ ...question, id: `${prefix}_${question.id}` }));
    battleQuizzes[quizId] = quiz;
    addedQuizzes.push(quizId);
    // A battle keeps its story: its helper knots (<battle>_claim, _press) are named after it.
    const battle = { ...clone(source), id: battleId, quizId, ...(landmarkId ? { landmarkId } : { cityId }) };
    battles.push(battle);
    return battle;
  };
  /** A landmark with its guide and its own copies of its clues; returns the clue ID mapping. */
  const copyLandmark = (source: LandmarkDefinition, landmarkId: string, battleId: string, guideStoryId: string) => {
    const clueIds = new Map<string, string>();
    const landmark = { ...clone(source), id: landmarkId, cityId, battleId,
      ...(source.guideStoryId ? { guideStoryId: ownStory(source.guideStoryId, guideStoryId) } : {}),
      clueIds: source.clueIds.map((clueId) => {
        const clue = clone(tourismClues.find((item) => item.id === clueId && item.landmarkId === source.id)!);
        const copyId = `${prefix}_${clueId}`;
        clueIds.set(clueId, copyId);
        tourismClues.push({ ...clue, id: copyId, landmarkId });
        return copyId;
      }) };
    landmarks.push(landmark);
    return { landmark, clueIds };
  };
  /** Reward rules of a template episode or special battle, renamed for the copy. */
  const copyRewards = (match: (rule: (typeof rewardRules)[number]) => boolean, target: { episodeId: string } | { battleId: string }) => {
    for (const source of rewardRules.filter(match)) {
      const rule = { ...clone(source), id: `${prefix}_${source.id}`, ...target };
      rewardRules.push(rule);
      allRewardRules.push(rule);
    }
  };

  // Required roles: a normal episode at its landmark and the city finale. A map condition (`when`)
  // names the template's own IDs, so the copies keep the current rule (requiredEpisodeIds) instead.
  const withoutWhen = <T extends { when?: unknown }>(value: T): Omit<T, "when"> => {
    const { when: _when, ...rest } = value;
    return rest;
  };
  const normal = { ...withoutWhen(clone(template.normal.episode)), id: id("episode"), cityId, landmarkId: id("landmark"),
    battleId: id("battle"), requiredEpisodeIds: [] };
  const finale = { ...withoutWhen(clone(template.finale.episode)), id: id("finale"), cityId, battleId: id("final_battle"),
    epilogueStoryId: ownStory(template.finale.episode.epilogueStoryId!, `${cityId}/epilogue`), requiredEpisodeIds: [normal.id] };
  episodes.push(normal, finale);
  copyBattle(template.normal.battle, normal.battleId, normal.landmarkId);
  const { landmark: normalLandmark } = copyLandmark(template.normal.landmark, normal.landmarkId, normal.battleId, `${cityId}/guide`);

  // Optional roles: special battles B and C, each at a landmark of its own.
  const specials = (["b", "c"] as const).flatMap((kind) => {
    const role = template[`special_${kind}`];
    if (!role) return [];
    const battleId = id(`special_${kind}`);
    const battle = copyBattle(role.battle, battleId, id(`special_${kind}_landmark`));
    const { landmark, clueIds } = copyLandmark(role.landmark, battle.landmarkId!, battleId, `${cityId}/special_${kind}_guide`);
    if (battle.reasoning) {
      battle.reasoning.caseClueIds = battle.reasoning.caseClueIds.map((clueId) => clueIds.get(clueId)!);
      battle.reasoning.correctClueIds = battle.reasoning.correctClueIds.map((clueId) => clueIds.get(clueId)!);
    }
    const special = { ...withoutWhen(clone(role.storyBattle)), battleId, requiredEpisodeIds: [] };
    if (special.completionReward) special.completionReward.id = id(`special_${kind}_first`);
    journeyConfig.storyBattles.push(special);
    allRewardRules.push(...getAllRewardRules({ ...journeyConfig, rewards: [], storyBattles: [special] }));
    copyRewards((rule) => rule.battleId === role.battle.id, { battleId });
    return [{ special, landmark }];
  });
  copyBattle(template.finale.battle, finale.battleId, null);
  copyRewards((rule) => rule.episodeId === template.normal.episode.id, { episodeId: normal.id });
  copyRewards((rule) => rule.episodeId === template.finale.episode.id, { episodeId: finale.id });

  // Optional: an encounter at the normal landmark that gives its own item.
  if (template.encounter) {
    const item = { ...clone(template.encounter.item), id: id("item"), cityId };
    encounters.items.push(item);
    encounters.encounters.push({ ...clone(template.encounter.encounter), id: id("encounter"), cityId, landmarkId: normalLandmark.id,
      completionItemId: item.id, storyId: ownStory(template.encounter.encounter.storyId, `${cityId}/encounter`) });
  }
  // Optional: a normal date at the city's place, open from the start (its conditions are not copied).
  const date = template.date && (() => {
    const destination = { ...clone(template.date.destination), id: id("date_destination"), cityId };
    dateDestinations.push(destination);
    const { when: _when, until: _until, ...copied } = clone(template.date.date);
    const entry = { ...copied, id: id("date"), chapterId: cityId, destinationId: destination.id,
      storyId: ownStory(template.date.date.storyId, `${cityId}/date`) };
    dates.push(entry);
    return entry;
  })();

  // Travel: a hotel and one place hosting every event, both copies of the normal episode's place.
  const hotel = { ...clone(template.normal.place), id: id("hotel"), cityId, landmarkIds: [], destinationIds: [] };
  const place = { ...clone(template.normal.place), id: id("place"), cityId,
    landmarkIds: [normalLandmark.id, ...specials.map((item) => item.landmark.id)], destinationIds: date ? [date.destinationId] : [] };
  const routes = [[hotel.id, hotel.id, 0], [hotel.id, place.id, 5], [place.id, hotel.id, 5], [place.id, place.id, 0]].map(([fromPlaceId, toPlaceId, minutes]) => ({
    ...clone(template.walkRoute), fromPlaceId: String(fromPlaceId), toPlaceId: String(toPlaceId), minutes: Number(minutes), cost: 0,
  }));
  const event = (eventId: string, category: "main" | "date", apCost = 0) => ({ ...clone(template.normal.event), id: eventId, cityId,
    placeId: place.id, category, activityMinutes: 15, apCost });
  const events = [event(normal.id, "main"), ...specials.map((item) => event(item.special.battleId, "main")), event(finale.id, "main"),
    ...(date ? [event(date.id, "date", date.apCost)] : [])];
  const { firstClearReward } = template.city.city;
  const city = { ...clone(template.city.city), id: cityId, nextCityId: options.nextCityId, nameJa: options.nameJa ?? "試験都市",
    firstClearReward: { ...firstClearReward, rewardSourceId: `${prefix}_${firstClearReward.rewardSourceId}` },
    landmarkIdsPlanned: place.landmarkIds };
  // Scenes of a test city start with its own place's background, not the template's story background.
  const travelSettings = { ...clone(template.city.travelSettings), hotelPlaceId: hotel.id };
  delete travelSettings.storyBackgroundId;
  cityContents[cityId] = { city, travel: { cityId, places: [hotel, place], routes, events }, travelSettings };
  if (previous) previous.city.nextCityId = city.id;

  return () => {
    if (addedCity && owner) owner.cities.splice(owner.cities.indexOf(addedCity), 1);
    if (previous) {
      if (previousNext === undefined) delete previous.city.nextCityId;
      else previous.city.nextCityId = previousNext;
    }
    if (originalCity) cityContents[cityId] = originalCity;
    else delete cityContents[cityId];
    episodes.splice(sizes.episodes); battles.splice(sizes.battles); landmarks.splice(sizes.landmarks);
    dates.splice(sizes.dates); dateDestinations.splice(sizes.destinations); tourismClues.splice(sizes.clues);
    journeyConfig.storyBattles.splice(sizes.specials); rewardRules.splice(sizes.rewards); allRewardRules.splice(sizes.allRewards);
    encounters.items.splice(sizes.items); encounters.encounters.splice(sizes.encounters);
    for (const id of addedStories) delete stories[id];
    for (const id of addedQuizzes) delete battleQuizzes[id];
  };
}

/** Development/tests only. These are fictional copies, never real city data. */
export function installJourneyTestCities(journeyId: string): () => void {
  const journey = getJourney(journeyId);
  if (!journey || journey.status !== "preparing")
    throw new Error(`制作中の旅行編ではありません: ${journeyId}`);
  const fixtures = journey.cities.map((city, index) => ({ cityId: city.id,
    nameJa: `${city.nameJa}（仮データ）`, nextCityId: journey.cities[index + 1]?.id }));
  // Never merge fictional scenes into real authored story content. The
  // temporary replacement is limited to empty prototypes and test fixtures.
  for (const fixture of fixtures) {
    if (episodes.some((episode) => episode.cityId === fixture.cityId))
      throw new Error(`実際のシナリオがある都市を仮データで置換できません: ${fixture.cityId}`);
  }
  const cleanups = fixtures.map((fixture) => installTestCity({ ...fixture, previousCityId: null }));
  return () => { for (const cleanup of cleanups.reverse()) cleanup(); };
}

/**
 * Debug "仮の場面": fictional cities for every preparing journey that has no
 * authored episode yet. A preparing journey whose cities already have real
 * scenes is left as it is (installJourneyTestCities refuses to replace it).
 */
export function installPreparingJourneyTestCities(): () => void {
  const cleanups: Array<() => void> = [];
  const cleanup = () => { for (const item of cleanups.reverse()) item(); };
  try {
    for (const journey of journeys.filter((item) => item.status === "preparing" &&
      !item.cities.some((city) => episodes.some((episode) => episode.cityId === city.id))))
      cleanups.push(installJourneyTestCities(journey.id));
  } catch (error) {
    cleanup();
    throw error;
  }
  return cleanup;
}
