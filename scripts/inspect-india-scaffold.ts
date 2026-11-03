import { readFileSync } from "node:fs";
import { buildIndiaFragments, indiaRequirements, loadIndiaScaffold } from "./india-scaffold";

// Read-only authoring helper. Content publication is performed by the release gate.
const args = process.argv.slice(2);
const mode = args.shift();
const narrativePath = mode === "--fragments" ? args.shift() : undefined;
let selectedCities: string[] | undefined;
if (args[0] === "--city" && args.length === 2) selectedCities = [args[1]];
else if (args.length) throw new Error("Expected --city <city-id>");
if (mode !== "--requirements" && (mode !== "--fragments" || !narrativePath))
  throw new Error("Usage: --requirements [--city ID] | --fragments NARRATIVE.json [--city ID]");
const input = loadIndiaScaffold(process.cwd());
if (mode === "--fragments") {
  console.log(JSON.stringify(buildIndiaFragments(input, JSON.parse(readFileSync(narrativePath!, "utf8")), selectedCities), null, 2));
} else {
  const requirements = indiaRequirements(input, selectedCities);
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
