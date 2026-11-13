import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes } from "./scene-table";
import { walkScene, type SceneWalkInput } from "./scene-walk";

// The walk's check of a line's `# leave:` (2026-11-13): naming someone who is not on the scene's stage at that line, on
// some path, is a warning (the stage as src/components/scene-stage.ts keeps it).

const people = [
  { id: "smp_x_toma", cityId: "x", nameJa: "トーマ", characterId: "smp_x_toma_art" },
  { id: "smp_x_lili", cityId: "x", nameJa: "リリ" },
];
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral", "smile"], personIds: people.map((person) => person.id) };
const talk = (body: string) => `INCLUDE modules.ink\n-> DONE\n\n=== smp_x_talk ===\n# scene: talk\n# at: visit x\n# priority: +1\n${body}-> END\n`;

/** The warnings of the walk of a talk, its stage read as `stage` says (a talk's by default). */
function warnings(body: string, stage: Partial<NonNullable<SceneWalkInput["stage"]>> = {}): string[] {
  const file = readPlaceFile("places/smp_x_tower", talk(body));
  const compiled = compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK });
  const scene = placeScenes({ file, compiled, apCap: 12, mains: [], landmarkCity: () => "x" })[0].entry;
  const found: string[] = [];
  walkScene({ compiled, start: scene.story.knot, label: scene.id, context, variables: {}, conds: scene.conds, options: scene.options,
    itemIds: [], memoryIds: [], onWarning: (message) => found.push(message), stage: { kind: "talk", people, ...stage } });
  return found;
}
const toma = "# speaker: smp_x_toma\nまたね。\n";
const her = "# speaker: heroine\nうん。\n";
const gone = (who: string) => `# speaker: narrator\n# leave: ${who}\n帰っていった。\n`;

describe("the walk's check of # leave:", () => {
  it("is quiet for someone on the stage there: a person after their line, her after hers, the scene's person after theirs", () => {
    expect(warnings(toma + gone("smp_x_toma"))).toEqual([]);
    expect(warnings(her + gone("heroine"))).toEqual([]);
    // A person may leave on a line they say themselves.
    expect(warnings(`# speaker: smp_x_toma\n# leave: smp_x_toma\nじゃあね。\n`)).toEqual([]);
    expect(warnings(`# speaker: enemy\nどうも。\n${gone("enemy")}`, { enemyFigure: "smp_x_toma_art" })).toEqual([]);
    expect(warnings(`# speaker: enemy\nどうも。\n${gone("smp_x_toma")}`, { enemyFigure: "smp_x_toma_art" })).toEqual([]);
    // She stands from the start in a guide (a date, an arrival, an epilogue, a battle's talk).
    expect(warnings(gone("heroine"), { kind: "guide" })).toEqual([]);
  });

  it("warns, naming the line, about someone not on the stage there", () => {
    expect(warnings(gone("smp_x_toma"))).toEqual(["# leave: smp_x_toma: the person is not on the stage there, so the tag takes no one off " +
      "(smp_x_talk, the line \"帰っていった。\")"]);
    expect(warnings(gone("heroine"))).toEqual([expect.stringContaining("# leave: heroine: the heroine is not on the stage there")]);
    expect(warnings(gone("enemy"), { enemyFigure: "smp_x_toma_art" })).toEqual([expect.stringContaining("# leave: enemy: the scene's enemy is not")]);
    // Gone already; a message read off a phone does not bring them on.
    expect(warnings(toma + gone("smp_x_toma") + gone("smp_x_toma"))).toHaveLength(1);
    expect(warnings(`# speaker: smp_x_toma\n# phone: received\nまたね。\n${gone("smp_x_toma")}`)).toHaveLength(1);
  });

  it("warns about a person without a figure, who never stands on the stage", () => {
    expect(warnings(`# speaker: smp_x_lili\nまたね。\n${gone("smp_x_lili")}`))
      .toEqual([expect.stringContaining("# leave: smp_x_lili: the person has no figure")]);
  });

  it("warns when one path reaches the line without them, and keeps the stage along each path", () => {
    const branch = `* [話す # option: talk]\n    ${toma.replace("\n", "\n    ")}* [黙る # option: quiet]\n    # speaker: narrator\n    沈黙。\n-\n`;
    expect(warnings(branch + gone("smp_x_toma"))).toHaveLength(1);
    expect(warnings(toma + branch + gone("smp_x_toma"))).toEqual([]);
  });

  it("brings her on at a cue in a talk: her reaction, or an emotion on the narration", () => {
    expect(warnings(`# speaker: narrator\n# emotion: smile\n風が吹く。\n${gone("heroine")}`)).toEqual([]);
    expect(warnings(`# speaker: narrator\n# reaction: heroine,smile\n風が吹く。\n${gone("heroine")}`)).toEqual([]);
  });
});
