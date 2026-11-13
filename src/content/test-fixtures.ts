import { copyFile, cp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { characterCatalogSchema } from "./character-assets";
import { ownArtworkCatalogSchema, type OwnArtworkCatalog } from "./own-artwork-schema";
import type { MergedKind } from "../../scripts/content-layout";
import { loadContentSources, publicRoots, storyFile } from "../../scripts/content-sources";
import { OWN_ARTWORK_KIND } from "../../scripts/image-rights";

/**
 * Build an isolated, artwork-undelivered fixture for tests of other content.
 * Production content and its artwork are still validated by content:build;
 * image-specific tests can register their own images in this fixture.
 *
 * The images of the journeys (`content/journeys/<journeyId>/public/`, most of
 * the repository's size) are not copied: their folders are real, but each file
 * is a symbolic link to the repository's file (a copy where links cannot be
 * made, see linkFiles). A test may add or remove files
 * there, but must never write over a linked file, since that would change the
 * repository; replace it with replaceFixtureFile. The unit test run checks
 * that no linked image changed (scripts/test-image-guard.ts).
 *
 * The sample journey (SAMPLE_JOURNEY_DIRECTORY) lives outside content/ and is
 * never copied: a test that needs it copies the folder itself, to the place
 * its check is about.
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
  // content:build refuses a listed own artwork that is not served: the fixture's
  // list leaves out the character images the fixture does not copy.
  const uncopied = `${path.relative(path.join(root, "public"), characterAssets).split(path.sep).join("/")}/`;
  const ownFile = path.join(fixture, "content", OWN_ARTWORK_KIND);
  const own = ownArtworkCatalogSchema.parse(JSON.parse(await readFile(ownFile, "utf8")));
  own.artworks = own.artworks
    .map((group) => ({ ...group, paths: group.paths.filter((assetPath) => !assetPath.startsWith(uncopied)) }))
    .filter((group) => group.paths.length > 0);
  await writeFile(ownFile, JSON.stringify(own));
}

/**
 * List `paths` (served paths such as assets/title/milano.webp) as artwork made
 * for Dreamscape in a fixture's layer, for a test that adds images: content:build
 * accepts a served image only when it is a credited tourism image or listed in
 * the own-artwork file of the layer that serves it. `layerDirectory` is the
 * layer's folder relative to the fixture (`content` for the root public/,
 * `content/journeys/<journeyId>` for that journey's public/); its file is
 * created when the layer has none.
 */
export async function registerOwnArtwork(fixture: string, layerDirectory: string, paths: readonly string[]): Promise<void> {
  const file = path.join(fixture, layerDirectory, OWN_ARTWORK_KIND);
  let catalog: OwnArtworkCatalog = { schemaVersion: 1, artworks: [] };
  try {
    catalog = ownArtworkCatalogSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(file), { recursive: true });
  }
  catalog.artworks.push({ noteJa: "テストで追加した絵", paths: [...paths] });
  await writeFile(file, JSON.stringify(catalog));
}

/**
 * Recreate the folders of `source` at `target`, with a symbolic link to each
 * file. Where a link cannot be made (EPERM: Windows without the right to
 * create links; ENOTSUP: a file system without links) the file is copied
 * instead: slower, but a copy can never change the repository's file.
 */
export async function linkFiles(source: string, target: string, link: (from: string, to: string) => Promise<void> = symlink): Promise<void> {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await linkFiles(from, to, link);
    else {
      try {
        await link(from, to);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EPERM" && code !== "ENOTSUP") throw error;
        await copyFile(from, to);
      }
    }
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

/**
 * The file (relative to the repository root) that defines story `id`, found
 * the way the build finds it. A test that edits a story in a fixture made by
 * prepareContentFixture writes `path.join(fixture, storySourceFile(id))`, so
 * it keeps working wherever the story's content layer keeps it.
 */
export function storySourceFile(id: string): string {
  const root = path.resolve(".");
  const file = storyFile(loadContentSources(root), id);
  if (!file) throw new Error(`No story ${id}`);
  return path.relative(root, file);
}

/**
 * One knot of a place file's source (stories/places/…): its text from its line `=== <knot> ===` to the
 * blank line after it (Milan's place files leave a blank line after each knot and its helper knots), and
 * the source without that text. Throws when the source has no such knot.
 */
export function placeKnot(source: string, knot: string): { text: string; without: string } {
  const start = source.indexOf(`=== ${knot} ===\n`);
  if (start < 0 || (start > 0 && source[start - 1] !== "\n")) throw new Error(`No knot ${knot}`);
  const blank = source.indexOf("\n\n", start);
  const end = blank < 0 ? source.length : blank + 1;
  return { text: source.slice(start, end), without: source.slice(0, start) + source.slice(blank < 0 ? end : end + 1) };
}

/** A place file's knot (placeKnot's text) as the body of a one-scene file: its lines without the knot line and its `# scene:` tag. */
export const oneSceneBody = (knotText: string): string =>
  knotText.split("\n").slice(1).filter((line) => !/^\s*#\s*scene\s*:/u.test(line)).join("\n");

/** The file (relative to the repository root) that defines the quiz with this `id`; see storySourceFile. */
export function quizSourceFile(id: string): string {
  const root = path.resolve(".");
  const quiz = loadContentSources(root).quizFiles.find((item) => (item.data as { id?: unknown }).id === id);
  if (!quiz) throw new Error(`No quiz ${id}`);
  return path.relative(root, quiz.file);
}
