import { describe, expect, it } from "vitest";
import type { TravelRoute } from "../../content/travel-schemas";
import type { DestinationChoices, EventChoice, RouteChoice, TravelDestinationEvent, TravelDestinationPlace } from "../../domain/travel-destinations";
import {
  blockedWays, cardOfTarget, cardTarget, chooseArrangement, chooseWay, nearestIndex, photoCardEntries, photoCardLabel, rowCards, STAY_CARD_ID,
  stepIndex, syncRow, TOUR_CARD_ID,
} from "./photo-cards";

const way = (mode: string, minutes: number, cost: number, reason?: string): RouteChoice =>
  ({ route: { fromPlaceId: "h", toPlaceId: "x", mode, minutes, cost } as TravelRoute, available: !reason, ...(reason ? { reason } : {}) });

describe("the way a card's 「行く」 takes", () => {
  const walk = way("walk", 25, 0);
  const auto = way("auto_rickshaw", 12, 80);
  const metro = way("metro", 12, 40);

  it("is the only way when there is one", () => {
    expect(chooseWay([walk], null)).toBe(walk);
  });

  it("is the fastest way first, the cheaper of two as fast", () => {
    expect(chooseWay([walk, auto, metro], null)).toBe(metro);
    expect(chooseWay([walk, auto], null)).toBe(auto);
  });

  it("is the mode the player picked while it can be taken", () => {
    expect(chooseWay([walk, auto, metro], "walk")).toBe(walk);
    expect(chooseWay([walk, auto, metro], "auto_rickshaw")).toBe(auto);
  });

  it("never takes a way that cannot be taken, picked or not", () => {
    const poor = way("metro", 12, 40, "予算が足りません。");
    expect(chooseWay([walk, auto, poor], null)).toBe(auto);
    expect(chooseWay([walk, poor], "metro")).toBe(walk);
    expect(chooseWay([way("walk", 25, 0, "今日は休館日です。")], null)).toBeNull();
  });

  it("names each reason once with the ways it holds back", () => {
    expect(blockedWays([walk, way("auto_rickshaw", 12, 80, "予算が足りません。"), way("metro", 12, 40, "予算が足りません。")]))
      .toEqual([{ modes: ["auto_rickshaw", "metro"], reason: "予算が足りません。" }]);
    expect(blockedWays([walk])).toEqual([]);
  });
});

