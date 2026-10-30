import { buildContent } from "./content-pipeline";

try {
  const result = await buildContent(process.cwd());
  console.log(
    `Content OK: ${result.dates.length} date, ${Object.keys(result.stories).length} story, ${result.routes} romance routes, ${result.battles.length} battle, ${result.battleScenarios} battle scenes, ${result.tourismGuides} tourism guide, ${result.tourism.clues.length} clues.`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
