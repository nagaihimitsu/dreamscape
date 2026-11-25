import { derivedImagePath } from "./derived-images";
import { getCityContent, tourismAssets } from "./index";
import { chooseCityBackdrop } from "./photo-choice";
import type { TourismAsset } from "./tourism-schemas";

/**
 * The city's free-time backdrop photo (`cities/<cityId>.json` backdropAssetId),
 * or null (no field, or a placeholder asset). Show its `backdrop` copy
 * (derivedImagePath); its credit is in ≡メニュー's 「画面の出典」.
 */
export function getCityBackdrop(cityId: string): TourismAsset | null {
  return chooseCityBackdrop(tourismAssets, getCityContent(cityId).city);
}

/**
 * The served path (relative to the game's base URL) of the city's free-time
 * backdrop: its own artwork (`backdropImagePath`, never credited), else the
 * `backdrop` copy of its photo (getCityBackdrop), else null for the screen's
 * own background. content:build lets a city name only one of the two.
 */
export function getCityBackdropPath(cityId: string): string | null {
  const artwork = getCityContent(cityId).city.backdropImagePath;
  if (artwork) return artwork;
  const photo = getCityBackdrop(cityId);
  return photo ? derivedImagePath(photo, "backdrop") : null;
}

/** The served path of the city's moving backdrop (`backdropVideoPath`, over its own artwork), or null. */
export function getCityBackdropVideoPath(cityId: string): string | null {
  return getCityContent(cityId).city.backdropVideoPath ?? null;
}
