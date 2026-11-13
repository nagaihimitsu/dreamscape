import { describe, expect, it } from "vitest";
import { allRewardRules, battles, dates, episodes, getCityContent, journeyConfig, landmarks, progression, scenes, tours } from "../../../src/content";
import { encounters } from "../../../src/content/encounters";
import { getJourney, journeys } from "../../../src/content/journeys";
import { isTourOnlyPlace } from "../../../src/content/travel-schemas";
import { mainPaymentsOf, requiredCitySpend, sceneItemsOf, tourProgression, type ProgressionContent } from "../../../scripts/progression-check";
import { journeyBalance } from "../../../scripts/journey-balance";
import { balanceInputs } from "../../../scripts/journey-balance-input";

// The Golden Triangle's budget covers what its cities' finales require at the least (tour decision 10), counted by the money
// warning's own function (requiredCitySpend: each required main part at its cheapest fares and admission, the main parts'
// # on_done: payments, and Fatehpur Sikri at its tour's cheapest offer without a condition, admission included).

const journey = getJourney("golden_triangle")!;
const content: ProgressionContent = {
  journeys, episodes, storyBattles: journeyConfig.storyBattles, battles, landmarks, encounters: encounters.encounters, items: encounters.items, dates,
  rewards: allRewardRules, romance: progression, sceneItems: sceneItemsOf(scenes),
  travel: journey.cities.map((city) => {
    const { travel, travelSettings } = getCityContent(city.id);
    return { cityId: city.id, hotelPlaceId: travelSettings.hotelPlaceId, initialBudget: travelSettings.initialBudget, events: travel.events, routes: travel.routes,
      tourOnlyPlaceIds: travel.places.filter((place) => isTourOnlyPlace(place)).map((place) => place.id) };
  }),
  tours: tours.map(tourProgression),
  mainPayments: mainPaymentsOf(scenes, { episodes, storyBattles: journeyConfig.storyBattles, battles }),
};

describe("Golden Triangle budget", () => {
  it("covers every city's required main parts, Fatehpur Sikri at its tour's front-desk price", () => {
    const spend = Object.fromEntries(journey.cities.map((city) => [city.id, requiredCitySpend(content, city.id)]));
    expect(spend.agra.eventIds).toContain("gt_agra_main_fatehpur_sikri");
    // The tour's cheapest offer without a condition is the inn's desk (₹3,200 for two, the ₹1,220 admission included).
    const desk = tours.find((tour) => tour.id === "gt_agra_tour_fatehpur_sikri")!.offers.find((offer) => offer.id === "hotel_desk")!;
    const withoutTour = requiredCitySpend({ ...content, tours: [] }, "agra").money;
    expect(spend.agra.money - withoutTour).toBe(desk.price);
    // The battles' # on_done: payments are counted (Jama Masjid ₹300, Amber Fort ₹900 and ₹300).
    expect(content.mainPayments).toMatchObject({ gt_delhi_main_jama_masjid: 300, gt_jaipur_main_amber_fort: 1200 });
    const total = Object.values(spend).reduce((sum, city) => sum + city.money, 0);
    expect(journey.initialBudget!).toBeGreaterThanOrEqual(total);
    console.log(`Golden Triangle required spend: ${journey.cities.map((city) => `${city.id} ₹${spend[city.id].money}`).join(", ")}; total ₹${total}; ` +
      `budget ₹${journey.initialBudget}`);
  });

  // The balance pass's rule (user decision 2026-11-13, ₹38,000): played at the cheapest fares, every main part, every date
  // and every scene payment fit the budget; the dearest way (an auto-rickshaw wherever one runs, every optional payment)
  // may not, and running short is part of the trip (India has no scene that gives money). The balance report counts it
  // (npm run balance:report; a second admission to a place is not counted).
  it("lets everything be played at the cheapest fares within the budget, and only at those", () => {
    const [input] = balanceInputs(process.cwd(), "golden_triangle");
    const report = journeyBalance(input);
    expect(report.budget).toBe(journey.initialBudget);
    expect(report.spend.min).toBeLessThanOrEqual(journey.initialBudget!);
    expect(report.spend.max).toBeGreaterThan(journey.initialBudget!);
    console.log(`Golden Triangle full play: ₹${report.spend.min}–₹${report.spend.max}; budget ₹${journey.initialBudget}`);
  });
});
