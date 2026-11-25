import { getCityContent, getCityShop, landmarks, presentation, tourismAssets } from "./index";
import { chooseCardPhotos, choosePlacePhoto } from "./photo-choice";
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

/** The photos of a city's 「待機」, tour and shop cards (photo-choice.ts chooseCardPhotos), each null for a plain tile. */
export function getCardPhotos(cityId: string): ReturnType<typeof chooseCardPhotos> {
  return chooseCardPhotos(tourismAssets, { settings: getCityContent(cityId).travelSettings, shop: getCityShop(cityId) });
}
