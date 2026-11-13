import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture, storySourceFile } from "./test-fixtures";
import { addCatalogWishToContent } from "../../tests/fixtures/catalog-wish";
// The repository's own build (pretest makes it): the conditions the fixture's scenes read before the epilogue changes.
import repositoryConditions from "./generated/scene-conditions.json";

// A scene's cond("…") through content:build (unified event design stage 2a): declared, read like the
// other conditions where the scene is played, walked true and false, and listed for the game.
let fixture: string;
// The Milan epilogue: a knot of the Darsena's place file, whose modules.ink declares cond.
const epilogueFile = "places/milano_darsena";
const epilogue = storySourceFile(epilogueFile);
const line = "放送が終わったダルセナで、彼女は左の掌を開いた。さっきの網目はもう消えている。";
// A one-scene file (the tests' wish in its catalog form, added to the fixture's Milan): it declares cond itself (decision 40).

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-cond-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

/** Write the Milan epilogue with `text` as a cond("…") on its first line. */
async function epilogueWith(text: string) {
  const file = path.join(fixture, epilogue);
  const source = await readFile(path.resolve(epilogue), "utf8");
  expect(source.split(line)).toHaveLength(2);
  await writeFile(file, source
    .replace(line, `放送が終わったダルセナで、彼女は左の掌を開いた。{ cond("${text}"): さっきの網目はもう消えている。| 網目はまだ少し残っている。}`));
}

describe("cond in a scene's Ink", () => {
  it("builds, walks both values and lists the text with its condition for the game", async () => {
    await epilogueWith("rel affection >= 3");
    const result = await buildContent(fixture);
    // The epilogue's text and its condition, beside the scenes of other journeys that read cond (India's place files)
    // and Milan's other scenes that read it since the Milano rewrite (the castle's, Duomo's and Galleria's knots and
    // the Darsena's confession, as the repository's build lists them): only the Darsena's file gains the epilogue's
    // condition. The fixture has no sample journey.
    expect(result.sceneConditions.conditions["rel affection >= 3"]).toEqual({ relationship: { axis: "affection", atLeast: 3 } });
    const others = (stories: Record<string, string[]>) => Object.fromEntries(Object.entries(stories)
      .filter(([storyId]) => !storyId.startsWith("places/gt_") && !storyId.startsWith("places/smp_")));
    const before = others(repositoryConditions.stories);
    expect(before[epilogueFile] ?? []).not.toContain("rel affection >= 3");
    expect(others(result.sceneConditions.stories)).toEqual({ ...before, [epilogueFile]: [...before[epilogueFile] ?? [], "rel affection >= 3"] });
    const generated = JSON.parse(await readFile(path.join(fixture, "src/content/generated/scene-conditions.json"), "utf8"));
    expect(generated).toEqual(result.sceneConditions);
  }, 120000);

  it("stops a one-scene file without the declaration, with how to add it (decision 40)", async () => {
    const file = await addCatalogWishToContent(fixture);
    await writeFile(file, `${await readFile(file, "utf8")}\n{ cond("couple"): x }\n`);
    await expect(buildContent(fixture, false)).rejects.toThrow(/cond\("…"\) needs its declaration in this file: add the line\n {2}EXTERNAL cond\(text\)/u);
  }, 120000);

  it("stops a condition naming what does not exist (an undeclared flag too)", async () => {
    await epilogueWith("battle no_such_battle");
    await expect(buildContent(fixture, false)).rejects.toThrow(`Unknown battle in a condition of the scene ${epilogueFile} (cond("battle no_such_battle")): no_such_battle`);
    await epilogueWith("flag milano_x");
    await expect(buildContent(fixture, false)).rejects.toThrow(`Unknown flag (progression/story.json) in a condition of the scene ${epilogueFile} (cond("flag milano_x")): milano_x`);
  }, 120000);

  it("stops cond in an English-note topic explanation, which is not a scene", async () => {
    const file = path.join(fixture, storySourceFile("learning/milano_english"));
    const source = await readFile(file, "utf8");
    await writeFile(file, `EXTERNAL cond(text)\n${source}\n{ cond("couple"): x }\n=== function cond(text) ===\n~ return false\n`);
    await expect(buildContent(fixture, false)).rejects.toThrow('cond("…") is not available in an English-note topic explanation (it is not a scene)');
  }, 120000);
});
