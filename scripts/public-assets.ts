import { existsSync } from "node:fs";
import path from "node:path";
import { displayPath, publicRoots } from "./content-sources";

// Static files (images) live in the root `public/` (shared) and in each
// journey's `content/journeys/<journeyId>/public/`, under the same relative
// URL paths (`assets/tourism/...`). Tools look a file up in all of them.

/**
 * The file serving `assetPath` (e.g. `assets/tourism/india/delhi.jpg`), or
 * undefined when no public root has it. Two roots providing the same path is
 * an error, because the game would serve only one of them.
 */
export function findPublicFile(root: string, assetPath: string, roots: readonly string[] = publicRoots(root)): string | undefined {
  const matches = roots.map((directory) => path.join(directory, assetPath)).filter((file) => existsSync(file));
  if (matches.length > 1)
    throw new Error(`Public file ${assetPath} exists in more than one public folder: ${matches.map((file) => displayPath(root, file)).join(" and ")}`);
  return matches[0];
}

/** The one file serving `assetPath`; a clear error when it is missing or provided twice. */
export function resolvePublicFile(root: string, assetPath: string, roots: readonly string[] = publicRoots(root)): string {
  const file = findPublicFile(root, assetPath, roots);
  if (!file) throw new Error(`Missing public file: ${assetPath} (searched public/ and content/journeys/<journeyId>/public/)`);
  return file;
}
