import { landmarkParts, type VisitPart } from "../../content/tourism-schemas";

type GuidedLandmark = { guideStoryId?: string; observation?: boolean; order?: readonly VisitPart[] };

/**
 * The part of the visit that follows a sightseeing guide: the next main part after the guide in the landmark's order (its
 * observation, or its quiz where it has none or its order puts the quiz next), and the observation for a guide read again
 * from there. None when the guide is the visit's last part.
 */
function partAfterGuide(landmark: GuidedLandmark, replay: boolean): VisitPart | undefined {
  if (replay) return "observe";
  const parts = landmarkParts(landmark);
  return parts[parts.indexOf("guide") + 1];
}

/**
 * Where a sightseeing guide's 「案内をとばす」 leads, said after its words (2026-11-14, the phone UI audit): the part after
 * the guide (partAfterGuide). Nothing when the guide is the visit's last part.
 */
export function guideSkipDestination(landmark: GuidedLandmark, replay: boolean): string {
  const next = partAfterGuide(landmark, replay);
  return next === "observe" ? "観察へ" : next === "battle" ? "クイズへ" : "";
}

/**
 * The words of the button on a guide's last line, which opens the part after it (partAfterGuide; 2026-11-16 user
 * decision: 「観察を始める」 also started the quiz of a landmark without an observation): 「観察を始める」 before the
 * observation, 「クイズへ進む」 before the quiz, 「次へ」 when the guide is the visit's last part.
 */
export function guideEndLabel(landmark: GuidedLandmark, replay: boolean): string {
  const next = partAfterGuide(landmark, replay);
  return next === "observe" ? "観察を始める" : next === "battle" ? "クイズへ進む" : "次へ";
}
