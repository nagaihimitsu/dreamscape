import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { getCityContent } from "../../content";
import type { GameState } from "../../domain/game";
import { destinationChoicesOf, getTravelDestinations, getTravelSleepChoices } from "../../domain/travel-destinations";
import type { TravelMode } from "../../domain/travel-game";
import { placeDisplayName } from "./travel-labels";
import { playSe } from "../../audio/sound-effects";
import {
  announcement, armedAt, CLEARED_JA, clear, isArmed, pressChoice, pressEvent, pressTarget, reconcile, targetShape, withFocusEnd,
  type Choice, type PressKind, type PressResult, type PressSource, type ScrollInstruction, type SelectionTarget, type TargetChoices,
  type TravelSelection,
} from "./travel-selection";

/** Where a press happened: the page (the list, the small map, the band) or the expanded map's dialog. */
export type PressScope = "page" | "dialog";
type ScrollJob = { scroll: ScrollInstruction; target: SelectionTarget; kind: PressKind; source: PressSource; scope: PressScope; anchor?: number };

/** The kind of a button's click: Enter or Space on a button clicks with `detail` 0. */
export const pressKindOf = (event: { detail: number }): PressKind => (event.detail === 0 ? "keyboard" : "pointer");

/**
 * Free time's shared selection (UI redesign §3.5): the list rows, both maps and the
 * bottom band read and press the same target. Runs the pure press functions of
 * travel-selection.ts, calls the game's handlers for a travel or a sleep, writes the
 * announcement of the live regions and performs the finger rule's scrolls after the render.
 */
