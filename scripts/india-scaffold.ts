// Existing India commands remain stable while all journeys share the implementation.
export { journeyNarrativeSchema as indiaNarrativeSchema, journeyRequirements as indiaRequirements,
  buildJourneyFragments as buildIndiaFragments } from "./journey-scaffold";
export type { JourneyScaffoldInput as IndiaScaffoldInput } from "./journey-scaffold";
import { loadJourneyScaffold } from "./journey-scaffold";
export const loadIndiaScaffold = (root: string) => loadJourneyScaffold(root, "golden_triangle");
