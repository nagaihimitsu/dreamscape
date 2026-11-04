import { useRef, useState } from "react";
import type { GameState } from "../domain/game";
import { beginTravelEvent, sleepAtHotel, type TravelMode } from "../domain/travel-game";
import { TravelTransition } from "../features/journey/TravelTransition";
import { TimePassage } from "../features/journey/TimePassage";
import type { GameChange } from "./useGameSession";

/** Plays decorative effects only after a successful, already-saved movement. */
export function useTravelEffects({ getCurrent, commit, nextRomanceRoll, reduceMotion }: {
  getCurrent: () => GameState | null;
  commit: (change: GameChange) => boolean;
  nextRomanceRoll: () => number;
  reduceMotion: boolean;
}) {
  const [transition, setTransition] = useState<{ mode: TravelMode; thenSleep: boolean } | null>(null);
  const [showTimePassage, setShowTimePassage] = useState(false);
  // A second activation may arrive before React renders the first transition.
  const pending = useRef(false);
  function travelToEvent(id: string, mode: TravelMode, revision: number) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = commit((state) => beginTravelEvent(state, id, mode, revision, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded && before && after && before.currentCityId === after.currentCityId &&
        before.travel.currentPlaceId !== after.travel.currentPlaceId) {
      pending.current = true;
      setTransition({ mode, thenSleep: false });
    }
    return succeeded;
  }
  function returnToHotel(mode: TravelMode, viaPlaceId: string | null, revision: number) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = commit((state) => sleepAtHotel(state, mode, revision, viaPlaceId));
    if (succeeded && before) {
      pending.current = true;
      if (before.travel.currentPlaceId !== before.travel.hotelPlaceId) setTransition({ mode, thenSleep: true });
      else setShowTimePassage(true);
    }
    return succeeded;
  }
  const effects = <>
    {transition && <TravelTransition mode={transition.mode} reduceMotion={reduceMotion} onEnd={() => {
      setTransition(null);
      if (transition.thenSleep) setShowTimePassage(true);
      else pending.current = false;
    }} />}
    {showTimePassage && <TimePassage reduceMotion={reduceMotion} onEnd={() => {
      setShowTimePassage(false);
      pending.current = false;
    }} />}
  </>;
  return { travelToEvent, returnToHotel, effects };
}
