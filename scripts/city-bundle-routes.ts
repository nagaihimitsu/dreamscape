import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { tourismSourceSchema } from "../src/content/tourism-schemas";
import { travelEventSchema, travelPlaceSchema, travelRouteSchema, type TravelRoute } from "../src/content/travel-schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const sourceId = id.refine((value) => !["constructor", "prototype", "__proto__"].includes(value), "Reserved source ID");
const sharedRoute = {
  sourceRef: sourceId,
  transferNote: z.string().trim().min(1).max(40).optional(),
  estimation: z.literal("game_model").optional(),
};
const compactRouteSchema = z.object({
  fromPlaceId: id, toPlaceId: id,
  mode: id,
  minutes: z.number().int().nonnegative(), cost: z.number().int().nonnegative(),
  ...sharedRoute, bothDirections: z.literal(true).optional(),
}).strict().refine((route) => !route.bothDirections || route.fromPlaceId !== route.toPlaceId,
  "A same-place route cannot be marked bothDirections");
export const compactTravelSchema = z.object({
  cityId: id, places: z.array(travelPlaceSchema).min(1), events: z.array(travelEventSchema),
  routeSources: z.record(sourceId, z.array(tourismSourceSchema).min(1)),
  samePlaceRoute: z.object(sharedRoute).strict().optional(),
  routes: z.array(compactRouteSchema),
}).strict();
export type CompactTravel = z.infer<typeof compactTravelSchema>;
type RouteSource = TravelRoute["sources"];
const key = (route: Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode">) =>
  `${route.fromPlaceId}:${route.toPlaceId}:${route.mode}`;
const routeDetails = (route: TravelRoute) => {
  const { fromPlaceId: _from, toPlaceId: _to, ...details } = route;
  return details;
};

/** This also accepts an intentionally incomplete new-city template with no routes. */
export function compactTravel(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("travel の形が違います（JSON のオブジェクトにします）。");
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.routes) || !Array.isArray(value.places)) throw new Error("travel には routes と places の配列が要ります。");
  const routes = value.routes.map((route) => travelRouteSchema.parse(route));
  const byKey = new Map<string, TravelRoute>();
  for (const route of routes) {
    if (byKey.has(key(route))) throw new Error(`同じ向き・同じ乗り物の経路が2つあります: ${key(route)}`);
    byKey.set(key(route), route);
  }
  const routeSources: Record<string, RouteSource> = {};
  const refs: { id: string; sources: RouteSource }[] = [];
  const ref = (sources: RouteSource): string => {
    const existing = refs.find((entry) => isDeepStrictEqual(entry.sources, sources));
    if (existing) return existing.id;
    const id = `source_${refs.length + 1}`;
    refs.push({ id, sources }); routeSources[id] = sources;
    return id;
  };

  // Group same-place walks only when every place has exactly the same data.
  // Other self-routes remain explicitly editable in routes.
  const placeIds = value.places.map((place) => (place as { id?: unknown })?.id);
  const identities = placeIds.map((id) => byKey.get(`${id}:${id}:walk`));
  const commonIdentity = identities.length > 0 && identities.every((route) => route &&
    isDeepStrictEqual(routeDetails(route), routeDetails(identities[0]!))) ? identities[0] : undefined;
  const samePlaceRoute = commonIdentity ? {
    sourceRef: ref(commonIdentity.sources),
    ...(commonIdentity.transferNote !== undefined ? { transferNote: commonIdentity.transferNote } : {}),
    ...(commonIdentity.estimation !== undefined ? { estimation: commonIdentity.estimation } : {}),
  } : undefined;
  const emitted = new Set<string>();
  const compactRoutes: z.infer<typeof compactRouteSchema>[] = [];
  for (const route of routes) {
    const routeKey = key(route);
    if (emitted.has(routeKey)) continue;
    if (commonIdentity && route.fromPlaceId === route.toPlaceId && route.mode === "walk") continue;
    const reverse = byKey.get(key({ ...route, fromPlaceId: route.toPlaceId, toPlaceId: route.fromPlaceId }));
    const bothDirections = route.fromPlaceId !== route.toPlaceId && reverse &&
      isDeepStrictEqual(routeDetails(route), routeDetails(reverse));
    const { sources, ...details } = route;
    compactRoutes.push({ ...details, sourceRef: ref(sources), ...(bothDirections ? { bothDirections: true as const } : {}) });
    emitted.add(routeKey);
    if (bothDirections) emitted.add(key(reverse));
  }
  const { routes: _routes, ...other } = value;
  return { ...other, routeSources, ...(samePlaceRoute ? { samePlaceRoute } : {}), routes: compactRoutes };
}

/** Expand only explicitly bidirectional routes; restore all existing route order. */
export function expandTravel(raw: unknown, baseline: readonly TravelRoute[] = []): unknown {
  const compact = compactTravelSchema.parse(raw);
  const routes: TravelRoute[] = [];
  const seen = new Set<string>();
  const sources = (reference: string): RouteSource => {
    if (!Object.hasOwn(compact.routeSources, reference)) throw new Error(`経路の出典ID（sourceRef）が routeSources にありません: ${reference}`);
    return structuredClone(compact.routeSources[reference]);
  };
  const add = (rawRoute: unknown) => {
    const route = travelRouteSchema.parse(rawRoute);
    const routeKey = key(route);
    if (seen.has(routeKey)) throw new Error(`同じ向き・同じ乗り物の経路が2つあります: ${routeKey}`);
    seen.add(routeKey); routes.push(route);
  };
  if (compact.samePlaceRoute) {
    const { sourceRef, ...details } = compact.samePlaceRoute;
    const source = sources(sourceRef);
    for (const place of compact.places) add({ fromPlaceId: place.id, toPlaceId: place.id, mode: "walk", minutes: 0, cost: 0, ...details, sources: source });
  }
  for (const route of compact.routes) {
    const { sourceRef, bothDirections, ...details } = route;
    const source = sources(sourceRef);
    add({ ...details, sources: source });
    if (bothDirections) add({ ...details, fromPlaceId: details.toPlaceId, toPlaceId: details.fromPlaceId, sources: source });
  }
  const previousOrder = new Map(baseline.map((route, index) => [key(route), index]));
  const ordered = routes.map((route, index) => ({ route, index })).sort((a, b) =>
    (previousOrder.get(key(a.route)) ?? baseline.length + a.index) - (previousOrder.get(key(b.route)) ?? baseline.length + b.index))
    .map(({ route }) => route);
  const { routeSources: _sources, samePlaceRoute: _samePlaceRoute, ...other } = compact;
  return { ...other, routes: ordered };
}
