import { getJourney, journeys } from "../content/journeys";
import { installJourneyTestCities } from "./multi-city-test-fixture";

/** Give the old three-city handoff tests their own namespace. Never replace
 * India's authored stories or relax the Debug guard against doing so. */
export function installTestGoldenTriangle(): () => void {
  const original = getJourney("golden_triangle");
  if (!original || getJourney("test_golden_triangle")) throw new Error("Invalid test journey setup");
  const fixture = { ...structuredClone(original), id: "test_golden_triangle", status: "preparing" as const,
    cities: original.cities.map((city) => ({ ...city, id: `test_${city.id}` })) };
  journeys.push(fixture);
  try {
    const cleanup = installJourneyTestCities(fixture.id);
    return () => {
      cleanup();
      journeys.splice(journeys.indexOf(fixture), 1);
    };
  } catch (error) {
    journeys.splice(journeys.indexOf(fixture), 1);
    throw error;
  }
}
