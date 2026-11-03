import { describe, expect, it } from "vitest";
import { travelCatalogSchema, type TravelCatalog } from "../src/content/travel-schemas";
import { buildIndiaTransitReview, indiaTransitCities, readIndiaTransitReview, type IndiaTransitReviewInput } from "./india-transit-review";

const fact = { publisher: "試験資料", title: "試験用資料", url: "https://example.org/test", checkedAt: "2026-11-03", claimType: "documented_fact" as const, claimJa: "試験用の根拠。" };
const model = { ...fact, title: "ゲーム値", claimType: "hypothesis" as const, claimJa: "試験用の推定値。" };

function fixture() {
  const input = readIndiaTransitReview(process.cwd());
  const catalogs = Object.fromEntries(indiaTransitCities.map((city) => {
    const catalog = travelCatalogSchema.parse(input.catalogs[city]);
    catalog.routes = catalog.routes.filter((route) => route.mode !== "rail" && route.mode !== "bus");
    return [city, catalog];
  })) as Record<typeof indiaTransitCities[number], TravelCatalog>;
  const delhi = catalogs.delhi;
  const [from, to] = delhi.places;
  const decision = { cityId: "delhi" as const, fromPlaceId: to.id, toPlaceId: from.id, mode: "bus" as const, status: "not_suitable" as const,
    checkedAt: "2026-11-03", reasonJa: "調べた候補は利用しにくいため採用しない。", sources: [fact] };
  return { input: { catalogs, decisions: { schemaVersion: 1, decisions: [decision] } } satisfies IndiaTransitReviewInput,
    catalogs, from: from.id, to: to.id, decision };
}

describe("India city transit review", () => {
  it("derives playable, reviewed, inconclusive and unresearched statuses independently for each direction and mode", () => {
    const { input, catalogs, from, to } = fixture();
    catalogs.delhi.routes.push({ fromPlaceId: from, toPlaceId: to, mode: "rail", minutes: 30, cost: 40,
      estimation: "game_model", sources: [fact, model] });
    const decisions = input.decisions as { schemaVersion: number; decisions: Array<{ cityId: string; fromPlaceId: string; toPlaceId: string; mode: string; status: string; checkedAt: string; reasonJa: string; sources: typeof fact[] }> };
    decisions.decisions.push({ cityId: "delhi", fromPlaceId: to, toPlaceId: from, mode: "rail", status: "inconclusive",
      checkedAt: "2026-11-03", reasonJa: "資料を確認したが候補を特定できない。", sources: [fact] });
    const report = buildIndiaTransitReview(input);
    const row = (origin: string, destination: string, mode: "rail" | "bus") => report.rows.find((item) => item.cityId === "delhi" && item.fromPlaceId === origin && item.toPlaceId === destination && item.mode === mode);
    expect(row(from, to, "rail")?.status).toBe("available");
    expect(row(to, from, "bus")?.status).toBe("not_suitable");
    expect(row(to, from, "rail")?.status).toBe("inconclusive");
    expect(row(from, to, "bus")?.status).toBe("unresearched");
    expect(report.counts.delhi.available).toBe(1);
    expect(report.counts.delhi.not_suitable).toBe(1);
    expect(report.counts.delhi.inconclusive).toBe(1);
    expect(report.rows).toHaveLength(indiaTransitCities.reduce((sum, city) => sum + catalogs[city].places.length * (catalogs[city].places.length - 1) * 2, 0));
  });

  it("rejects decisions without evidence, repeated decisions and wrong place ownership", () => {
    const { input, decision } = fixture();
    expect(() => buildIndiaTransitReview({ ...input, decisions: { schemaVersion: 1, decisions: [{ ...decision, sources: [model] }] } })).toThrow(/documented source/);
    expect(() => buildIndiaTransitReview({ ...input, decisions: { schemaVersion: 1, decisions: [decision, decision] } })).toThrow(/Duplicate transit decision/);
    expect(() => buildIndiaTransitReview({ ...input, decisions: { schemaVersion: 1, decisions: [{ ...decision, fromPlaceId: "agra_agra_fort" }] } })).toThrow(/Invalid reviewed transit endpoints/);
  });

  it("rejects a playable route that conflicts with a reviewed decision or lacks research", () => {
    const { input, catalogs, from, to } = fixture();
    catalogs.delhi.routes.push({ fromPlaceId: to, toPlaceId: from, mode: "bus", minutes: 30, cost: 40,
      estimation: "game_model", sources: [fact, model] });
    expect(() => buildIndiaTransitReview(input)).toThrow(/conflicts with a playable route/);
    catalogs.delhi.routes = catalogs.delhi.routes.filter((route) => route.mode !== "bus");
    catalogs.delhi.routes.push({ fromPlaceId: from, toPlaceId: to, mode: "rail", minutes: 30, cost: 40,
      estimation: "game_model", sources: [model] });
    expect(() => buildIndiaTransitReview(input)).toThrow(/documented source/);
  });
});
