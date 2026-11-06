import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, utimesSync } from "node:fs";
import path from "node:path";
import { displayPath, listFiles, publicRoots, removeEmptyDirectories } from "./content-sources";

// Static files (images) live in the root `public/` (shared) and in each
// journey's `content/journeys/<journeyId>/public/`, under the same relative
// URL paths (`assets/tourism/...`). Tools look a file up in all of them;
// content:build assembles them into one folder that Vite serves.

/**
 * The file serving `assetPath` (e.g. `assets/tourism/india/delhi.jpg`), or
 * undefined when no public root has it. Two roots providing the same path is
 * an error, because the game would serve only one of them.
 */
export function findPublicFile(root: string, assetPath: string, roots: readonly string[] = publicRoots(root)): string | undefined {
  const matches = roots.map((directory) => path.join(directory, assetPath)).filter((file) => existsSync(file));
  if (matches.length > 1) throw duplicateError(root, assetPath, matches);
  return matches[0];
}

/** The one file serving `assetPath`; a clear error when it is missing or provided twice. */
export function resolvePublicFile(root: string, assetPath: string, roots: readonly string[] = publicRoots(root)): string {
  const file = findPublicFile(root, assetPath, roots);
  if (!file) throw new Error(`Missing public file: ${assetPath} (searched public/ and content/journeys/<journeyId>/public/)`);
  return file;
}

function duplicateError(root: string, assetPath: string, files: readonly string[]): Error {
  return new Error(`Public file ${assetPath} exists in more than one public folder: ${files.map((file) => displayPath(root, file)).join(" and ")}`);
}

/**
 * Every served file of the public roots: URL path (posix, e.g.
 * `assets/items/item.svg`) → source file, in root order. Dot entries are
 * skipped, as in the content layers. The same URL path in two roots is an error.
 */
export function collectPublicFiles(root: string, roots: readonly string[] = publicRoots(root)): Map<string, string> {
  const files = new Map<string, string>();
  for (const directory of roots) {
    if (!existsSync(directory)) continue;
    for (const relative of listFiles(directory)) {
      const file = path.join(directory, relative);
      const previous = files.get(relative);
      if (previous) throw duplicateError(root, relative, [previous, file]);
      files.set(relative, file);
    }
  }
  return files;
}

/**
 * Make `directory` hold exactly `files` (URL path → source file): remove the
 * files no source provides any more, and copy a file when its copy is missing
 * or differs in size or modification time (copies keep the source's time;
 * times within a millisecond count as equal). Returns the number of files
 * copied and removed.
 */
export function assemblePublicDirectory(files: ReadonlyMap<string, string>, directory: string): { copied: number; removed: number } {
  let removed = 0;
  for (const relative of existsSync(directory) ? listFiles(directory) : []) {
    if (files.has(relative)) continue;
    rmSync(path.join(directory, relative), { recursive: true, force: true });
    removed += 1;
  }
  removeEmptyDirectories(directory);
  let copied = 0;
  for (const [relative, source] of files) {
    const target = path.join(directory, relative);
    const from = statSync(source);
    const to = existsSync(target) ? statSync(target) : undefined;
    if (to?.isFile() && to.size === from.size && Math.abs(to.mtimeMs - from.mtimeMs) < 1) continue;
    if (to && !to.isFile()) rmSync(target, { recursive: true, force: true });
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    // Seconds as numbers keep sub-millisecond precision (a Date would round).
    utimesSync(target, from.atimeMs / 1000, from.mtimeMs / 1000);
    copied += 1;
  }
  return { copied, removed };
}
