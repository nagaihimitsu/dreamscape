import { describe, expect, it } from "vitest";
import type { TravelPlace, TravelRoute } from "../../content/travel-schemas";
import type { DestinationChoices, EventChoice, TravelDestinationEvent, TravelSleepChoices } from "../../domain/travel-destinations";
import {
  announcement, ARMING_MS, armedAt, clear, FOCUS_MS, pressChoice, pressEvent, pressTarget, reconcile, withFocusEnd,
  type TargetChoices, type TravelSelection,
} from "./travel-selection";

const place = (id: string) => ({ id, nameJa: id }) as TravelPlace;
const route = (mode: string, minutes = 10) => ({ fromPlaceId: "h", toPlaceId: "x", mode, minutes, cost: 0 }) as TravelRoute;
const event = (id: string, modes: [string, boolean][]): EventChoice => {
  const routes = modes.map(([mode, available]) => available ? { route: route(mode), available } : { route: route(mode), available, reason: "予算が足りません。" });
  const ok = routes.some((item) => item.available);
  return { event: { id, placeId: "x" } as TravelDestinationEvent, routes, available: ok, ...(ok ? {} : { reason: "今は利用できません。" }) };
};
const destination = (id: string, events: EventChoice[], isCurrent = false): TargetChoices => {
  const only = events.length === 1 && events[0].routes.length === 1 && events[0].routes[0].available ? events[0] : null;
  const available = events.some((item) => item.available);
  const choices: DestinationChoices = { place: place(id), isCurrent, events, available, ...(available ? {} : { reason: "閉まっています。" }),
    onlyWay: only ? { eventId: only.event.id, mode: only.routes[0].route.mode } : null };
  return { kind: "place", placeId: id, choices };
};
const sleep = (ways: [string, boolean][]): TargetChoices => {
  const options = ways.map(([mode, ok]) => ({ route: { mode, minutes: 5, cost: 0, legs: [] }, plan: ok ? { ok: true } : { ok: false, reason: "budget" } })) as unknown as TravelSleepChoices["options"];
  return { kind: "sleep", choices: { options, onlyWay: options.length === 1 && ways[0][1] ? options[0].route : null } };
};

const oneWay = destination("p_duomo", [event("duomo", [["walk", true]])]);
const modes = destination("p_supper", [event("supper", [["walk", true], ["tram", true]])]);
const events = destination("p_navigli", [event("night", [["walk", false]]), event("navigli", [["walk", true], ["taxi", true]]), event("cafe", [["walk", true]])]);
const closed = destination("p_castello", [event("castello", [["walk", false]])]);
const name = (now: number, kind: "pointer" | "keyboard" = "pointer") => ({ kind, now, source: "name" as const });