export function useTravelSelection(game: GameState, handlers: {
  onTravelEvent: (eventId: string, mode: TravelMode) => void;
  onTravelSleep: (mode: TravelMode, viaPlaceId: string | null) => void;
}, options: {
  /** The live regions' words for a selection (B案's photo cards: photo-cards.ts photoCardAnnouncement); today's two-step words by default. */
  announce?: typeof announcement;
} = {}) {
  const { travel } = getCityContent(game.currentCityId);
  const destinations = useMemo(() => getTravelDestinations(game), [game]);
  const choices = useMemo(() => new Map(destinations.places.map((place) => [place.id, destinationChoicesOf(game, place)])), [game, destinations]);
  const sleep = useMemo(() => getTravelSleepChoices(game), [game]);
  const [selection, setSelectionState] = useState<TravelSelection | null>(null);
  const selectionRef = useRef(selection);
  const [message, setMessage] = useState({ text: "", key: 0 });
  const [showOther, setShowOther] = useState(false);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const pending = useRef<ScrollJob | null>(null);
  /** Set by the expanded map while it is open: it closes before a travel or a sleep. */
  const leaveRef = useRef<(() => void) | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const set = (next: TravelSelection | null) => {
    selectionRef.current = next;
    setSelectionState(next);
  };
  const say = (text: string) => setMessage((previous) => ({ text, key: previous.key + 1 }));
  const nameOf = (placeId: string) => placeDisplayName(game, travel.places.find((place) => place.id === placeId));

  /** The target's current choices, or null when it is gone (no row and no marker). */
  function targetFor(target: SelectionTarget): TargetChoices | null {
    if (target.kind === "sleep") return { kind: "sleep", choices: sleep };
    const row = choices.get(target.placeId);
    if (row) return { kind: "place", placeId: target.placeId, choices: row };
    return target.placeId === game.travel.currentPlaceId ? { kind: "place", placeId: target.placeId, choices: null } : null;
  }
  /** What a marker selects: its row, else the hotel's sleep, else the current place (marker only). */
  function markerTarget(placeId: string): TargetChoices | null {
    if (choices.has(placeId)) return targetFor({ kind: "place", placeId });
    if (placeId === game.travel.hotelPlaceId) return targetFor({ kind: "sleep" });
    return targetFor({ kind: "place", placeId });
  }
  const describe = (target: TargetChoices, openEventId: string | null) =>
    (options.announce ?? announcement)(target, target.kind === "place" ? nameOf(target.placeId) : "滞在先のホテル", openEventId);

  function apply(result: PressResult, target: TargetChoices, job: Omit<ScrollJob, "scroll" | "target">) {
    const { effect } = result;
    if (effect.kind === "ignore") return;
    // The press's sound: a departure or a rest is decided (ui_confirm); a place or 休む chosen, or its choices shown again
    // (ui_tap); a second press where nothing can be done now, whose reason is said again (ui_denied).
    if (effect.kind === "travel" || effect.kind === "sleep") playSe("ui_confirm");
    else if (effect.kind === "select") playSe("ui_tap");
    else if (effect.kind === "remind") playSe(targetShape(target) === "unavailable" || targetShape(target) === "none" ? "ui_denied" : "ui_tap");
    if (effect.kind === "travel" || effect.kind === "sleep") {
      leaveRef.current?.();
      set(null);
      if (effect.kind === "travel") handlersRef.current.onTravelEvent(effect.eventId, effect.mode);
      else handlersRef.current.onTravelSleep(effect.mode, effect.viaPlaceId);
      return;
    }
    if (effect.kind === "clear" || !result.selection) {
      set(null);
      say(CLEARED_JA);
      return;
    }
    set(result.selection);
    if (target.kind === "place" && destinations.other.some((place) => place.id === target.placeId)) setShowOther(true);
    say(describe(target, result.selection.openEventId));
    pending.current = { ...job, scroll: result.scroll, target: result.selection.target };
  }

  const now = () => performance.now();
  const rowTop = (placeId: string) => document.querySelector(`.free-time-hub [data-testid="travel-place-${placeId}"]`)?.getBoundingClientRect().top;

  // After a wait or a rental: a vanished target clears the selection; changed choices re-arm it (and are announced).
  const shownGame = useRef(game);
  useEffect(() => {
    if (shownGame.current === game) return;
    shownGame.current = game;
    const current = selectionRef.current;
    const target = current && targetFor(current.target);
    const result = reconcile(current, target, now());
    if (!result.changed) return;
    set(result.selection);
    if (result.selection && target) say(describe(target, result.selection.openEventId));
  // targetFor reads this render's game.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // data-armed follows the arming time.
  useEffect(() => {
    if (!selection) return;
    const wait = armedAt(selection) - now();
    if (wait <= 0) return;
    const timer = window.setTimeout(rerender, wait + 5);
    return () => window.clearTimeout(timer);
  }, [selection]);

  // The finger rule's scrolls (§3.5), after the selected row or the band has its new size.
  useLayoutEffect(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    const instant = { behavior: "instant" as ScrollBehavior };
    if (job.scope === "dialog") {
      const slot = document.querySelector<HTMLElement>('[data-testid="map-selection"]');
      if (job.scroll === "reveal") slot?.scrollIntoView({ block: "nearest", ...instant });
      if (job.kind === "keyboard" && job.source === "marker") slot?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
      return;
    }
    const hub = document.querySelector<HTMLElement>(".free-time-hub");
    if (!hub) return;
    if (job.target.kind === "sleep") {
      if (job.kind === "keyboard" && job.source === "marker") hub.querySelector<HTMLElement>(".travel-sleep-toggle")?.focus({ preventScroll: true });
      if (job.scroll !== "stick") return;
      // 休む lets the map stick first when the band's content needs the room (the band is fixed: nothing moves under the finger).
      const content = hub.querySelector<HTMLElement>(".travel-band-sleep");
      const map = hub.querySelector<HTMLElement>(".travel-map");
      if (!content || !map || hub.dataset.mapSticky !== "true" || content.scrollHeight <= content.clientHeight + 1) return;
      const top = map.getBoundingClientRect().top - parseFloat(getComputedStyle(map).top || "0");
      if (top > 1) window.scrollBy({ top, ...instant });
      return;
    }
    const row = hub.querySelector<HTMLElement>(`[data-testid="travel-place-${job.target.placeId}"]`);
    if (!row) return;
    // The pressed row stays where it was when a selected row above it collapsed.
    if (job.anchor !== undefined) {
      const moved = row.getBoundingClientRect().top - job.anchor;
      if (Math.abs(moved) >= 1) window.scrollBy({ top: moved, ...instant });
    }
    if (job.scroll === "strip") {
      const button = row.querySelector<HTMLElement>(".travel-destination-button");
      const band = hub.querySelector<HTMLElement>('[data-testid="travel-actions"]');
      const under = button && band ? button.getBoundingClientRect().bottom - band.getBoundingClientRect().top : 0;
      if (under > 0) window.scrollBy({ top: Math.min(under, 42), ...instant });
    } else if (job.scroll === "reveal") {
      row.scrollIntoView({ block: "nearest", ...instant });
    }
    if (job.kind === "keyboard" && job.source === "marker") row.querySelector<HTMLElement>(".travel-destination-button")?.focus({ preventScroll: true });
  });

  const press = (kind: PressKind) => ({ kind, now: now() });
  function onTarget(target: TargetChoices | null, kind: PressKind, source: PressSource, scope: PressScope, mapStuck = false) {
    if (!target) return;
    const anchor = source === "name" && scope === "page" && target.kind === "place" ? rowTop(target.placeId) : undefined;
    apply(pressTarget(selectionRef.current, target, { ...press(kind), source, mapStuck }), target, { kind, source, scope, anchor });
  }
  function onChoice(target: TargetChoices | null, choice: Choice, kind: PressKind, scope: PressScope) {
    if (target) apply(pressChoice(selectionRef.current, target, choice, press(kind)), target, { kind, source: "name", scope });
  }

  const selectedTarget = selection && targetFor(selection.target);
  return {
    selection,
    target: selectedTarget,
    armed: !!selection && isArmed(selection, now()),
    destinations,
    choices,
    sleep,
    message,
    showOther,
    setShowOther,
    leaveRef,
    /** The marker drawn as selected (the hotel's for 休む). */
    selectedMarkerId: !selection ? null : selection.target.kind === "sleep" ? game.travel.hotelPlaceId : selection.target.placeId,
    isSelected: (target: SelectionTarget) => !!selection && (target.kind === "sleep" ? selection.target.kind === "sleep"
      : selection.target.kind === "place" && selection.target.placeId === target.placeId),
    pressName: (placeId: string, kind: PressKind, scope: PressScope = "page") => onTarget(targetFor({ kind: "place", placeId }), kind, "name", scope),
    /**
     * Selects a place or the hotel's 休む and nothing else, as a marker's press does, or nothing (`null`) (B案's photo
     * cards: the card in the row's centre is the selection; a card never travels). No scroll; `quiet` leaves the live
     * regions as they are (a selection the screen makes by itself, not one the player made).
     */
    choose: (next: SelectionTarget | null, { quiet = false }: { quiet?: boolean } = {}) => {
      if (!next) {
        if (selectionRef.current) set(null);
        return;
      }
      const target = targetFor(next);
      if (!target) return;
      const result = pressTarget(selectionRef.current, target, { ...press("pointer"), source: "marker" });
      if (!result.selection || result.selection === selectionRef.current) return;
      set(result.selection);
      if (!quiet) say(describe(target, null));
    },
    /** Says `text` in the live regions (a choice the screen describes itself: B案's tour card). */
    announce: say,
    pressSleep: (kind: PressKind) => onTarget(targetFor({ kind: "sleep" }), kind, "name", "page"),
    pressMarker: (placeId: string, kind: PressKind, mapStuck: boolean, scope: PressScope = "page") => onTarget(markerTarget(placeId), kind, "marker", scope, mapStuck),
    pressEvent: (placeId: string, eventId: string, kind: PressKind, scope: PressScope = "page") => {
      const target = targetFor({ kind: "place", placeId });
      if (target) apply(pressEvent(selectionRef.current, target, eventId, press(kind)), target, { kind, source: "name", scope });
    },
    pressRoute: (placeId: string, eventId: string, mode: TravelMode, kind: PressKind, scope: PressScope = "page") =>
      onChoice(targetFor({ kind: "place", placeId }), { kind: "route", eventId, mode }, kind, scope),
    pressSleepRoute: (mode: TravelMode, viaPlaceId: string | null, kind: PressKind, scope: PressScope = "page") =>
      onChoice(targetFor({ kind: "sleep" }), { kind: "sleep", mode, viaPlaceId }, kind, scope),
    clear: () => {
      const current = selectionRef.current;
      apply(clear(current), { kind: "sleep", choices: sleep }, { kind: "keyboard", source: "name", scope: "page" });
      return current?.target ?? null;
    },
    focusEnd: (until: number) => set(withFocusEnd(selectionRef.current, until)),
  };
}

export type TravelSelectionApi = ReturnType<typeof useTravelSelection>;
