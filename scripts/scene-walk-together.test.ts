import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes } from "./scene-table";
import { walkScene, type SceneWalkInput } from "./scene-walk";
import { checkSpeakerPeople } from "./speaker-people";

// content:build's checks of a line's `# together:` (2026-11-15; three 2026-11-20): its form and people statically
// (speaker-people.ts, every line with its knot and line number), and in the walk whether each of the two or three can
// stand opposite her in that scene (scene-walk.ts checkTogether); a `# leave:` naming any of them standing is quiet.

const people = [
  { id: "smp_x_toma", cityId: "x", nameJa: "トーマ", characterId: "smp_x_toma_art" },
  { id: "smp_x_toma_alias", cityId: "x", nameJa: "青年", characterId: "smp_x_toma_art" },
  { id: "smp_x_ana", cityId: "x", nameJa: "アナ", characterId: "smp_x_ana_art" },
  { id: "smp_x_lili", cityId: "x", nameJa: "リリ" },
];
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral", "smile"], personIds: people.map((person) => person.id) };
const talk = (body: string) => `INCLUDE modules.ink\n-> DONE\n\n=== smp_x_talk ===\n# scene: talk\n# at: visit x\n# priority: +1\n${body}-> END\n`;

/** The warnings of the walk of a talk, its stage read as `stage` says (a talk's by default); throws as content:build stops. */
function walk(body: string, stage: Partial<NonNullable<SceneWalkInput["stage"]>> = {}): string[] {
  const file = readPlaceFile("places/smp_x_tower", talk(body));
  const compiled = compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK });
  const scene = placeScenes({ file, compiled, mains: [], landmarkCity: () => "x" })[0].entry;
  const found: string[] = [];
  walkScene({ compiled, start: scene.story.knot, label: scene.id, context, variables: {}, conds: scene.conds, options: scene.options,
    itemIds: [], memoryIds: [], onWarning: (message) => found.push(message), stage: { kind: "talk", people, ...stage } });
  return found;
}
const two = (who: string) => `# speaker: narrator\n# together: ${who}\n二人が並んでいた。\n`;

describe("the walk's check of # together:", () => {
  it("is quiet for two people with figures, or the scene's enemy with one; # leave: of either standing is quiet too", () => {
    expect(walk(two("smp_x_toma smp_x_ana") + "# speaker: narrator\n# leave: smp_x_ana\n# leave: smp_x_toma\n帰っていった。\n")).toEqual([]);
    expect(walk(two("enemy smp_x_ana") + "# speaker: narrator\n# leave: enemy\n去った。\n", { enemyFigure: "smp_x_toma_art" })).toEqual([]);
    expect(walk(two("smp_x_toma smp_x_ana"), { kind: "date" })).toEqual([]);
    expect(walk(two("enemy smp_x_toma smp_x_ana") + "# speaker: narrator\n# leave: smp_x_ana\n去った。\n", { enemyFigure: "smp_x_enemy_art" }))
      .toEqual([]);
  });

  it("stops, in Japanese with the line, at a person without a figure", () => {
    expect(() => walk(two("smp_x_toma smp_x_lili")))
      .toThrow("# together: の smp_x_lili には絵がないので、向かいに立ちません。progression/story.json の people で characterId を付けるか、" +
        "絵のある人を書いてください（# together: smp_x_lili has no figure）。（smp_x_talk の行「二人が並んでいた。」）");
  });

  it("stops at the enemy where the scene has no figure for them: a talk without # person:, a date, a guide", () => {
    expect(() => walk(two("enemy smp_x_ana"))).toThrow("# together: の enemy は、この会話の場面では向かいに立ちません（場面の頭の # person: に絵のある人がいません）");
    for (const [kind, name] of [["date", "デート"], ["guide", "観光案内"]] as const)
      expect(() => walk(two("enemy smp_x_ana"), { kind, enemyFigure: "smp_x_toma_art" }), kind)
        .toThrow(`# together: の enemy は、この${name}の場面では向かいに立ちません（デートと観光案内の enemy には絵がありません）`);
  });

  it("stops at two names of one figure: a person's other name, or the enemy's own figure", () => {
    expect(() => walk(two("smp_x_toma smp_x_toma_alias"))).toThrow("# together: の smp_x_toma と smp_x_toma_alias は、同じ絵の人です");
    expect(() => walk(two("enemy smp_x_toma"), { enemyFigure: "smp_x_toma_art" })).toThrow("# together: の enemy と smp_x_toma は、同じ絵の人です");
    expect(() => walk(two("smp_x_ana smp_x_toma smp_x_toma_alias"))).toThrow("# together: の smp_x_toma と smp_x_toma_alias は、同じ絵の人です");
  });
});

describe("the static check of # together: (speaker-people.ts)", () => {
  const declared = new Set(people.map((person) => person.id));
  const source = (line: string) => `INCLUDE modules.ink\n-> DONE\n\n=== smp_x_talk ===\n# scene: talk\n# speaker: narrator\n広場。\n${line}\n今日は。\n-> END\n`;

  it("accepts two or three declared people or the enemy among them, on their own tag line or with other tags", () => {
    for (const line of ["# together: smp_x_toma smp_x_ana", "# speaker: narrator # together: enemy smp_x_lili", "    # together: smp_x_ana enemy",
      "# together: enemy smp_x_toma smp_x_ana"])
      expect(() => checkSpeakerPeople(source(line), declared), line).not.toThrow();
  });

  it("stops, naming the knot and the line, at one name or four, an undeclared person, the heroine, and one name twice", () => {
    expect(() => checkSpeakerPeople(source("# together: smp_x_toma"), declared))
      .toThrow("knot smp_x_talk の8行目の # together: smp_x_toma：# together: には、向かいに立つ2人か3人を書きます");
    expect(() => checkSpeakerPeople(source("# together: smp_x_toma smp_x_ana enemy smp_x_lili"), declared))
      .toThrow("# together: には、向かいに立つ2人か3人を書きます");
    for (const name of ["smp_x_nobody", "heroine", "player"])
      expect(() => checkSpeakerPeople(source(`# together: smp_x_toma ${name}`), declared), name)
        .toThrow(`8行目の # together: smp_x_toma ${name}：# together: の ${name} は、向かいに立てる人ではありません`);
    expect(() => checkSpeakerPeople(source("# together: smp_x_ana smp_x_ana"), declared)).toThrow("# together: に同じ人を2回書いています");
  });

  it("reads no commented-out tag", () => {
    expect(() => checkSpeakerPeople(source("// # together: smp_x_nobody"), declared)).not.toThrow();
  });
});
