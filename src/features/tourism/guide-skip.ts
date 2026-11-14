import { landmarkParts, type VisitPart } from "../../content/tourism-schemas";

/**
 * Where a sightseeing guide's 「案内をとばす」 leads, said after its words (2026-11-14, the phone UI audit): the visit's
 * next main part after the guide in the landmark's order (its observation, or its quiz where it has none), and the
 * observation for a guide read again from there. Nothing when the guide is the visit's last part.
 */
export function guideSkipDestination(
  landmark: { guideStoryId?: string; observation?: boolean; order?: readonly VisitPart[] },
  replay: boolean,
): string {
  const parts = landmarkParts(landmark);
  const next: VisitPart | undefined = replay ? "observe" : parts[parts.indexOf("guide") + 1];
  return next === "observe" ? "観察へ" : next === "battle" ? "クイズへ" : "";
}
