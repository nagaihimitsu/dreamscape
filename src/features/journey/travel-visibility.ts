import { dates } from "../../content";
import type { TravelEvent, TravelRoute } from "../../content/travel-schemas";
import { isEventVisible, type GameState } from "../../domain/game";
import { isTravelEventUnlocked } from "../../domain/travel-game";

export const travelModeLabels: Record<TravelRoute["mode"], string> = {
  walk: "徒歩", rail: "鉄道・地下鉄", tram: "路面電車", bus: "バス", taxi: "タクシー",
};

export function showTravelEvent(game: GameState, event: TravelEvent): boolean {
  if (!isTravelEventUnlocked(game, event.id)) return false;
  const date = dates.find((item) => item.id === event.id);
  if (!date) return true;
  if (date.legacyOnly) return false;
  return date.kind === "normal" ? !game.playedDateIds.includes(date.id) || isEventVisible(game, date.id) : isEventVisible(game, date.id);
}
