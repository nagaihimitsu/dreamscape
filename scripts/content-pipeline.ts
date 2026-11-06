import { checkContentImages } from "./content-images";
import { writeContentOutputs } from "./content-outputs";
import { loadContentSources } from "./content-sources";
import { validateContent } from "./content-validation";

// content:build in three steps: load (content-sources.ts reads every content
// file once) → validate (content-validation.ts, pure; content-images.ts then
// decodes the image files) → write the outputs (content-outputs.ts).
//
// This module exports only buildContent: the unit-test split (scripts/test-sets.ts) puts every test that imports
// it in the slow "content" set. Put helpers that tests call on their own in light modules
// (ink-validation, quiz-validation, city-links).

export async function buildContent(root: string, writeOutput = true) {
  const sources = loadContentSources(root);
  const content = validateContent(sources);
  await checkContentImages(sources.publicFiles, content.images);
  if (writeOutput) writeContentOutputs(root, sources, content);
  return content;
}
