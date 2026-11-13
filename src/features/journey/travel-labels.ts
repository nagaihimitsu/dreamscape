import type { TravelPlace } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";

/**
 * How the screens name a travel place. The hotel is the couple's own 「滞在先のホテル」 rather than its data name (a
 * data name's 「架空」 mark is not shown: it spoils the trip, 2026-11-11 user decision); a place that cannot be found
 * is 「不明」.
 */
export function placeDisplayName(
  game: { travel: Pick<GameState["travel"], "hotelPlaceId"> },
  place: Pick<TravelPlace, "id" | "nameJa"> | undefined,
): string {
  if (!place) return "不明";
  if (place.id !== game.travel.hotelPlaceId) return place.nameJa;
  return "滞在先のホテル";
}

/** A city's map as the screens name its places: its places and its own hotel. */
export type MapCity = { hotelPlaceId: string; places: readonly Pick<TravelPlace, "id" | "nameJa">[] };

/** Where a story scene's background is (romance/presentation.json backgrounds; both optional, never both). */
export type BackdropPlace = { placeId?: string; placeJa?: string };

/**
 * The header's place plate (2026-11-13 user decision): in a tour's car (its leg's narration begun, the move not yet)
 * the leg's label (`legJa`); else, while a story scene shows a background that says where it is, that place (its
 * `placeJa`, or the map place `placeId` as the screens name it: the hotel of any city is 「滞在先のホテル」); else the
 * place the party is at (`here`, as placeDisplayName names it). A `placeId` no map has leaves the plate to `here`.
 */
export function hudPlaceName(
  here: string,
  scene: { legJa?: string; backdrop?: BackdropPlace },
  cities: readonly MapCity[],
): string {
  const { legJa, backdrop } = scene;
  if (legJa !== undefined) return legJa;
  if (backdrop?.placeJa !== undefined) return backdrop.placeJa;
  if (backdrop?.placeId !== undefined) {
    const city = cities.find((item) => item.places.some((place) => place.id === backdrop.placeId));
    if (city) return placeDisplayName({ travel: { hotelPlaceId: city.hotelPlaceId } }, city.places.find((place) => place.id === backdrop.placeId));
  }
  return here;
}

/**
 * The photo a scene at no landmark is drawn on (stage 4: a date's, the hotel's, a trip's or a departure's scene): its
 * `# background:` when that names a registered photo. The scene's label then names that background and 出典 opens the
 * photo's credits; with no such photo the label names the place the party is at.
 */
export function sceneBackdropPhoto<Asset extends { id: string }>(
  backgroundId: string,
  backgrounds: Readonly<Record<string, { nameJa: string; imageAssetId?: string }>>,
  assets: readonly Asset[],
): { nameJa: string; asset: Asset } | undefined {
  const backdrop = backgrounds[backgroundId];
  const asset = backdrop?.imageAssetId ? assets.find((candidate) => candidate.id === backdrop.imageAssetId) : undefined;
  return backdrop && asset ? { nameJa: backdrop.nameJa, asset } : undefined;
}
