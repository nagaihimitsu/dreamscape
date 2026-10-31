import { afterEach, expect, it } from "vitest";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareContentFixture } from "./test-fixtures";

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
  await expect(access(path.join(fixture, "public/assets/characters"))).rejects.toThrow();
  await expect(access(path.join(fixture, "public/assets/presentation/heroine_shy_placeholder.svg"))).resolves.toBeUndefined();
  expect(await readFile(original, "utf8")).toBe(source);
});
