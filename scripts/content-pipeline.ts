import { checkContentImages } from "./content-images";
import { derivedImageList, prepareDerivedImages } from "./derived-images";
import { writeContentOutputs } from "./content-outputs";
import { loadContentSources, type ContentLoadOptions } from "./content-sources";
import { validateContent } from "./content-validation";
import { markSampleCopies, readObservationCards, tourismPhotos, tourismPhotoWarnings } from "./image-optimization";
import { imageJourneyIndex } from "./image-rights";
import { sampleMarks } from "./sample-journey";
import { chooseStoryCache, type StoryValidationCache } from "./story-validation-cache";
import { voiceScriptWarnings } from "./voice-changes";

// content:build in three steps: load (content-sources.ts reads every content
// file once) → validate (content-validation.ts, pure; content-images.ts then
// decodes the image files) → write the outputs (content-outputs.ts). The
// warnings about photos to convert (image-optimization.ts) also read the
// observation cards of authoring/, which name the photos that keep their size,
// and the sample journey's images, whose copies are left to journey:readiness;
// the warnings about recorded lines that changed read the voice scripts sent
// (authoring/journeys/<journeyId>/voice/, voice-changes.ts).
//
// This module exports only buildContent: the unit-test split (scripts/test-sets.ts) puts every test that imports
// it in the slow "content" set. Put helpers that tests call on their own in light modules
// (ink-validation, quiz-validation, city-links).

/**
 * Build (or, with writeOutput false, only check) the content of `root`.
 * The full-branch Ink validation uses the validation cache
 * (story-validation-cache.ts) unless `storyCache` is null or
 * DREAMSCAPE_INK_CACHE=off; pass an opened cache to read its statistics.
 * `extraJourneyDirectories` adds journey folders outside content/journeys/
 * (the sample journey); the outputs record them (build-info.json).
 */
export async function buildContent(
  root: string,
  writeOutput = true,
  options: { storyCache?: StoryValidationCache | null } & ContentLoadOptions = {},
) {
  const sources = loadContentSources(root, { extraJourneyDirectories: options.extraJourneyDirectories });
  const storyCache = chooseStoryCache(options.storyCache);
  const content = validateContent(sources, { storyCache });
  await checkContentImages(sources.publicFiles, content.images);
  // The reduced copies of the free-time photos (derived-images.ts), served beside the other public files.
  let derivedImages: { count: number; made: number } | undefined;
  if (writeOutput) {
    const journeyOf = new Map(Object.entries(imageJourneyIndex(sources).journeys)
      .flatMap(([journeyId, assetIds]) => assetIds.map((assetId): [string, string] => [assetId, journeyId])));
    const derived = await prepareDerivedImages(derivedImageList({
      content: { assets: content.tourism.assets, landmarks: content.tourism.landmarks, backgrounds: content.photoContent.backgrounds },
      cities: content.photoContent.cities, journeyOf, publicFiles: sources.publicFiles,
    }));
    writeContentOutputs(root, sources, content, derived.files);
    derivedImages = { count: derived.files.size, made: derived.made };
  }
  const photos = markSampleCopies(tourismPhotos(sources, content.tourism, readObservationCards(root, sources.manifests, "skip")), sampleMarks().imageHashes);
  return { ...content, derivedImages, warnings: [...content.warnings, ...tourismPhotoWarnings(sources, photos), ...voiceScriptWarnings(sources)] };
}
