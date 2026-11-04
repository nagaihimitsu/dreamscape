/** Only editing conventions live here; city order and gameplay belong to the catalogs. */
export const journeyAuthoringProfiles = {
  golden_triangle: { eventPrefix: "gt", observationFile: "authoring/drafts/golden-triangle/observation-cards.json", imageDirectory: "assets/tourism/india" },
  uzbekistan: { eventPrefix: "uz", observationFile: "authoring/drafts/uzbekistan/observation-cards.json", imageDirectory: "assets/tourism/uzbekistan",
    transitDirectory: "authoring/research/uzbekistan-20261104" },
} as const;

export function getJourneyAuthoringProfile(journeyId: string) {
  if (!Object.hasOwn(journeyAuthoringProfiles, journeyId)) throw new Error(`Unknown authoring journey: ${journeyId}`);
  return journeyAuthoringProfiles[journeyId as keyof typeof journeyAuthoringProfiles];
}
