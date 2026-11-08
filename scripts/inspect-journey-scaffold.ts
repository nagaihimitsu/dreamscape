import { readFileSync } from "node:fs";
import { parseJourneyScaffoldArgs } from "./journey-cli";
import { buildJourneyFragments, journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";

// Read-only authoring helper. Content publication is performed by the release gate.
// Options: parseJourneyScaffoldArgs (without a mode it prints the requirements).
try {
  const { mode, narrativePath, journeyId, selectedCities } = parseJourneyScaffoldArgs(process.argv.slice(2));
  const input = loadJourneyScaffold(process.cwd(), journeyId);
  if (mode === "fragments") {
    console.log(JSON.stringify(buildJourneyFragments(input, JSON.parse(readFileSync(narrativePath!, "utf8")), selectedCities), null, 2));
  } else {
    const requirements = journeyRequirements(input, selectedCities);
    const scene = { titleJa: null, descriptionJa: null, clearTitleJa: null, clearDescriptionJa: null,
      enemyNameJa: null, enemyTitleJa: null, enemyDescriptionJa: null };
    const narrativeTemplate = {
      main: Object.fromEntries(requirements.flatMap((city) => city.main.map((item) => [item.eventId, scene]))),
      dates: Object.fromEntries(requirements.flatMap((city) => city.dates.map((item) => [item.eventId,
        { titleJa: null, descriptionJa: null, memoryTitleJa: null, memoryDescriptionJa: null }]))),
      finales: Object.fromEntries(requirements.map((city) => [city.cityId, { ...scene, placeId: null, activityMinutes: null }])),
    };
    console.log(JSON.stringify({ requirements, narrativeTemplate }, null, 2));
  }
} catch (error) {
  // The message only: a stack trace would bury it.
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
