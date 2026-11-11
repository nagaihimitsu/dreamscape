import { describe, expect, it } from "vitest";
import type { TravelRoute } from "../../content/travel-schemas";
import type {
  DestinationChoices, EventChoice, RouteChoice, SleepOption, TravelDestinationEvent, TravelDestinationPlace, TravelWaitOption,
} from "../../domain/travel-destinations";
import {
  blockedSleepWays, blockedWays, cardKinds, cardOfTarget, cardScales, cardTarget, chooseArrangement, chooseSleepWay, chooseWait, chooseWay,
  defaultCardIndex, departureOf, dragDirection, eventKindJa, flickSpeed, glideIndex, halfShown, liftsCard, liftTurnedSideways, nearestIndex,
  NO_PLAN, pageAtEnd, photoCardAnnouncement, photoCardEntries, photoCardLabel, refusalJa, rowCards, sleepRefusalJa, sleepWayKey,
  sleepWayLabelJa, STAY_CARD_ID, stepIndex, swipeArea, swipeDeparts, syncRow, takesSwipe, TOUR_CARD_ID, WAIT_BLOCKED_JA, WAIT_CARD_ID,
  WAIT_REFUSAL_JA, waitChosenJa, waitKey, waitLabelJa, type PhotoCardEntry,
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

  it("starts with 「待機」 and ends with the tour, while there is one, and 「ホテルに戻る」", () => {
    const entries = photoCardEntries(places, map);
    expect(rowCards(entries, { tour: true }).map((card) => card.id)).toEqual([WAIT_CARD_ID, "b", "c", "d", "a", TOUR_CARD_ID, STAY_CARD_ID]);
    expect(rowCards(entries, { tour: false }).map((card) => card.id)).toEqual([WAIT_CARD_ID, "b", "c", "d", "a", STAY_CARD_ID]);
    expect(rowCards([], { tour: false }).map((card) => card.kind)).toEqual(["wait", "stay"]);
  });

  it("chooses the first place's card first, else the first card", () => {
    expect(defaultCardIndex(rowCards(photoCardEntries(places, map), { tour: true }))).toBe(1);
    expect(defaultCardIndex(rowCards([], { tour: true }))).toBe(0);
  });

  it("stands for the place, the hotel's 休む, or (「待機」, the tour) no selection", () => {
    const [wait, b, , , , tour, stay] = rowCards(photoCardEntries(places, map), { tour: true });
    expect(cardTarget(b)).toEqual({ kind: "place", placeId: "b" });
    expect(cardTarget(stay)).toEqual({ kind: "sleep" });
    expect(cardTarget(tour)).toBeNull();
    expect(cardTarget(wait)).toBeNull();
  });

  it("keeps the chosen card the selection, and turns to the card the expanded map chose", () => {
    const cards = rowCards(photoCardEntries(places, map), { tour: true });
    const [, b, c, , , tour, stay] = cards;
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

  it("fills a card for the story, a date or both, and leaves 「待機」, the tour and 「ホテルに戻る」 plain", () => {
    const cards = rowCards(photoCardEntries(places, map), { tour: true });
    expect(cards.map((card) => [card.id, cardKinds(card)])).toEqual([
      [WAIT_CARD_ID, "none"], ["b", "date"], ["c", "story"], ["d", "both"], ["a", "both"], [TOUR_CARD_ID, "none"], [STAY_CARD_ID, "none"],
    ]);
  });

  it("departs for the picked event while it is there, else the first that can be done now, by its way", () => {
    const [, , d, a] = photoCardEntries(places, map);
    expect(departureOf(d, NO_PLAN).event.event.id).toBe("d_date");
    expect(departureOf(d, { eventId: "d_main", mode: null }).event.event.id).toBe("d_main");
    expect(departureOf(d, { eventId: "gone", mode: "walk" })).toMatchObject({ event: { event: { id: "d_date" } }, way: { route: { mode: "walk" } } });
    // Nothing can be done there: the first event, no way, and its reason when a swipe tries.
    const closed = departureOf(a, NO_PLAN);
    expect([closed.event.event.id, closed.way]).toEqual(["a_main", null]);
    expect(refusalJa(closed.event)).toBe("出発できません。閉まっています。");
  });
});

describe("「待機」 and 「ホテルに戻る」 go by a swipe up too (user decision 2026-11-11)", () => {
  it("takes a swipe up on a place's card, 「待機」 and 「ホテルに戻る」, never on the tour's", () => {
    const entry = { place: { id: "p" }, events: [], available: true } as unknown as PhotoCardEntry;
    expect(rowCards([entry], { tour: true }).map((card) => [card.kind, takesSwipe(card)]))
      .toEqual([["wait", true], ["place", true], ["tour", false], ["stay", true]]);
  });

  const minutes: TravelWaitOption = { minutes: 30, until: null, available: true };
  const night: TravelWaitOption = { minutes: 120, until: 18 * 60, available: true };

  it("waits 「30分待つ」 first, the picked wait while it can be waited, never one that cannot", () => {
    expect(chooseWait([minutes, night], null)).toBe(minutes);
    expect(chooseWait([minutes, night], waitKey(night))).toBe(night);
    // A pick gone (the next time changed after a wait) or one that cannot be waited: the first that can.
    expect(chooseWait([minutes, { ...night, until: 19 * 60 }], waitKey(night))).toBe(minutes);
    const late = { ...minutes, available: false };
    expect(chooseWait([late, night], waitKey(late))).toBe(night);
    expect(chooseWait([late], null)).toBeNull();
  });

  it("names the waits: the minutes, the night with its time, else the time", () => {
    expect(waitLabelJa(minutes)).toBe("30分待つ");
    expect(waitLabelJa(night)).toBe("夜(18:00)まで待つ");
    expect(waitLabelJa({ minutes: 45, until: 15 * 60 + 30 })).toBe("15:30まで待つ");
    expect(WAIT_BLOCKED_JA).toBe("21:00までにホテルへ帰れなくなる待ち方は選べません。");
    expect(WAIT_REFUSAL_JA).toBe("待てません。21:00までにホテルへ帰れなくなります。");
  });

  const ok = { ok: true, arrivalMinute: 900, nextDay: 2, nextMinute: 540, remainingBudget: 100, remainingAp: 3, usedAssistance: false } as const;
  const home = (mode: string, plan: SleepOption["plan"], viaPlaceId?: string): SleepOption =>
    ({ route: { fromPlaceId: "x", toPlaceId: "h", mode, minutes: 10, cost: 40, ...(viaPlaceId ? { viaPlaceId } : {}) }, plan }) as SleepOption;
  const auto = home("auto_rickshaw", ok);
  const metro = home("metro", ok, "station");
  const walk = home("walk", ok);

  it("rests by the first way home that can be taken (the fastest) first, the picked one while it can be taken", () => {
    expect(chooseSleepWay([auto, metro, walk], null)).toBe(auto);
    expect(chooseSleepWay([auto, metro, walk], sleepWayKey(metro.route))).toBe(metro);
    // A via route is its own way: the same mode direct is another.
    expect(sleepWayKey(metro.route)).not.toBe(sleepWayKey(home("metro", ok).route));
    const poor = home("auto_rickshaw", { ok: false, reason: "budget" });
    expect(chooseSleepWay([poor, walk], sleepWayKey(poor.route))).toBe(walk);
    expect(chooseSleepWay([poor], null)).toBeNull();
    expect(chooseSleepWay([], null)).toBeNull();
  });

  it("names a way home: 「ホテルに戻って休む」 at the hotel, else by its mode and where it changes to walking", () => {
    expect(sleepWayLabelJa({ atHotel: true, mode: "徒歩" })).toBe("ホテルに戻って休む");
    expect(sleepWayLabelJa({ atHotel: false, mode: "徒歩" })).toBe("徒歩で帰る");
    expect(sleepWayLabelJa({ atHotel: false, mode: "メトロ", via: "中央駅" })).toBe("メトロで帰る・中央駅から徒歩");
  });

  it("says each reason a way home cannot be taken once, with its ways, and why a rest cannot be made", () => {
    const poor = home("auto_rickshaw", { ok: false, reason: "budget" });
    const poorer = home("taxi", { ok: false, reason: "budget" });
    const late = home("metro", { ok: false, reason: "time" });
    expect(blockedSleepWays([walk, poor, late, poorer])).toEqual([
      { options: [poor, poorer], reason: "この移動手段の予算が足りません。" }, { options: [late], reason: "この経路では帰れません。" },
    ]);
    expect(blockedSleepWays([walk])).toEqual([]);
    expect(sleepRefusalJa([poor, late])).toBe("休めません。この移動手段の予算が足りません。この経路では帰れません。");
    expect(sleepRefusalJa([])).toBe("休めません。ホテルへの経路は確認されていません。");
  });

  it("says, once chosen, what its swipe up takes", () => {
    expect(waitChosenJa("30分待つ")).toBe("「待機」を選びました。待ち方を出しています（「30分待つ」を選んでいます）。");
    expect(waitChosenJa(null)).toBe("「待機」を選びました。今は待てません。");
    const sleep = { kind: "sleep" as const, choices: { options: [walk], onlyWay: walk.route } };
    expect(photoCardAnnouncement(sleep, "滞在先", null, "ホテルに戻って休む"))
      .toBe("「ホテルに戻る」を選びました。帰り方を出しています（「ホテルに戻って休む」を選んでいます）。");
    expect(photoCardAnnouncement(sleep, "滞在先")).toBe("「ホテルに戻る」を選びました。今は休めません。");
  });
});

describe("reading and moving through the cards", () => {
  it("tags each event in the selected place's card as the story or a date, in words", () => {
    expect(eventKindJa("main")).toBe("ストーリー");
    expect(eventKindJa("date")).toBe("デート");
  });

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

  it("shows the centre card whole size and its neighbours small, the coming card growing with the scroll", () => {
    const rounded = (scales: number[]) => scales.map((scale) => Math.round(scale * 100) / 100);
    expect(rounded(cardScales([0, 100, 200, 300], 100, 100, 0.4, false))).toEqual([0.4, 1, 0.4, 0.4]);
    expect(rounded(cardScales([0, 100, 200], 150, 100, 0.4, false))).toEqual([0.4, 0.7, 0.7]);
    // Reduced motion: no growing, the nearest card is whole size at once.
    expect(cardScales([0, 100, 200], 140, 100, 0.4, true)).toEqual([0.4, 1, 0.4]);
  });

  it("departs on a swipe up past a third of the card, or on a quick flick up, never down", () => {
    const speed = flickSpeed([{ t: 0, x: 0, y: 300 }, { t: 50, x: 0, y: 280 }, { t: 100, x: 0, y: 240 }], "y");
    expect(speed).toBeCloseTo(-0.8);
    expect(flickSpeed([{ t: 0, x: 0, y: 300 }], "y")).toBe(0);
    expect(swipeDeparts({ lift: -100, height: 300, speed: 0 })).toBe(true);
    expect(swipeDeparts({ lift: -90, height: 300, speed: 0 })).toBe(false);
    expect(swipeDeparts({ lift: -40, height: 300, speed })).toBe(true);
    expect(swipeDeparts({ lift: -10, height: 300, speed: -2 })).toBe(false);
    expect(swipeDeparts({ lift: 0, height: 300, speed: -2 })).toBe(false);
  });
});

describe("drags anywhere on the screen (the row arrangement)", () => {
  it("takes the way of a drag from its first movement past the slop, a tie sideways", () => {
    expect(dragDirection(6, -6)).toBeNull();
    expect(dragDirection(-12, 4)).toBe("sideways");
    expect(dragDirection(10, -10)).toBe("sideways");
    expect(dragDirection(3, -14)).toBe("up");
    expect(dragDirection(-3, 14)).toBe("down");
  });

  it("brings a lifted card back once its drag turns sideways", () => {
    expect(liftTurnedSideways(20, -10)).toBe(false);
    expect(liftTurnedSideways(-40, -20)).toBe(true);
    expect(liftTurnedSideways(40, -60)).toBe(false);
  });

  it("starts on the row, else elsewhere on the screen, never where it is excluded, and off the row not while zoomed in", () => {
    expect(swipeArea({ onRow: true, excluded: false, zoomed: false })).toBe("row");
    expect(swipeArea({ onRow: false, excluded: false, zoomed: false })).toBe("screen");
    expect(swipeArea({ onRow: false, excluded: true, zoomed: false })).toBeNull();
    expect(swipeArea({ onRow: true, excluded: true, zoomed: false })).toBeNull();
    expect(swipeArea({ onRow: true, excluded: false, zoomed: true })).toBe("row");
    expect(swipeArea({ onRow: false, excluded: false, zoomed: true })).toBeNull();
  });

  it("lifts the card from the row always, from elsewhere once the page has nothing below and the card shows", () => {
    expect(liftsCard({ area: "row", atEnd: false, cardShown: false })).toBe(true);
    expect(liftsCard({ area: "screen", atEnd: false, cardShown: true })).toBe(false);
    expect(liftsCard({ area: "screen", atEnd: true, cardShown: false })).toBe(false);
    expect(liftsCard({ area: "screen", atEnd: true, cardShown: true })).toBe(true);
  });

  it("knows a page scrolled to its end or fitting the screen", () => {
    expect(pageAtEnd({ top: 0, viewport: 700, height: 650 })).toBe(true);
    expect(pageAtEnd({ top: 199, viewport: 700, height: 900 })).toBe(true);
    expect(pageAtEnd({ top: 120, viewport: 700, height: 900 })).toBe(false);
  });

  it("sees a card while at least half of it is on the screen", () => {
    expect(halfShown({ top: 100, bottom: 300, viewport: 700 })).toBe(true);
    expect(halfShown({ top: -90, bottom: 110, viewport: 700 })).toBe(true);
    expect(halfShown({ top: -120, bottom: 80, viewport: 700 })).toBe(false);
    expect(halfShown({ top: 620, bottom: 820, viewport: 700 })).toBe(false);
  });

  it("glides a let-go row to the card nearest its landing, a flick on to at least the next card its way", () => {
    const centres = [0, 140, 280, 420];
    // Let go slowly: the nearest card (the row stays, or comes back).
    expect(glideIndex(centres, 150, 0)).toBe(1);
    expect(glideIndex(centres, 200, 0.2)).toBe(2);
    // A flick goes on, at least to the next card, further when fast.
    expect(glideIndex(centres, 140, 0.5)).toBe(2);
    expect(glideIndex(centres, 140, 1.5)).toBe(3);
    expect(glideIndex(centres, 200, -0.6)).toBe(1);
    // Past either end it stays on the end card.
    expect(glideIndex(centres, 420, 2)).toBe(3);
    expect(glideIndex(centres, 0, -2)).toBe(0);
    expect(glideIndex([], 0, 1)).toBeNull();
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
