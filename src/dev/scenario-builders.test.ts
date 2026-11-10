import { beforeAll, describe, expect, it } from "vitest";
import { balance, episodes, getCityContent } from "../content";
import { getJourney, journeys } from "../content/journeys";
import { leaveBattle } from "../domain/battle";
import { storyBattlesForCity } from "../domain/chapter";
import { advanceDate, chooseDate, createGame, validateGameState, type GameState } from "../domain/game";
import { startTourismBattle } from "../domain/tourism";
import { beginTravelEvent } from "../domain/travel-game";
import { encounters } from "../content/encounters";
import {
  advanceEncounter, chooseEncounter, continueTourismEncounters, encounterChoiceOption, encounterVisitSlot, finishEncounter,
  getActiveEncounterDefinition, leaveBattleToFreeTime,
} from "../domain/encounter";
import {
  cityFinaleResult, cityMidway, cityStart, completedCity, correctAnswer, finishEpisode, firstCorrect, newJourney,
  openBattleScene, openEpilogueScene, openTourismScene, playBattleToResult, playEpisodeToResult, readEpilogue,
  readGuide, rollTickets, startDateScene, startEncounterScene, withAp, wrongAnswer, bookTour, playTour, tourScene,
} from "./scenario-builders";
import { installTourTestCity, testTour } from "./test-tours";

const noScene = { activeTourism: null, activeBattle: null, activeDate: null, activeEncounter: null, activeEpilogue: null };

/** Play the open encounter with the option `optionId` to its end; its moment goes on (continueTourismEncounters). */
function playEncounter(initial: GameState, optionId: string): GameState {
  let state = initial;
  const event = getActiveEncounterDefinition(state.activeEncounter!);
  for (let step = 0; !state.activeEncounter!.frame.choices.length; step++) {
    expect(step).toBeLessThan(50);
    state = advanceEncounter(state, state.revision);
  }
  const choice = state.activeEncounter!.frame.choices.find((item) => encounterChoiceOption(event, item)?.id === optionId)!;
  state = chooseEncounter(state, choice.index, state.revision);
  for (let step = 0; !state.activeEncounter!.frame.ended; step++) {
    expect(step).toBeLessThan(50);
    state = advanceEncounter(state, state.revision);
  }
  return continueTourismEncounters(state, finishEncounter(state, state.revision), () => 0);
}
const finaleOf = (cityId: string) => episodes.find((item) => item.cityId === cityId && item.kind === "city_finale")!;

// Every complete city of every playable journey in the generated content (the
// unit tests build it with the sample journey): a new journey can reach each
// city's finale, clear it and read its epilogue without a browser.
const playableCities = journeys.filter((journey) => journey.status === "available").flatMap((journey) =>
  journey.cities.filter((city) => getCityContent(city.id).city.productionStatus === "complete")
    .map((city, index) => ({ journeyId: journey.id, cityId: city.id, earlier: journey.cities.slice(0, index).map((item) => item.id),
      afterEpilogue: journey.cityTransition === "after_epilogue" })));

beforeAll(() => {
  if (!getJourney("sample_trip"))
    throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してから、もう一度テストしてください。");
});

