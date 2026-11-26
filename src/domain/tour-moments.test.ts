import { describe, expect, it } from "vitest";
import { occasionSteps } from "./occasion";
import type { Occasion } from "./occasion-state";
import { tourLegsBetween, tourLegUnderway, tourSceneBadge } from "./tour";
import { meets } from "./conditions";
import { bookTour, cityStart, playTour } from "../dev/scenario-builders";

// The order of a tour's steps (tour stages 2b, 3) on the Golden Triangle's Fatehpur Sikri day tour, as its writer assumes it:
// out -1 → out narration → out in-car encounter → the move → out +1; the visit's main group, then visit +1 (after the result's
// 「ツアーを続ける」); back narration → back in-car encounter → the move → back +1. And what reads a leg's moment: the legs the
// transition art draws (once the leg has moved), the leg named while riding it, the scene label's tag.

const tourId = "gt_agra_tour_fatehpur_sikri";
const leg = (step: string, ran: Occasion["ran"] = []): Occasion =>
  ({ kind: "tour", cityId: "agra", tour: { id: tourId, step }, eventId: null, landmarkId: null, parts: ["leg", "leg_move"], ran, at: null, started: [] });
const running = (step: number) => ({ status: "running" as const, tourId, offerId: "hotel_desk", pricePaid: 3200, bookedDay: 1, contentHash: "x", step });

describe("a tour step's moment (tour stages 2b, 3)", () => {
  it("runs a leg's scenes before it, its narration, its in-car encounter, its move, then its scenes after it", () => {
    // (The steps list every scene; each one's # when: — the offer the tour was bought through, 2026-11-26 — is read as its turn comes.)
    expect(occasionSteps(leg("out"))).toEqual([{ scene: "gt_agra_tour_morning" }, { part: "leg" }, { scene: "gt_agra_tour_out_mother", after: "leg" },
      { scene: "gt_agra_tour_out_shared", after: "leg" }, { part: "leg_move" }, { scene: "gt_agra_tour_arrive" }, { scene: "gt_agra_tour_guide_gate" }]);
    expect(occasionSteps(leg("back"))).toEqual([{ part: "leg" }, { scene: "gt_agra_tour_back_awake", after: "leg" },
      { scene: "gt_agra_tour_back_shared", after: "leg" }, { part: "leg_move" }, { scene: "gt_agra_tour_home" }]);
  });

  it("runs an event step's scenes around its visit's main group", () => {
    const visit: Occasion = { kind: "visit", tour: { id: tourId, step: "visit" }, eventId: "gt_agra_main_fatehpur_sikri", landmarkId: "agra_fatehpur_sikri",
      parts: ["guide", "battle"], ran: [], at: null, started: [] };
    expect(occasionSteps(visit)).toEqual([{ part: "guide" }, { part: "battle" }, { scene: "gt_agra_tour_guide_palace" },
      { scene: "gt_agra_tour_shared_sandals" }, { scene: "gt_agra_tour_mathri" }, { scene: "gt_agra_tour_mother_door" }]);
    // The same visit outside a tour has none of them.
    const { tour: _tour, ...alone } = visit;
    expect(occasionSteps(alone)).toEqual([{ part: "guide" }, { part: "battle" }]);
  });

  // 2026-11-26: how the tour was bought decides who comes along: a guide (the inn's desk), other guests (the website), or Vinod
  // alone (his own offer, once he was met). Played through like a player (first choices), each offer runs its own scenes only.
  it.each([
    ["hotel_desk", ["gt_agra_tour_out_mother", "gt_agra_tour_guide_gate", "gt_agra_tour_guide_palace", "gt_agra_tour_back_awake"]],
    ["web", ["gt_agra_tour_out_shared", "gt_agra_tour_shared_sandals", "gt_agra_tour_back_shared"]],
    ["vinod_direct", ["gt_agra_tour_out_mother", "gt_agra_tour_mother_door", "gt_agra_tour_back_awake"]],
  ])("runs the scenes of the offer %s, and none of the others'", (offerId, own) => {
    const offerScenes = ["gt_agra_tour_out_mother", "gt_agra_tour_out_shared", "gt_agra_tour_guide_gate", "gt_agra_tour_guide_palace",
      "gt_agra_tour_shared_sandals", "gt_agra_tour_mother_door", "gt_agra_tour_back_awake", "gt_agra_tour_back_shared"];
    const start = cityStart("agra");
    const met = offerId === "vinod_direct" ? { ...start, seenEncounterIds: [...start.seenEncounterIds, "gt_agra_hotel_vinod"] } : start;
    const booked = bookTour(met, tourId, offerId);
    expect(meets(booked, { tourOffer: { tour: tourId, offer: offerId } })).toBe(true);
    const done = playTour(booked, tourId);
    expect(offerScenes.filter((id) => done.seenEncounterIds.includes(id))).toEqual(own);
    // Every offer shares the rest of the day: the morning, the narrations' legs, the snack, the way home.
    for (const id of ["gt_agra_tour_morning", "gt_agra_tour_arrive", "gt_agra_tour_mathri", "gt_agra_tour_home"]) expect(done.seenEncounterIds).toContain(id);
    // The record of the offer ends with the tour (a later scene reads a flag the tour's scenes set).
    expect(meets(done, { tourOffer: { tour: tourId, offer: offerId } })).toBe(false);
  }, 60_000);

  it("draws a leg once its moment has moved the party, names it while riding, and tags the leg's scenes 「ツアー」", () => {
    const at = (occasion: Occasion | null, step = 0) => ({ tour: running(step), completedTourIds: [], occasion });
    expect(tourLegsBetween(at(leg("out")), at(leg("out", ["leg"])))).toEqual([]);
    expect(tourLegsBetween(at(leg("out", ["leg"])), at(leg("out", ["leg", "leg_move"]))).map((item) => item.id)).toEqual(["out"]);
    // The visit after the moved leg draws nothing more; the end after the back leg's moment neither.
    expect(tourLegsBetween(at(leg("out", ["leg", "leg_move"])), at(null, 1))).toEqual([]);
    expect(tourLegsBetween(at(leg("back", ["leg", "leg_move"]), 2), { tour: null, completedTourIds: [tourId], occasion: null })).toEqual([]);
    expect(tourLegUnderway({ occasion: leg("out") })).toBeUndefined();
    expect(tourLegUnderway({ occasion: leg("out", ["leg"]) })?.labelJa).toBe("車でファテープル・シークリーへ");
    expect(tourLegUnderway({ occasion: leg("out", ["leg", "leg_move"]) })).toBeUndefined();
    expect(tourSceneBadge({ tour: running(0), occasion: leg("out") })).toBe("ツアー");
    expect(tourSceneBadge({ tour: running(1), occasion: null })).toBe("ツアー・見学");
  });
});
