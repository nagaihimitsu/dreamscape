import { afterEach, expect, it } from "vitest";
import { access, lstat, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolvePublicFile } from "../../scripts/public-assets";
import tourismData from "./generated/content/tourism/catalog.json";
import { prepareContentFixture, replaceFixtureFile } from "./test-fixtures";

let fixture: string | undefined;
afterEach(async () => {
  if (fixture) await rm(fixture, { recursive: true, force: true });
});

it("creates an isolated undelivered-artwork fixture without changing the source catalog", async () => {
  const original = path.resolve("content/presentation/characters.json");
  const source = await readFile(original, "utf8");
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-fixture-check-"));
  await prepareContentFixture(fixture);
  const catalog = JSON.parse(await readFile(path.join(fixture, "content/presentation/characters.json"), "utf8"));
  const expected = JSON.parse(source);
  for (const character of expected.characters)
    for (const costume of character.costumes ?? [])
      for (const pose of costume.poses) pose.expressions = {};
  expect(catalog).toEqual(expected);
  await expect(access(path.join(fixture, "public/assets/characters"))).rejects.toThrow(/ENOENT/);
  await expect(access(path.join(fixture, "public/assets/presentation/heroine_shy_placeholder.svg"))).resolves.toBeUndefined();
  expect(await readFile(original, "utf8")).toBe(source);
});

it("links the journeys' images into real folders, so a test can add or replace files without touching the repository", async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-fixture-check-"));
  await prepareContentFixture(fixture);
  const image = tourismData.assets.find((asset) => asset.id === "darsena_finale_photo")!.path;
  const repositoryFile = resolvePublicFile(path.resolve("."), image);
  const fixtureFile = resolvePublicFile(fixture, image);
  const original = await readFile(repositoryFile);
  expect((await lstat(fixtureFile)).isSymbolicLink()).toBe(true);
  expect(await readlink(fixtureFile)).toBe(repositoryFile);
  expect((await lstat(path.dirname(fixtureFile))).isDirectory()).toBe(true);
  // A new file stays in the fixture's own folder.
  const added = path.join(path.dirname(fixtureFile), "fixture-only.webp");
  await writeFile(added, "added");
  await expect(access(path.join(path.dirname(repositoryFile), "fixture-only.webp"))).rejects.toThrow(/ENOENT/);
  // A linked file is replaced, not written through.
  await replaceFixtureFile(fixtureFile, "not an image");
  expect((await lstat(fixtureFile)).isSymbolicLink()).toBe(false);
  expect(await readFile(fixtureFile, "utf8")).toBe("not an image");
  expect((await readFile(repositoryFile)).equals(original)).toBe(true);
});
