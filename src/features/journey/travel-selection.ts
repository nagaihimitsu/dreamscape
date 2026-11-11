// The two-step destination selection (UI redesign §3.5 「Behaviour」), as pure functions:
// the first press on a name, a marker or 休む selects (the map shows the place); a second
// press on the same name or 休む travels when there is exactly one way, after the arming
// time; otherwise the choices show inline and one of them travels. The hook
// useTravelSelection runs these, calls the game's handlers and performs the scrolls.
import type { DestinationChoices, TravelSleepChoices } from "../../domain/travel-destinations";
import type { TravelMode } from "../../domain/travel-game";

/** A second press (or a choice) counts only this long after the press that selected or revealed it. */
export const ARMING_MS = 300;
/** The map's flyTo after a selection (0 with reduced motion). */
export const FOCUS_MS = 400;

export type SelectionTarget = { kind: "place"; placeId: string } | { kind: "sleep" };
/** A target with what can be chosen there; a place without a row (the current place, marker only) has `choices: null`. */
export type TargetChoices =
  | { kind: "place"; placeId: string; choices: DestinationChoices | null }
  | { kind: "sleep"; choices: TravelSleepChoices };
export type TravelSelection = {
  target: SelectionTarget;
  /** The event whose modes are open (a place with several events). */
  openEventId: string | null;
  /** When the press that selected or last revealed the choices happened (ms). */
  at: number;
  /** When the map's focus ends (ms); the second press waits for it too. */
  focusUntil: number;
  /** The available choices when `at` was set; reconcile re-arms when they change. */
  choicesKey: string;
};
export type PressKind = "pointer" | "keyboard";
export type Press = { kind: PressKind; now: number; repeat?: boolean };
/** Where a press came from: the row's name / 休む, a map marker (or 「地点を名前で探す」), whose presses only select. */
export type PressSource = "name" | "marker";
export type SelectionEffect =
  | { kind: "select" }
  | { kind: "travel"; eventId: string; mode: TravelMode }
  | { kind: "sleep"; mode: TravelMode; viaPlaceId: string | null }
  | { kind: "remind" }
  | { kind: "clear" }
  | { kind: "ignore" };
/**
 * What the page scrolls after the press (the finger rule, §3.5): `none`; `strip` (a one-way
 * row's hint strip, at most 42 px); `reveal` (the row or its choices into view; keyboard
 * presses, the U25 second press, a marker press while the map is stuck); `stick` (休む: the
 * page scrolls until the map sticks when the band's content needs the room).
 */
export type ScrollInstruction = "none" | "strip" | "reveal" | "stick";
export type PressResult = { selection: TravelSelection | null; effect: SelectionEffect; scroll: ScrollInstruction };

/** The shape of a target's choices. */
export type TargetShape = "one" | "modes" | "events" | "unavailable" | "none";

export function targetShape(target: TargetChoices): TargetShape {
  if (target.kind === "sleep") return target.choices.onlyWay ? "one" : "modes";
  const choices = target.choices;
  if (!choices) return "none";
  if (choices.onlyWay) return "one";
  if (choices.events.length > 1) return "events";
  if (choices.events[0] && choices.events[0].routes.length > 1) return "modes";
  return "unavailable";
}

/** Whether the target shows its choices inline (modes, events, the ways home). */
export function expands(target: TargetChoices): boolean {
  const shape = targetShape(target);
  return shape === "modes" || shape === "events";
}

/** The available choices of a target, as a key that changes when they change. */
export function choicesKey(target: TargetChoices): string {
  if (target.kind === "sleep")
    return JSON.stringify([target.choices.onlyWay ? 1 : 0, target.choices.options.map((option) => [option.route.mode, option.route.viaPlaceId ?? null, option.plan.ok])]);
  const choices = target.choices;
  if (!choices) return "none";
  return JSON.stringify([choices.onlyWay ? 1 : 0, choices.events.map((event) => [event.event.id, event.routes.map((route) => [route.route.mode, route.available])])]);
}

