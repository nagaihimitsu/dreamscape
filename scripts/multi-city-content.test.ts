import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "./content-pipeline";
import { prepareContentFixture } from "../src/content/test-fixtures";

let root: string;
const prefix = (id: string) => `test_${id}`;
async function read(relative: string): Promise<any> {
  return JSON.parse(await readFile(path.join(root, "content", relative), "utf8"));
}
async function write(relative: string, value: unknown): Promise<void> {
  await writeFile(path.join(root, "content", relative), JSON.stringify(value));
}

/** A fictional, isolated second city reuses fixture artwork and Ink. */
async function addSecondCity() {
  const milan = await read("cities/milano.json");
  const second = { ...milan, id: "test_city", nameJa: "試験都市", nextCityId: undefined,
    landmarkIdsPlanned: [prefix("duomo_milano")],
    firstClearReward: { rewardSourceId: prefix("episode_duomo_first"), ap: 1 } };
  milan.nextCityId = second.id;
  await write("cities/milano.json", milan);
  await write("cities/test_city.json", second);
  const catalog = await read("journeys/catalog.json");
  catalog.journeys.find((item: any) => item.id === "milano").cities.push({ id: second.id, nameJa: second.nameJa });
  await write("journeys/catalog.json", catalog);

  const journey = await read("progression/journey.json");
  const chosenEpisodes = journey.episodes.filter((episode: any) => ["milano_duomo_episode", "milano_finale"].includes(episode.id));
  journey.episodes.push(...chosenEpisodes.map((episode: any) => ({ ...episode, id: prefix(episode.id),
    cityId: second.id, legacyChapterId: second.id, landmarkId: episode.landmarkId && prefix(episode.landmarkId),
    battleId: prefix(episode.battleId), requiredEpisodeIds: episode.kind === "city_finale" ? [prefix("milano_duomo_episode")] : [] })));
  journey.rewards.push(...journey.rewards.filter((reward: any) => chosenEpisodes.some((episode: any) => episode.id === reward.episodeId))
    .map((reward: any) => ({ ...reward, id: prefix(reward.id), episodeId: prefix(reward.episodeId) })));
  await write("progression/journey.json", journey);

  const battles = await read("battles/catalog.json");
  battles.battles.push(...battles.battles.filter((battle: any) => chosenEpisodes.some((episode: any) => episode.battleId === battle.id))
    .map((battle: any) => ({ ...battle, id: prefix(battle.id), quizId: prefix(battle.quizId),
      ...(battle.cityId ? { cityId: second.id } : {}), landmarkId: battle.landmarkId && prefix(battle.landmarkId) })));
  await write("battles/catalog.json", battles);

  const learning = await read("learning/translations.json");
  for (const name of ["duomo_B1", "sound_duomo_B1", "sound_finale_B1"]) {
    const quiz = await read(`quizzes/${name}.json`);
    const copy = { ...quiz, id: prefix(quiz.id), ...(quiz.cityId ? { cityId: second.id } : {}),
      landmarkId: quiz.landmarkId && prefix(quiz.landmarkId), questions: quiz.questions.map((question: any) => {
        if (learning.questions[question.id]) learning.questions[prefix(question.id)] = learning.questions[question.id];
        return { ...question, id: prefix(question.id) };
      }) };
    await write(`quizzes/test_${name}.json`, copy);
  }
  await write("learning/translations.json", learning);

  const tourism = await read("tourism/catalog.json");
  const landmark = tourism.landmarks.find((item: any) => item.id === "duomo_milano");
  tourism.landmarks.push({ ...landmark, id: prefix(landmark.id), cityId: second.id,
    battleId: prefix(landmark.battleId), clueIds: landmark.clueIds.map(prefix) });
  tourism.clues.push(...tourism.clues.filter((clue: any) => clue.landmarkId === landmark.id)
    .map((clue: any) => ({ ...clue, id: prefix(clue.id), landmarkId: prefix(clue.landmarkId),
      factId: prefix(clue.factId), relatedQuestionIds: clue.relatedQuestionIds.map(prefix) })));
  await write("tourism/catalog.json", tourism);

  const originalTravel = await read("travel/milano.json");
  const placeIds = ["p_hotel", "p_duomo"];
  const places = originalTravel.places.filter((place: any) => placeIds.includes(place.id)).map((place: any) => ({
    ...place, id: prefix(place.id), cityId: second.id,
    landmarkIds: place.id === "p_duomo" ? [prefix("duomo_milano")] : [], destinationIds: [],
  }));
  const routes = originalTravel.routes.filter((route: any) => placeIds.includes(route.fromPlaceId) && placeIds.includes(route.toPlaceId))
    .map((route: any) => ({ ...route, fromPlaceId: prefix(route.fromPlaceId), toPlaceId: prefix(route.toPlaceId) }));
  const events = originalTravel.events.filter((event: any) => chosenEpisodes.some((episode: any) => episode.id === event.id))
    .map((event: any) => ({ ...event, id: prefix(event.id), cityId: second.id, placeId: prefix("p_duomo") }));
  await write("travel/test_city.json", { cityId: second.id, places, routes, events });
  const settings = await read("travel/milano-settings.json");
  await write("travel/test_city-settings.json", { ...settings, hotelPlaceId: prefix("p_hotel") });
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "dreamscape-multicity-"));
  await prepareContentFixture(root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("multi-city content build", () => {
  it("accepts a published city with an unfinished registered successor", async () => {
    const milano = await read("cities/milano.json");
    const successor = { ...milano, id: "future_city", nameJa: "準備中の都市", productionStatus: "prototype",
      firstClearReward: { rewardSourceId: "future_placeholder", ap: 0 }, landmarkIdsPlanned: [] };
    milano.nextCityId = successor.id;
    await write("cities/milano.json", milano);
    await write("cities/future_city.json", successor);
    const catalog = await read("journeys/catalog.json");
    catalog.journeys.find((item: any) => item.id === "milano").cities.push({ id: successor.id, nameJa: successor.nameJa });
    await write("journeys/catalog.json", catalog);
    const travel = await read("travel/milano.json");
    travel.cityId = successor.id;
    travel.places = travel.places.map((place: any) => ({ ...place, id: `future_${place.id}`, cityId: successor.id, landmarkIds: [], destinationIds: [] }));
    travel.routes = travel.routes.map((route: any) => ({ ...route, fromPlaceId: `future_${route.fromPlaceId}`, toPlaceId: `future_${route.toPlaceId}` }));
    travel.events = [];
    await write("travel/future_city.json", travel);
    const settings = await read("travel/milano-settings.json");
    settings.hotelPlaceId = `future_${settings.hotelPlaceId}`;
    await write("travel/future_city-settings.json", settings);
    await expect(buildContent(root, false)).resolves.toBeDefined();
  }, 120000);

  it("builds two registered cities with independent content and travel", async () => {
    await addSecondCity();
    const catalog = await read("journeys/catalog.json");
    catalog.journeys.find((item: any) => item.id === "milano").cities.push({ id: "future_city", nameJa: "予定都市" });
    await write("journeys/catalog.json", catalog);
    const result = await buildContent(root, false);
    expect(result.journey.episodes.some((episode) => episode.cityId === "test_city")).toBe(true);
    expect(result.tourism.landmarks.some((landmark) => landmark.cityId === "test_city")).toBe(true);
  }, 60000);

  it("rejects an unregistered or cyclic next city", async () => {
    const city = await read("cities/milano.json");
    city.nextCityId = "unknown_city";
    await write("cities/milano.json", city);
    await expect(buildContent(root, false)).rejects.toThrow(/Unknown or incomplete next city/);
    city.nextCityId = "milano";
    await write("cities/milano.json", city);
    await expect(buildContent(root, false)).rejects.toThrow(/Cyclic city route/);
  });

  it("rejects a departure to a city belonging to another journey", async () => {
    await addSecondCity();
    const catalog = await read("journeys/catalog.json");
    const milano = catalog.journeys.find((item: any) => item.id === "milano");
    const india = catalog.journeys.find((item: any) => item.id === "golden_triangle");
    india.cities.push(milano.cities.pop());
    await write("journeys/catalog.json", catalog);
    await expect(buildContent(root, false)).rejects.toThrow(/Next city is outside the journey order/);
  }, 60000);

  it("rejects a departure that skips a planned city", async () => {
    await addSecondCity();
    const catalog = await read("journeys/catalog.json");
    catalog.journeys.find((item: any) => item.id === "milano").cities.splice(1, 0, { id: "planned_city", nameJa: "予定都市" });
    catalog.journeys.find((item: any) => item.id === "milano").status = "preparing";
    await write("journeys/catalog.json", catalog);
    await expect(buildContent(root, false)).rejects.toThrow(/Next city is outside the journey order/);
  }, 60000);

  it("rejects journey initial AP above the configured cap", async () => {
    const catalog = await read("journeys/catalog.json");
    const balance = await read("romance/balance.json");
    catalog.journeys.find((item: any) => item.id === "golden_triangle").initialState.ap = balance.apCap + 1;
    await write("journeys/catalog.json", catalog);
    await expect(buildContent(root, false)).rejects.toThrow(/Journey initial AP exceeds cap/);
  }, 60000);

  it("checks the city's actual finale reward against the journey plan", async () => {
    const catalog = await read("journeys/catalog.json");
    catalog.journeys.find((item: any) => item.id === "milano").cityPlan = {
      cityClearAp: 4, lodgingCost: 10, mainTourismCount: 4, dateCount: 6,
    };
    await write("journeys/catalog.json", catalog);
    // Milan has a 4 AP legacy first-episode reward, but its city-clear reward is 3 AP.
    await expect(buildContent(root, false)).rejects.toThrow(/City clear reward does not match journey plan: milano/);
  }, 60000);

  it("checks the city's lodging setting against the journey plan", async () => {
    const catalog = await read("journeys/catalog.json");
    catalog.journeys.find((item: any) => item.id === "milano").cityPlan = {
      cityClearAp: 3, lodgingCost: 0, mainTourismCount: 4, dateCount: 6,
    };
    await write("journeys/catalog.json", catalog);
    await expect(buildContent(root, false)).rejects.toThrow(/City lodging cost does not match journey plan: milano/);
  }, 60000);

  it("rejects duplicate place IDs across cities", async () => {
    await addSecondCity();
    const travel = await read("travel/test_city.json");
    travel.places.find((place: any) => place.id === "test_p_hotel").id = "p_hotel";
    travel.routes.forEach((route: any) => {
      if (route.fromPlaceId === "test_p_hotel") route.fromPlaceId = "p_hotel";
      if (route.toPlaceId === "test_p_hotel") route.toPlaceId = "p_hotel";
    });
    await write("travel/test_city.json", travel);
    await expect(buildContent(root, false)).rejects.toThrow(/Duplicate travel place ID/);
  }, 60000);

  it("rejects a landmark assigned to the wrong city", async () => {
    await addSecondCity();
    const tourism = await read("tourism/catalog.json");
    tourism.landmarks.find((landmark: any) => landmark.id === "test_duomo_milano").cityId = "milano";
    await write("tourism/catalog.json", tourism);
    await expect(buildContent(root, false)).rejects.toThrow(/Unknown tourism city\/landmark/);
  }, 60000);

  it("rejects a main event at a place without its landmark", async () => {
    await addSecondCity();
    const travel = await read("travel/test_city.json");
    travel.events.find((event: any) => event.id === "test_milano_duomo_episode").placeId = "test_p_hotel";
    await write("travel/test_city.json", travel);
    await expect(buildContent(root, false)).rejects.toThrow(/Travel landmark place mismatch/);
  }, 60000);
});
