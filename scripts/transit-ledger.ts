import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { tourismSourceSchema } from "../src/content/tourism-schemas";
import { isTourOnlyPlace, type TravelCatalog, type TravelRoute } from "../src/content/travel-schemas";
import { WALK_MODE_ID } from "../src/content/transport-schemas";
import { japaneseText as japanese } from "../src/content/text-language";
import { SAMPLE_SOURCE_URL } from "./sample-journey";
import { schemaIssueLines } from "./content-validation-utils";

type TourismSource = z.infer<typeof tourismSourceSchema>;

// The per-city transit ledger `travel/<cityId>-transit.json`, next to the
// city's routes in its journey folder: for every ordered pair of places and
// every transport mode the journey declares (walking is the routes' own game
// model and is not a ledger subject), one decision with its status, the date
// it was checked, a Japanese reason and its sources. A route of a declared
// mode exists exactly when its decision is `available`. content:build checks
// the ledger against the routes (transport-validation.ts); `inconclusive`
// builds but is not ready for release (journey:transit, city:bundle apply).

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);

/**
 * available: a route of this mode exists. not_suitable: the service exists
 * there but the game does not use it (e.g. walking is short). not_applicable:
 * the service does not run there. inconclusive: researched, not determined
 * (never evidence that there is no service; the route is simply not offered).
 */
export const transitStatuses = ["available", "not_suitable", "not_applicable", "inconclusive"] as const;
export type TransitStatus = typeof transitStatuses[number];
const decisionFields = {
  fromPlaceId: id, toPlaceId: id, mode: id,
  status: z.enum(transitStatuses),
  checkedAt: z.iso.date(),
  reasonJa: japanese,
};
const decisionSchema = z.object({ ...decisionFields, sourceRefs: z.array(id).min(1) }).strict();
export const transitLedgerSchema = z.object({
  schemaVersion: z.literal(2), cityId: id,
  sourceRefs: z.record(id, tourismSourceSchema), decisions: z.array(decisionSchema),
}).strict();
export type TransitLedger = z.infer<typeof transitLedgerSchema>;
export type TransitDecision = TransitLedger["decisions"][number];
/** A decision with its sources written out (city bundles edit this form). */
const editableDecisionSchema = z.object({ ...decisionFields, cityId: id, sources: z.array(tourismSourceSchema).min(1) }).strict();

/**
 * A documented fact: a `documented_fact` source, or in the sample journey its
 * fictional stand-in (sources at SAMPLE_SOURCE_URL, which content:build
 * refuses in every other available journey, so they never reach a release).
 */
export function isFactSource(source: Pick<TourismSource, "claimType" | "url">): boolean {
  return source.claimType === "documented_fact" || source.url === SAMPLE_SOURCE_URL;
}

export type TransitCounts = Record<string, Record<TransitStatus, number>>;
export type CityTransitReview = {
  cityId: string;
  /** Ordered pairs of different places. */
  directions: number;
  decisions: number;
  /** Decisions per declared mode and status. */
  counts: TransitCounts;
  /** No decision is `inconclusive`. */
  ready: boolean;
  /**
   * Directions ("from → to") without a walking route. content:build warns about
   * them (a review rule: a ledger reason that weighs a vehicle against walking
   * needs that walk); that every place stays reachable is checked elsewhere
   * (travel-validation.ts, `Missing usable directed route`).
   */
  missingWalks: string[];
};

const pairKey = (from: string, to: string, mode: string) => `${from} → ${to}（${mode}）`;

/**
 * Check a city's ledger against its routes and the journey's declared modes
 * (non-walk IDs): one decision per ordered pair and mode, `available` exactly
 * where a route of that mode exists, resolvable sources, and a documented
 * fact (isFactSource) behind every decision that is not `available` (what the
 * fact shows: the service does not reach the place, the service exists there,
 * or what was checked). Directions without a walking route are listed, not
 * refused (`missingWalks`): a ledger reason that weighs a vehicle against
 * walking there (e.g. 「徒歩が20分未満」) needs that walk, which is a review
 * rule. `file` names the ledger in the errors.
 */
