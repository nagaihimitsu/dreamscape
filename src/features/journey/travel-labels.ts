import type { TravelPlace } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";

/**
 * How the screens name a travel place. The hotel is the couple's own 「滞在先」
 * rather than its data name, and keeps 「（架空）」 when that name marks it as
 * fictional; a place that cannot be found is 「不明」.
 */
export function placeDisplayName(
  game: { travel: Pick<GameState["travel"], "hotelPlaceId"> },
  place: Pick<TravelPlace, "id" | "nameJa"> | undefined,
): string {
  if (!place) return "不明";
  if (place.id !== game.travel.hotelPlaceId) return place.nameJa;
  return `滞在先${place.nameJa.includes("架空") ? "（架空）" : ""}`;
}
