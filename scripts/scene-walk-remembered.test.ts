import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes } from "./scene-table";
import { walkScene } from "./scene-walk";

// content:build's walk of a scene with a remembered line (`# remembered`, 2026-11-16): the line's tags are read as the game
// reads them (parseStoryTags stops the build at a narrator's, a player's or a repeated one), and its stage is the screens'
// (scene-stage.ts): the remembered person does not come on, so a `# leave:` of theirs right after takes no one off.

const people = [{ id: "smp_x_toma", cityId: "x", nameJa: "トーマ", characterId: "smp_x_toma_art" }];
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"], personIds: people.map((person) => person.id) };
const talk = (body: string) => `INCLUDE modules.ink\n-> DONE\n\n=== smp_x_talk ===\n# scene: talk\n# at: visit x\n# priority: +1\n${body}-> END\n`;

/** The warnings of the walk of a talk; throws as content:build stops. */
function walk(body: string): string[] {
  const file = readPlaceFile("places/smp_x_tower", talk(body));
  const compiled = compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK });
  const scene = placeScenes({ file, compiled, mains: [], landmarkCity: () => "x" })[0].entry;
  const found: string[] = [];
  walkScene({ compiled, start: scene.story.knot, label: scene.id, context, variables: {}, conds: scene.conds, options: scene.options,
    itemIds: [], memoryIds: [], onWarning: (message) => found.push(message), stage: { kind: "talk", people } });
  return found;
}
const leaves = "# speaker: narrator\n# leave: smp_x_toma\nそれきりだった。\n";

describe("the walk of a remembered line", () => {
  it("leaves the remembered person off the stage, as the screens do", () => {
    expect(walk(`# speaker: smp_x_toma\nまた来いよ\n${leaves}`)).toEqual([]);
    expect(walk(`# speaker: smp_x_toma\n# remembered\nまた来いよ\n${leaves}`))
      .toEqual([expect.stringContaining("# leave: smp_x_toma: the person is not on the stage there, so the tag takes no one off")]);
  });

  it("stops at a narrator's, a player's or a repeated # remembered", () => {
    expect(() => walk("# speaker: narrator\n# remembered\nまた来いよ\n")).toThrow("# remembered は地の文の行には書けません");
    expect(() => walk("# speaker: player\n# remembered\nまた来るよ\n")).toThrow("# remembered は主人公の行には書けません");
    expect(() => walk("# speaker: smp_x_toma\n# remembered\n# remembered\nまた来いよ\n")).toThrow("1つの行に # remembered が2つあります");
  });
});
