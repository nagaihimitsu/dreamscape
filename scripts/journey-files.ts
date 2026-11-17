import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Which journey each served file belongs to: every file a journey serves from its public/ folder and the reduced
// copies of its photos. content:build writes the list (scripts/content-outputs.ts journeyFiles); the production build
// sorts its files by it for 「オフラインで遊ぶ」 (scripts/offline-list-build.ts: a journey's own files, and what every
// journey shares). The files a production build leaves out are the same list's journeys players cannot open yet
// (scripts/withheld-files.ts). No project module is imported here: vite.config.ts loads this one.

/** The list content:build writes: `{ schemaVersion: 1, journeys: { <journeyId>: [<served path>, …] } }`. */
export const JOURNEY_FILES_FILE = "src/content/generated/journey-files.json";

/** Each journey of the catalog (its key even with no file, in the catalog's order), with its served paths, sorted. */
export type JourneyFiles = { schemaVersion: 1; journeys: Record<string, string[]> };

/**
 * Read a generated list of served paths by journey (`file`, relative to `root`): JOURNEY_FILES_FILE, or the withheld
 * files' list of the same shape. Throws a message for the person when it is missing or malformed.
 */
export function readJourneyPaths(root: string, file: string): JourneyFiles {
  const absolute = path.join(root, file);
  if (!existsSync(absolute)) throw new Error(`${file} がありません。先に npm run content:build を実行してください。`);
  const data = JSON.parse(readFileSync(absolute, "utf8")) as Partial<JourneyFiles> | null;
  const journeys = data?.journeys;
  if (data?.schemaVersion !== 1 || typeof journeys !== "object" || journeys === null || Array.isArray(journeys) ||
    !Object.values(journeys).every((paths) => Array.isArray(paths) && paths.every((item) => typeof item === "string")))
    throw new Error(`${file} の形が違います。npm run content:build で生成し直してください。`);
  return { schemaVersion: 1, journeys };
}

/** Read the list of `root` (JOURNEY_FILES_FILE); throws a message for the person when it is missing or malformed. */
export function readJourneyFiles(root: string): JourneyFiles {
  return readJourneyPaths(root, JOURNEY_FILES_FILE);
}
