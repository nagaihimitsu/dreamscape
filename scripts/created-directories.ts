import { existsSync, mkdirSync, readdirSync, rmdirSync } from "node:fs";
import path from "node:path";

// Authoring tools may write the first file of a kind into a journey folder
// (e.g. its first `tourism/catalog.json`). They create the parent directories
// themselves and remove them again when the write is rolled back.

/**
 * Create the missing parent directories of root-relative `files`. Returns the
 * created directories (root-relative, outermost first) for a later rollback.
 */
export function createParentDirectories(root: string, files: readonly string[]): string[] {
  const created: string[] = [];
  try {
    for (const file of files) {
      const missing: string[] = [];
      for (let directory = path.dirname(path.join(root, file)); !existsSync(directory); directory = path.dirname(directory))
        missing.unshift(directory);
      for (const directory of missing) {
        mkdirSync(directory);
        created.push(path.relative(root, directory));
      }
    }
  } catch (error) {
    removeCreatedDirectories(root, created);
    throw error;
  }
  return created;
}

/**
 * Remove directories returned by createParentDirectories, innermost first,
 * when they are empty. A directory someone else put a file into is kept and
 * returned, so the caller can report it.
 */
export function removeCreatedDirectories(root: string, created: readonly string[]): string[] {
  const kept: string[] = [];
  for (const directory of [...created].reverse()) {
    const absolute = path.join(root, directory);
    if (!existsSync(absolute)) continue;
    if (readdirSync(absolute).length) { kept.push(directory); continue; }
    try { rmdirSync(absolute); } catch { kept.push(directory); }
  }
  return kept;
}
