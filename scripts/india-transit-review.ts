import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tourismSourceSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, type TravelCatalog } from "../src/content/travel-schemas";
import { loadContentSources, requireCity } from "./content-sources";

export const indiaTransitCities = ["delhi", "agra", "jaipur"] as const;
export const indiaTransitModes = ["rail", "bus"] as const;
const decisionSchema = z.object({
  cityId: z.enum(indiaTransitCities),
  fromPlaceId: z.string().min(1),
  toPlaceId: z.string().min(1),
  mode: z.enum(indiaTransitModes),
  status: z.enum(["not_suitable", "inconclusive"]),
  checkedAt: z.iso.date(),
  reasonJa: z.string().trim().min(1),
  sources: z.array(tourismSourceSchema).min(1),
}).strict().refine((decision) => decision.sources.some((source) => source.claimType === "documented_fact"),
  "A checked decision requires a documented source, not only a hypothesis");
const decisionsSchema = z.object({ schemaVersion: z.literal(1), decisions: z.array(decisionSchema) }).strict();

type CityId = typeof indiaTransitCities[number];
type Mode = typeof indiaTransitModes[number];
type Decision = z.infer<typeof decisionSchema>;
type ReviewRow = { cityId: CityId; fromPlaceId: string; toPlaceId: string; mode: Mode } &
  ({ status: "available" } | { status: "unresearched" } | { status: "not_suitable" | "inconclusive"; checkedAt: string; reasonJa: string; sources: Decision["sources"] });
export type IndiaTransitReview = { rows: ReviewRow[]; counts: Record<CityId, Record<ReviewRow["status"], number>> };
export type IndiaTransitReviewInput = { catalogs: Record<CityId, unknown>; decisions: unknown };

export function readIndiaTransitReview(root: string): IndiaTransitReviewInput {
  const read = (file: string): unknown => JSON.parse(readFileSync(path.resolve(root, file), "utf8"));
  const sources = loadContentSources(root);
  return { catalogs: Object.fromEntries(indiaTransitCities.map((city) => [city, read(requireCity(sources, city).travelFile)])) as Record<CityId, unknown>,
    decisions: read("authoring/journeys/golden_triangle/research/golden-triangle-transit-20261103/decisions.json") };
}

/** An absent decision is explicitly unresearched, never evidence of no service. */
export function buildIndiaTransitReview(input: IndiaTransitReviewInput): IndiaTransitReview {
  const catalogs = Object.fromEntries(indiaTransitCities.map((cityId) => {
    const catalog = travelCatalogSchema.parse(input.catalogs[cityId]);
    if (catalog.cityId !== cityId) throw new Error(`Mismatched transit city: ${cityId}`);
    return [cityId, catalog];
  })) as Record<CityId, TravelCatalog>;
  const decisions = decisionsSchema.parse(input.decisions).decisions;
  const key = (city: string, from: string, to: string, mode: string) => `${city}:${from}:${to}:${mode}`;
  const reviewed = new Map<string, Decision>();
  for (const decision of decisions) {
    const catalog = catalogs[decision.cityId];
    const ids = new Set(catalog.places.map((place) => place.id));
    if (!ids.has(decision.fromPlaceId) || !ids.has(decision.toPlaceId) || decision.fromPlaceId === decision.toPlaceId)
      throw new Error(`Invalid reviewed transit endpoints: ${decision.cityId}/${decision.fromPlaceId}/${decision.toPlaceId}`);
    const id = key(decision.cityId, decision.fromPlaceId, decision.toPlaceId, decision.mode);
    if (reviewed.has(id)) throw new Error(`Duplicate transit decision: ${id}`);
    if (catalog.routes.some((route) => route.fromPlaceId === decision.fromPlaceId && route.toPlaceId === decision.toPlaceId && route.mode === decision.mode))
      throw new Error(`Reviewed transit decision conflicts with a playable route: ${id}`);
    reviewed.set(id, decision);
  }
  const rows: ReviewRow[] = [];
  const counts = Object.fromEntries(indiaTransitCities.map((city) => [city, { available: 0, not_suitable: 0, inconclusive: 0, unresearched: 0 }])) as IndiaTransitReview["counts"];
  for (const cityId of indiaTransitCities) {
    const catalog = catalogs[cityId];
    for (const from of catalog.places) for (const to of catalog.places) {
      if (from.id === to.id) continue;
      for (const mode of indiaTransitModes) {
        const route = catalog.routes.find((item) => item.fromPlaceId === from.id && item.toPlaceId === to.id && item.mode === mode);
        const decision = reviewed.get(key(cityId, from.id, to.id, mode));
        let row: ReviewRow;
        if (route) {
          if (route.estimation !== "game_model" || !route.sources.some((source) => source.claimType === "documented_fact"))
            throw new Error(`Playable transit requires a game estimate and documented source: ${cityId}/${from.id}/${to.id}/${mode}`);
          row = { cityId, fromPlaceId: from.id, toPlaceId: to.id, mode, status: "available" };
        } else if (decision) {
          row = { cityId, fromPlaceId: from.id, toPlaceId: to.id, mode, status: decision.status,
            checkedAt: decision.checkedAt, reasonJa: decision.reasonJa, sources: decision.sources };
        } else row = { cityId, fromPlaceId: from.id, toPlaceId: to.id, mode, status: "unresearched" };
        rows.push(row);
        counts[cityId][row.status]++;
      }
    }
  }
  return { rows, counts };
}
