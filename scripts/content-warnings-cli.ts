import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { errorText } from "./cli-error";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { displayPath } from "./content-sources";
import {
  compareWarningSnapshots, parseContentWarningsArgs, readWarningSnapshot, savedSummary, STALE_DIALOGUE_LINE, warningSnapshot,
} from "./content-warnings";
import { openStoryValidationCache } from "./story-validation-cache";

// npm run content:warnings -- --save [file] | --compare [file] [--with-sample] (content-warnings.ts). It validates the
// content as content:build does, with the same Ink validation cache, but writes no generated file
// (src/content/generated/ stays as it is); it writes only the --save file.
const root = process.cwd();
const warn = console.warn;
try {
  const args = parseContentWarningsArgs(process.argv.slice(2));
  const file = path.resolve(root, args.file);
  const shown = displayPath(root, file);
  // Read the saved record first: a missing or broken file stops before the validation, which takes a while.
  const before = args.mode === "compare" ? readSaved(file, shown) : undefined;
  const stale: string[] = [];
  console.warn = (...values: unknown[]) => {
    if (typeof values[0] === "string" && STALE_DIALOGUE_LINE.test(values[0])) stale.push(values[0]);
    else warn(...values);
  };
  const result = await buildContent(root, false, {
    storyCache: openStoryValidationCache() ?? null,
    ...(args.withSample ? { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] } : {}),
  });
  console.warn = warn;
  const now = warningSnapshot(result.warnings, stale, { savedAt: new Date().toISOString(), head: gitHead(), withSample: args.withSample });
  if (before) console.log(compareWarningSnapshots(before, now, shown).join("\n"));
  else {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
    console.log(savedSummary(now, shown).join("\n"));
  }
} catch (error) {
  console.warn = warn;
  console.error(errorText(error));
  process.exitCode = 1;
}

function readSaved(file: string, shown: string) {
  if (!existsSync(file)) throw new Error(`前の記録がありません：${shown}。先に npm run content:warnings -- --save で保存してください。`);
  return readWarningSnapshot(readFileSync(file, "utf8"), shown);
}

/** The commit checked out, or null outside a git checkout. */
function gitHead(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}
