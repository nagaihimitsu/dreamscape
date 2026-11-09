import { describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "./content-sources";
import { validateContent } from "./content-validation";

// content:build runs the transport checks (transport-validation.ts) on the
// sample journey's rental bicycle: each edit below breaks one rule.
const sample = selectJourneys(loadContentSources(process.cwd(), { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), ["sample_trip"]);
const folder = SAMPLE_JOURNEY_DIRECTORY;
const read = (file: string) => JSON.parse(sample.tree.files.get(`${folder}/${file}`)!.toString("utf8"));
const isWalkToMarket = (route: { mode: string; fromPlaceId: string; toPlaceId: string }) =>
  route.mode === "walk" && route.fromPlaceId === "mihon_hotel" && route.toPlaceId === "mihon_market";
function edit(changes: Record<string, (data: any) => unknown>): ContentSources {
  const files = new Map(sample.tree.files);
  for (const [file, change] of Object.entries(changes)) files.set(`${folder}/${file}`, Buffer.from(JSON.stringify(change(read(file)))));
  return contentSourcesFromTree({ ...sample.tree, files });
}

describe("transport checks in content:build", () => {
  it("builds the sample with its rental bicycle and reports it", () => {
    expect(validateContent(sample).transport).toContain("Transport sample_trip: modes walk, rental_bicycle (rental); transit ledgers 1: available 12, not_suitable 0, not_applicable 0, inconclusive 0");
  }, 60_000);

  it("refuses an undeclared mode, a missing offer, a third mode and a missing ledger", () => {
    // (The first bicycle ride's scene reads the mode in its condition, stage 4: that check names it first.)
    expect(() => validateContent(edit({ "manifest.json": (data) => ({ ...data, transportModes: [] }) })))
      .toThrow(/rental_bicycle.*(transportModes|declare it)/u);
    expect(() => validateContent(edit({ "travel/mihon-settings.json": ({ rentals: _rentals, ...data }) => data })))
      .toThrow('借りる乗り物 "rental_bicycle" の経路がありますが');
    const mode = (id: string) => ({ id, nameJa: "乗り物", movingJa: "乗り物で移動中", kind: "car" });
    expect(() => validateContent(edit({ "manifest.json": (data) => ({ ...data, transportModes: [...data.transportModes, mode("a_car"), mode("b_car")] }) })))
      .toThrow("乗り物は徒歩のほかに2つまでです: authoring/templates/sample_trip/manifest.json の transportModes に3つあります");
    const files = new Map(sample.tree.files);
    files.delete(`${folder}/travel/mihon-transit.json`);
    expect(() => validateContent(contentSourcesFromTree({ ...sample.tree, files }))).toThrow("交通判断台帳 authoring/templates/sample_trip/travel/mihon-transit.json がありません");
  }, 60_000);

  it("refuses a ledger that disagrees with the routes and a pair reached only by the rental", () => {
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.filter((route: { mode: string; fromPlaceId: string; toPlaceId: string }) => !(route.mode === "rental_bicycle" && route.toPlaceId === "mihon_market" && route.fromPlaceId === "mihon_hotel")) }) })))
      .toThrow("Transit decision and route disagree: mihon_hotel → mihon_market（rental_bicycle）");
    // Without the walk, or with a walk longer than the day, only the rental reaches the market.
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.filter((route: { mode: string; fromPlaceId: string; toPlaceId: string }) => !isWalkToMarket(route)) }) })))
      .toThrow("Missing usable directed route: mihon_hotel/mihon_market");
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.map((route: { mode: string; fromPlaceId: string; toPlaceId: string; minutes: number }) => isWalkToMarket(route) ? { ...route, minutes: 12 * 60 } : route) }) })))
      .toThrow("Missing usable directed route: mihon_hotel/mihon_market");
  }, 60_000);

  it("only warns about a direction without a walking route and about routes without their sources", () => {
    // The bicycle as an ordinary (not rented) mode still reaches the market without the walk.
    const withoutWalk = validateContent(edit({
      "manifest.json": (data) => ({ ...data, transportModes: data.transportModes.map(({ rental: _rental, ...mode }: { rental?: boolean }) => mode) }),
      "travel/mihon-settings.json": ({ rentals: _rentals, ...data }) => data,
      "travel/mihon.json": (data) => ({ ...data, routes: data.routes.filter((route: { mode: string; fromPlaceId: string; toPlaceId: string }) => !isWalkToMarket(route)) }),
    }));
    expect(withoutWalk.warnings.filter((warning) => warning.kind.startsWith("transit-"))).toEqual([{ kind: "transit-walk-missing", message:
      "Directions without a walking route: authoring/templates/sample_trip/travel/mihon.json has no walk route for 1 direction(s), first mihon_hotel → mihon_market " +
      "(the city has a transit ledger, authoring/templates/sample_trip/travel/mihon-transit.json: a ledger reason that weighs a vehicle against walking needs that walk; " +
      "every place must still be reachable by some route)" }]);
    const unmarked = validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.map((route: { mode: string; estimation?: string }) => route.mode === "rental_bicycle" ? { ...route, estimation: undefined } : route) }) }));
    expect(unmarked.warnings.filter((warning) => warning.kind.startsWith("transit-")).map((warning) => warning.kind)).toEqual(["transit-route-unsourced"]);
    expect(unmarked.warnings.find((warning) => warning.kind === "transit-route-unsourced")!.message)
      .toContain('authoring/templates/sample_trip/travel/mihon.json has 12 "rental_bicycle" route(s) without "estimation": "game_model" or a documented_fact source, first mihon_hotel → mihon_clock_tower');
    expect(validateContent(sample).warnings.filter((warning) => warning.kind.startsWith("transit-"))).toEqual([]);
  }, 60_000);

  it("refuses a vehicle route from the hotel to the hotel (no ledger decision covers it)", () => {
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: [...data.routes, { ...data.routes.find((route: { mode: string }) => route.mode === "rental_bicycle"), fromPlaceId: "mihon_hotel", toPlaceId: "mihon_hotel", minutes: 0 }] }) })))
      .toThrow('同じ地点への経路は徒歩だけです: authoring/templates/sample_trip/travel/mihon.json の mihon_hotel → mihon_hotel が "rental_bicycle" です。');
  }, 60_000);
});
