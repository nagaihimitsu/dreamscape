/**
 * The Golden Triangle's three-city chain with fictional cities (tests only).
 * The journey is copied under the test ID test_golden_triangle with cities
 * test_delhi, test_agra and test_jaipur, which installJourneyTestCities fills
 * from the Debug template. The authored Indian stories are never replaced.
 */
import { getJourney, journeys } from "../../../src/content/journeys";
import { installJourneyTestCities } from "../../../src/dev/test-cities";

export function installTestGoldenTriangle(): () => void {
  const original = getJourney("golden_triangle");
  if (!original) throw new Error("試験用の三都市の旅の元になる旅行編 golden_triangle がありません");
  if (getJourney("test_golden_triangle"))
    throw new Error("試験用の旅行編 test_golden_triangle が既にあります（前のテストの後始末を確かめてください）");
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
