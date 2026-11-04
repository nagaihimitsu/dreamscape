import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { tourismSourceSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, type TravelCatalog } from "../src/content/travel-schemas";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { journeyAuthoringProfiles } from "./journey-authoring";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
export const reviewedModes = ["bus", "rail", "tram", "taxi"] as const;
const decision = z.object({
  fromPlaceId: id, toPlaceId: id, mode: z.enum(reviewedModes),
  status: z.enum(["available", "not_applicable", "not_suitable", "unconfirmed"]),
  reasonJa: z.string().trim().min(1), sourceRefs: z.array(id).min(1),
}).strict();
export const transitLedgerSchema = z.object({
  schemaVersion: z.literal(1), cityId: id,
  sourceRefs: z.record(id, tourismSourceSchema), decisions: z.array(decision),
}).strict();
export type TransitLedger = z.infer<typeof transitLedgerSchema>;
const editableDecision = decision.omit({ sourceRefs: true }).extend({ cityId: id, sources: z.array(tourismSourceSchema).min(1) });

/** A source ledger accompanies travel catalogs; it never supplies runtime routes. */
export function cityTransitFile(root: string, cityId: string): string | undefined {
  id.parse(cityId);
  const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync(path.join(root, "content/journeys/catalog.json"), "utf8")));
  const owner = catalog.journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
  if (!owner || !Object.hasOwn(journeyAuthoringProfiles, owner.id)) return undefined;
  const profile = journeyAuthoringProfiles[owner.id as keyof typeof journeyAuthoringProfiles];
  return "transitDirectory" in profile ? `${profile.transitDirectory}/${cityId}/transit-decisions.json` : undefined;
}

export function readTransitLedger(root: string, file: string): TransitLedger {
  return transitLedgerSchema.parse(JSON.parse(readFileSync(path.join(root, file), "utf8")));
}

export function exportTransitDecisions(ledger: TransitLedger) {
  return ledger.decisions.map(({ sourceRefs, ...entry }) => ({ ...entry, cityId: ledger.cityId,
    sources: sourceRefs.map((ref) => {
      if (!Object.hasOwn(ledger.sourceRefs, ref)) throw new Error(`Missing transit source: ${ref}`);
      return ledger.sourceRefs[ref];
    }) }));
}

export function replaceTransitDecisions(ledger: TransitLedger, raw: unknown[]): TransitLedger {
  if (isDeepStrictEqual(raw, exportTransitDecisions(ledger))) return ledger;
  const sourceRefs: TransitLedger["sourceRefs"] = {};
  const keys = new Map<string, string>();
  const decisions = raw.map((value) => {
    const { cityId, sources, ...entry } = editableDecision.parse(value);
    if (cityId !== ledger.cityId) throw new Error("Transit decision belongs to another city");
    return { ...entry, sourceRefs: sources.map((source) => {
      const fingerprint = JSON.stringify(source);
      let key = keys.get(fingerprint);
      if (!key) { key = `source_${keys.size + 1}`; keys.set(fingerprint, key); sourceRefs[key] = source; }
      return key;
    }) };
  });
  return { schemaVersion: 1, cityId: ledger.cityId, sourceRefs, decisions };
}

/** Require a decision for every directed pair and mode, and reconcile it with playable data. */
export function inspectCityTransit(travel: TravelCatalog, raw: unknown) {
  const ledger = transitLedgerSchema.parse(raw);
  if (travel.cityId !== ledger.cityId) throw new Error("Transit city mismatch");
  const places = new Set(travel.places.map((place) => place.id));
  const entries = new Map<string, z.infer<typeof decision>>();
  const key = (from: string, to: string, mode: string) => `${from}:${to}:${mode}`;
  const routes = new Set(travel.routes.map((route) => key(route.fromPlaceId, route.toPlaceId, route.mode)));
  const counts = { available: 0, not_applicable: 0, not_suitable: 0, unconfirmed: 0 };
  for (const entry of ledger.decisions) {
    const ownKey = key(entry.fromPlaceId, entry.toPlaceId, entry.mode);
    if (!places.has(entry.fromPlaceId) || !places.has(entry.toPlaceId) || entry.fromPlaceId === entry.toPlaceId || entries.has(ownKey))
      throw new Error(`Invalid or duplicate transit direction: ${ownKey}`);
    if (entry.sourceRefs.some((ref) => !Object.hasOwn(ledger.sourceRefs, ref))) throw new Error(`Unresolved transit source: ${ownKey}`);
    if ((entry.status === "available") !== routes.has(ownKey)) throw new Error(`Transit decision and route disagree: ${ownKey}`);
    entries.set(ownKey, entry); counts[entry.status]++;
  }
  for (const from of places) for (const to of places) {
    if (!routes.has(key(from, to, "walk"))) throw new Error(`Walking game model missing: ${from}:${to}`);
    if (from === to) continue;
    for (const mode of reviewedModes) if (!entries.has(key(from, to, mode))) throw new Error(`Unreviewed transit direction: ${from}:${to}:${mode}`);
  }
  return { cityId: travel.cityId, directions: places.size * (places.size - 1), decisions: entries.size, counts,
    ready: counts.unconfirmed === 0 };
}

export function inspectJourneyTransit(root: string, journeyId: string) {
  const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync(path.join(root, "content/journeys/catalog.json"), "utf8")));
  const journey = catalog.journeys.find((entry) => entry.id === journeyId);
  if (!journey) throw new Error(`Unknown journey: ${journeyId}`);
  return journey.cities.map(({ id: cityId }) => {
    const file = cityTransitFile(root, cityId);
    if (!file || !existsSync(path.join(root, file))) throw new Error(`Transit review missing: ${cityId}`);
    const travel = travelCatalogSchema.parse(JSON.parse(readFileSync(path.join(root, `content/travel/${cityId}.json`), "utf8")));
    return inspectCityTransit(travel, readTransitLedger(root, file));
  });
}
