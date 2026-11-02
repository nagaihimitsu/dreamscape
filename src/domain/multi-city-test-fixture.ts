/** In-memory second-city fixtures for tests. Never imported by the application. */
import {
  allRewardRules, battleQuizzes, battles, cityContents, dateDestinations, dates,
  episodes, journeyConfig, landmarks, rewardRules, stories, tourismClues,
} from "../content";
import { encounters } from "../content/encounters";

/** Reuse real executable scripts/assets while giving every owned entity a distinct ID. */
export function installTestCity(): () => void {
  const milan = cityContents.milano;
  const previousNext = milan.city.nextCityId;
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
  const normal = { ...clone(normalSource), id: "test_episode", cityId: "test_city", landmarkId: "test_landmark",
    battleId: "test_battle", legacyChapterId: "test_city", requiredEpisodeIds: [] };
  const finale = { ...clone(finaleSource), id: "test_finale", cityId: "test_city", battleId: "test_final_battle",
    epilogueStoryId: ownStory(finaleSource.epilogueStoryId!, "test_city/epilogue"),
    legacyChapterId: "test_city", requiredEpisodeIds: [normal.id] };
  episodes.push(normal, finale);

  const normalBattle = { ...clone(battles.find((item) => item.id === "milano_duomo_01")!), id: "test_battle", landmarkId: "test_landmark" };
  const specialBattle = { ...clone(battles.find((item) => item.id === "milano_la_scala_b01")!), id: "test_special", landmarkId: "test_special_landmark" };
  const finalBattle = { ...clone(battles.find((item) => item.id === "milano_city_boss_01")!), id: "test_final_battle", cityId: "test_city" };
  const normalLandmark = { ...clone(landmarks.find((item) => item.id === "duomo_milano")!), id: "test_landmark", cityId: "test_city", battleId: normalBattle.id };
  const specialLandmark = { ...clone(landmarks.find((item) => item.id === "la_scala_case")!), id: "test_special_landmark", cityId: "test_city", battleId: specialBattle.id };
  normalLandmark.guideStoryId = ownStory(normalLandmark.guideStoryId, "test_city/guide");
  specialLandmark.guideStoryId = ownStory(specialLandmark.guideStoryId, "test_city/special_guide");
  for (const [battle, landmarkId] of [[normalBattle, normalLandmark.id], [specialBattle, specialLandmark.id], [finalBattle, null]] as const) {
    const id = `test_${battle.quizId}`;
    const quiz = clone(battleQuizzes[battle.quizId]);
    quiz.id = id;
    quiz.landmarkId = landmarkId;
    if ("cityId" in quiz) quiz.cityId = "test_city";
    quiz.questions = quiz.questions.map((question) => ({ ...question, id: `test_${question.id}` }));
    battleQuizzes[id] = quiz;
    addedQuizzes.push(id);
    battle.quizId = id;
    battle.storyId = ownStory(battle.storyId, `test_city/${battle.id}`);
  }
  const clueMap = new Map<string, string>();
  for (const [sourceId, target] of [["duomo_milano", normalLandmark], ["la_scala_case", specialLandmark]] as const) {
    target.clueIds = target.clueIds.map((id) => {
      const clue = clone(tourismClues.find((item) => item.id === id && item.landmarkId === sourceId)!);
      const newId = `test_${id}`;
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
  const item = { ...clone(encounters.items.find((entry) => entry.id === "blue_pick")!), id: "test_item", cityId: "test_city" };
  encounters.items.push(item);
  const encounter = { ...clone(encounters.encounters.find((entry) => entry.id === "duomo_string")!),
    id: "test_encounter", cityId: "test_city", landmarkId: normalLandmark.id, completionItemId: item.id };
  encounter.storyId = ownStory(encounter.storyId, "test_city/encounter");
  encounters.encounters.push(encounter);

  const special = clone(journeyConfig.storyBattles.find((item) => item.battleId === "milano_la_scala_b01")!);
  special.battleId = specialBattle.id;
  special.requiredEpisodeIds = [];
  if (special.completionReward) special.completionReward.id = "test_special_first";
  journeyConfig.storyBattles.push(special);
  if (special.completionReward) allRewardRules.push(special.completionReward);
  const originalRewards = rewardRules.filter((item) => [normalSource.id, finaleSource.id].includes(item.episodeId));
  for (const source of originalRewards) {
    const rule = { ...clone(source), id: `test_${source.id}`, episodeId: source.episodeId === normalSource.id ? normal.id : finale.id };
    rewardRules.push(rule);
    allRewardRules.push(rule);
  }

  const destination = { ...clone(dateDestinations[0]), id: "test_date_destination", cityId: "test_city" };
  dateDestinations.push(destination);
  const date = { ...clone(dates.find((item) => item.id === "milano_cafe_01")!), id: "test_date", chapterId: "test_city",
    destinationId: destination.id, requiredCompletedChapters: [], requiredCompletedCityIds: [], requiredCompletedEpisodeIds: [], requiredPlayedDateIds: [] };
  date.storyId = ownStory(date.storyId, "test_city/date");
  dates.push(date);

  const original = milan.travel;
  const sourcePlace = original.places.find((item) => item.id === "p_duomo")!;
  const sourceRoute = original.routes.find((item) => item.mode === "walk" && item.fromPlaceId !== item.toPlaceId)!;
  const hotel = { ...clone(sourcePlace), id: "test_hotel", cityId: "test_city", landmarkIds: [], destinationIds: [] };
  const place = { ...clone(sourcePlace), id: "test_place", cityId: "test_city", landmarkIds: [normalLandmark.id, specialLandmark.id], destinationIds: [destination.id] };
  const routes = [[hotel.id, hotel.id, 0], [hotel.id, place.id, 5], [place.id, hotel.id, 5], [place.id, place.id, 0]].map(([fromPlaceId, toPlaceId, minutes]) => ({
    ...clone(sourceRoute), fromPlaceId: String(fromPlaceId), toPlaceId: String(toPlaceId), minutes: Number(minutes), cost: 0,
  }));
  const eventSource = original.events.find((item) => item.id === normalSource.id)!;
  const event = (id: string, category: "main" | "date") => ({ ...clone(eventSource), id, cityId: "test_city", placeId: place.id, category, activityMinutes: 15, apCost: category === "date" ? date.apCost : 0 });
  const city = { ...clone(milan.city), id: "test_city", nextCityId: undefined, nameJa: "試験都市", firstClearReward: { rewardSourceId: "test_episode_duomo_first", ap: 1 }, landmarkIdsPlanned: [normalLandmark.id, specialLandmark.id] };
  cityContents.test_city = { city, travel: { cityId: city.id, places: [hotel, place], routes, events: [event(normal.id, "main"), event(special.battleId, "main"), event(finale.id, "main"), event(date.id, "date")] },
    travelSettings: { ...clone(milan.travelSettings), hotelPlaceId: hotel.id } };
  milan.city.nextCityId = city.id;

  return () => {
    if (previousNext === undefined) delete milan.city.nextCityId;
    else milan.city.nextCityId = previousNext;
    delete cityContents.test_city;
    episodes.splice(sizes.episodes); battles.splice(sizes.battles); landmarks.splice(sizes.landmarks);
    dates.splice(sizes.dates); dateDestinations.splice(sizes.destinations); tourismClues.splice(sizes.clues);
    journeyConfig.storyBattles.splice(sizes.specials); rewardRules.splice(sizes.rewards); allRewardRules.splice(sizes.allRewards);
    encounters.items.splice(sizes.items); encounters.encounters.splice(sizes.encounters);
    for (const id of addedStories) delete stories[id];
    for (const id of addedQuizzes) delete battleQuizzes[id];
  };
}
