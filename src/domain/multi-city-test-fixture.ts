/** In-memory fixtures used only by tests and the development-only Debug entry. */
import {
  allRewardRules, battleQuizzes, battles, cityContents, dateDestinations, dates,
  episodes, journeyConfig, landmarks, rewardRules, stories, tourismClues,
} from "../content";
import { encounters } from "../content/encounters";
import { getJourneyForCity } from "../content/journeys";

/** Reuse real executable scripts/assets while giving every owned entity a distinct ID. */
export function installTestCity(options: {
  cityId?: string;
  nameJa?: string;
  previousCityId?: string | null;
  nextCityId?: string;
} = {}): () => void {
  const cityId = options.cityId ?? "test_city";
  // Real prototype cities may already be registered. Preserve the exact
  // original content object when installing a temporary debug fixture.
  const originalCity = cityContents[cityId];
  const prefix = cityId === "test_city" ? "test" : cityId;
  const id = (suffix: string) => `${prefix}_${suffix}`;
  const milan = cityContents.milano;
  const previous = options.previousCityId === null ? undefined : cityContents[options.previousCityId ?? "milano"];
  const previousNext = previous?.city.nextCityId;
  // Ad-hoc test cities inherit their predecessor's journey currency. Planned
  // Indian cities are already registered in the journey catalog.
  const owner = getJourneyForCity(cityId) ?? getJourneyForCity(previous?.city.id ?? "milano");
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
    stories[id] = stories[sourceId];
    addedStories.push(id);
    return id;
  };
  const normalSource = episodes.find((item) => item.id === "milano_duomo_episode")!;
  const finaleSource = episodes.find((item) => item.id === "milano_finale")!;
  const normal = { ...clone(normalSource), id: id("episode"), cityId: cityId, landmarkId: id("landmark"),
    battleId: id("battle"), legacyChapterId: cityId, requiredEpisodeIds: [] };
  const finale = { ...clone(finaleSource), id: id("finale"), cityId: cityId, battleId: id("final_battle"),
    epilogueStoryId: ownStory(finaleSource.epilogueStoryId!, `${cityId}/epilogue`),
    legacyChapterId: cityId, requiredEpisodeIds: [normal.id] };
  episodes.push(normal, finale);

  const normalBattle = { ...clone(battles.find((item) => item.id === "milano_duomo_01")!), id: id("battle"), landmarkId: id("landmark") };
  const specialBattle = { ...clone(battles.find((item) => item.id === "milano_la_scala_b01")!), id: id("special"), landmarkId: id("special_landmark") };
  const finalBattle = { ...clone(battles.find((item) => item.id === "milano_city_boss_01")!), id: id("final_battle"), cityId: cityId };
  const normalLandmark = { ...clone(landmarks.find((item) => item.id === "duomo_milano")!), id: id("landmark"), cityId: cityId, battleId: normalBattle.id };
  const specialLandmark = { ...clone(landmarks.find((item) => item.id === "la_scala_case")!), id: id("special_landmark"), cityId: cityId, battleId: specialBattle.id };
  normalLandmark.guideStoryId = ownStory(normalLandmark.guideStoryId, `${cityId}/guide`);
  specialLandmark.guideStoryId = ownStory(specialLandmark.guideStoryId, `${cityId}/special_guide`);
  for (const [battle, landmarkId] of [[normalBattle, normalLandmark.id], [specialBattle, specialLandmark.id], [finalBattle, null]] as const) {
    const id = `${prefix}_${battle.quizId}`;
    const quiz = clone(battleQuizzes[battle.quizId]);
    quiz.id = id;
    quiz.landmarkId = landmarkId;
    if ("cityId" in quiz) quiz.cityId = cityId;
    quiz.questions = quiz.questions.map((question) => ({ ...question, id: `${prefix}_${question.id}` }));
    battleQuizzes[id] = quiz;
    addedQuizzes.push(id);
    battle.quizId = id;
    battle.storyId = ownStory(battle.storyId, `${cityId}/${battle.id}`);
  }
  const clueMap = new Map<string, string>();
  for (const [sourceId, target] of [["duomo_milano", normalLandmark], ["la_scala_case", specialLandmark]] as const) {
    target.clueIds = target.clueIds.map((id) => {
      const clue = clone(tourismClues.find((item) => item.id === id && item.landmarkId === sourceId)!);
      const newId = `${prefix}_${id}`;
      clueMap.set(id, newId);
      tourismClues.push({ ...clue, id: newId, landmarkId: target.id });
      return newId;
    });
  }
  if (specialBattle.reasoning) {
    specialBattle.reasoning.caseClueIds = specialBattle.reasoning.caseClueIds.map((id) => clueMap.get(id)!);
    specialBattle.reasoning.correctClueIds = specialBattle.reasoning.correctClueIds.map((id) => clueMap.get(id)!);
  }
  battles.push(normalBattle, specialBattle, finalBattle);
  landmarks.push(normalLandmark, specialLandmark);
  const item = { ...clone(encounters.items.find((entry) => entry.id === "blue_pick")!), id: id("item"), cityId: cityId };
  encounters.items.push(item);
  const encounter = { ...clone(encounters.encounters.find((entry) => entry.id === "duomo_string")!),
    id: id("encounter"), cityId: cityId, landmarkId: normalLandmark.id, completionItemId: item.id };
  encounter.storyId = ownStory(encounter.storyId, `${cityId}/encounter`);
  encounters.encounters.push(encounter);

  const special = clone(journeyConfig.storyBattles.find((item) => item.battleId === "milano_la_scala_b01")!);
  special.battleId = specialBattle.id;
  special.requiredEpisodeIds = [];
  if (special.completionReward) special.completionReward.id = id("special_first");
  journeyConfig.storyBattles.push(special);
  if (special.completionReward) allRewardRules.push(special.completionReward);
  const originalRewards = rewardRules.filter((item) => [normalSource.id, finaleSource.id].includes(item.episodeId));
  for (const source of originalRewards) {
    const rule = { ...clone(source), id: `${prefix}_${source.id}`, episodeId: source.episodeId === normalSource.id ? normal.id : finale.id };
    rewardRules.push(rule);
    allRewardRules.push(rule);
  }

  const destination = { ...clone(dateDestinations[0]), id: id("date_destination"), cityId: cityId };
  dateDestinations.push(destination);
  const date = { ...clone(dates.find((item) => item.id === "milano_cafe_01")!), id: id("date"), chapterId: cityId,
    destinationId: destination.id, requiredCompletedChapters: [], requiredCompletedCityIds: [], requiredCompletedEpisodeIds: [], requiredPlayedDateIds: [] };
  date.storyId = ownStory(date.storyId, `${cityId}/date`);
  dates.push(date);

  const original = milan.travel;
  const sourcePlace = original.places.find((item) => item.id === "p_duomo")!;
  const sourceRoute = original.routes.find((item) => item.mode === "walk" && item.fromPlaceId !== item.toPlaceId)!;
  const hotel = { ...clone(sourcePlace), id: id("hotel"), cityId: cityId, landmarkIds: [], destinationIds: [] };
  const place = { ...clone(sourcePlace), id: id("place"), cityId: cityId, landmarkIds: [normalLandmark.id, specialLandmark.id], destinationIds: [destination.id] };
  const routes = [[hotel.id, hotel.id, 0], [hotel.id, place.id, 5], [place.id, hotel.id, 5], [place.id, place.id, 0]].map(([fromPlaceId, toPlaceId, minutes]) => ({
    ...clone(sourceRoute), fromPlaceId: String(fromPlaceId), toPlaceId: String(toPlaceId), minutes: Number(minutes), cost: 0,
  }));
  const eventSource = original.events.find((item) => item.id === normalSource.id)!;
  const event = (id: string, category: "main" | "date") => ({ ...clone(eventSource), id, cityId: cityId, placeId: place.id, category, activityMinutes: 15, apCost: category === "date" ? date.apCost : 0 });
  const city = { ...clone(milan.city), id: cityId, nextCityId: options.nextCityId, nameJa: options.nameJa ?? "試験都市", firstClearReward: { rewardSourceId: id("episode_duomo_first"), ap: 1 }, landmarkIdsPlanned: [normalLandmark.id, specialLandmark.id] };
  cityContents[cityId] = { city, travel: { cityId: city.id, places: [hotel, place], routes, events: [event(normal.id, "main"), event(special.battleId, "main"), event(finale.id, "main"), event(date.id, "date")] },
    travelSettings: { ...clone(milan.travelSettings), hotelPlaceId: hotel.id } };
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
export function installIndiaTestCities(): () => void {
  const fixtures = [
    { cityId: "delhi", nameJa: "デリー（仮データ）", nextCityId: "agra" },
    { cityId: "agra", nameJa: "アーグラ（仮データ）", nextCityId: "jaipur" },
    { cityId: "jaipur", nameJa: "ジャイプール（仮データ）" },
  ];
  // Never merge fictional scenes into real authored story content. The
  // temporary replacement is limited to empty prototypes and test fixtures.
  for (const fixture of fixtures) {
    if (episodes.some((episode) => episode.cityId === fixture.cityId))
      throw new Error(`実際のシナリオがある都市を仮データで置換できません: ${fixture.cityId}`);
  }
  const cleanups = fixtures.map((fixture) => installTestCity({ ...fixture, previousCityId: null }));
  return () => { for (const cleanup of cleanups.reverse()) cleanup(); };
}
