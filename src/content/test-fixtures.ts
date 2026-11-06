import { cp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { characterCatalogSchema } from "./character-assets";
import type { MergedKind } from "../../scripts/content-layout";
import { loadContentSources, publicRoots } from "../../scripts/content-sources";

/**
 * Build an isolated, artwork-undelivered fixture for tests of other content.
 * Production content and its artwork are still validated by content:build;
 * image-specific tests can register their own images in this fixture.
 *
 * The images of the journeys (`content/journeys/<journeyId>/public/`, most of
 * the repository's size) are not copied: their folders are real, but each file
 * is a symbolic link to the repository's file. A test may add or remove files
 * there, but must never write over a linked file, since that would change the
 * repository; replace it with replaceFixtureFile. The unit test run checks
 * that no linked image changed (scripts/test-image-guard.ts).
 */
export async function prepareContentFixture(fixture: string): Promise<void> {
  const root = path.resolve(".");
  const characterAssets = path.join(root, "public/assets/characters");
  const journeyImages = new Set(publicRoots(root).filter((directory) => directory !== path.join(root, "public")));
  await cp(path.join(root, "content"), path.join(fixture, "content"), {
    recursive: true,
    filter: (source) => !journeyImages.has(source),
  });
  for (const directory of journeyImages) await linkFiles(directory, path.join(fixture, path.relative(root, directory)));
  await cp(path.join(root, "public"), path.join(fixture, "public"), {
    recursive: true,
    filter: (source) => source !== characterAssets,
  });
  const file = path.join(fixture, "content/presentation/characters.json");
  const catalog = characterCatalogSchema.parse(JSON.parse(await readFile(file, "utf8")));
  for (const character of catalog.characters)
    for (const costume of character.costumes ?? [])
      for (const pose of costume.poses) pose.expressions = {};
  await writeFile(file, JSON.stringify(catalog));
}

/** Recreate the folders of `source` at `target`, with a symbolic link to each file. */
async function linkFiles(source: string, target: string): Promise<void> {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await linkFiles(from, to);
    else await symlink(from, to);
  }
}

/**
 * Write `data` to `file` in a fixture as a new file, so a file that
 * prepareContentFixture linked to the repository is replaced, not written through.
 */
export async function replaceFixtureFile(file: string, data: string | Uint8Array): Promise<void> {
  await rm(file, { force: true });
  await writeFile(file, data);
}

/**
 * Change one catalog entry in a fixture made by prepareContentFixture, in
 * the layer file that defines it (found through the merged view's
 * provenance), so a test keeps addressing the same entry wherever its
 * content layer keeps it. `key` is the catalog's array or record key (e.g.
 * "battles", "backgrounds") and `id` the entry's ID or record key. Each call
 * starts again from the repository's copy of that file; `fragment` is that
 * whole file, for changes that involve neighbouring entries.
 */
export async function changeCatalogEntry<Entry = any>(
  fixture: string,
  kind: MergedKind,
  key: string,
  id: string,
  change: (entry: Entry, fragment: any) => void,
): Promise<void> {
  const root = path.resolve(".");
  const merged = loadContentSources(root).catalogs[kind];
  const items = merged?.provenance.items[key];
  const index = items ? (merged!.value as Record<string, { id?: string }[]>)[key].findIndex((entry) => entry.id === id) : -1;
  const file = items ? items[index] : merged?.provenance.keys[key]?.[id];
  if (!file) throw new Error(`No ${kind} entry ${key}/${id}`);
  const fragment = JSON.parse(await readFile(file, "utf8"));
  const entry = Array.isArray(fragment[key]) ? fragment[key].find((item: { id?: string }) => item.id === id) : fragment[key][id];
  change(entry, fragment);
  await writeFile(path.join(fixture, path.relative(root, file)), JSON.stringify(fragment));
}
