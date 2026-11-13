import { useRef, useState } from "react";
import type { GameState } from "../domain/game";
import { getTransportMode, WALK_MODE, type TransportMode } from "../content/transport";
import { getTour, type TourLeg } from "../content";
import { tourLegsBetween, tourLegStart } from "../domain/tour";
import { beginTravelEvent, sleepAtHotel, type TravelMode } from "../domain/travel-game";
import { TravelTransition } from "../features/journey/TravelTransition";
import { rideRoute, type RideRoute } from "../features/journey/ride-map";
import { TimePassage } from "../features/journey/TimePassage";
import { NightFade, NightRest } from "../features/journey/NightRest";
import { NightLeaving, type NightButton } from "../features/journey/NightScreen";
import { nightRecap, restNightCard, todayWord, type NightKey, type NightRecap, type TodayWord } from "../features/journey/night-recap";
import { DAY_END_REST_JA, NIGHT_RESTED_JA } from "../features/journey/night-rest-text";
import type { HomeRoute } from "../domain/travel-routes";
import type { GameChange } from "./useGameSession";

/** The declared labels and art of a route's mode; content:build refuses undeclared modes, so the fallback never shows in built content. */
function presentation(cityId: string, mode: TravelMode): TransportMode {
  return getTransportMode(cityId, mode) ?? { ...WALK_MODE, id: mode, nameJa: "移動", movingJa: "移動中" };
}
/** A tour's leg drawn like a ride (tour stage 2a): its own caption and art kind, not one of the journey's modes. */
const legArt = (leg: TourLeg): TransportMode => ({ id: leg.id, nameJa: leg.labelJa, movingJa: leg.vehicle.movingJa, kind: leg.vehicle.kind });

/**
 * One decorative effect after a saved change: a ride (its art), the night of 「休む」 (「次の日」, or 「ホテルで休みました。」 with the
 * night's recap when it has one: restNightCard), or the one night visual of a rest at the day's end (docs/02 「一日の終わり」): the
 * card 「夜も更けたので、ホテルで休みました。」 of the rest the game took by itself, the night screen's own line changed to
 * 「ホテルで休みました。」 as it fades (its 「ホテルで休む」 slept at once), or a plain fade (its 「ホテルで休む」 led to the hotel's
 * scenes before the night).
 */
type Effect = { kind: "move"; mode: TransportMode; route?: RideRoute } | { kind: "night" } | { kind: "day_end"; recap?: NightRecap; line: string }
  | { kind: "night_left"; buttons: readonly NightButton[]; recap: NightRecap; word: TodayWord | null } | { kind: "night_fade" };
const night: Effect = { kind: "night" };
const nightFade: Effect = { kind: "night_fade" };

/** How a rest at the day's end began: by the game itself (no night action open), or by the night screen's 「ホテルで休む」. */
export type DayEndRest = { by: "game" } | { by: "night_screen"; buttons: readonly NightButton[] };

