import { buildContent } from "./content-pipeline";

// Dialogue annotations can become stale when Ink text is edited. Keep the
// warnings visible as a count and offer their details on demand, without
// burying errors under the same list on every successful build.
const verbose = process.argv.includes("--verbose");
const staleWarnings: string[] = [];
const warn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && /^Stale dialogue (expression|reaction) \(/u.test(args[0])) {
    staleWarnings.push(args[0]);
    if (verbose) warn(...args);
    return;
  }
  warn(...args);
};

try {
  const result = await buildContent(process.cwd());
  if (staleWarnings.length && !verbose) {
    warn(`${staleWarnings.length} stale dialogue annotation(s); details: npm run content:build -- --verbose`);
  }
  console.log(
    `Content OK: ${result.dates.length} date, ${Object.keys(result.stories).length} story, ${result.routes} romance routes, ${result.battles.length} battle (${result.reasoningBattles} special), ${result.battleScenarios} battle scenes, ${result.tourismGuides} tourism guide, ${result.epilogueScenarios} epilogue contexts, ${result.tourism.clues.length} clues, ${result.journey.episodes.length} episode, ${result.journey.rewards.length} progression rewards.`,
  );
} catch (error) {
  if (!verbose) staleWarnings.forEach((message) => warn(message));
  console.error(error);
  process.exitCode = 1;
} finally {
  console.warn = warn;
}
