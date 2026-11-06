import { existsSync } from "node:fs";
import path from "node:path";
import { duplicatePublicFileError, publicRoots } from "./content-sources";

// Static files (images) live in the root `public/` (shared) and in each
// journey's `content/journeys/<journeyId>/public/`, under the same relative
// URL paths (`assets/tourism/...`). The content loader lists them
// (ContentSources.publicFiles) and content:build assembles them into one
// folder that Vite serves; tools may also look a single file up on disk.

/** `journeyFolder` (repo-relative) is the folder of the journey whose data names the file, when the caller knows it. */
const missingMessage = (assetPath: string, journeyFolder?: string) =>
  `Missing public file: ${assetPath} (searched public/ and ${journeyFolder ?? "content/journeys/<journeyId>"}/public/)`;

/**
 * The file serving `assetPath` (e.g. `assets/tourism/india/delhi.jpg`), or
 * undefined when no public root has it. Two roots providing the same path is
 * an error, because the game would serve only one of them.
 */
export function findPublicFile(root: string, assetPath: string, roots: readonly string[] = publicRoots(root)): string | undefined {
  const matches = roots.map((directory) => path.join(directory, assetPath)).filter((file) => existsSync(file));
  if (matches.length > 1) throw duplicatePublicFileError(root, assetPath, matches);
  return matches[0];
}

/** The one file serving `assetPath`; a clear error when it is missing or provided twice. */
export function resolvePublicFile(root: string, assetPath: string, roots: readonly string[] = publicRoots(root)): string {
  const file = findPublicFile(root, assetPath, roots);
  if (!file) throw new Error(missingMessage(assetPath));
  return file;
}

/** The served file of `assetPath` in loaded public files (ContentSources.publicFiles), or undefined. */
export function servedFile(publicFiles: ReadonlyMap<string, string>, assetPath: string): string | undefined {
  return publicFiles.get(path.posix.normalize(assetPath));
}

/**
 * The served file of `assetPath` in loaded public files; the same error as
 * resolvePublicFile when it is missing, naming `journeyFolder`'s public/ when
 * given (the folder of the journey whose data names the file).
 */
export function requireServedFile(publicFiles: ReadonlyMap<string, string>, assetPath: string, journeyFolder?: string): string {
  const file = servedFile(publicFiles, assetPath);
  if (!file) throw new Error(missingMessage(assetPath, journeyFolder));
  return file;
}
