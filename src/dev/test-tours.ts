/**
 * Tests only: a tour of the sample journey's city (tour design stage 2a), installed into the shared catalogs and removed again.
 * The sample city 見本の街 (mihon) has the hotel scenes after waking that a booked tour waits for (unified design 2.3), so its
 * library (special battle C) or its clock tower (the main episode, with scenes around its visit) becomes a tour-only place here.
 */
import { cityContents, episodes, tours, type Tour } from "../content";
import { journeys } from "../content/journeys";
import { installTestCity } from "./test-cities";

type Variant = { placeId: string; eventId: string; activityMinutes: number };
const variants = {
  /** Special battle C at the library: guide, observation, the reasoning battle. */
  library: { placeId: "mihon_library", eventId: "smp_mihon_special_c_library", activityMinutes: 40 },
  /** The main episode at the clock tower: guide, observation, battle, and its scenes (an encounter after the battle). */
  clock_tower: { placeId: "mihon_clock_tower", eventId: "smp_mihon_main_clock_tower", activityMinutes: 60 },
} satisfies Record<string, Variant>;

/** The fixture's IDs. */
export const testTour = {
  cityId: "mihon",
  journeyId: "sample_trip",
  tourId: "smp_mihon_tour_test",
  hotelPlaceId: "mihon_hotel",
  desk: { id: "hotel_desk", price: 10 },
  web: { id: "web", price: 12 },
  ...variants.library,
} as const;

const source = { publisher: "Dreamscape 試験", title: "試験のツアー（架空）", url: "https://example.com/dreamscape-sample", checkedAt: "2026-11-10" };
/** The fixture tour: the car to the place (60 min), its event, the car back to the hotel (60 min). */
export function testTourDefinition(variant: Variant = variants.library): Tour {
  const leg = (id: string, toPlaceId: string, labelJa: string) => ({ id, kind: "leg" as const, labelJa, toPlaceId, minutes: 60,
    vehicle: { kind: "car" as const, movingJa: "ツアーの車で移動中" }, estimation: "game_model" as const,
    sources: [{ ...source, claimType: "documented_fact" as const, claimJa: "試験用の事実の出典です。" }, { ...source, claimType: "hypothesis" as const, claimJa: "試験用の推定です。" }] });
  const offerSources = [{ ...source, claimType: "hypothesis" as const, claimJa: "試験用の料金です。" }];
  return {
    schemaVersion: 1, id: testTour.tourId, cityId: testTour.cityId, titleJa: "見本の街の日帰りツアー", summaryJa: "試験用のツアーです。車で行き、昼過ぎに宿へ戻ります。",
    steps: [leg("out", variant.placeId, "車で見学地へ"), { id: "visit", kind: "event", eventId: variant.eventId }, leg("back", testTour.hotelPlaceId, "車で宿へ")],
    offers: [
      { id: testTour.desk.id, channel: "desk", sellerJa: "宿のフロント", placeIds: [testTour.hotelPlaceId], price: testTour.desk.price, sources: offerSources },
      { id: testTour.web.id, channel: "web", sellerJa: "ツアー予約サイト", price: testTour.web.price, sources: offerSources },
    ],
  };
}

/**
 * Make the place tour-only (its routes but the same-place walk go) and add the tour there. `required: false` takes the tour's
 * event out of the finale's condition (a tour the city can be cleared without); `nextCity` installs the fictional test city
 * after the sample city first (a departure to wait for); `cityTransition` sets the sample journey's way of moving on. Returns
 * the function that restores the catalogs.
 */
export function installTourTestCity(options: { place?: keyof typeof variants; required?: boolean; nextCity?: boolean;
  cityTransition?: "manual" | "after_epilogue" } = {}): () => void {
  const variant = variants[options.place ?? "library"];
  const cleanupCity = options.nextCity ? installTestCity({ templateCityId: testTour.cityId }) : () => {};
  const content = cityContents[testTour.cityId];
  const original = content.travel;
  content.travel = { ...original,
    places: original.places.map((place) => (place.id === variant.placeId ? { ...place, access: "tour" as const } : place)),
    routes: original.routes.filter((route) => (route.fromPlaceId !== variant.placeId && route.toPlaceId !== variant.placeId) ||
      (route.fromPlaceId === route.toPlaceId && route.mode === "walk")) };
  const finale = episodes.find((item) => item.cityId === testTour.cityId && item.kind === "city_finale")!;
  const when = finale.when;
  if (options.required === false && when && "all" in when)
    finale.when = { all: when.all.filter((leaf) => !("battlePlayed" in leaf) || !leaf.battlePlayed.startsWith(variant.eventId)) };
  const journey = journeys.find((item) => item.id === testTour.journeyId)!;
  const transition = journey.cityTransition;
  if (options.cityTransition) journey.cityTransition = options.cityTransition;
  tours.push(testTourDefinition(variant));
  return () => {
    tours.splice(tours.findIndex((item) => item.id === testTour.tourId), 1);
    if (transition === undefined) delete journey.cityTransition;
    else journey.cityTransition = transition;
    finale.when = when;
    content.travel = original;
    cleanupCity();
  };
}