export function inspectCityTransit(travel: TravelCatalog, raw: unknown, modes: readonly string[], file = "transit ledger"): CityTransitReview {
  const parsed = transitLedgerSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`交通判断台帳の形式が違います: ${file}（Invalid transit ledger）:\n${schemaIssueLines(parsed.error.issues)}`, { cause: parsed.error });
  const ledger = parsed.data;
  const fail = (japanese: string, english: string) => new Error(`${japanese}: ${file}（${english}）`);
  if (ledger.cityId !== travel.cityId) throw fail(`台帳の都市 ${ledger.cityId} が経路の都市 ${travel.cityId} と違います`, "Transit city mismatch");
  const declared = new Set(modes);
  if (declared.has(WALK_MODE_ID)) throw new Error("Walking is not a transit ledger mode");
  // A tour-only place (tour stage 2a) has no route but its same-place walk, so it has no direction to decide either.
  const tourOnly = new Set(travel.places.filter((place) => isTourOnlyPlace(place)).map((place) => place.id));
  const places = new Set(travel.places.filter((place) => !tourOnly.has(place.id)).map((place) => place.id));
  const routes = new Set(travel.routes.map((route) => pairKey(route.fromPlaceId, route.toPlaceId, route.mode)));
  const walks = new Set(travel.routes.filter((route) => route.mode === WALK_MODE_ID).map((route) => `${route.fromPlaceId} → ${route.toPlaceId}`));
  const decided = new Set<string>();
  const counts: TransitCounts = Object.fromEntries(modes.map((mode) => [mode, Object.fromEntries(transitStatuses.map((status) => [status, 0]))])) as TransitCounts;
  for (const decision of ledger.decisions) {
    const key = pairKey(decision.fromPlaceId, decision.toPlaceId, decision.mode);
    if (!declared.has(decision.mode))
      throw fail(`宣言されていない乗り物の判断があります: ${key}`, `Decision for an undeclared mode: ${key}`);
    if (tourOnly.has(decision.fromPlaceId) || tourOnly.has(decision.toPlaceId))
      throw fail(`ツアー専用の地点の判断は台帳に書きません: ${key}`, `Transit decision for a tour-only place: ${key}`);
    if (!places.has(decision.fromPlaceId) || !places.has(decision.toPlaceId) || decision.fromPlaceId === decision.toPlaceId || decided.has(key))
      throw fail(`判断の地点が不明・同じ地点・重複です: ${key}`, `Invalid or duplicate transit direction: ${key}`);
    if (decision.sourceRefs.some((ref) => !Object.hasOwn(ledger.sourceRefs, ref)))
      throw fail(`判断の出典が sourceRefs にありません: ${key}`, `Unresolved transit source: ${key}`);
    const sources = decision.sourceRefs.map((ref) => ledger.sourceRefs[ref]);
    if ((decision.status === "available") !== routes.has(key))
      throw fail(decision.status === "available" ? `available の判断に経路がありません: ${key}` : `経路があるのに判断が ${decision.status} です: ${key}`,
        `Transit decision and route disagree: ${key}`);
    if (decision.status !== "available" && !sources.some(isFactSource))
      throw fail(`${decision.status} の判断には事実の出典（documented_fact）が要ります: ${key}`, `A ${decision.status} decision needs a documented fact: ${key}`);
    decided.add(key);
    counts[decision.mode][decision.status]++;
  }
  const missingWalks: string[] = [];
  for (const from of places) for (const to of places) {
    if (from === to) continue;
    if (!walks.has(`${from} → ${to}`)) missingWalks.push(`${from} → ${to}`);
    for (const mode of modes) {
      const key = pairKey(from, to, mode);
      if (!decided.has(key)) throw fail(`判断のない方向があります: ${key}`, `Undecided transit direction: ${key}`);
    }
  }
  const inconclusive = modes.reduce((sum, mode) => sum + counts[mode].inconclusive, 0);
  return { cityId: travel.cityId, directions: places.size * (places.size - 1), decisions: decided.size, counts, ready: inconclusive === 0, missingWalks };
}

/**
 * Routes of declared modes whose sources do not support them as a game
 * estimate: a route of a declared mode should be `estimation: "game_model"`
 * with a hypothesis (the schema's own rule, an error) and at least one
 * documented fact (isFactSource) for this mode and kind of trip. A route that
 * lacks the mark or the fact is listed (content:build warns, journey:transit
 * prints it); whether the fact reaches the trip is a review rule
 * (authoring/CONTENT_GUIDE.md).
 */
export function unsupportedTransitRoutes(travel: TravelCatalog, modes: readonly string[]): TravelRoute[] {
  const declared = new Set(modes);
  return travel.routes.filter((route) => route.mode !== WALK_MODE_ID && declared.has(route.mode) &&
    (route.estimation !== "game_model" || !route.sources.some(isFactSource)));
}

/** The decisions with their sources written out, for a city bundle. */
export function exportTransitDecisions(ledger: TransitLedger) {
  return ledger.decisions.map(({ sourceRefs, ...entry }) => ({ ...entry, cityId: ledger.cityId,
    sources: sourceRefs.map((ref) => {
      if (!Object.hasOwn(ledger.sourceRefs, ref))
        throw new Error(`交通判断台帳の判断の出典 ${ref} が、台帳の sourceRefs にありません（都市 ${ledger.cityId}）。`);
      return ledger.sourceRefs[ref];
    }) }));
}

