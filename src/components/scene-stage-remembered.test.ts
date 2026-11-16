import { describe, expect, it } from "vitest";
import { sceneStageOf, stageAfter, stageFocus, stageLine, type Stage, type StageScene } from "./scene-stage";
import type { StoryFrame } from "../story/frame-reader";

// A remembered line (`# remembered`, 2026-11-16 user decision) on the stage every screen and content:build's walk read
// (scene-stage.ts): words said before, heard in someone's head. Its speaker is not there: their figure does not come on,
// and the figures on stage stay as they are. The stage without the tag is scene-stage.test.ts's, unchanged.

const people = [
  { id: "smp_kamla", cityId: "mihon", nameJa: "カムラ", characterId: "smp_kamla_art" },
  { id: "smp_ana", cityId: "mihon", nameJa: "アナ", characterId: "smp_ana_art" },
];
type Line = Pick<StoryFrame, "speaker" | "speakerPersonId" | "remembered" | "leave">;
const kamla: Line = { speaker: "person", speakerPersonId: "smp_kamla" };
const remembered = (line: Line): Line => ({ ...line, remembered: true });

/** The stage and focus at each line of a scene read from its start, each frame read as the screens read it (stageLine). */
function read(scene: StageScene, lines: Line[], cues: { heroine?: boolean; enemy?: boolean }[] = []) {
  let stage: Stage | undefined;
  return lines.map((frame, index) => {
    const line = stageLine(frame, people, cues[index]);
    stage = stageAfter(stage, line, scene);
    return { stage, focus: stageFocus(stage, line, scene) };
  });
}

describe("a remembered line on the stage", () => {
  it("is read as said off stage: no figure for its speaker (a person with a figure included)", () => {
    expect(stageLine(remembered(kamla), people)).toEqual({ speaker: "person", read: true });
    expect(stageLine(kamla, people)).toEqual({ speaker: "person", personFigure: "smp_kamla_art" });
    expect(stageLine(remembered({ speaker: "heroine" }), people, { heroine: true })).toEqual({ speaker: "heroine", read: true, heroineCue: true });
  });

  it("does not bring its person on, and keeps who stands there and how (the Agra finale: Kamla's words while the opponent stands)", () => {
    const battle = sceneStageOf("battle", "anwar");
    const [opening, words, opponent] = read(battle, [{ speaker: "narrator" }, remembered(kamla), { speaker: "enemy" }]);
    expect(opening.stage).toEqual({ heroine: true, opposite: { figure: "anwar" } });
    expect(words).toEqual({ stage: { heroine: true, opposite: { figure: "anwar" } }, focus: {} });
    expect(opponent.focus).toEqual({ heroine: "listening", opposite: "speaking" });
    // Without the tag, she would come on in the opponent's place.
    expect(read(battle, [{ speaker: "narrator" }, kamla])[1].stage).toEqual({ heroine: true, opposite: { figure: "smp_kamla_art" } });
  });

  it("keeps a person standing there as they are, and an empty place empty", () => {
    const date = sceneStageOf("date");
    const [, ana, words] = read(date, [{ speaker: "narrator" }, { speaker: "person", speakerPersonId: "smp_ana" }, remembered(kamla)]);
    expect(ana.stage).toEqual({ heroine: true, opposite: { figure: "smp_ana_art" } });
    expect(words).toEqual({ stage: { heroine: true, opposite: { figure: "smp_ana_art" } }, focus: {} });
    expect(read(date, [remembered(kamla)])[0]).toEqual({ stage: { heroine: true }, focus: {} });
  });

  it("does not bring the heroine on in a talk at her own remembered words, nor the scene's enemy at theirs", () => {
    const talk = sceneStageOf("talk", "roohi");
    expect(read(talk, [remembered({ speaker: "heroine" })])[0]).toEqual({ stage: { heroine: false }, focus: {} });
    expect(read(talk, [remembered({ speaker: "enemy" })])[0]).toEqual({ stage: { heroine: false }, focus: {} });
    // Their cues on the line still show them (a reaction of hers), as on any line.
    expect(read(talk, [remembered(kamla)], [{ heroine: true }])[0]).toEqual({ stage: { heroine: true }, focus: {} });
  });
});
