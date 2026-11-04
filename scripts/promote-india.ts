// Backward-compatible entry points for existing India authoring commands.
import { renameSync } from "node:fs";
import { journeyReleaseChanges, mergeJourneyReleaseFragments, journeyInputFingerprint,
  writeJourneyReleaseFiles, prepareJourneyRelease } from "./promote-journey";
export type IndiaReleaseCity = "delhi" | "agra" | "jaipur";
export const indiaReleaseChanges = (original: Record<string, string>, through: IndiaReleaseCity = "jaipur") =>
  journeyReleaseChanges(original, "golden_triangle", through);
export const mergeIndiaReleaseFragments = mergeJourneyReleaseFragments;
export const indiaInputFingerprint = journeyInputFingerprint;
export const writeIndiaReleaseFiles = (root: string, original: Record<string, string>, next: Record<string, string>,
  move = renameSync, expectedFingerprint?: string) => writeJourneyReleaseFiles(root, original, next, "golden_triangle", move, expectedFingerprint);
export const prepareIndiaRelease = (root: string, apply: boolean, through: IndiaReleaseCity = "jaipur", narrativeFile?: string, translationsFile?: string) =>
  prepareJourneyRelease(root, "golden_triangle", apply, through, narrativeFile, translationsFile);
