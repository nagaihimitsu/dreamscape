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
import { linkFiles, oneSceneBody, placeKnot, prepareContentFixture, quizSourceFile, registerOwnArtwork, replaceFixtureFile, storySourceFile } from "./test-fixtures";
import { storyFileOf } from "./story-address";

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
  // A journey's own images (India's characters and backdrops) are linked, so its whole list stays.
  for (const layer of ["milano", "golden_triangle"])
    expect([...listed.get(layer)!.keys()], layer).toEqual([...repository.get(layer)!.keys()]);
  const tourismAssets = (tourismData.assets as { path: string }[]);
  expect(() => checkImageRights(sources, tourismAssets)).not.toThrow();
  // An added image is refused until the test registers it, in its layer's list (created when the layer has none:
  // Uzbekistan, whose served images are all tourism photos).
  expect(listed.has("uzbekistan")).toBe(false);
  const title = path.join(fixture, "content/journeys/uzbekistan/public/assets/title/uzbekistan.webp");
  await mkdir(path.dirname(title), { recursive: true });
  await writeFile(title, "image");
  sources = loadContentSources(fixture);
  expect(() => checkImageRights(sources, tourismAssets)).toThrow("出典のない画像：content/journeys/uzbekistan/public/assets/title/uzbekistan.webp。");
  await registerOwnArtwork(fixture, "content/journeys/uzbekistan", ["assets/title/uzbekistan.webp"]);
  sources = loadContentSources(fixture);
  expect(() => checkImageRights(sources, tourismAssets)).not.toThrow();
  expect([...ownArtworkByLayer(sources).byLayer.get("uzbekistan")!.keys()]).toEqual(["assets/title/uzbekistan.webp"]);
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
  // Battles name the story (a place file's knot: the file before the dot) and quiz they use; the files live in the battle's journey folder.
  const battle = battleData.battles.find((entry) => entry.id === "milano_last_supper_01")!;
  const story = storySourceFile(storyFileOf(battle.storyId));
  const quiz = quizSourceFile(battle.quizId);
  expect(story).toBe(path.join("content/journeys/milano/stories", `${storyFileOf(battle.storyId)}.ink`));
  expect(JSON.parse(readFileSync(quiz, "utf8")).id).toBe(battle.quizId);
  expect(path.dirname(quiz)).toBe(path.join("content/journeys/milano/quizzes"));
  expect(() => storySourceFile("milano/missing")).toThrow("No story milano/missing");
  expect(() => quizSourceFile("missing_quiz")).toThrow("No quiz missing_quiz");
});

it("takes one knot out of a place file's source, and writes it as a one-scene file's body", () => {
  const source = "INCLUDE modules.ink\n-> DONE\n\n// a\n=== one ===\n# scene: guide\n# speaker: narrator\n一。\n-> END\n\n" +
    "=== two ===\n# scene: battle\n二。\n-> END\n\n=== two_claim ===\n主張。\n->->\n";
  const one = placeKnot(source, "one");
  expect(one.text).toBe("=== one ===\n# scene: guide\n# speaker: narrator\n一。\n-> END\n");
  expect(one.without).toBe("INCLUDE modules.ink\n-> DONE\n\n// a\n=== two ===\n# scene: battle\n二。\n-> END\n\n=== two_claim ===\n主張。\n->->\n");
  expect(oneSceneBody(one.text)).toBe("# speaker: narrator\n一。\n-> END\n");
  // A knot ends at its blank line (its helper knots after it stay); the last knot runs to the end of the file.
  expect(placeKnot(source, "two").text).toBe("=== two ===\n# scene: battle\n二。\n-> END\n");
  expect(placeKnot(source, "two_claim")).toEqual({ text: "=== two_claim ===\n主張。\n->->\n", without: source.slice(0, source.indexOf("=== two_claim")) });
  // A blank line inside a knot (between a date's choices) does not end it: the next comment or knot line does.
  const date = "=== three ===\n# scene: date\n三。\n\n* [「はい」 # option: yes]\n    -> END\n\n// four\n=== four ===\n四。\n-> END\n";
  expect(placeKnot(date, "three")).toEqual({ text: "=== three ===\n# scene: date\n三。\n\n* [「はい」 # option: yes]\n    -> END\n",
    without: "// four\n=== four ===\n四。\n-> END\n" });
  expect(() => placeKnot(source, "three")).toThrow("No knot three");
});