/**
 * A ledger with the edited decisions of a city bundle; unchanged input returns `ledger` itself. A source
 * already in the ledger keeps its key (e.g. `fare`, the research's own ID), and the keys keep their order;
 * only a source that is new to the ledger gets a new key (`source_N`, after the others). A key that the edit
 * leaves unused is removed; one that no decision used before the edit stays as it is. So one edited decision
 * changes that decision only (with a new source: and one new key).
 */
export function replaceTransitDecisions(ledger: TransitLedger, raw: unknown[]): TransitLedger {
  if (isDeepStrictEqual(raw, exportTransitDecisions(ledger))) return ledger;
  const usedBefore = new Set(ledger.decisions.flatMap((decision) => decision.sourceRefs));
  // A decision whose sources did not change keeps its own refs (also when two keys hold the same source).
  const exported = exportTransitDecisions(ledger);
  const previousRefs = (entry: { fromPlaceId: string; toPlaceId: string; mode: string }, sources: unknown[]) => {
    const index = ledger.decisions.findIndex((decision) =>
      decision.fromPlaceId === entry.fromPlaceId && decision.toPlaceId === entry.toPlaceId && decision.mode === entry.mode);
    return index >= 0 && isDeepStrictEqual(exported[index].sources, sources) ? ledger.decisions[index].sourceRefs : undefined;
  };
  const next = decisionsWithRefs(ledger.cityId, raw, { ...ledger.sourceRefs }, previousRefs);
  const usedAfter = new Set(next.decisions.flatMap((decision) => decision.sourceRefs));
  const sourceRefs = Object.fromEntries(Object.entries(next.sourceRefs).filter(([key]) => usedAfter.has(key) || !usedBefore.has(key)));
  return { schemaVersion: 2, cityId: ledger.cityId, sourceRefs, decisions: next.decisions };
}

/** A new ledger from decisions with written-out sources (a new city of a city bundle). */
export function transitLedgerFromDecisions(cityId: string, raw: unknown[]): TransitLedger {
  return { schemaVersion: 2, cityId, ...decisionsWithRefs(cityId, raw, {}) };
}

/**
 * The decisions with their sources as references into `sourceRefs`: `previousRefs` (an unchanged decision's own refs)
 * first, else the first key that holds an identical source, else a new key.
 */
function decisionsWithRefs(cityId: string, raw: unknown[], sourceRefs: TransitLedger["sourceRefs"],
  previousRefs: (entry: { fromPlaceId: string; toPlaceId: string; mode: string }, sources: unknown[]) => string[] | undefined = () => undefined) {
  const keys = new Map<string, string>();
  for (const [key, source] of Object.entries(sourceRefs)) {
    const fingerprint = JSON.stringify(tourismSourceSchema.parse(source));
    if (!keys.has(fingerprint)) keys.set(fingerprint, key);
  }
  let counter = 0;
  const newKey = () => {
    do counter++; while (Object.hasOwn(sourceRefs, `source_${counter}`));
    return `source_${counter}`;
  };
  const decisions = raw.map((value) => {
    const { cityId: owner, sources, ...entry } = editableDecisionSchema.parse(value);
    if (owner !== cityId) throw new Error(`交通の判断がほかの都市（${owner}）のものです。この都市（${cityId}）の判断だけを書きます`);
    const kept = previousRefs(entry, sources);
    if (kept) return { ...entry, sourceRefs: [...kept] };
    return { ...entry, sourceRefs: sources.map((source) => {
      const fingerprint = JSON.stringify(source);
      let key = keys.get(fingerprint);
      if (!key) { key = newKey(); keys.set(fingerprint, key); sourceRefs[key] = source; }
      return key;
    }) };
  });
  return { sourceRefs, decisions };
}

/** One Japanese line per mode for the tools, e.g. `路面電車: 使う 8、使わない 174`. */
export function formatTransitCounts(counts: TransitCounts, label: (mode: string) => string = (mode) => mode): string[] {
  const names: Record<TransitStatus, string> = { available: "使う", not_suitable: "使わない", not_applicable: "走っていない", inconclusive: "特定できず" };
  return Object.entries(counts).map(([mode, byStatus]) =>
    `${label(mode)}: ${transitStatuses.filter((status) => byStatus[status]).map((status) => `${names[status]} ${byStatus[status]}`).join("、") || "判断なし"}`);
}
