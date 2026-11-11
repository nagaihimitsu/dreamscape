import { z } from "zod";
import { japaneseText } from "./text-language";
import { tourismSourceSchema } from "./tourism-schemas";

// Shared input contract for each registered city's travel data.
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const minute = z.number().int().min(0).max(1440);
const timeWindowSchema = z.object({ start: minute, end: minute }).strict()
  .refine((window) => window.start < window.end, "Time window must end after it starts");

export const travelPlaceSchema = z.object({
  id,
  cityId: id,
  nameJa: text,
  nameEn: text,
  /**
   * The place's general tourist description, shown in free time's card of the selected place. Checkable facts,
   * no story: never an event's teaser. Optional: a place without one shows no description.
   */
  descriptionJa: japaneseText.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  backgroundId: id,
  /** Existing catalogs stay authoritative; these IDs identify the same physical place. */
  landmarkIds: z.array(id).optional(),
  destinationIds: z.array(id).optional(),
  openingWindows: z.array(timeWindowSchema).optional(),
  /** Game-calendar weekdays when the place is closed; Monday is 0. */
  closedWeekdays: z.array(z.number().int().min(0).max(6)).refine((days) => new Set(days).size === days.length, "Duplicate closed weekday").optional(),
  /**
   * `"tour"`: a tour-only place (tour design stage 2a). The party reaches it only on a tour of the
   * city (tours/<tourId>.json), so it has no route but its same-place walk, and the map never lists it.
   */
  access: z.literal("tour").optional(),
  sources: z.array(tourismSourceSchema).min(1),
}).strict();

/** Whether the party reaches the place only on a tour (`access: "tour"`). */
export const isTourOnlyPlace = (place: { access?: "tour" } | undefined): boolean => place?.access === "tour";

export const travelRouteSchema = z.object({
  fromPlaceId: id,
  toPlaceId: id,
  /** `walk` or a transport mode the city's journey declares in its manifest (checked by content:build). */
  mode: id,
  minutes: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  /** Short passenger-facing detail shown after the mode: line, transfer or boarding point (e.g. 「16番」). */
  transferNote: text.max(40).optional(),
  /** Editorial estimates are not an observation of the actual route or fare. */
  estimation: z.literal("game_model").optional(),
  sources: z.array(tourismSourceSchema).min(1),
}).strict().superRefine((route, ctx) => {
  if (route.estimation === "game_model" && !route.sources.some((source) => source.claimType === "hypothesis")) {
    ctx.addIssue({ code: "custom", message: "Game-model routes must identify their estimated source", path: ["sources"] });
  }
  if (route.mode === "walk" && route.cost !== 0) {
    ctx.addIssue({ code: "custom", message: "Walking must be free", path: ["cost"] });
  }
  if (route.fromPlaceId === route.toPlaceId && (route.minutes !== 0 || route.cost !== 0)) {
    ctx.addIssue({ code: "custom", message: "A route to the same place must take no time or money" });
  }
  if (route.fromPlaceId !== route.toPlaceId && route.minutes === 0) {
    ctx.addIssue({ code: "custom", message: "A route to a different place must take time", path: ["minutes"] });
  }
});

export const travelEventSchema = z.object({
  id,
  cityId: id,
  placeId: id,
  category: z.enum(["main", "date"]),
  titleJa: text,
  /** A registered prototype event has no story/quiz implementation yet. */
  contentStatus: z.literal("pending_content").optional(),
  activityMinutes: z.number().int().positive(),
  apCost: z.number().int().nonnegative(),
  /** Optional game admission charge for the whole party, in the journey currency. */
  admissionCost: z.number().int().nonnegative().safe().optional(),
  startWindows: z.array(timeWindowSchema).optional(),
  endWindows: z.array(timeWindowSchema).optional(),
}).strict();

export const travelCatalogSchema = z.object({
  cityId: id,
  places: z.array(travelPlaceSchema).min(1),
  routes: z.array(travelRouteSchema),
  events: z.array(travelEventSchema),
}).strict().superRefine((catalog, ctx) => {
  const places = new Set<string>();
  for (const [index, place] of catalog.places.entries()) {
    if (place.cityId !== catalog.cityId) ctx.addIssue({ code: "custom", message: "Place belongs to another city", path: ["places", index, "cityId"] });
    if (places.has(place.id)) ctx.addIssue({ code: "custom", message: "Duplicate place ID", path: ["places", index, "id"] });
    places.add(place.id);
  }
  const events = new Set<string>();
  for (const [index, event] of catalog.events.entries()) {
    if (event.cityId !== catalog.cityId) ctx.addIssue({ code: "custom", message: "Event belongs to another city", path: ["events", index, "cityId"] });
    if (!places.has(event.placeId)) ctx.addIssue({ code: "custom", message: "Unknown event place", path: ["events", index, "placeId"] });
    if (events.has(event.id)) ctx.addIssue({ code: "custom", message: "Duplicate event ID", path: ["events", index, "id"] });
    events.add(event.id);
  }
  const routes = new Set<string>();
  for (const [index, route] of catalog.routes.entries()) {
    if (!places.has(route.fromPlaceId)) ctx.addIssue({ code: "custom", message: "Unknown route origin", path: ["routes", index, "fromPlaceId"] });
    if (!places.has(route.toPlaceId)) ctx.addIssue({ code: "custom", message: "Unknown route destination", path: ["routes", index, "toPlaceId"] });
    const key = `${route.fromPlaceId}:${route.toPlaceId}:${route.mode}`;
    if (routes.has(key)) ctx.addIssue({ code: "custom", message: "Duplicate directed route", path: ["routes", index] });
    routes.add(key);
  }
});

/**
 * Where the party can rent a rental transport mode of the journey (manifest
 * transportModes[].rental) in this city: at these places, for this price
 * (for the whole party, in the journey currency). A rented mode is ridden
 * until the party leaves the city. Placeholder values until the scenario is
 * fixed; the common condition system will decide any further conditions.
 */
export const rentalOfferSchema = z.object({
  modeId: id,
  placeIds: z.array(id).min(1).refine((ids) => new Set(ids).size === ids.length, "Duplicate rental place"),
  cost: z.number().int().nonnegative().safe(),
  sources: z.array(tourismSourceSchema).min(1),
}).strict();

/** Game-balancing values, not claims about actual hotel prices or fares. */
export const travelSettingsSchema = z.object({
  initialBudget: z.number().int().nonnegative(),
  hotelPlaceId: id,
  lodgingCost: z.number().int().nonnegative(),
  retryMinutes: z.number().int().positive(),
  /**
   * Background every battle, guide, encounter, date and arrival/epilogue scene
   * of the city starts with. Without it a scene starts with the background of
   * its place (or of the hotel).
   */
  storyBackgroundId: id.optional(),
  /** Rental offers of the city, at most one per mode. */
  rentals: z.array(rentalOfferSchema).refine((offers) => new Set(offers.map((offer) => offer.modeId)).size === offers.length,
    "Duplicate rental offer for a mode").optional(),
  notes: text,
}).strict();

export type TravelPlace = z.infer<typeof travelPlaceSchema>;
export type TravelRoute = z.infer<typeof travelRouteSchema>;
export type TravelEvent = z.infer<typeof travelEventSchema>;
export type TravelCatalog = z.infer<typeof travelCatalogSchema>;
export type RentalOffer = z.infer<typeof rentalOfferSchema>;
