import { getCityContent, tourismAssets } from "./index";
import { chooseCityBackdrop } from "./photo-choice";
import type { TourismAsset } from "./tourism-schemas";

/**
 * The city's free-time backdrop (`cities/<cityId>.json` backdropAssetId), or
 * null for the plain background (no field, or a placeholder asset). Show its
 * `backdrop` copy (derivedImagePath).
 */
export function getCityBackdrop(cityId: string): TourismAsset | null {
  return chooseCityBackdrop(tourismAssets, getCityContent(cityId).city);
}
