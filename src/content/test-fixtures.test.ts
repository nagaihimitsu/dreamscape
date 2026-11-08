import { afterEach, expect, it } from "vitest";
import { access, lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolvePublicFile } from "../../scripts/public-assets";
import { loadContentSources } from "../../scripts/content-sources";
import { checkImageRights, ownArtworkByLayer } from "../../scripts/image-rights";
import tourismData from "./generated/content/tourism/catalog.json";
import battleData from "./generated/content/battles/catalog.json";
import { linkFiles, prepareContentFixture, quizSourceFile, registerOwnArtwork, replaceFixtureFile, storySourceFile } from "./test-fixtures";

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

it("lists as own artwork only the images the fixture serves, and lets a test register the images it adds", async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-fixture-check-"));
  await prepareContentFixture(fixture);
  const repository = ownArtworkByLayer(loadContentSources(path.resolve("."))).byLayer;
  let sources = loadContentSources(fixture);
  const listed = ownArtworkByLayer(sources).byLayer;
  // The character images are not copied, so their lines are dropped; every other line stays.
  const kept = [...repository.get("core")!.keys()].filter((assetPath) => !assetPath.startsWith("assets/characters/"));
  expect(kept.length).toBeLessThan(repository.get("core")!.size);
  expect([...listed.get("core")!.keys()]).toEqual(kept);
  expect([...listed.get("milano")!.keys()]).toEqual([...repository.get("milano")!.keys()]);
  const tourismAssets = (tourismData.assets as { path: string }[]);
  expect(() => checkImageRights(sources, tourismAssets)).not.toThrow();
  // An added image is refused until the test registers it, in its layer's list (created when the layer has none).
  const title = path.join(fixture, "content/journeys/golden_triangle/public/assets/title/golden_triangle.webp");
  await mkdir(path.dirname(title), { recursive: true });
  await writeFile(title, "image");
  sources = loadContentSources(fixture);
  expect(() => checkImageRights(sources, tourismAssets)).toThrow("出典のない画像：content/journeys/golden_triangle/public/assets/title/golden_triangle.webp。");
  await registerOwnArtwork(fixture, "content/journeys/golden_triangle", ["assets/title/golden_triangle.webp"]);
  sources = loadContentSources(fixture);
  expect(() => checkImageRights(sources, tourismAssets)).not.toThrow();
  expect([...ownArtworkByLayer(sources).byLayer.get("golden_triangle")!.keys()]).toEqual(["assets/title/golden_triangle.webp"]);
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

it("copies the images where symbolic links cannot be made, and reports other errors", async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-fixture-check-"));
  const source = path.join(fixture, "source");
  await mkdir(path.join(source, "assets"), { recursive: true });
  await writeFile(path.join(source, "assets/spot.webp"), "image");
  const refuse = (code: string) => async () => {
    throw Object.assign(new Error(`link refused: ${code}`), { code });
  };
  for (const code of ["EPERM", "ENOTSUP"]) {
    const copy = path.join(fixture, code, "assets/spot.webp");
    await linkFiles(source, path.join(fixture, code), refuse(code));
    expect((await lstat(copy)).isSymbolicLink()).toBe(false);
    expect(await readFile(copy, "utf8")).toBe("image");
  }
  await expect(linkFiles(source, path.join(fixture, "other"), refuse("EIO"))).rejects.toThrow("link refused: EIO");
});

it("finds the file of a story and of a quiz by their IDs, as the build does", () => {
  // Battle IDs name the story and quiz they use; the files live in the battle's journey folder.
  const battle = battleData.battles.find((entry) => entry.id === "milano_last_supper_01")!;
  const story = storySourceFile(battle.storyId);
  const quiz = quizSourceFile(battle.quizId);
  expect(story).toBe(path.join("content/journeys/milano/stories", `${battle.storyId}.ink`));
  expect(JSON.parse(readFileSync(quiz, "utf8")).id).toBe(battle.quizId);
  expect(path.dirname(quiz)).toBe(path.join("content/journeys/milano/quizzes"));
  expect(() => storySourceFile("milano/missing")).toThrow("No story milano/missing");
  expect(() => quizSourceFile("missing_quiz")).toThrow("No quiz missing_quiz");
});