describe("the row of cards", () => {
  const event = (id: string, category: "main" | "date", available: boolean): EventChoice => ({
    event: { id, placeId: id, category } as TravelDestinationEvent,
    routes: [way("walk", 5, 0, available ? undefined : "閉まっています。")],
    available,
    ...(available ? {} : { reason: "閉まっています。" }),
  });
  const place = (id: string): TravelDestinationPlace => ({ id, walkMinutes: 5, events: [], available: true, hasAvailableUnclearedMain: false });
  const choices = (events: EventChoice[]) => ({ events }) as DestinationChoices;
  const places = [place("a"), place("b"), place("c"), place("d")];
  const map = new Map([
    ["a", choices([event("a_main", "main", false), event("a_date", "date", false)])],
    ["b", choices([event("b_date", "date", true)])],
    ["c", choices([event("c_main", "main", true)])],
    ["d", choices([event("d_main", "main", false), event("d_date", "date", true)])],
  ]);

  it("gives each place one card with all its events, in the destinations' order, a place with nothing to do now last", () => {
    expect(photoCardEntries(places, map).map((entry) => [entry.place.id, entry.events.map((choice) => choice.event.id), entry.available])).toEqual([
      ["b", ["b_date"], true], ["c", ["c_main"], true], ["d", ["d_main", "d_date"], true], ["a", ["a_main", "a_date"], false],
    ]);
  });

  it("ends with the tour, while there is one, and 「ホテルに戻る」", () => {
    const entries = photoCardEntries(places, map);
    expect(rowCards(entries, { tour: true }).map((card) => card.id)).toEqual(["b", "c", "d", "a", TOUR_CARD_ID, STAY_CARD_ID]);
    expect(rowCards(entries, { tour: false }).map((card) => card.id)).toEqual(["b", "c", "d", "a", STAY_CARD_ID]);
    expect(rowCards([], { tour: false }).map((card) => card.kind)).toEqual(["stay"]);
  });

  it("stands for the place, the hotel's 休む, or (the tour) no selection", () => {
    const [b, , , , tour, stay] = rowCards(photoCardEntries(places, map), { tour: true });
    expect(cardTarget(b)).toEqual({ kind: "place", placeId: "b" });
    expect(cardTarget(stay)).toEqual({ kind: "sleep" });
    expect(cardTarget(tour)).toBeNull();
  });

  it("keeps the chosen card the selection, and turns to the card the expanded map chose", () => {
    const cards = rowCards(photoCardEntries(places, map), { tour: true });
    const [b, c, , , tour, stay] = cards;
    expect(syncRow(cards, b, { kind: "place", placeId: "b" })).toBeNull();
    expect(syncRow(cards, tour, null)).toBeNull();
    expect(syncRow(cards, stay, { kind: "sleep" })).toBeNull();
    // Nothing selected yet (or the selection gone after a wait): the chosen card is selected.
    expect(syncRow(cards, b, null)).toEqual({ select: { kind: "place", placeId: "b" } });
    expect(syncRow(cards, stay, null)).toEqual({ select: { kind: "sleep" } });
    // The map chose another card's place or the hotel: the row turns to that card.
    expect(syncRow(cards, b, { kind: "place", placeId: "c" })).toEqual({ turn: c.id });
    expect(syncRow(cards, tour, { kind: "sleep" })).toEqual({ turn: STAY_CARD_ID });
    // The map chose a place without a card (the current place): the chosen card is selected again.
    expect(syncRow(cards, tour, { kind: "place", placeId: "here" })).toEqual({ select: null });
    expect(cardOfTarget(cards, { kind: "place", placeId: "here" })).toBeNull();
  });
});

describe("reading and moving through the cards", () => {
  it("reads a card's position, name and marks", () => {
    expect(photoCardLabel({ position: 2, count: 13, name: "ガッレリア" })).toBe("13件中2件目、ガッレリア");
    expect(photoCardLabel({ position: 1, count: 3, name: "最後の晩餐", marks: ["おすすめ", "今は行けない"] }))
      .toBe("3件中1件目、最後の晩餐、おすすめ、今は行けない");
  });

  it("moves the choice with the arrow keys, Home and End, never past either end", () => {
    expect(stepIndex(0, 3, "ArrowLeft")).toBe(0);
    expect(stepIndex(0, 3, "ArrowRight")).toBe(1);
    expect(stepIndex(2, 3, "ArrowDown")).toBe(2);
    expect(stepIndex(2, 3, "ArrowUp")).toBe(1);
    expect(stepIndex(1, 3, "Home")).toBe(0);
    expect(stepIndex(1, 3, "End")).toBe(2);
    expect(stepIndex(1, 3, "Enter")).toBeNull();
    expect(stepIndex(0, 0, "ArrowRight")).toBeNull();
  });

  it("chooses the card nearest the row's centre once a flick settles", () => {
    expect(nearestIndex([60, 190, 320], 200)).toBe(1);
    expect(nearestIndex([60, 190, 320], 0)).toBe(0);
    expect(nearestIndex([], 100)).toBeNull();
  });
});

describe("row or list", () => {
  const phone = { viewport: 664, hud: 96, sideways: false };

  it("uses the row while a card fits the visible height's share", () => {
    expect(chooseArrangement({ ...phone, card: 150 })).toBe("row");
  });

  it("lists on short screens, with large text and held sideways", () => {
    expect(chooseArrangement({ ...phone, viewport: 400, card: 150 })).toBe("list");
    expect(chooseArrangement({ ...phone, card: 260 })).toBe("list");
    expect(chooseArrangement({ ...phone, sideways: true, card: 150 })).toBe("list");
  });

  it("keeps the row until the card is measured", () => {
    expect(chooseArrangement({ ...phone, card: 0 })).toBe("row");
  });
});
