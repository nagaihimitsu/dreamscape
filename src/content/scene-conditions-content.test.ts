import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture, storySourceFile } from "./test-fixtures";

// A scene's cond("…") through content:build (unified event design stage 2a): declared, read like the
// other conditions where the scene is played, walked true and false, and listed for the game.
let fixture: string;
const epilogue = storySourceFile("epilogues/milano");
const line = "放送が終わったダルセナで、彼女は左の掌を開いた。さっきの網目はもう消えている。";

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-cond-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

/** Write the Milan epilogue with `text` as a cond("…") on its first line, with or without the declaration. */
async function epilogueWith(text: string, declared = true) {
  const file = path.join(fixture, epilogue);
  const source = await readFile(path.resolve(epilogue), "utf8");
  expect(source).toContain(line);
  await writeFile(file, source
    .replace("VAR ending_reached = false\n", `VAR ending_reached = false\n${declared ? "EXTERNAL cond(text)\n" : ""}`)
    .replace(line, `放送が終わったダルセナで、彼女は左の掌を開いた。{ cond("${text}"): さっきの網目はもう消えている。| 網目はまだ少し残っている。}`) +
    "\n=== function cond(text) ===\n~ return false\n");
}

describe("cond in a scene's Ink", () => {
  it("builds, walks both values and lists the text with its condition for the game", async () => {
    await epilogueWith("rel affection >= 3");
    const result = await buildContent(fixture);
    expect(result.sceneConditions).toEqual({
      conditions: { "rel affection >= 3": { relationship: { axis: "affection", atLeast: 3 } } },
      stories: { "epilogues/milano": ["rel affection >= 3"] },
    });
    const generated = JSON.parse(await readFile(path.join(fixture, "src/content/generated/scene-conditions.json"), "utf8"));
    expect(generated).toEqual(result.sceneConditions);
  }, 120000);

  it("stops without the declaration, with how to add it (decision 40)", async () => {
    await epilogueWith("couple", false);
    await expect(buildContent(fixture, false)).rejects.toThrow(/cond\("…"\) needs its declaration in this file: add the line\n {2}EXTERNAL cond\(text\)/u);
  }, 120000);

  it("stops a condition naming what does not exist (an undeclared flag too)", async () => {
    await epilogueWith("battle no_such_battle");
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown battle in a condition of the scene epilogues/milano (cond(\"battle no_such_battle\")): no_such_battle");
    await epilogueWith("flag milano_x");
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown flag (progression/story.json) in a condition of the scene epilogues/milano (cond(\"flag milano_x\")): milano_x");
  }, 120000);

  it("stops cond in an English-note topic explanation, which is not a scene", async () => {
    const file = path.join(fixture, storySourceFile("learning/milano_english"));
    const source = await readFile(file, "utf8");
    await writeFile(file, `EXTERNAL cond(text)\n${source}\n{ cond("couple"): x }\n=== function cond(text) ===\n~ return false\n`);
    await expect(buildContent(fixture, false)).rejects.toThrow('cond("…") is not available in an English-note topic explanation (it is not a scene)');
  }, 120000);
});
