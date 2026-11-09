import imageJourneyData from "./generated/image-journeys.json";
import { derivedImageFile, type DerivedImageKind } from "./code-images";
import { imageJourneyIndexSchema } from "./credits";
import type { TourismAsset } from "./tourism-schemas";

// content:build writes a reduced copy of every photo that getPlacePhoto
// (`card`, 240×160) or getCityBackdrop (`backdrop`, longest side 1280) can
// return, below the folder of the journey that provides the photo. The copies
// keep the photo's credit; the screens that show them say they are reduced
// and cropped (credits.ts DERIVED_PHOTO_NOTE_JA).

const journeyOfAsset = new Map(Object.entries(imageJourneyIndexSchema.parse(imageJourneyData).journeys)
  .flatMap(([journeyId, assetIds]) => assetIds.map((assetId): [string, string] => [assetId, journeyId])));

/** The served path of a photo's reduced copy (relative to the game's base URL). */
export function derivedImagePath(asset: Pick<TourismAsset, "id">, kind: DerivedImageKind): string {
  const journeyId = journeyOfAsset.get(asset.id);
  if (!journeyId) throw new Error(`No journey provides the tourism image ${asset.id}`);
  return derivedImageFile(journeyId, asset.id, kind);
}
