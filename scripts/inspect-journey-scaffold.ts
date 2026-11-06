import { readFileSync } from "node:fs";
import { buildJourneyFragments, journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";

// Read-only authoring helper. Content publication is performed by the release gate.
// The mode may follow other options (e.g. `npm run india:scaffold -- --requirements`).
const args = process.argv.slice(2);
const modeIndex = args.findIndex((arg) => arg === "--requirements" || arg === "--fragments");
const mode = modeIndex < 0 ? undefined : args.splice(modeIndex, 1)[0];
const narrativePath = mode === "--fragments" ? args.splice(modeIndex, 1)[0] : undefined;
let selectedCities: string[] | undefined;
let journeyId: string | undefined;
const seen = new Set<string>();
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index], value = args[index + 1];
  if (!value || seen.has(flag)) throw new Error("Expected unique --journey ID and optional --city ID");
  seen.add(flag);
  if (flag === "--journey") journeyId = value;
  else if (flag === "--city") selectedCities = [value];
  else throw new Error(`Unknown option: ${flag}`);
}
if (!journeyId) throw new Error("--journey ID is required");
if (mode !== "--requirements" && (mode !== "--fragments" || !narrativePath))
  throw new Error("Usage: --requirements --journey ID [--city ID] | --fragments NARRATIVE.json --journey ID [--city ID]");
const input = loadJourneyScaffold(process.cwd(), journeyId);
if (mode === "--fragments") {
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
