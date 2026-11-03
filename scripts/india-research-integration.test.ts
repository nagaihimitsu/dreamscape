import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cityContents } from "../src/content";
import { getJourney } from "../src/content/journeys";

const research = path.resolve("authoring/research/golden-triangle-all-research-20261103/source");
const earlier = path.resolve("authoring/research/golden-triangle-20261103/source");
const json = (base: string, file: string) => JSON.parse(readFileSync(path.join(base, file), "utf8"));

// CSV fields may contain quoted commas, newlines and doubled quotes. The source
// is kept byte-for-byte; parse it without changing its BOM or line endings.
function csv(base: string, file: string): Record<string, string>[] {
  const input = readFileSync(path.join(base, file), "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error(`Unterminated CSV field: ${file}`);
  if (row.length || field) { row.push(field); rows.push(row); }
  const header = rows.shift();
  if (!header || new Set(header).size !== header.length) throw new Error(`Invalid CSV header: ${file}`);
  return rows.map((values) => {
    if (values.length !== header.length) throw new Error(`Invalid CSV row in ${file}`);
    return Object.fromEntries(header.map((name, index) => [name, values[index]]));
  });
}

describe("India research integration boundaries", () => {
  it("keeps the independent journey's order and research models historically consistent", () => {
    const india = getJourney("golden_triangle")!;
    const milan = getJourney("milano")!;
    const summary = json(research, "00_SUMMARY.json");
    const oldPolicy = json(earlier, "data/GAME_POLICY.json");
    const model = json(research, "canonical/18_GAME_ITINERARY_ASSUMPTIONS_RESULTS.json");
    expect(india.cities.slice(0, summary.citySequence.length).map((city) => city.id)).toEqual(summary.citySequence);
    expect(summary.citySequence).toEqual(oldPolicy.cityOrder);
    expect(oldPolicy.startMoneyINR).toBe(30_000);
    // These are historical research scenarios, not a constraint on later
    // game balancing. A future budget change need not rewrite the source ZIP.
    expect(model.results).toHaveLength(2);
    expect(model.results.every((result: { initialBudgetINR: number }) => result.initialBudgetINR === oldPolicy.startMoneyINR)).toBe(true);
    expect(india.currency).toMatchObject({ code: "INR", symbol: "₹" });
    expect(milan.currency).toMatchObject({ code: "EUR", symbol: "€" });
    expect(milan.cities[0].id).toBe("milano");
    expect(milan.cities.some((city) => summary.citySequence.includes(city.id))).toBe(false);
  });

  it("preserves the distinction between provisional routes and verified entry points or images", () => {
    const places = csv(research, "canonical/01_PLACES_AND_ACCESS_33.csv");
    const photos = csv(research, "canonical/14_PHOTO_ASSET_AUDIT_30.csv");
    const routes = csv(research, "canonical/02_WALKING_ROUTES_147.csv");
    expect(places).toHaveLength(33);
    expect(places.every((place) => place.officialEntranceGPSVerified === "False" && place.productionEntryReady === "False" && !place.officialGateLat && !place.officialGateLon)).toBe(true);
    expect(photos).toHaveLength(30);
    expect(photos.every((photo) => photo.imageBinaryDownloaded === "False" && photo.actualImageVisualReviewComplete === "False" && photo.productionReady === "False")).toBe(true);
    expect(routes).toHaveLength(147);
    expect(routes.every((route) => route.actualMeasuredPedestrianRoadMeters === "")).toBe(true);
    expect(routes.filter((route) => route.samePoint === "False").every((route) => !route.actualMeasuredPedestrianMinutes)).toBe(true);
    expect(routes.filter((route) => route.validity === "PROTOTYPE_ONLY_UNVERIFIED")).toHaveLength(102);
    expect(routes.filter((route) => route.samePoint === "False").every((route) => route.offerPedestrianModeInProduction === "False")).toBe(true);
  });

  it("keeps every earlier bridge-risk pair explicitly unverified in the archival research", () => {
    const key = (route: Record<string, string>) => `${route.cityId}/${route.fromPlaceId}/${route.toPlaceId}`;
    const olderRoutes = csv(earlier, "data/WALK_ROUTES.csv");
    const oldBlocked = olderRoutes.filter((route) => route.crossRiverCaution.toLowerCase() === "true");
    const bridges = csv(research, "canonical/03_YAMUNA_BRIDGE_RESTRICTIONS_24.csv");
    const routes = csv(research, "canonical/02_WALKING_ROUTES_147.csv");
    const byKey = new Map(routes.map((route) => [key(route), route]));
    expect(oldBlocked).toHaveLength(24);
    expect(bridges).toHaveLength(24);
    expect(new Set(bridges.map(key))).toEqual(new Set(oldBlocked.map(key)));
    expect(new Set(bridges.map(key)).size).toBe(24);
    expect(oldBlocked.every((route) => route.gamePlayableAsWalk === "False")).toBe(true);
    const india = getJourney("golden_triangle")!;
    for (const bridge of bridges) {
      expect(bridge.productionWalkingAllowed).toBe("False");
      const route = byKey.get(key(bridge));
      expect(route).toMatchObject({ bridgeFootAccessUnverified: "True", offerPedestrianModeInProduction: "False" });
      // This archival flag is not a substitute for reviewing any new evidence.
    }
    // A missing or incomplete starting city must not make the journey playable.
    if (cityContents[india.cities[0].id]?.city.productionStatus !== "complete")
      expect(india.status).toBe("preparing");
  });
});