/** Plays decorative effects only after a successful, already-saved movement, one after another. */
export function useTravelEffects({ getCurrent, commit, nextRomanceRoll, reduceMotion }: {
  getCurrent: () => GameState | null;
  commit: (change: GameChange) => boolean;
  nextRomanceRoll: () => number;
  reduceMotion: boolean;
}) {
  const [queue, setQueue] = useState<Effect[]>([]);
  // A second activation may arrive before React renders the first transition.
  const pending = useRef(false);
  // The map's departure and 「休む」 play their own art (playMove leaves their commits alone).
  const own = useRef(false);
  // A rest at the day's end that stopped at the hotel's scenes before the night: its night's visual plays when the night passes
  // (playMove), instead of 「次の日」. In this tab's memory only (no save format change): after a reload that night plays 「次の日」.
  const dayEndNight = useRef<{ by: DayEndRest["by"]; cityId: string; day: number } | null>(null);
  // The last night whose recap a card showed (restNightCard: once a night). This tab's memory; nothing is saved.
  const recapShown = useRef<NightKey | null>(null);
  /**
   * The card of the night that passes after `atNight` (the state before it): the day's end card (`dayEnd`, the game's own rest
   * at 21:00) with the night's route and line, or for a rest before 21:00 「ホテルで休みました。」 with them when there are any,
   * else 「次の日」 (restNightCard).
   */
  function nightCard(atNight: GameState, dayEnd: boolean): Effect {
    const card = restNightCard(atNight, { dayEnd, shown: recapShown.current });
    if (card.kind !== "next_day" && card.recap) recapShown.current = { cityId: atNight.currentCityId, day: atNight.travel.day };
    if (card.kind === "next_day") return night;
    return { kind: "day_end", recap: card.recap, line: card.kind === "day_end" ? DAY_END_REST_JA : NIGHT_RESTED_JA };
  }
  function ownCommit(change: GameChange) {
    own.current = true;
    try { return commit(change); } finally { own.current = false; }
  }
  function play(effects: Effect[]) {
    if (!effects.length) return;
    pending.current = true;
    setQueue(effects);
  }
  /** A ride in the city of `state` by `mode`, from the place `from` to `to` (its map card: ride-map.ts; none when either is unknown). */
  const move = (state: GameState, mode: TravelMode, from?: string, to?: string): Effect =>
    ({ kind: "move", mode: presentation(state.currentCityId, mode), route: rideRoute(state, from, to) });
  const legs = (previous: GameState, next: GameState): Effect[] => {
    const tour = previous.tour ? getTour(previous.tour.tourId) : undefined;
    return tourLegsBetween(previous, next).map((leg) => ({ kind: "move", mode: legArt(leg),
      route: rideRoute(next, tour && tourLegStart(tour, leg.id), leg.toPlaceId) }));
  };
  function travelToEvent(id: string, mode: TravelMode, revision: number) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = ownCommit((state) => beginTravelEvent(state, id, mode, revision, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded && before && after && before.currentCityId === after.currentCityId &&
        before.travel.currentPlaceId !== after.travel.currentPlaceId) play([move(after, mode, before.travel.currentPlaceId, after.travel.currentPlaceId)]);
    return succeeded;
  }
  /** 「休む」 by the way home the player chose, or (`dayEnd`) a rest at the day's end (restAtDayEnd). */
  function restAtHotel(mode: TravelMode, viaPlaceId: string | null, revision: number, dayEnd?: DayEndRest) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = ownCommit((state) => sleepAtHotel(state, mode, revision, viaPlaceId, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded) dayEndNight.current = null;
    if (succeeded && before && after && before.currentCityId === after.currentCityId) {
      // The hotel's moment (stage 4) may stop at a scene before moving or before the night: the rest plays later from its marks.
      // A booked tour that started in the same action (tour stage 2a) has taken the party on from the hotel: the ride home, the
      // night, then the tour's legs.
      const tour = legs(before, after);
      if (dayEnd) {
        // The day's end has one night visual (the ride home is part of it). Slept at once: the card (the game's own rest) or the
        // night screen's line changed in place, then a booked tour's legs. The hotel's scenes before the night first: the ride
        // home to them as after 「休む」, and the visual when the night passes (playMove).
        if (after.travel.day !== before.travel.day)
          play([dayEnd.by === "game" ? nightCard(before, true)
            : { kind: "night_left", buttons: dayEnd.buttons, recap: nightRecap(before), word: todayWord(before) }, ...tour]);
        else {
          dayEndNight.current = { by: dayEnd.by, cityId: before.currentCityId, day: before.travel.day };
          if (before.travel.currentPlaceId !== after.travel.currentPlaceId)
            play([move(before, mode, before.travel.currentPlaceId, after.travel.currentPlaceId)]);
        }
        return succeeded;
      }
      const moved = tour.length ? before.travel.currentPlaceId !== before.travel.hotelPlaceId : before.travel.currentPlaceId !== after.travel.currentPlaceId;
      const slept = after.travel.day !== before.travel.day;
      play([...(moved ? [move(before, mode, before.travel.currentPlaceId, before.travel.hotelPlaceId)] : []), ...(slept ? [nightCard(before, false)] : []), ...tour]);
    }
    return succeeded;
  }
  function returnToHotel(mode: TravelMode, viaPlaceId: string | null, revision: number) {
    return restAtHotel(mode, viaPlaceId, revision);
  }
  /**
   * A rest at the day's end (GameApp, getDayEnd): the same rest as 「休む」 by `way`, with the day's end's one night visual.
   * Refused while an effect plays (GameApp asks again once it has ended) and for a revision that has moved on.
   */
  function restAtDayEnd(way: HomeRoute, revision: number, how: DayEndRest) {
    return restAtHotel(way.mode, way.viaPlaceId ?? null, revision, how);
  }
  /**
   * The visual of a marked day's-end night once it passes ("game": the card; "night_screen": the plain fade), else null. The mark
   * is taken then, and forgotten when the hotel's moment ends without a night (a then: leaving it) or another night passes.
   */
  function dayEndNightOf(previous: GameState, next: GameState, slept: boolean): DayEndRest["by"] | null {
    const mark = dayEndNight.current;
    if (!mark || (!slept && next.occasion?.kind === "hotel")) return null;
    dayEndNight.current = null;
    return slept && mark.cityId === previous.currentCityId && mark.day === previous.travel.day ? mark.by : null;
  }
  /**
   * A move or a night inside a scene's action (4.7): a `# then: move` (stage 3b), a trip whose move waited for its
   * scenes, the hotel's night after its scenes (stage 4), a tour's legs (stage 2a: the start after the hotel's scenes after
   * waking, the way back after 「ツアーを続ける」). The art plays from the occasion's marks: the place it moved to by its mode,
   * the day that passed, the tour's legs.
   */
  function playMove(previous: GameState, next: GameState) {
    if (own.current || previous.currentCityId !== next.currentCityId) return;
    const slept = next.travel.day > previous.travel.day;
    const dayEnd = dayEndNightOf(previous, next, slept);
    if (pending.current) return;
    const tour = legs(previous, next);
    // The night of a rest at the day's end after the hotel's scenes: its one visual instead of the ride home and 「次の日」.
    if (dayEnd) {
      play([dayEnd === "game" ? nightCard(previous, true) : nightFade, ...tour]);
      return;
    }
    if (tour.length) {
      // The ride home of a rest whose move waited for its scenes, then the night, then the legs.
      const trip = previous.occasion?.kind === "hotel" && previous.occasion.trip && !previous.occasion.ran.includes("move") &&
        previous.occasion.trip.from !== previous.occasion.trip.to ? previous.occasion.trip : undefined;
      play([...(trip ? [move(next, trip.modeId, trip.from, trip.to)] : []), ...(slept ? [nightCard(previous, false)] : []), ...tour]);
      return;
    }
    const moved = previous.travel.currentPlaceId !== next.travel.currentPlaceId;
    const mode = moved ? next.occasion?.moved ?? previous.occasion?.trip?.modeId ?? next.occasion?.trip?.modeId : undefined;
    play([...(mode ? [move(next, mode, previous.travel.currentPlaceId, next.travel.currentPlaceId)] : []), ...(slept ? [nightCard(previous, false)] : [])]);
  }
  /** The effect on screen ended: the next one, or nothing more (other controls may move again). */
  function done() {
    const rest = queue.slice(1);
    setQueue(rest);
    if (!rest.length) pending.current = false;
  }
  const current = queue[0];
  const effects = <>
    {current?.kind === "move" && <TravelTransition key={`${queue.length}:${current.mode.id}`} mode={current.mode} route={current.route} reduceMotion={reduceMotion} onEnd={done} />}
    {current?.kind === "night" && <TimePassage key={`${queue.length}:night`} reduceMotion={reduceMotion} onEnd={done} />}
    {current?.kind === "day_end" && <NightRest key={`${queue.length}:day_end`} recap={current.recap} line={current.line} reduceMotion={reduceMotion} onEnd={done} />}
    {current?.kind === "night_left" && <NightLeaving key={`${queue.length}:night_left`} buttons={current.buttons} recap={current.recap} word={current.word} reduceMotion={reduceMotion} onEnd={done} />}
    {current?.kind === "night_fade" && <NightFade key={`${queue.length}:night_fade`} reduceMotion={reduceMotion} onEnd={done} />}
  </>;
  /** An effect is on screen (the day's end waits for it to end). */
  const playing = queue.length > 0;
  /** The night screen is fading to the morning (GameApp keeps its page as at night meanwhile). */
  const nightLeaving = current?.kind === "night_left";
  /** A ride's visual is on screen (the music is lowered under it), or a night's (the night's music plays): src/audio/scene-music.ts. */
  const riding = current?.kind === "move";
  const nightVisual = !!current && current.kind !== "move";
  return { travelToEvent, returnToHotel, restAtDayEnd, playMove, playing, nightLeaving, riding, nightVisual, effects };
}
