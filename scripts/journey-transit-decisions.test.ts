import { describe, expect, it } from "vitest";
import { travelCatalogSchema, type TravelCatalog } from "../src/content/travel-schemas";
import { buildJourneyTransitDecisionReview, journeyTransitDecisionFile, readJourneyTransitDecisions, type JourneyTransitDecisionInput } from "./journey-transit-decisions";
import { getJourneyAuthoringProfile, journeyAuthoringSchema } from "./journey-authoring";

const fact = { publisher: "試験資料", title: "試験用資料", url: "https://example.org/test", checkedAt: "2026-11-03", claimType: "documented_fact" as const, claimJa: "試験用の根拠。" };
const model = { ...fact, title: "ゲーム値", claimType: "hypothesis" as const, claimJa: "試験用の推定値。" };

// Golden Triangle keeps one journey-wide ledger for Delhi, Agra and Jaipur.
const ledgerCities = ["delhi", "agra", "jaipur"] as const;

function fixture() {
  const input = readJourneyTransitDecisions(process.cwd(), "golden_triangle");
  expect(Object.keys(input.catalogs)).toEqual(ledgerCities);
  const catalogs = Object.fromEntries(ledgerCities.map((city) => {
    const catalog = travelCatalogSchema.parse(input.catalogs[city]);
    catalog.routes = catalog.routes.filter((route) => route.mode !== "rail" && route.mode !== "bus");
    return [city, catalog];
  })) as Record<typeof ledgerCities[number], TravelCatalog>;
  const delhi = catalogs.delhi;
  const [from, to] = delhi.places;
  const decision = { cityId: "delhi" as const, fromPlaceId: to.id, toPlaceId: from.id, mode: "bus" as const, status: "not_suitable" as const,
    checkedAt: "2026-11-03", reasonJa: "調べた候補は利用しにくいため採用しない。", sources: [fact] };
  return { input: { catalogs, decisions: { schemaVersion: 1, decisions: [decision] } } satisfies JourneyTransitDecisionInput,
    catalogs, from: from.id, to: to.id, decision };
}

describe("journey-wide transit decision ledger", () => {
  it("derives playable, reviewed, inconclusive and unresearched statuses independently for each direction and mode", () => {
    const { input, catalogs, from, to } = fixture();
    catalogs.delhi.routes.push({ fromPlaceId: from, toPlaceId: to, mode: "rail", minutes: 30, cost: 40,
      estimation: "game_model", sources: [fact, model] });
    const decisions = input.decisions as { schemaVersion: number; decisions: Array<{ cityId: string; fromPlaceId: string; toPlaceId: string; mode: string; status: string; checkedAt: string; reasonJa: string; sources: typeof fact[] }> };
    decisions.decisions.push({ cityId: "delhi", fromPlaceId: to, toPlaceId: from, mode: "rail", status: "inconclusive",
      checkedAt: "2026-11-03", reasonJa: "資料を確認したが候補を特定できない。", sources: [fact] });
    const report = buildJourneyTransitDecisionReview(input);
    const row = (origin: string, destination: string, mode: "rail" | "bus") => report.rows.find((item) => item.cityId === "delhi" && item.fromPlaceId === origin && item.toPlaceId === destination && item.mode === mode);
    expect(row(from, to, "rail")?.status).toBe("available");
    expect(row(to, from, "bus")?.status).toBe("not_suitable");
    expect(row(to, from, "rail")?.status).toBe("inconclusive");
    expect(row(from, to, "bus")?.status).toBe("unresearched");
    expect(report.counts.delhi.available).toBe(1);
    expect(report.counts.delhi.not_suitable).toBe(1);
    expect(report.counts.delhi.inconclusive).toBe(1);
    expect(report.rows).toHaveLength(ledgerCities.reduce((sum, city) => sum + catalogs[city].places.length * (catalogs[city].places.length - 1) * 2, 0));
  });

  it("rejects decisions without evidence, repeated decisions and wrong place ownership", () => {
    const { input, decision } = fixture();
    expect(() => buildJourneyTransitDecisionReview({ ...input, decisions: { schemaVersion: 1, decisions: [{ ...decision, sources: [model] }] } })).toThrow(/documented source/);
    expect(() => buildJourneyTransitDecisionReview({ ...input, decisions: { schemaVersion: 1, decisions: [decision, decision] } })).toThrow(/Duplicate transit decision/);
    expect(() => buildJourneyTransitDecisionReview({ ...input, decisions: { schemaVersion: 1, decisions: [{ ...decision, fromPlaceId: "agra_agra_fort" }] } })).toThrow(/Invalid reviewed transit endpoints/);
    expect(() => buildJourneyTransitDecisionReview({ ...input, decisions: { schemaVersion: 1, decisions: [{ ...decision, cityId: "milano" }] } })).toThrow(/Invalid option: expected one of .*delhi.*agra.*jaipur/);
  });

  it("rejects a playable route that conflicts with a reviewed decision or lacks research", () => {
    const { input, catalogs, from, to } = fixture();
    catalogs.delhi.routes.push({ fromPlaceId: to, toPlaceId: from, mode: "bus", minutes: 30, cost: 40,
      estimation: "game_model", sources: [fact, model] });
    expect(() => buildJourneyTransitDecisionReview(input)).toThrow(/conflicts with a playable route/);
    catalogs.delhi.routes = catalogs.delhi.routes.filter((route) => route.mode !== "bus");
    catalogs.delhi.routes.push({ fromPlaceId: from, toPlaceId: to, mode: "rail", minutes: 30, cost: 40,
      estimation: "game_model", sources: [model] });
    expect(() => buildJourneyTransitDecisionReview(input)).toThrow(/documented source/);
  });

  it("is chosen by the journey's authoring profile for the cities it lists", () => {
    const profile = getJourneyAuthoringProfile(process.cwd(), "golden_triangle");
    expect(profile.transitDecisionLedger?.cities).toEqual(ledgerCities);
    for (const city of ledgerCities) expect(journeyTransitDecisionFile(process.cwd(), city)).toBe(profile.transitDecisionLedger?.file);
    // Milan has no profile; Uzbekistan reviews transit in per-city ledgers.
    expect(journeyTransitDecisionFile(process.cwd(), "milano")).toBeUndefined();
    expect(journeyTransitDecisionFile(process.cwd(), "tashkent")).toBeUndefined();
    expect(() => readJourneyTransitDecisions(process.cwd(), "uzbekistan")).toThrow("Journey has no transit decision ledger: uzbekistan");
    expect(journeyAuthoringSchema.safeParse({ ...profile, transitDirectory: "authoring/x" }).error?.message)
      .toMatch(/Use either transitDirectory or transitDecisionLedger, not both/);
  });
});
