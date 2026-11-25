import type { LandmarkDefinition, TourismAsset } from "./tourism-schemas";
import type { TravelPlace } from "./travel-schemas";

// Which registered tourism photo the free-time screen shows for a place (its
// list row) and for a city (the backdrop). Pure, so the game (place-photo.ts,
// city-backdrop.ts) and content:build (scripts/derived-images.ts, which writes
// the reduced copies of exactly these photos) choose the same ones.
// A placeholder asset (isPlaceholder) is never chosen: only the scenes with the
// 「仮画像」 notice show those.

export type PhotoContent = {
  assets: readonly TourismAsset[];
  landmarks: readonly Pick<LandmarkDefinition, "id" | "imageAssetId">[];
  /** romance/presentation.json backgrounds. */
  backgrounds: Readonly<Record<string, { imageAssetId?: string }>>;
};

function usableAsset(assets: readonly TourismAsset[], assetId: string | undefined): TourismAsset | null {
  const asset = assetId === undefined ? undefined : assets.find((item) => item.id === assetId);
  return asset && !asset.isPlaceholder ? asset : null;
}

/**
 * The photo of a place's row: the place's own `photoAssetId`, else the first
 * landmark's image, else the image of the place's background, else null (a
 * plain tile). The hotel (`hotelPlaceId`) shows only its own `photoAssetId`
 * (else null): its background often borrows another place's photo.
 */
export function choosePlacePhoto(
  content: PhotoContent,
  place: Pick<TravelPlace, "id" | "landmarkIds" | "backgroundId" | "photoAssetId">,
  hotelPlaceId: string,
): TourismAsset | null {
  const own = usableAsset(content.assets, place.photoAssetId);
  if (own || place.id === hotelPlaceId) return own;
  const landmarkId = place.landmarkIds?.[0];
  const landmarkAsset = landmarkId === undefined ? undefined : content.landmarks.find((item) => item.id === landmarkId)?.imageAssetId;
  return usableAsset(content.assets, landmarkAsset) ?? usableAsset(content.assets, content.backgrounds[place.backgroundId]?.imageAssetId);
}

/**
 * The photos of a city's other free-time cards (2026-11-25): 「待機」's and the tour's (travel settings `waitPhotoAssetId`,
 * `tourPhotoAssetId`) and its shop's (shop/catalog.json `photoAssetId`), each null for the plain tile.
 */
export function chooseCardPhotos(
  assets: readonly TourismAsset[],
  input: { settings: { waitPhotoAssetId?: string; tourPhotoAssetId?: string }; shop?: { photoAssetId?: string } },
): { wait: TourismAsset | null; tour: TourismAsset | null; shop: TourismAsset | null } {
  return {
    wait: usableAsset(assets, input.settings.waitPhotoAssetId),
    tour: usableAsset(assets, input.settings.tourPhotoAssetId),
    shop: usableAsset(assets, input.shop?.photoAssetId),
  };
}

/** A city's free-time backdrop (`cities/<cityId>.json` backdropAssetId), or null for the plain background. */
export function chooseCityBackdrop(assets: readonly TourismAsset[], city: { backdropAssetId?: string }): TourismAsset | null {
  return usableAsset(assets, city.backdropAssetId);
}
