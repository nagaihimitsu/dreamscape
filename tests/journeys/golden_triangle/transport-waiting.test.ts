// Golden Triangle keeps its old transport (taxi, rail and bus, the journey-wide
// ledger and npm run india:transit) until the tour feature lets it switch (user
// decision T1 (b)). Every report says so and points to its own ledger check.
import { describe, expect, it } from "vitest";
import { loadContentSources, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { inspectJourneyReadiness, loadJourneyReadiness } from "../../../scripts/journey-readiness";
import { cityTransitPath, inspectJourneyTransit } from "../../../scripts/journey-transit";
import { transportWaitingJa } from "../../../scripts/transport-validation";
import { getCityContent } from "../../../src/content";
import { completedCity } from "../../../src/dev/scenario-builders";
import { departToNextCity } from "../../../src/domain/city-travel";
import { createGame, validateGameState } from "../../../src/domain/game";
import { beginTravelEvent, getTravelEventAvailability } from "../../../src/domain/travel-game";

const pending = { pendingJa: "ツアー機能待ち", inspectCommand: "npm run india:transit" };
const waitingJa = "ツアー機能待ち（交通は旧方式のまま。都市ごとの交通判断台帳と新しい交通の確認はまだ使いません。旧方式の判断台帳は npm run india:transit で確かめます）";

describe("Golden Triangle waits for its transport switch", () => {
  it("is reported as waiting by journey:transit and keeps no per-city ledger", () => {
    const sources = loadContentSources(process.cwd());
    expect(inspectJourneyTransit(process.cwd(), "golden_triangle", sources)).toEqual({ journeyId: "golden_triangle", pending });
    expect(transportWaitingJa(pending)).toBe(waitingJa);
    for (const cityId of ["delhi", "agra", "jaipur"]) expect(cityTransitPath(sources, cityId), cityId).toBeUndefined();
  });

  it("is reported as waiting by journey:readiness (india:readiness) without changing its readiness", () => {
    const input = loadJourneyReadiness(process.cwd(), "golden_triangle");
    expect(input.transportPending).toEqual(pending);
    const report = inspectJourneyReadiness(input);
    expect(report.transportPending).toEqual(pending);
    const { transportPending: _pending, ...withoutPending } = input;
    const { transportPending: _reported, ...rest } = report;
    expect(inspectJourneyReadiness(withoutPending)).toEqual(rest);
    // Journeys on the new transport report nothing of the kind.
    expect(inspectJourneyReadiness(loadJourneyReadiness(process.cwd(), "luang_prabang")).transportPending).toBeUndefined();
  });

  it("is reported as waiting in the content:build summary, with its old modes", () => {
    const summary = validateContent(selectJourneys(loadContentSources(process.cwd()), ["golden_triangle"])).transport;
    expect(summary).toContain(`Transport golden_triangle: ${waitingJa}; modes walk, taxi, rail, bus`);
  }, 120_000);

  it("counts rides by its current declared modes while waiting, and starts every later city with no ride counted", () => {
    const start = createGame("旅人", "相手", { journeyId: "golden_triangle" });
    // The first map event of Delhi that the party can reach by taxi from the hotel right away.
    const event = getCityContent("delhi").travel.events.find((item) => getTravelEventAvailability(start, item.id, "taxi").available)!;
    expect(event, "a Delhi event reached by taxi").toBeDefined();
    const rode = beginTravelEvent(start, event.id, "taxi", start.revision);
    expect(rode.travel).toMatchObject({ currentPlaceId: event.placeId });
    expect(rode.travel.rideCounts).toEqual({ taxi: 1 });
    expect(validateGameState(JSON.parse(JSON.stringify(rode)))).toEqual(rode);
    const cleared = completedCity("delhi");
    const counted = validateGameState({ ...cleared, travel: { ...cleared.travel, rideCounts: { taxi: 2, rail: 1, bus: 1 } } });
    expect(() => validateGameState({ ...cleared, travel: { ...cleared.travel, rideCounts: { metro: 1 } } })).toThrow("乗り物に乗った回数の記録が一致しません。");
    // A flag of the stay would end there too (none is declared yet, so such a save would not load).
    const flagged = { ...counted, travel: { ...counted.travel, temporaryFlags: ["gt_delhi_test_flag"] } };
    const agra = departToNextCity(flagged, flagged.revision);
    expect(agra.currentCityId).toBe("agra");
    expect(agra.travel.rideCounts).toEqual({});
    expect(agra.travel.temporaryFlags).toEqual([]);
    expect(agra.travel.rentedModeIds).toEqual([]);
    expect(validateGameState(JSON.parse(JSON.stringify(agra)))).toEqual(agra);
  });
});

