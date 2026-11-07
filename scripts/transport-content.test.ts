import { describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "./content-sources";
import { validateContent } from "./content-validation";

// content:build runs the transport checks (transport-validation.ts) on the
// sample journey's rental bicycle: each edit below breaks one rule.
const sample = selectJourneys(loadContentSources(process.cwd(), { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), ["sample_trip"]);
const folder = SAMPLE_JOURNEY_DIRECTORY;
const read = (file: string) => JSON.parse(sample.tree.files.get(`${folder}/${file}`)!.toString("utf8"));
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
    expect(() => validateContent(edit({ "manifest.json": (data) => ({ ...data, transportModes: [] }) })))
      .toThrow('乗り物 "rental_bicycle" は authoring/templates/sample_trip/manifest.json の transportModes に宣言されていません');
    expect(() => validateContent(edit({ "travel/mihon-settings.json": ({ rentals: _rentals, ...data }) => data })))
      .toThrow('借りる乗り物 "rental_bicycle" の経路がありますが');
    const mode = (id: string) => ({ id, nameJa: "乗り物", movingJa: "乗り物で移動中", kind: "car" });
    expect(() => validateContent(edit({ "manifest.json": (data) => ({ ...data, transportModes: [...data.transportModes, mode("a_car"), mode("b_car")] }) })))
      .toThrow("乗り物は徒歩のほかに2つまでです: authoring/templates/sample_trip/manifest.json の transportModes に3つあります");
    const files = new Map(sample.tree.files);
    files.delete(`${folder}/travel/mihon-transit.json`);
    expect(() => validateContent(contentSourcesFromTree({ ...sample.tree, files }))).toThrow("交通判断台帳 authoring/templates/sample_trip/travel/mihon-transit.json がありません");
  }, 60_000);

  it("refuses a ledger that disagrees with the routes, a pair reached only by the rental, and a route without its sources", () => {
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.filter((route: { mode: string; fromPlaceId: string; toPlaceId: string }) => !(route.mode === "rental_bicycle" && route.toPlaceId === "mihon_market" && route.fromPlaceId === "mihon_hotel")) }) })))
      .toThrow("Transit decision and route disagree: mihon_hotel → mihon_market（rental_bicycle）");
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.filter((route: { mode: string; fromPlaceId: string; toPlaceId: string }) => !(route.mode === "walk" && route.fromPlaceId === "mihon_hotel" && route.toPlaceId === "mihon_market")) }) })))
      .toThrow("Missing usable directed route: mihon_hotel/mihon_market");
    expect(() => validateContent(edit({ "travel/mihon.json": (data) => ({ ...data,
      routes: data.routes.map((route: { mode: string; estimation?: string }) => route.mode === "rental_bicycle" ? { ...route, estimation: undefined } : route) }) })))
      .toThrow("乗り物の経路12本に、ゲーム用の推定の印");
  }, 60_000);
});
