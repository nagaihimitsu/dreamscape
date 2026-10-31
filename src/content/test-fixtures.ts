import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { characterCatalogSchema } from "./character-assets";

/** Build an isolated, artwork-undelivered fixture for tests of other content.
 * Production content and its artwork are still validated by content:build;
 * image-specific tests can register their own images in this fixture. */
export async function prepareContentFixture(fixture: string): Promise<void> {
  const root = path.resolve(".");
  const characterAssets = path.join(root, "public/assets/characters");
  await cp(path.join(root, "content"), path.join(fixture, "content"), { recursive: true });
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
