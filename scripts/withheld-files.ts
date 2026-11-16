import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

// The served files a production build leaves out (user decision 2026-11-16): those of each journey players cannot
// open yet (src/content/journey-catalog.ts journeyFilesShip), so its photos, pictures and sounds wait for its release.
// content:build lists them (scripts/content-outputs.ts withheldFiles), the production build copies the generated
// public folder without them (withheldFilesPlugin) and the dist check (scripts/check-dist.ts) fails when one is in
// dist/. The development server serves them all. No project module is imported here: vite.config.ts loads this one.

/** The list content:build writes: `{ schemaVersion: 1, journeys: { <journeyId>: [<served path>, …] } }`. */
export const WITHHELD_FILES_FILE = "src/content/generated/withheld-files.json";

/** Each journey whose files a production build leaves out (its key even with none), with its served paths. */
export type WithheldFiles = { schemaVersion: 1; journeys: Record<string, string[]> };

/** Read the list of `root` (WITHHELD_FILES_FILE); throws a message for the person when it is missing or malformed. */
export function readWithheldFiles(root: string): WithheldFiles {
  const file = path.join(root, WITHHELD_FILES_FILE);
  if (!existsSync(file)) throw new Error(`${WITHHELD_FILES_FILE} がありません。先に npm run content:build を実行してください。`);
  const data = JSON.parse(readFileSync(file, "utf8")) as Partial<WithheldFiles> | null;
  const journeys = data?.journeys;
  if (data?.schemaVersion !== 1 || typeof journeys !== "object" || journeys === null || Array.isArray(journeys) ||
    !Object.values(journeys).every((paths) => Array.isArray(paths) && paths.every((item) => typeof item === "string")))
    throw new Error(`${WITHHELD_FILES_FILE} の形が違います。npm run content:build で生成し直してください。`);
  return { schemaVersion: 1, journeys };
}

/** Every withheld served path, with the journey whose file it is. */
export function withheldPaths(withheld: WithheldFiles): Map<string, string> {
  return new Map(Object.entries(withheld.journeys).flatMap(([journeyId, paths]) => paths.map((item): [string, string] => [item, journeyId])));
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
}

/**
 * Copy every file of `publicDirectory` to `outDirectory` but the withheld ones (served paths); returns how many
 * files were copied and left out.
 */
export function copyReleasedFiles(publicDirectory: string, outDirectory: string, withheld: ReadonlySet<string>): { copied: number; withheld: number } {
  let copied = 0;
  let left = 0;
  for (const file of listFiles(publicDirectory)) {
    if (withheld.has(file)) { left += 1; continue; }
    const target = path.join(outDirectory, file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(publicDirectory, file), target);
    copied += 1;
  }
  return { copied, withheld: left };
}

/**
 * Vite plugin (production builds only): the generated public folder goes into the build without the withheld files
 * (WITHHELD_FILES_FILE), in place of Vite's own copy of the whole folder (`build.copyPublicDir`). The files are
 * written before the service worker plugin reads the build (its closeBundle), so its versions see the same files.
 */
export function withheldFilesPlugin(): Plugin {
  let root = "";
  let publicDirectory = "";
  let outDirectory = "";
  return {
    name: "dreamscape-withheld-files",
    apply: "build",
    config: () => ({ build: { copyPublicDir: false } }),
    configResolved(config) {
      root = config.root;
      publicDirectory = config.publicDir;
      outDirectory = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      // As Vite's own copy: a build without a public folder (content:build not run) has no served files.
      if (!publicDirectory || !existsSync(publicDirectory)) return;
      copyReleasedFiles(publicDirectory, outDirectory, new Set(withheldPaths(readWithheldFiles(root)).keys()));
    },
  };
}