describe("the two-step selection", () => {
  it("selects on the first press and travels on the second only once armed", () => {
    const first = pressTarget(null, oneWay, name(0));
    expect(first.effect).toEqual({ kind: "select" });
    expect(first.scroll).toBe("strip");
    const selected = first.selection!;
    expect(armedAt(selected)).toBe(ARMING_MS);
    expect(pressTarget(selected, oneWay, name(ARMING_MS - 1)).effect).toEqual({ kind: "ignore" });
    expect(pressTarget(selected, oneWay, name(ARMING_MS)).effect).toEqual({ kind: "travel", eventId: "duomo", mode: "walk" });
  });

  it("waits for the map's focus too: max(at + 300, focusUntil)", () => {
    const animated = withFocusEnd(pressTarget(null, oneWay, name(0)).selection, FOCUS_MS)!;
    expect(armedAt(animated)).toBe(400);
    expect(pressTarget(animated, oneWay, name(399)).effect.kind).toBe("ignore");
    expect(pressTarget(animated, oneWay, name(400)).effect.kind).toBe("travel");
    const reduced = withFocusEnd(pressTarget(null, oneWay, name(0)).selection, 0)!;
    expect(armedAt(reduced)).toBe(300);
  });

  it("ignores a key's auto-repeat", () => {
    const selected = pressTarget(null, oneWay, name(0)).selection;
    expect(pressTarget(selected, oneWay, { ...name(1000, "keyboard"), repeat: true }).effect.kind).toBe("ignore");
  });

  it("keeps a row with modes open on a second press, re-arms it and scrolls its choices into view (U25)", () => {
    const first = pressTarget(null, modes, name(0));
    expect(first.scroll).toBe("none");
    const again = pressTarget(first.selection, modes, name(500));
    expect(again.effect).toEqual({ kind: "remind" });
    expect(again.scroll).toBe("reveal");
    expect(again.selection!.at).toBe(500);
    expect(pressChoice(again.selection, modes, { kind: "route", eventId: "supper", mode: "tram" }, { kind: "pointer", now: 600 }).effect.kind).toBe("ignore");
    expect(pressChoice(again.selection, modes, { kind: "route", eventId: "supper", mode: "tram" }, { kind: "pointer", now: 800 }).effect)
      .toEqual({ kind: "travel", eventId: "supper", mode: "tram" });
  });

  it("lists several events: one route travels, several open the event's modes (one open at a time)", () => {
    const selected = pressTarget(null, events, name(0)).selection;
    expect(pressEvent(selected, events, "cafe", { kind: "pointer", now: 100 }).effect.kind).toBe("ignore");
    expect(pressEvent(selected, events, "cafe", { kind: "pointer", now: 300 }).effect).toEqual({ kind: "travel", eventId: "cafe", mode: "walk" });
    expect(pressEvent(selected, events, "night", { kind: "pointer", now: 300 }).effect.kind).toBe("ignore");
    const open = pressEvent(selected, events, "navigli", { kind: "pointer", now: 300 });
    expect(open.selection!.openEventId).toBe("navigli");
    expect(open.scroll).toBe("none");
    expect(pressEvent(open.selection, events, "navigli", { kind: "pointer", now: 1000 }).selection!.openEventId).toBe("navigli");
    expect(pressChoice(open.selection, events, { kind: "route", eventId: "navigli", mode: "taxi" }, { kind: "pointer", now: 500 }).effect.kind).toBe("ignore");
    expect(pressChoice(open.selection, events, { kind: "route", eventId: "navigli", mode: "taxi" }, { kind: "pointer", now: 600 }).effect)
      .toEqual({ kind: "travel", eventId: "navigli", mode: "taxi" });
    expect(pressEvent(open.selection, events, "navigli", { kind: "keyboard", now: 0 }).scroll).toBe("none");
  });

  it("does nothing on an unavailable place but repeat its reason", () => {
    const selected = pressTarget(null, closed, name(0)).selection;
    const again = pressTarget(selected, closed, name(1000));
    expect(again.effect).toEqual({ kind: "remind" });
    expect(announcement(closed, "スフォルツェスコ城")).toBe("スフォルツェスコ城を選びました。今は行けません。閉まっています。");
    expect(pressChoice(selected, closed, { kind: "route", eventId: "castello", mode: "walk" }, { kind: "pointer", now: 1000 }).effect.kind).toBe("ignore");
  });

  it("moves the selection to another target and resets the arming", () => {
    const selected = pressTarget(null, oneWay, name(0)).selection;
    const moved = pressTarget(selected, modes, name(1000));
    expect(moved.effect.kind).toBe("select");
    expect(moved.selection).toMatchObject({ target: { kind: "place", placeId: "p_supper" }, at: 1000 });
  });

  it("sleeps on a second 休む with one way home, else from a way home", () => {
    const one = sleep([["walk", true]]);
    const first = pressTarget(null, one, name(0));
    expect(first.scroll).toBe("stick");
    expect(pressTarget(first.selection, one, name(300)).effect).toEqual({ kind: "sleep", mode: "walk", viaPlaceId: null });
    const two = sleep([["walk", true], ["taxi", false]]);
    const selected = pressTarget(null, two, name(0)).selection;
    expect(pressTarget(selected, two, name(300)).effect.kind).toBe("remind");
    expect(pressChoice(selected, two, { kind: "sleep", mode: "taxi", viaPlaceId: null }, { kind: "pointer", now: 300 }).effect.kind).toBe("ignore");
    expect(pressChoice(selected, two, { kind: "sleep", mode: "walk", viaPlaceId: null }, { kind: "pointer", now: 300 }).effect.kind).toBe("sleep");
  });

  it("never travels from a marker press, and scrolls only for the keyboard or a stuck map", () => {
    const marker = (now: number, mapStuck: boolean, kind: "pointer" | "keyboard" = "pointer") => ({ kind, now, source: "marker" as const, mapStuck });
    const first = pressTarget(null, oneWay, marker(0, false));
    expect(first.scroll).toBe("none");
    expect(pressTarget(null, oneWay, marker(0, true)).scroll).toBe("reveal");
    expect(pressTarget(null, oneWay, marker(0, false, "keyboard")).scroll).toBe("reveal");
    expect(pressTarget(first.selection, oneWay, marker(5000, false)).effect.kind).toBe("select");
    // The name is then the second press.
    expect(pressTarget(first.selection, oneWay, name(5000)).effect.kind).toBe("travel");
  });

  it("scrolls the revealed content into view for keyboard presses", () => {
    expect(pressTarget(null, modes, name(0, "keyboard")).scroll).toBe("reveal");
    expect(pressTarget(null, oneWay, name(0, "keyboard")).scroll).toBe("reveal");
  });

  it("clears, and reconciles after the game changed", () => {
    const selected = pressTarget(null, modes, name(0)).selection as TravelSelection;
    expect(clear(selected)).toMatchObject({ selection: null, effect: { kind: "clear" } });
    expect(reconcile(selected, null, 50)).toEqual({ selection: null, changed: true });
    expect(reconcile(selected, modes, 50)).toEqual({ selection: selected, changed: false });
    const fewer = destination("p_supper", [event("supper", [["walk", true], ["tram", false]])]);
    const result = reconcile(selected, fewer, 2000);
    expect(result.changed).toBe(true);
    expect(result.selection!.at).toBe(2000);
  });

  it("announces each kind of target", () => {
    expect(announcement(oneWay, "ドゥオモ広場")).toBe("ドゥオモ広場を選びました。地図に表示しています。もう一度押すと出発します。");
    expect(announcement(destination("p_here", [event("here", [["walk", true]])], true), "ここ")).toContain("もう一度押すと、ここで始めます。");
    expect(announcement(modes, "最後の晩餐")).toBe("最後の晩餐を選びました。移動手段を選んでください（2件）。");
    expect(announcement(events, "ナヴィリオ")).toBe("ナヴィリオを選びました。ここでできることから選んでください（3件）。");
    expect(announcement(sleep([["walk", true]]), "")).toBe("滞在先のホテルを選びました。もう一度『休む』を押すと休みます。");
    expect(announcement({ kind: "place", placeId: "p_here", choices: null }, "ここ")).toBe("ここ（現在地）を選びました。ここで始められる予定はありません。");
  });
});
