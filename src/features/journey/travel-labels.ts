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
