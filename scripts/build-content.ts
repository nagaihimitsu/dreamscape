import { buildContent } from "./content-pipeline";

try {
  const result = await buildContent(process.cwd());
  console.log(
    `Content OK: ${result.dates.length} date, ${Object.keys(result.stories).length} story, ${result.routes} romance routes, ${result.battles.length} battle (${result.reasoningBattles} special), ${result.battleScenarios} battle scenes, ${result.tourismGuides} tourism guide, ${result.epilogueScenarios} epilogue contexts, ${result.tourism.clues.length} clues, ${result.journey.episodes.length} episode, ${result.journey.rewards.length} progression rewards.`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
