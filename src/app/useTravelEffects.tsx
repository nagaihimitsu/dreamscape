import { useRef, useState } from "react";
import type { GameState } from "../domain/game";
import { getTransportMode, WALK_MODE, type TransportMode } from "../content/transport";
import { beginTravelEvent, sleepAtHotel, type TravelMode } from "../domain/travel-game";
import { TravelTransition } from "../features/journey/TravelTransition";
import { TimePassage } from "../features/journey/TimePassage";
import type { GameChange } from "./useGameSession";

/** The declared labels and art of a route's mode; content:build refuses undeclared modes, so the fallback never shows in built content. */
function presentation(cityId: string, mode: TravelMode): TransportMode {
  return getTransportMode(cityId, mode) ?? { ...WALK_MODE, id: mode, nameJa: "移動", movingJa: "移動中" };
}

/** Plays decorative effects only after a successful, already-saved movement. */
export function useTravelEffects({ getCurrent, commit, nextRomanceRoll, reduceMotion }: {
  getCurrent: () => GameState | null;
  commit: (change: GameChange) => boolean;
  nextRomanceRoll: () => number;
  reduceMotion: boolean;
}) {
  const [transition, setTransition] = useState<{ mode: TransportMode; thenSleep: boolean } | null>(null);
  const [showTimePassage, setShowTimePassage] = useState(false);
  // A second activation may arrive before React renders the first transition.
  const pending = useRef(false);
  // The map's departure and 「休む」 play their own art (playMove leaves their commits alone).
  const own = useRef(false);
  function ownCommit(change: GameChange) {
    own.current = true;
    try { return commit(change); } finally { own.current = false; }
  }
  function travelToEvent(id: string, mode: TravelMode, revision: number) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = ownCommit((state) => beginTravelEvent(state, id, mode, revision, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded && before && after && before.currentCityId === after.currentCityId &&
        before.travel.currentPlaceId !== after.travel.currentPlaceId) {
      pending.current = true;
      setTransition({ mode: presentation(after.currentCityId, mode), thenSleep: false });
    }
    return succeeded;
  }
  function returnToHotel(mode: TravelMode, viaPlaceId: string | null, revision: number) {
    if (pending.current) return false;
    const before = getCurrent();
    const succeeded = ownCommit((state) => sleepAtHotel(state, mode, revision, viaPlaceId, nextRomanceRoll));
    const after = getCurrent();
    if (succeeded && before && after) {
      // The hotel's moment (stage 4) may stop at a scene before moving or before the night: the rest plays later from its marks.
      const moved = before.travel.currentPlaceId !== after.travel.currentPlaceId;
      const slept = after.travel.day !== before.travel.day;
      if (moved || slept) pending.current = true;
      if (moved) setTransition({ mode: presentation(before.currentCityId, mode), thenSleep: slept });
      else if (slept) setShowTimePassage(true);
    }
    return succeeded;
  }
  /**
   * A move or a night inside a scene's action (4.7): a `# then: move` (stage 3b), a trip whose move waited for its
   * scenes, the hotel's night after its scenes (stage 4). The art plays from the occasion's marks: the place it moved
   * to by its mode, the day that passed.
   */
  function playMove(previous: GameState, next: GameState) {
    if (own.current || pending.current || previous.currentCityId !== next.currentCityId) return;
    const moved = previous.travel.currentPlaceId !== next.travel.currentPlaceId;
    const slept = next.travel.day > previous.travel.day;
    const mode = moved ? next.occasion?.moved ?? previous.occasion?.trip?.modeId ?? next.occasion?.trip?.modeId : undefined;
    if (mode) {
      pending.current = true;
      setTransition({ mode: presentation(next.currentCityId, mode), thenSleep: slept });
    } else if (slept) {
      pending.current = true;
      setShowTimePassage(true);
    }
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
  return { travelToEvent, returnToHotel, playMove, effects };
}