describe("scenario builders", () => {
  it("lists the playable cities from the data", () => {
    expect(playableCities.map((item) => item.cityId)).toEqual(expect.arrayContaining(["milano", "delhi", "agra", "jaipur", "mihon"]));
  });

  it.each(playableCities)("starts, reaches the finale result, clears and ends $cityId ($journeyId)", ({ journeyId, cityId, earlier, afterEpilogue }) => {
    const start = cityStart(cityId, ["航", "澪"]);
    expect(start).toMatchObject({ currentCityId: cityId, playerName: "航", heroineName: "澪", completedCityIds: earlier, ...noScene });
    expect(start.travel.currentPlaceId).toBe(start.travel.hotelPlaceId);
    // A journey that moves on after the epilogue has shown every earlier city's epilogue.
    expect(start.viewedEpilogueCityIds).toEqual(afterEpilogue ? earlier : []);
    if (!earlier.length) expect(start).toEqual(newJourney(journeyId, ["航", "澪"]));

    const finale = cityFinaleResult(cityId);
    expect(finale.activeBattle).toMatchObject({ battleId: finaleOf(cityId).battleId, phase: "result" });
    expect(finale.completedCityIds).toEqual([...earlier, cityId]);
    expect(finale.completedEpisodeIds).toEqual(expect.arrayContaining(episodes.filter((item) => item.cityId === cityId).map((item) => item.id)));

    const cleared = completedCity(cityId);
    expect(cleared).toMatchObject({ ...noScene, completedCityIds: [...earlier, cityId] });
    expect(cleared).toEqual(validateGameState(leaveBattle(finale, finale.revision)));

    const ended = readEpilogue(openEpilogueScene(cleared));
    expect(ended.viewedEpilogueCityIds).toContain(cityId);
    expect(ended.currentCityId).toBe(cityId);
  });

  it.each(playableCities)("is midway through $cityId: half of the battles before its finale won, back in free time", ({ cityId }) => {
    const midway = cityMidway(cityId);
    const stops = episodes.filter((item) => item.cityId === cityId && item.kind !== "city_finale");
    const done = midway.battleRecords.filter((record) => [...stops.map((item) => item.battleId), ...storyBattlesForCity(cityId).map((item) => item.battleId)].includes(record.battleId));
    expect(midway).toMatchObject({ ...noScene, currentCityId: cityId });
    expect(done).toHaveLength(Math.ceil((stops.length + storyBattlesForCity(cityId).length) / 2));
    expect(midway.completedCityIds).not.toContain(cityId);
  });

  it("answers by the given picker and calls `after` for every action", () => {
    const started = openBattleScene(completedCity("milano"), "milano_duomo_01");
    const questions = 3;
    const seen: Array<[number, number]> = [];
    const all = playBattleToResult(started, { after: (next, previous) => { seen.push([previous.revision, next.revision]); return next; } });
    expect(all.activeBattle).toMatchObject({ phase: "result", score: questions });
    expect(seen.length).toBeGreaterThan(questions);
    expect(seen.every(([before, after]) => after > before)).toBe(true);
    expect(playBattleToResult(started, { answer: wrongAnswer }).activeBattle?.score).toBe(0);
    expect(playBattleToResult(started, { answer: firstCorrect(2) }).activeBattle?.score).toBe(2);
    expect(playBattleToResult(started, { answer: correctAnswer }).activeBattle?.answers).toEqual(all.activeBattle?.answers);
    // A restored state can be returned from `after` (a save/load round trip).
    const restored = playBattleToResult(started, { after: (next) => validateGameState(JSON.parse(JSON.stringify(next))) });
    expect(restored).toEqual(all);
  });

  it("presents the correct evidence of special battles B and C", () => {
    for (const battleId of ["milano_la_scala_b01", "smp_mihon_special_b_market", "smp_mihon_special_c_library"]) {
      const cityId = battleId.startsWith("smp_") ? "mihon" : "milano";
      const result = playBattleToResult(openBattleScene(completedCity(cityId), battleId));
      expect(result.activeBattle, battleId).toMatchObject({ battleId, phase: "result" });
      expect(result.activeBattle?.answers.length, battleId).toBeGreaterThan(0);
    }
  });

  it("stops with a message instead of looping when an action changes nothing", () => {
    const fresh = newJourney("milano");
    expect(() => playBattleToResult(fresh)).toThrow("対決が始まっていません。");
    expect(() => playEpisodeToResult(fresh, finaleOf("milano").id)).toThrow("この操作では状態が変わりませんでした");
    expect(readGuide(fresh)).toEqual(fresh);
  });

  it("never returns a finale result or a cleared city whose clear is missing", () => {
    const finale = finaleOf("mihon");
    // `after` takes the clear away at the finale's result, as a broken clear rule would. Today the
    // state check (validateGameState: 「都市クリアの記録が一致しません。」) refuses it first; the
    // builders' own check (「…都市クリアになっていません。」) covers rules the state check would allow.
    const notCleared = (next: GameState) => next.activeBattle?.battleId === finale.battleId && next.activeBattle.phase === "result"
      ? { ...next, completedCityIds: next.completedCityIds.filter((id) => id !== "mihon") } : next;
    expect(() => cityFinaleResult("mihon", { after: notCleared })).toThrow(/都市クリア/u);
    expect(() => completedCity("mihon", { after: notCleared })).toThrow(/都市クリア/u);
  });

  it("reads or skips the guide of a main episode", () => {
    const fresh = newJourney("sample_trip");
    const read = finishEpisode(fresh, "smp_mihon_main_clock_tower", { guide: "read" });
    const skipped = finishEpisode(fresh, "smp_mihon_main_clock_tower");
    expect(read).toMatchObject(noScene);
    expect(read.completedEpisodeIds).toEqual(["smp_mihon_main_clock_tower"]);
    expect(read.completedGuideIds.length).toBe(1);
    expect(skipped.completedGuideIds).toEqual([]);
    const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, item) => sum + item.remainingAp, 0);
    expect(totalAp(read)).toBe(totalAp(skipped) + 1);
  });

  it("settles a map event at the battle result like the game screen", () => {
    const fresh = createGame("航", "澪", { journeyId: "sample_trip" });
    const travelling = beginTravelEvent(fresh, "smp_mihon_main_clock_tower", "walk", fresh.revision, () => 0);
    const event = travelling.travel.activeEvent!;
    expect(event.eventId).toBe("smp_mihon_main_clock_tower");
    // The tower's stall (priority -1) comes first on the trip; after it, the visit's guide opens.
    expect(travelling.activeEncounter).toMatchObject({ encounterId: "smp_mihon_bookmark_stall" });
    const arrived = playEncounter(travelling, "later");
    expect(arrived.activeTourism).toMatchObject({ landmarkId: "mihon_clock_tower", phase: "guide" });
    expect(arrived.travel.activeEvent).toEqual(event);
    const guided = readGuide(arrived);
    const result = playBattleToResult(startTourismBattle(guided, guided.revision));
    expect(result.activeBattle?.phase).toBe("result");
    // The time window settles when the visit's occasion closes (stage 3b): leaving the result, after its +N scenes.
    expect(result.travel).toMatchObject({ activeEvent: event, currentPlaceId: event.placeId });
    let left = leaveBattleToFreeTime(result, result.revision, () => 0);
    for (let guard = 0; left.activeEncounter && guard < 200; guard++) {
      const active = left.activeEncounter;
      const current = left;
      left = active.frame.choices.length ? chooseEncounter(current, active.frame.choices[0].index, current.revision)
        : continueTourismEncounters(current, active.frame.ended ? finishEncounter(current, current.revision) : advanceEncounter(current, current.revision), () => 0);
    }
    expect(left.travel).toMatchObject({ activeEvent: null, minute: event.endMinute, currentPlaceId: event.placeId });
  });

  it("opens Debug's scenes at their places with the saved reaction ticket", () => {
    const cleared = withAp(completedCity("mihon"), 9);
    expect(cleared).toMatchObject({ ap: 9, pendingApRewards: [] });
    expect(withAp(cleared, 99).ap).toBe(balance.apCap);
    expect(withAp(cleared, -1).ap).toBe(0);

    const tower = openTourismScene(cleared, "mihon_clock_tower");
    expect(tower.activeTourism).toMatchObject({ landmarkId: "mihon_clock_tower", phase: "guide" });
    expect(tower.travel.currentPlaceId).toBe(getCityContent("mihon").travel.places.find((place) => place.landmarkIds?.includes("mihon_clock_tower"))!.id);

    // Met as play meets them, at the moment of the clock tower's visit their head tags name: the stall (-1) on the
    // departure from the map, before the guide; the gift (+1) on leaving the tower battle's result, after the stall
    // was played with its first choice (ask: it gives the bookmark the gift needs).
    const stall = startEncounterScene(cityStart("mihon"), "smp_mihon_bookmark_stall", rollTickets.positive);
    expect(stall.activeEncounter).toMatchObject({ encounterId: "smp_mihon_bookmark_stall" });
    expect(stall.occasion).toMatchObject({ eventId: "smp_mihon_main_clock_tower", at: "smp_mihon_bookmark_stall" });
    expect(stall.travel.activeEvent?.eventId).toBe("smp_mihon_main_clock_tower");
    // The visit is recorded as it opens (any order; stage 3b, 3.9 (b)).
    expect(stall.visitedLandmarkIds).toEqual(["mihon_clock_tower"]);
    const gift = startEncounterScene(cityStart("mihon"), "smp_mihon_bookmark_gift", rollTickets.positive);
    expect(gift.activeEncounter).toMatchObject({ encounterId: "smp_mihon_bookmark_gift" });
    expect(gift.occasion).toMatchObject({ at: "smp_mihon_bookmark_gift", ran: ["guide", "observe", "battle"] });
    expect(gift).toMatchObject({ inventory: { smp_mihon_three_bookmark: "held" }, completedEncounterIds: ["smp_mihon_bookmark_stall"],
      activeBattle: null, completedEpisodeIds: ["smp_mihon_main_clock_tower"] });
    // The time window settles when the visit's occasion closes (after its +N scenes; stage 3b).
    expect(gift.travel.activeEvent?.eventId).toBe("smp_mihon_main_clock_tower");
    // Every encounter of the sample's clock tower starts this way, each at its slot's moment.
    const towerEncounters = encounters.encounters.filter((item) => item.landmarkId === "mihon_clock_tower");
    expect(towerEncounters.map((item) => item.id).sort()).toEqual(["smp_mihon_bookmark_gift", "smp_mihon_bookmark_stall", "smp_mihon_clock_bell", "smp_mihon_clock_gears"]);
    for (const item of towerEncounters) {
      const started = startEncounterScene(cityStart("mihon"), item.id, rollTickets.positive);
      expect(started.activeEncounter?.encounterId, item.id).toBe(item.id);
      expect(started.occasion?.started, item.id).toContain(item.id);
      expect(validateGameState(JSON.parse(JSON.stringify(started))), item.id).toEqual(started);
    }
    // A cleared city no longer leads to the tower from the map, so neither can start there.
    expect(() => startEncounterScene(completedCity("mihon"), "smp_mihon_bookmark_gift", rollTickets.positive))
      .toThrow("この交流は、地図から観光地へ出発したときに起きます。");

    for (const [roll, ticket] of Object.entries(rollTickets)) {
      let date = startDateScene(cleared, "smp_mihon_date_tower_square", ticket);
      expect(date.activeDate?.dateId).toBe("smp_mihon_date_tower_square");
      expect(date.ap).toBeLessThan(9);
      for (let step = 0; !date.activeDate!.frame.choices.length; step++) {
        expect(step).toBeLessThan(50);
        date = advanceDate(date, date.revision);
      }
      date = chooseDate(date, date.activeDate!.frame.choices[0].index, date.revision);
      expect(date.activeDate!.resolvedChoices[0].result, roll).toBe(roll);
    }
    expect(() => startDateScene(withAp(cleared, 0), "smp_mihon_date_tower_square", 0)).toThrow("デートを始められません");
    expect(() => openEpilogueScene(cityStart("mihon"))).toThrow("エピローグは都市クリア後に開けます");
  });

  it("plays a battle at a tour-only place on its tour (booked, the night, the visit, the way back), so a cleared city has done its tour", () => {
    const cleanup = installTourTestCity();
    try {
      const cleared = completedCity(testTour.cityId);
      expect(cleared.completedCityIds).toContain(testTour.cityId);
      expect(cleared.completedTourIds).toEqual([testTour.tourId]);
      expect(cleared.tour).toBeNull();
      // A tour-only place is not a placement: its scenes open on the tour.
      expect(() => openTourismScene(cityStart(testTour.cityId), testTour.placeId))
        .toThrow("ツアー専用の地点です。ツアーの場面（scene=tour）から開けます。");
      // bookTour books at the hotel desk; playTour plays it through from a booking or from free time.
      const start = cityStart(testTour.cityId);
      const booked = bookTour(start, testTour.tourId);
      expect(booked.tour).toMatchObject({ status: "booked", offerId: testTour.desk.id });
      expect(bookTour(start, testTour.tourId, testTour.web.id).tour).toMatchObject({ offerId: testTour.web.id });
      expect(playTour(booked, testTour.tourId).completedTourIds).toEqual([testTour.tourId]);
      const results: string[] = [];
      const played = playTour(start, testTour.tourId, { onResult: (state) => results.push(state.activeBattle!.battleId) });
      expect(results).toEqual([testTour.eventId]);
      expect(played.travel.currentPlaceId).toBe(testTour.hotelPlaceId);
      expect(() => bookTour(played, testTour.tourId)).toThrow("この進行状態ではツアー「見本の街の日帰りツアー」を予約できません。");
      // Debug's tour scene: booked, or at its visit.
      expect(tourScene(start, testTour.tourId).tour?.status).toBe("booked");
      expect(tourScene(start, testTour.tourId, "visit").occasion?.eventId).toBe(testTour.eventId);
    } finally { cleanup(); }
  });
});
