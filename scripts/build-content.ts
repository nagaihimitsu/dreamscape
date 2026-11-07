import path from "node:path";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { CONTENT_WARNING_LABELS, formatJourneyContents, type ContentWarningKind } from "./content-report";
import { inkCacheDisabledByEnv, openStoryValidationCache } from "./story-validation-cache";

// Warnings (stale dialogue annotations after Ink edits, and the content
// warnings of content-report.ts) stay visible as counts and offer their
// details on demand, without burying errors under the same list on every
// successful build.
const verbose = process.argv.includes("--verbose");
// --no-cache (or DREAMSCAPE_INK_CACHE=off) validates every Ink branch without
// reading or writing the validation cache.
const noCache = process.argv.includes("--no-cache");
// --with-sample adds the sample journey (development and tests only; see
// SAMPLE_JOURNEY_DIRECTORY). Production builds never pass it.
const withSample = process.argv.includes("--with-sample");
const details = "details: npm run content:build -- --verbose";
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
  const storyCache = noCache ? undefined : openStoryValidationCache();
  const result = await buildContent(process.cwd(), true, {
    storyCache: storyCache ?? null,
    ...(withSample ? { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] } : {}),
  });
  if (staleWarnings.length && !verbose) warn(`${staleWarnings.length} stale dialogue annotation(s); ${details}`);
  if (verbose) result.warnings.forEach((warning) => warn(warning.message));
  else if (result.warnings.length) {
    const counts = new Map<ContentWarningKind, number>();
    for (const warning of result.warnings) counts.set(warning.kind, (counts.get(warning.kind) ?? 0) + 1);
    warn(`${result.warnings.length} content warning(s): ${[...counts].map(([kind, count]) => `${count} ${CONTENT_WARNING_LABELS[kind]}`).join(", ")}; ${details}`);
  }
  console.log(
    storyCache
      ? `Ink validation cache: ${storyCache.stats.reused} reused, ${storyCache.stats.run} run (${path.relative(process.cwd(), path.dirname(storyCache.directory))}; --no-cache skips it)`
      : `Ink validation cache: off (${noCache ? "--no-cache" : inkCacheDisabledByEnv() ? "DREAMSCAPE_INK_CACHE" : "code fingerprint unavailable"})`,
  );
  console.log(
    `Content OK: ${result.dates.length} date, ${Object.keys(result.stories).length} story, ${result.routes} romance routes, ${result.battles.length} battle (${result.reasoningBattles} special), ${result.battleScenarios} battle scenes, ${result.tourismGuides} tourism guide, ${result.epilogueScenarios} epilogue contexts, ${result.tourism.clues.length} clues, ${result.journey.episodes.length} episode, ${result.journey.rewards.length} progression rewards.`,
  );
  // One line per journey folder, so a forgotten or still empty folder shows before it is published.
  for (const journey of result.journeyContents) console.log(formatJourneyContents(journey));
  for (const line of result.transport) console.log(line);
  if (withSample) console.log(`Sample journey included from ${SAMPLE_JOURNEY_DIRECTORY} (development and tests only; npm run content:build without --with-sample removes it)`);
  // Unused dictionary entries do no harm: a count, the words with --verbose.
  const unusedWords = result.unusedWordMeanings.reduce((sum, item) => sum + item.words.length, 0);
  if (verbose) for (const item of result.unusedWordMeanings) console.log(`Unused word meanings in ${item.file} (${item.words.length}): ${item.words.join(", ")}`);
  else if (unusedWords) console.log(`${unusedWords} word meaning(s) that no quiz or encounter text uses; list: npm run content:build -- --verbose`);
} catch (error) {
  if (!verbose) staleWarnings.forEach((message) => warn(message));
  console.error(error);
  process.exitCode = 1;
} finally {
  console.warn = warn;
}
