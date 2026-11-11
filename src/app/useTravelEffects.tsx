import { useRef, useState } from "react";
import type { GameState } from "../domain/game";
import { getTransportMode, WALK_MODE, type TransportMode } from "../content/transport";
import type { TourLeg } from "../content";
import { tourLegsBetween } from "../domain/tour";
import { beginTravelEvent, sleepAtHotel, type TravelMode } from "../domain/travel-game";
import { TravelTransition } from "../features/journey/TravelTransition";
import { TimePassage } from "../features/journey/TimePassage";
import { NightRest } from "../features/journey/NightRest";
import type { HomeRoute } from "../domain/travel-routes";
import type { GameChange } from "./useGameSession";

/** The declared labels and art of a route's mode; content:build refuses undeclared modes, so the fallback never shows in built content. */
function presentation(cityId: string, mode: TravelMode): TransportMode {
  return getTransportMode(cityId, mode) ?? { ...WALK_MODE, id: mode, nameJa: "移動", movingJa: "移動中" };
}
/** A tour's leg drawn like a ride (tour stage 2a): its own caption and art kind, not one of the journey's modes. */
const legArt = (leg: TourLeg): TransportMode => ({ id: leg.id, nameJa: leg.labelJa, movingJa: leg.vehicle.movingJa, kind: leg.vehicle.kind });

/**
 * One decorative effect after a saved change: a ride (its art), the night (「次の日」), or the day's end (the night card of
 * the rest the game took by itself at 21:00).
 */
type Effect = { kind: "move"; mode: TransportMode } | { kind: "night" } | { kind: "day_end" };
const night: Effect = { kind: "night" };
const dayEnd: Effect = { kind: "day_end" };

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
  function ownCommit(change: GameChange) {
    own.current = true;
    try { return commit(change); } finally { own.current = false; }
  }
  function play(effects: Effect[]) {
    if (!effects.length) return;
    pending.current = true;
    setQueue(effects);
  }
  const move = (cityId: string, mode: TravelMode): Effect => ({ kind: "move", mode: presentation(cityId, mode) });
  const legs = (previous: GameState, next: GameState): Effect[] => tourLegsBetween(previous, next).map((leg) => ({ kind: "move", mode: legArt(leg) }));
  function travelToEvent(id: string, mode: TravelMode, revision: number) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = ownCommit((state) => beginTravelEvent(state, id, mode, revision, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded && before && after && before.currentCityId === after.currentCityId &&
        before.travel.currentPlaceId !== after.travel.currentPlaceId) play([move(after.currentCityId, mode)]);
    return succeeded;
  }
  /** 「休む」 by the way home the player chose, or (`byItself`) the rest the game takes at the day's end (restAtDayEnd). */
  function restAtHotel(mode: TravelMode, viaPlaceId: string | null, revision: number, byItself: boolean) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = ownCommit((state) => sleepAtHotel(state, mode, revision, viaPlaceId, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded && before && after && before.currentCityId === after.currentCityId) {
      // The hotel's moment (stage 4) may stop at a scene before moving or before the night: the rest plays later from its marks.
      // A booked tour that started in the same action (tour stage 2a) has taken the party on from the hotel: the ride home, the
      // night, then the tour's legs.
      const tour = legs(before, after);
      // The day's end: its night card first (the ride home is part of it), over whatever the rest led to; a night still to
      // come after the hotel's scenes plays its 「次の日」 later from the marks, as after 「休む」.
      if (byItself) {
        play([dayEnd, ...tour]);
        return succeeded;
      }
      const moved = tour.length ? before.travel.currentPlaceId !== before.travel.hotelPlaceId : before.travel.currentPlaceId !== after.travel.currentPlaceId;
      const slept = after.travel.day !== before.travel.day;
      play([...(moved ? [move(before.currentCityId, mode)] : []), ...(slept ? [night] : []), ...tour]);
    }
    return succeeded;
  }
  function returnToHotel(mode: TravelMode, viaPlaceId: string | null, revision: number) {
    return restAtHotel(mode, viaPlaceId, revision, false);
  }
  /**
   * The day's end (GameApp, dayEndRest): the same rest as 「休む」 by `way`, then the night card 「夜も更けたので、ホテルで休みました。」.
   * Refused while an effect plays (GameApp asks again once it has ended) and for a revision that has moved on.
   */
  function restAtDayEnd(way: HomeRoute, revision: number) {
    return restAtHotel(way.mode, way.viaPlaceId ?? null, revision, true);
  }
  /**
   * A move or a night inside a scene's action (4.7): a `# then: move` (stage 3b), a trip whose move waited for its
   * scenes, the hotel's night after its scenes (stage 4), a tour's legs (stage 2a: the start after the hotel's scenes after
   * waking, the way back after 「ツアーを続ける」). The art plays from the occasion's marks: the place it moved to by its mode,
   * the day that passed, the tour's legs.
   */
  function playMove(previous: GameState, next: GameState) {
    if (own.current || pending.current || previous.currentCityId !== next.currentCityId) return;
    const slept = next.travel.day > previous.travel.day;
    const tour = legs(previous, next);
    if (tour.length) {
      // The ride home of a rest whose move waited for its scenes, then the night, then the legs.
      const trip = previous.occasion?.kind === "hotel" && previous.occasion.trip && !previous.occasion.ran.includes("move") &&
        previous.occasion.trip.from !== previous.occasion.trip.to ? previous.occasion.trip : undefined;
      play([...(trip ? [move(next.currentCityId, trip.modeId)] : []), ...(slept ? [night] : []), ...tour]);
      return;
    }
    const moved = previous.travel.currentPlaceId !== next.travel.currentPlaceId;
    const mode = moved ? next.occasion?.moved ?? previous.occasion?.trip?.modeId ?? next.occasion?.trip?.modeId : undefined;
    play([...(mode ? [move(next.currentCityId, mode)] : []), ...(slept ? [night] : [])]);
  }
  /** The effect on screen ended: the next one, or nothing more (other controls may move again). */
  function done() {
    const rest = queue.slice(1);
    setQueue(rest);
    if (!rest.length) pending.current = false;
  }
  const current = queue[0];
  const effects = <>
    {current?.kind === "move" && <TravelTransition key={`${queue.length}:${current.mode.id}`} mode={current.mode} reduceMotion={reduceMotion} onEnd={done} />}
    {current?.kind === "night" && <TimePassage key={`${queue.length}:night`} reduceMotion={reduceMotion} onEnd={done} />}
    {current?.kind === "day_end" && <NightRest key={`${queue.length}:day_end`} reduceMotion={reduceMotion} onEnd={done} />}
  </>;
  /** An effect is on screen (the day's end waits for it to end). */
  const playing = queue.length > 0;
  return { travelToEvent, returnToHotel, restAtDayEnd, playMove, playing, effects };
}
