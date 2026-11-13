import { describe, expect, it } from "vitest";
import { allRewardRules, battles, cityContents, dates, episodes, journeyConfig, landmarks, progression, scenes, tours } from "../src/content";
import { encounters } from "../src/content/encounters";
import { journeys } from "../src/content/journeys";
import { isTourOnlyPlace } from "../src/content/travel-schemas";
import { mainPaymentsOf, requiredCitySpend, sceneItemsOf, tourProgression, type ProgressionContent } from "./progression-check";

// AGENTS.md: 「いちばん安く回れば本筋を最後まで遊べることは、テストで守る」. For every published journey of the last content:build
// (the sample too after content:build -- --with-sample), the journey's budget covers what its cities' finales require at the least,
// counted by the money warning's own function (requiredCitySpend: each required main part at its cheapest fares and admission, a
// tour-only place at its tour's cheapest offer, and the main parts' # on_done: payments). Money a scene gives is not counted.
// Running short by playing the dearest way is part of the trip and is not checked here (the balance report shows it).

const content: ProgressionContent = {
  journeys, episodes, storyBattles: journeyConfig.storyBattles, battles, landmarks, encounters: encounters.encounters, items: encounters.items, dates,
  rewards: allRewardRules, romance: progression, sceneItems: sceneItemsOf(scenes),
  travel: Object.values(cityContents).map(({ city, travel, travelSettings }) => ({ cityId: city.id, hotelPlaceId: travelSettings.hotelPlaceId,
    initialBudget: travelSettings.initialBudget, events: travel.events, routes: travel.routes,
    tourOnlyPlaceIds: travel.places.filter((place) => isTourOnlyPlace(place)).map((place) => place.id) })),
  tours: tours.map(tourProgression),
  mainPayments: mainPaymentsOf(scenes, { episodes, storyBattles: journeyConfig.storyBattles, battles }),
};

describe("journey budgets", () => {
  it("let every published journey's main story be played to the end at the cheapest fares", () => {
    const available = journeys.filter((journey) => journey.status === "available");
    expect(available.length).toBeGreaterThan(0);
    const rows = available.map((journey) => {
      // The journey's budget, or its first city's (the same start as the progression check's).
      const budget = journey.initialBudget ?? cityContents[journey.cities[0].id]?.travelSettings.initialBudget ?? 0;
      const spend = journey.cities.map((city) => ({ cityId: city.id, money: requiredCitySpend(content, city.id).money }));
      return { journeyId: journey.id, budget, spend, total: spend.reduce((sum, city) => sum + city.money, 0) };
    });
    console.log(rows.map((row) => `${row.journeyId}: ${row.spend.map((city) => `${city.cityId} ${city.money}`).join(", ")}; ` +
      `total ${row.total}, budget ${row.budget}`).join("\n"));
    expect(rows.filter((row) => row.total > row.budget).map((row) =>
      `${row.journeyId}: the main story needs ${row.total} at the cheapest fares, more than the budget ${row.budget}`)).toEqual([]);
  });
});