export function toTarget(target: TargetChoices): SelectionTarget {
  return target.kind === "sleep" ? { kind: "sleep" } : { kind: "place", placeId: target.placeId };
}

export function sameTarget(a: SelectionTarget, b: SelectionTarget): boolean {
  return a.kind === "sleep" ? b.kind === "sleep" : b.kind === "place" && a.placeId === b.placeId;
}

/** When a second press or a choice of the selection starts to count. */
export function armedAt(selection: TravelSelection): number {
  return Math.max(selection.at + ARMING_MS, selection.focusUntil);
}

export function isArmed(selection: TravelSelection, now: number): boolean {
  return now >= armedAt(selection);
}

const ignore = (selection: TravelSelection | null): PressResult => ({ selection, effect: { kind: "ignore" }, scroll: "none" });

function firstScroll(target: TargetChoices, kind: PressKind, source: PressSource, mapStuck: boolean): ScrollInstruction {
  if (source === "marker") return kind === "keyboard" || (mapStuck && target.kind === "place") ? "reveal" : "none";
  if (kind === "keyboard") return "reveal";
  if (target.kind === "sleep") return "stick";
  return expands(target) ? "none" : "strip";
}

/**
 * A press on a target's name (a row, 休む) or its marker. The first press selects; a marker
 * press always only selects. A second press on the same name, once armed, travels or sleeps
 * when there is one way; with choices it re-arms and scrolls them into view (U25); with
 * nothing available it repeats the reason.
 */
export function pressTarget(selection: TravelSelection | null, target: TargetChoices,
  press: Press & { source: PressSource; mapStuck?: boolean }): PressResult {
  if (press.repeat) return ignore(selection);
  const next = toTarget(target);
  const scroll = firstScroll(target, press.kind, press.source, !!press.mapStuck);
  if (!selection || !sameTarget(selection.target, next))
    return { selection: { target: next, openEventId: null, at: press.now, focusUntil: press.now, choicesKey: choicesKey(target) }, effect: { kind: "select" }, scroll };
  if (press.source === "marker") return { selection, effect: { kind: "select" }, scroll };
  if (!isArmed(selection, press.now)) return ignore(selection);
  if (targetShape(target) === "one") {
    if (target.kind === "sleep") {
      const route = target.choices.onlyWay!;
      return { selection, effect: { kind: "sleep", mode: route.mode, viaPlaceId: route.viaPlaceId ?? null }, scroll: "none" };
    }
    const way = target.choices!.onlyWay!;
    return { selection, effect: { kind: "travel", eventId: way.eventId, mode: way.mode }, scroll: "none" };
  }
  if (expands(target)) return { selection: { ...selection, at: press.now }, effect: { kind: "remind" }, scroll: "reveal" };
  return { selection, effect: { kind: "remind" }, scroll: "none" };
}

/**
 * A press on an event of a place with several events: one route → travel; several routes →
 * its modes open under it (one event open at a time; pressing it again keeps it open).
 */
export function pressEvent(selection: TravelSelection | null, target: TargetChoices, eventId: string, press: Press): PressResult {
  if (press.repeat || !selection || target.kind !== "place" || !target.choices || !sameTarget(selection.target, toTarget(target))) return ignore(selection);
  if (!isArmed(selection, press.now)) return ignore(selection);
  const event = target.choices.events.find((item) => item.event.id === eventId);
  if (!event?.available) return ignore(selection);
  if (event.routes.length === 1)
    return event.routes[0].available ? { selection, effect: { kind: "travel", eventId, mode: event.routes[0].route.mode }, scroll: "none" } : ignore(selection);
  if (selection.openEventId === eventId) return ignore(selection);
  return { selection: { ...selection, openEventId: eventId, at: press.now }, effect: { kind: "remind" }, scroll: press.kind === "keyboard" ? "reveal" : "none" };
}

export type Choice = { kind: "route"; eventId: string; mode: TravelMode } | { kind: "sleep"; mode: TravelMode; viaPlaceId: string | null };

