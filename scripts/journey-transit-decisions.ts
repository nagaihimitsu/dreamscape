import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tourismSourceSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, type TravelCatalog } from "../src/content/travel-schemas";
import { loadContentSources, readJourneyCatalog, requireCity } from "./content-sources";
import { getJourneyAuthoringProfile, journeyAuthoringProfiles } from "./journey-authoring";

/**
 * A journey-wide transit decision ledger (`authoring.transitDecisionLedger` of a
 * manifest): one file reviews rail and bus for every direction of the listed
 * cities. Unlike per-city ledgers (`transitDirectory`), a direction without a
 * playable route or a decision is allowed and reported as unresearched.
 */
export const journeyTransitDecisionModes = ["rail", "bus"] as const;
type Mode = typeof journeyTransitDecisionModes[number];
const decisionSchema = (cities: readonly [string, ...string[]]) => z.object({
  cityId: z.enum(cities),
  fromPlaceId: z.string().min(1),
  toPlaceId: z.string().min(1),
  mode: z.enum(journeyTransitDecisionModes),
  status: z.enum(["not_suitable", "inconclusive"]),
  checkedAt: z.iso.date(),
  reasonJa: z.string().trim().min(1),
  sources: z.array(tourismSourceSchema).min(1),
}).strict().refine((decision) => decision.sources.some((source) => source.claimType === "documented_fact"),
  "A checked decision requires a documented source, not only a hypothesis");
const decisionsSchema = (cities: readonly [string, ...string[]]) =>
  z.object({ schemaVersion: z.literal(1), decisions: z.array(decisionSchema(cities)) }).strict();

type Decision = z.infer<ReturnType<typeof decisionSchema>>;
type ReviewRow = { cityId: string; fromPlaceId: string; toPlaceId: string; mode: Mode } &
  ({ status: "available" } | { status: "unresearched" } | { status: "not_suitable" | "inconclusive"; checkedAt: string; reasonJa: string; sources: Decision["sources"] });
export type JourneyTransitDecisionReview = { rows: ReviewRow[]; counts: Record<string, Record<ReviewRow["status"], number>> };
/** Travel catalogs of the ledger's cities, in the ledger's city order, and the raw ledger. */
export type JourneyTransitDecisionInput = { catalogs: Record<string, unknown>; decisions: unknown };

/** The journey-wide ledger that reviews a city's transit, if its journey keeps one for that city. */
export function journeyTransitDecisionFile(root: string, cityId: string): string | undefined {
  const owner = readJourneyCatalog(root).journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
  const ledger = owner && journeyAuthoringProfiles(root).get(owner.id)?.transitDecisionLedger;
  return ledger?.cities.includes(cityId) ? ledger.file : undefined;
}

export function readJourneyTransitDecisions(root: string, journeyId: string): JourneyTransitDecisionInput {
  const ledger = getJourneyAuthoringProfile(root, journeyId).transitDecisionLedger;
  if (!ledger) throw new Error(`Journey has no transit decision ledger: ${journeyId}`);
  const read = (file: string): unknown => JSON.parse(readFileSync(path.resolve(root, file), "utf8"));
  const sources = loadContentSources(root);
  return { catalogs: Object.fromEntries(ledger.cities.map((city) => [city, read(requireCity(sources, city).travelFile)])),
    decisions: read(ledger.file) };
}

/** An absent decision is explicitly unresearched, never evidence of no service. */
export function buildJourneyTransitDecisionReview(input: JourneyTransitDecisionInput): JourneyTransitDecisionReview {
  const cityIds = Object.keys(input.catalogs);
  if (!cityIds.length) throw new Error("A transit decision ledger needs at least one city");
  const catalogs = Object.fromEntries(cityIds.map((cityId) => {
    const catalog = travelCatalogSchema.parse(input.catalogs[cityId]);
    if (catalog.cityId !== cityId) throw new Error(`Mismatched transit city: ${cityId}`);
    return [cityId, catalog];
  })) as Record<string, TravelCatalog>;
  const decisions = decisionsSchema(cityIds as [string, ...string[]]).parse(input.decisions).decisions;
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
  const counts = Object.fromEntries(cityIds.map((city) => [city, { available: 0, not_suitable: 0, inconclusive: 0, unresearched: 0 }])) as JourneyTransitDecisionReview["counts"];
  for (const cityId of cityIds) {
    const catalog = catalogs[cityId];
    for (const from of catalog.places) for (const to of catalog.places) {
      if (from.id === to.id) continue;
      for (const mode of journeyTransitDecisionModes) {
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
