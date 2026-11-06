import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generatedPublicDirectory, mirrorDirectory, type CatalogKind } from "./content-layout";
import type { MergedCatalog } from "./catalog-merge";
import { listFiles, type ContentSources } from "./content-sources";

// The outputs of content:build, written after the content was validated:
// the compiled stories and quizzes, the generated mirror of the merged
// catalogs (src/content/generated/content/) and the served static files
// (src/content/generated/public/).

export const GENERATED_DIRECTORY = "src/content/generated";

/** Write every output of a validated build into `root`. */
export function writeContentOutputs(
  root: string,
  sources: ContentSources,
  validated: { stories: Record<string, string>; quizzes: Record<string, unknown> },
): void {
  const directory = path.join(root, GENERATED_DIRECTORY);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "quizzes.json"), `${JSON.stringify(validated.quizzes, null, 2)}\n`);
  writeFileSync(path.join(directory, "stories.json"), `${JSON.stringify(validated.stories, null, 2)}\n`);
  // The game imports the validated, merged catalogs only from this mirror.
  writeContentMirror(sources, mirrorDirectory(root));
  // Vite serves and builds the game's images from this folder (publicDir in vite.config.ts).
  assemblePublicDirectory(sources.publicFiles, generatedPublicDirectory(root));
}

/**
 * Write the validated merged view to `directory` (the generated mirror) with
 * the old `content/` relative paths: catalogs as formatted JSON, city and
 * travel files byte for byte. Files are written in place, unchanged files
 * are left untouched and files no longer produced are removed.
 */
export function writeContentMirror(sources: ContentSources, directory: string): void {
  const outputs = new Map<string, Buffer>();
  for (const [kind, merged] of Object.entries(sources.catalogs) as [CatalogKind, MergedCatalog][])
    outputs.set(kind, Buffer.from(`${JSON.stringify(merged.value, null, 2)}\n`));
  for (const city of sources.cities) {
    outputs.set(`cities/${city.id}.json`, city.bytes.city);
    outputs.set(`travel/${city.id}.json`, city.bytes.travel);
    outputs.set(`travel/${city.id}-settings.json`, city.bytes.settings);
  }
  const existing = existsSync(directory) ? listFiles(directory) : [];
  for (const relative of existing)
    if (!outputs.has(relative)) rmSync(path.join(directory, relative), { force: true });
  for (const [relative, data] of outputs) {
    const file = path.join(directory, relative);
    if (existsSync(file) && readFileSync(file).equals(data)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, data);
  }
  removeEmptyDirectories(directory);
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

/** Remove empty directories below and including `directory`; true when it was removed. */
export function removeEmptyDirectories(directory: string): boolean {
  if (!existsSync(directory)) return false;
  let empty = true;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const removed = entry.isDirectory() && removeEmptyDirectories(path.join(directory, entry.name));
    if (!removed) empty = false;
  }
  if (empty) rmdirSync(directory);
  return empty;
}
