import { describe, expect, it } from "vitest";
import { dates, getCityContent } from "../../../src/content";
import { cityStart, finishEpisode } from "../../../src/dev/scenario-builders";
import { isBudgetDeadEnd } from "../../../src/domain/budget-dead-end";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { findTravelHomeRoutes } from "../../../src/domain/travel-routes";

// B1 (user decision 2026-11-13): free time says when the money left pays for nothing still open in the city and waiting or
// resting cannot change that. In Jaipur the cheapest sights are a walk from the inn with ₹1,200 admission for two (Hawa
// Mahal, Jantar Mantar); its dates open after a first sight.

const start = cityStart("jaipur");
const afterSight = finishEpisode(start, "gt_jaipur_main_hawa_mahal");
const jaipurDates = dates.filter((date) => date.chapterId === "jaipur" && date.kind === "normal").map((date) => date.id);
const { routes } = getCityContent("jaipur").travel;
const hotel = start.travel.hotelPlaceId;
/** The cheapest fare of a ride from one place of Jaipur to another. */
const fare = (from: string, to: string) => Math.min(...routes.filter((route) => route.fromPlaceId === from && route.toPlaceId === to).map((route) => route.cost));
/** The cheapest way home from a place (a ride, or a ride and a walk). */
const homeFare = (from: string) => Math.min(...findTravelHomeRoutes(routes, from, hotel).map((route) => route.cost));
/** `from` with the money at `money`, the party at `placeId` at `minute` (the fare home kept), and the Jaipur dates in `played` played. */
const at = (from: GameState, { money, placeId = hotel, minute = from.travel.minute, played = [] }: {
  money: number; placeId?: string; minute?: number; played?: readonly string[];
}) => validateGameState({ ...from, travelBudget: money, playedDateIds: [...from.playedDateIds, ...played],
  travel: { ...from.travel, currentPlaceId: placeId, minute, returnReserve: homeFare(placeId) } });

describe("Golden Triangle: out of money in a city", () => {
  it("names Jaipur's dead end when no sight is affordable, late in the day or not", () => {
    expect(isBudgetDeadEnd(at(start, { money: 1199 }))).toBe(true);
    expect(isBudgetDeadEnd(at(start, { money: 1199, minute: 20 * 60 + 50 }))).toBe(true);
    // ₹1,200 pays Hawa Mahal: at 20:50 it cannot be started today, but tomorrow it can.
    expect(isBudgetDeadEnd(at(start, { money: 1200 }))).toBe(false);
    expect(isBudgetDeadEnd(at(start, { money: 1200, minute: 20 * 60 + 50 }))).toBe(false);
  });

  it("does not while a rest at the inn makes something affordable, or tonight brings the free rooftop confession", () => {
    // At Amber Fort, every date played but Johari Bazaar's (a walk from the inn; its ₹500 payment): the ride there costs more
    // than the way home, so the money for the way home and the payment pays it after a rest, not from here.
    const home = homeFare("jaipur_amber_fort");
    expect(fare("jaipur_amber_fort", "jaipur_johari_bazaar")).toBeGreaterThan(home);
    const others = jaipurDates.filter((id) => id !== "gt_jaipur_date_johari_bazaar");
    expect(isBudgetDeadEnd(at(afterSight, { money: home + 500, placeId: "jaipur_amber_fort", played: others }))).toBe(false);
    expect(isBudgetDeadEnd(at(afterSight, { money: home + 499, placeId: "jaipur_amber_fort", played: others }))).toBe(true);
    // With the relationship at stage 2 the rooftop confession (the inn, no AP, no money) opens tonight: not by day while it is
    // to come; once it is played, nothing is left.
    const close = { ...afterSight, romanceStage: 2 as const };
    expect(isBudgetDeadEnd(at(close, { money: 0, played: jaipurDates }))).toBe(false);
    expect(isBudgetDeadEnd(at(close, { money: 0, played: [...jaipurDates, "gt_jaipur_date_confession"] }))).toBe(true);
  });
});
