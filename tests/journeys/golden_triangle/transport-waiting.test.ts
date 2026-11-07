// Golden Triangle keeps its old transport (taxi, rail and bus, the journey-wide
// ledger and npm run india:transit) until the tour feature lets it switch (user
// decision T1 (b)). Every report says so and points to its own ledger check.
import { describe, expect, it } from "vitest";
import { loadContentSources, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { inspectJourneyReadiness, loadJourneyReadiness } from "../../../scripts/journey-readiness";
import { cityTransitPath, inspectJourneyTransit } from "../../../scripts/journey-transit";
import { transportWaitingJa } from "../../../scripts/transport-validation";

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
});
