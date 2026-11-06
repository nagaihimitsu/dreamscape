import { checkContentImages } from "./content-images";
import { writeContentOutputs } from "./content-outputs";
import { loadContentSources } from "./content-sources";
import { validateContent } from "./content-validation";
import { openStoryValidationCache, type StoryValidationCache } from "./story-validation-cache";

// content:build in three steps: load (content-sources.ts reads every content
// file once) → validate (content-validation.ts, pure; content-images.ts then
// decodes the image files) → write the outputs (content-outputs.ts).
//
// This module exports only buildContent: the unit-test split (scripts/test-sets.ts) puts every test that imports
// it in the slow "content" set. Put helpers that tests call on their own in light modules
// (ink-validation, quiz-validation, city-links).

/**
 * Build (or, with writeOutput false, only check) the content of `root`.
 * The full-branch Ink validation uses the validation cache
 * (story-validation-cache.ts) unless `storyCache` is null or
 * DREAMSCAPE_INK_CACHE=off; pass an opened cache to read its statistics.
 */
export async function buildContent(root: string, writeOutput = true, options: { storyCache?: StoryValidationCache | null } = {}) {
  const sources = loadContentSources(root);
  const storyCache = options.storyCache === undefined ? openStoryValidationCache() : options.storyCache ?? undefined;
  const content = validateContent(sources, { storyCache });
  await checkContentImages(sources.publicFiles, content.images);
  if (writeOutput) writeContentOutputs(root, sources, content);
  return content;
}
