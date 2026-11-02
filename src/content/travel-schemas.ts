import { z } from "zod";
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
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  backgroundAssetId: id,
  /** Existing catalogs stay authoritative; these IDs identify the same physical place. */
  landmarkIds: z.array(id).optional(),
  destinationIds: z.array(id).optional(),
  openingWindows: z.array(timeWindowSchema).optional(),
  sources: z.array(tourismSourceSchema).min(1),
}).strict();

export const travelRouteSchema = z.object({
  fromPlaceId: id,
  toPlaceId: id,
  mode: z.enum(["walk", "rail", "tram", "bus", "taxi"]),
  minutes: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  sources: z.array(tourismSourceSchema).min(1),
}).strict().superRefine((route, ctx) => {
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
  activityMinutes: z.number().int().positive(),
  apCost: z.number().int().nonnegative(),
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

/** Game-balancing values, not claims about actual hotel prices or fares. */
export const travelSettingsSchema = z.object({
  initialBudget: z.number().int().nonnegative(),
  hotelPlaceId: id,
  lodgingCost: z.number().int().nonnegative(),
  retryMinutes: z.number().int().positive(),
  notes: text,
}).strict();

export type TravelPlace = z.infer<typeof travelPlaceSchema>;
export type TravelRoute = z.infer<typeof travelRouteSchema>;
export type TravelEvent = z.infer<typeof travelEventSchema>;
export type TravelCatalog = z.infer<typeof travelCatalogSchema>;
