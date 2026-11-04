export { inspectJourneyReadiness as inspectIndiaReadiness } from "./journey-readiness";
export type { JourneyReadinessInput as IndiaReadinessInput, JourneyReadinessIssue as IndiaReadinessIssue,
  JourneyEventReadiness as IndiaEventReadiness, JourneyCityReadiness as IndiaCityReadiness,
  JourneyReadinessReport as IndiaReadinessReport } from "./journey-readiness";
import { loadJourneyReadiness } from "./journey-readiness";
export const loadIndiaReadiness = (root: string) => loadJourneyReadiness(root, "golden_triangle");