/** A press on a mode (an event's route, or a way home): travels or sleeps once armed, when available. */
export function pressChoice(selection: TravelSelection | null, target: TargetChoices, choice: Choice, press: Press): PressResult {
  if (press.repeat || !selection || !sameTarget(selection.target, toTarget(target)) || !isArmed(selection, press.now)) return ignore(selection);
  if (choice.kind === "sleep") {
    if (target.kind !== "sleep") return ignore(selection);
    const option = target.choices.options.find((item) => item.route.mode === choice.mode && (item.route.viaPlaceId ?? null) === choice.viaPlaceId);
    return option?.plan.ok ? { selection, effect: { kind: "sleep", mode: choice.mode, viaPlaceId: choice.viaPlaceId }, scroll: "none" } : ignore(selection);
  }
  if (target.kind !== "place" || !target.choices) return ignore(selection);
  const route = target.choices.events.find((item) => item.event.id === choice.eventId)?.routes.find((item) => item.route.mode === choice.mode);
  return route?.available ? { selection, effect: { kind: "travel", eventId: choice.eventId, mode: choice.mode }, scroll: "none" } : ignore(selection);
}

/** × 「選択を解除」 or Esc. */
export function clear(selection: TravelSelection | null): PressResult {
  return selection ? { selection: null, effect: { kind: "clear" }, scroll: "none" } : ignore(null);
}

/**
 * After the game changed (a wait, a rental): a target that is gone (null) clears the
 * selection; changed choices keep it, re-armed from `now` (the new hint is announced).
 */
export function reconcile(selection: TravelSelection | null, target: TargetChoices | null, now: number): { selection: TravelSelection | null; changed: boolean } {
  if (!selection) return { selection, changed: false };
  if (!target || !sameTarget(selection.target, toTarget(target))) return { selection: null, changed: true };
  const key = choicesKey(target);
  if (key === selection.choicesKey) return { selection, changed: false };
  const open = selection.openEventId && target.kind === "place" &&
    target.choices?.events.some((event) => event.event.id === selection.openEventId && event.routes.length > 1) ? selection.openEventId : null;
  return { selection: { ...selection, choicesKey: key, at: now, openEventId: open }, changed: true };
}

/** The map reports when its focus ends. */
export function withFocusEnd(selection: TravelSelection | null, until: number): TravelSelection | null {
  return selection ? { ...selection, focusUntil: Math.max(selection.focusUntil, until) } : selection;
}

/** The hint strip of a selected one-way row (U26). */
export function stripText(choices: DestinationChoices): string {
  return choices.isCurrent ? "もう一度押すと、ここで始める" : "もう一度押すと出発";
}

/** What the live region says for the selected target (`name` = the place's display name). */
export function announcement(target: TargetChoices, name: string, openEventId: string | null = null): string {
  if (target.kind === "sleep")
    return target.choices.onlyWay ? "滞在先のホテルを選びました。もう一度『休む』を押すと休みます。" : "滞在先のホテルを選びました。帰り方を選んでください。";
  const choices = target.choices;
  if (!choices) return `${name}（現在地）を選びました。ここで始められる予定はありません。`;
  if (!choices.available) return `${name}を選びました。今は行けません。${choices.reason ?? ""}`;
  const open = openEventId ? choices.events.find((event) => event.event.id === openEventId) : undefined;
  if (open) return `移動手段を選んでください（${open.routes.length}件）。`;
  switch (targetShape(target)) {
    case "one": return `${name}を選びました。地図に表示しています。${choices.isCurrent ? "もう一度押すと、ここで始めます。" : "もう一度押すと出発します。"}`;
    case "modes": return `${name}を選びました。移動手段を選んでください（${choices.events[0].routes.length}件）。`;
    case "events": return `${name}を選びました。ここでできることから選んでください（${choices.events.length}件）。`;
    default: return `${name}を選びました。今は行けません。${choices.events[0]?.reason ?? ""}`;
  }
}

export const CLEARED_JA = "選択を解除しました。";
