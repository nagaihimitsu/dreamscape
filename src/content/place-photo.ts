import { getCityContent, landmarks, presentation, tourismAssets } from "./index";
import { choosePlacePhoto } from "./photo-choice";
import type { TourismAsset } from "./tourism-schemas";

/**
 * The photo of a place's row on the free-time screen (photo-choice.ts
 * choosePlacePhoto over the generated content), or null for a plain tile.
 * Show its `card` copy (derivedImagePath).
 */
export function getPlacePhoto(cityId: string, placeId: string): TourismAsset | null {
  const { travel, travelSettings } = getCityContent(cityId);
  const place = travel.places.find((item) => item.id === placeId);
  return place
    ? choosePlacePhoto({ assets: tourismAssets, landmarks, backgrounds: presentation.backgrounds }, place, travelSettings.hotelPlaceId)
    : null;
}
