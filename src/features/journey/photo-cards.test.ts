import { describe, expect, it } from "vitest";
import type { TravelRoute } from "../../content/travel-schemas";
import type { DestinationChoices, EventChoice, RouteChoice, TravelDestinationEvent, TravelDestinationPlace } from "../../domain/travel-destinations";
import { bandItems, blockedWays, chooseArrangement, chooseWay, nearestIndex, photoCardEntries, photoCardLabel, stepIndex } from "./photo-cards";

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

describe("the bottom band's icons", () => {
  it("always offers 待機 and 休む", () => {
    expect(bandItems({ dates: [], tourOffers: 0 })).toEqual(["wait", "sleep"]);
  });

  it("offers デート only while a date can be started now", () => {
    expect(bandItems({ dates: [{ available: false }], tourOffers: 0 })).toEqual(["wait", "sleep"]);
    expect(bandItems({ dates: [{ available: false }, { available: true }], tourOffers: 0 })).toEqual(["wait", "sleep", "dates"]);
  });

  it("offers ツアー only while a tour is offered here", () => {
    expect(bandItems({ dates: [], tourOffers: 2 })).toEqual(["wait", "sleep", "tours"]);
    expect(bandItems({ dates: [{ available: true }], tourOffers: 1 })).toEqual(["wait", "sleep", "dates", "tours"]);
  });
});

describe("the photo cards of a kind", () => {
  const event = (id: string, category: "main" | "date", available: boolean): EventChoice => ({
    event: { id, placeId: id, category } as TravelDestinationEvent,
    routes: [way("walk", 5, 0, available ? undefined : "閉まっています。")],
    available,
    ...(available ? {} : { reason: "閉まっています。" }),
  });
  const place = (id: string): TravelDestinationPlace => ({ id, walkMinutes: 5, events: [], available: true, hasAvailableUnclearedMain: false });
  const choices = (events: EventChoice[]) => ({ events }) as DestinationChoices;

  it("keeps the destinations' order, a place with nothing of that kind to do now last", () => {
    const places = [place("a"), place("b"), place("c"), place("d")];
    const map = new Map([
      ["a", choices([event("a_main", "main", false), event("a_date", "date", true)])],
      ["b", choices([event("b_date", "date", true)])],
      ["c", choices([event("c_main", "main", true)])],
      ["d", choices([event("d_main", "main", true), event("d_date", "date", false)])],
    ]);
    const main = photoCardEntries(places, map, "main");
    expect(main.map((entry) => [entry.place.id, entry.events.map((choice) => choice.event.id), entry.available])).toEqual([
      ["c", ["c_main"], true], ["d", ["d_main"], true], ["a", ["a_main"], false],
    ]);
    expect(main[2].reason).toBe("閉まっています。");
    expect(photoCardEntries(places, map, "date").map((entry) => entry.place.id)).toEqual(["a", "b", "d"]);
  });
});

describe("reading and moving through the cards", () => {
  it("reads a card's position, name, way and marks", () => {
    expect(photoCardLabel({ position: 2, count: 13, name: "ガッレリア", summary: "徒歩約5分" })).toBe("13件中2件目、ガッレリア、徒歩約5分");
    expect(photoCardLabel({ position: 1, count: 3, name: "最後の晩餐", summary: "路面電車約18分 · €5", marks: ["おすすめ"] }))
      .toBe("3件中1件目、最後の晩餐、路面電車約18分 · €5、おすすめ");
  });

  it("moves the selection with the arrow keys, Home and End, never past either end", () => {
    expect(stepIndex(0, 3, "ArrowLeft")).toBe(0);
    expect(stepIndex(0, 3, "ArrowRight")).toBe(1);
    expect(stepIndex(2, 3, "ArrowDown")).toBe(2);
    expect(stepIndex(2, 3, "ArrowUp")).toBe(1);
    expect(stepIndex(1, 3, "Home")).toBe(0);
    expect(stepIndex(1, 3, "End")).toBe(2);
    expect(stepIndex(1, 3, "Enter")).toBeNull();
    expect(stepIndex(0, 0, "ArrowRight")).toBeNull();
  });

  it("selects the card nearest the row's centre once a flick settles", () => {
    expect(nearestIndex([60, 190, 320], 200)).toBe(1);
    expect(nearestIndex([60, 190, 320], 0)).toBe(0);
    expect(nearestIndex([], 100)).toBeNull();
  });
});

describe("row or list", () => {
  const phone = { viewport: 664, hud: 96, band: 60, sideways: false };

  it("uses the row while a card fits the visible height's share", () => {
    expect(chooseArrangement({ ...phone, card: 150 })).toBe("row");
  });

  it("lists on short screens, with large text and held sideways", () => {
    expect(chooseArrangement({ ...phone, viewport: 460, card: 150 })).toBe("list");
    expect(chooseArrangement({ ...phone, card: 260 })).toBe("list");
    expect(chooseArrangement({ ...phone, sideways: true, card: 150 })).toBe("list");
  });

  it("keeps the row until the card is measured", () => {
    expect(chooseArrangement({ ...phone, card: 0 })).toBe("row");
  });
});
