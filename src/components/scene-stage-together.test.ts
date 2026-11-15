import { describe, expect, it } from "vitest";
import {
  oppositeFigures, oppositeIsEnemy, stageAfter, stageCast, stageFocus, stageLine, standsOnStage, type Stage, type StageLine, type StageScene,
} from "./scene-stage";

// Two people opposite the heroine (`# together:`, 2026-11-15 user decision). The scenes without the tag keep the stage
// of scene-stage.test.ts, unchanged.

const people = [
  { id: "smp_lili", cityId: "mihon", nameJa: "リリ" },
  { id: "smp_toma", cityId: "mihon", nameJa: "トーマ", characterId: "smp_toma_art" },
  { id: "smp_ana", cityId: "mihon", nameJa: "アナ", characterId: "smp_ana_art" },
];
const said = (speaker: StageLine["speaker"], personFigure?: string): StageLine => ({ speaker, ...(personFigure ? { personFigure } : {}) });
const narration = said("narrator");
const together = (line: StageLine, ...who: NonNullable<StageLine["together"]>): StageLine => ({ ...line, together: who });
const leaving = (line: StageLine, ...leave: NonNullable<StageLine["leave"]>): StageLine => ({ ...line, leave });

/** The stage and focus at each line of a scene read from its start. */
function read(scene: StageScene, lines: StageLine[]) {
  let stage: Stage | undefined;
  return lines.map((line) => {
    stage = stageAfter(stage, line, scene);
    return { stage, focus: stageFocus(stage, line, scene) };
  });
}

describe("two people opposite her (# together:)", () => {
  const harbans = { figure: "harbans" };
  const gurmeet = { figure: "gurmeet" };

  it("puts the two it names opposite her at its line, in the order written, and keeps both while each speaks (Guru ka Taal)", () => {
    const date: StageScene = { heroineFromStart: true };
    const [father, intro, son, fatherAgain, her, quiet] = read(date, [said("person", "harbans"), together(narration, harbans, gurmeet),
      said("person", "gurmeet"), said("person", "harbans"), said("heroine"), narration]);
    expect(father.stage).toEqual({ heroine: true, opposite: harbans });
    // 「ハルバンスの隣には、…男が座っていた」: the son stands beside his father from the narration that shows him.
    expect(intro).toEqual({ stage: { heroine: true, opposite: harbans, beside: gurmeet, together: { recent: "gurmeet" } }, focus: {} });
    expect(son).toEqual({ stage: { heroine: true, opposite: harbans, beside: gurmeet, together: { recent: "gurmeet" } },
      focus: { heroine: "listening", opposite: "listening", beside: "speaking" } });
    expect(fatherAgain).toEqual({ stage: { heroine: true, opposite: harbans, beside: gurmeet, together: { recent: "harbans" } },
      focus: { heroine: "listening", opposite: "speaking", beside: "listening" } });
    expect(her.focus).toEqual({ heroine: "speaking", opposite: "listening", beside: "listening" });
    expect(quiet.focus).toEqual({});
  });

  it("names the scene's enemy by `enemy`: a battle's opponent stays while a person beside them speaks, and asks the quiz in place (Jama Masjid)", () => {
    const battle: StageScene = { heroineFromStart: true, enemyFigure: "hamid", enemyFromStart: true };
    const [opening, zoheb, hamid, quiz, after] = read(battle, [narration, together(said("person", "zoheb"), "enemy", { figure: "zoheb" }),
      said("enemy"), { enemyCue: true }, said("person", "zoheb")]);
    expect(opening.stage).toEqual({ heroine: true, opposite: { figure: "hamid" } });
    expect(zoheb).toEqual({ stage: { heroine: true, opposite: { figure: "hamid" }, beside: { figure: "zoheb" }, together: { recent: "zoheb" } },
      focus: { heroine: "listening", opposite: "listening", beside: "speaking" } });
    expect(hamid.focus).toEqual({ heroine: "listening", opposite: "speaking", beside: "listening" });
    expect(oppositeIsEnemy(hamid.stage, battle)).toBe(true);
    // The quiz (no line): the opponent asks; both stay.
    expect(quiz).toEqual({ stage: { heroine: true, opposite: { figure: "hamid" }, beside: { figure: "zoheb" }, together: { recent: "hamid" } }, focus: {} });
    expect(after.stage.beside).toEqual({ figure: "zoheb" });
  });

  it("lets a third person who comes on take the place of the one of the two who spoke less recently (Hawa Mahal)", () => {
    const battle: StageScene = { heroineFromStart: true, enemyFigure: "kamla", enemyFromStart: true };
    const [, pooja, kamla, grandmother, poojaAgain] = read(battle, [together(narration, "enemy", { figure: "pooja" }), said("person", "pooja"),
      said("enemy"), said("person", "grandmother"), said("person", "pooja")]);
    expect(pooja.stage).toMatchObject({ opposite: { figure: "kamla" }, beside: { figure: "pooja" } });
    expect(kamla.stage.together).toEqual({ recent: "kamla" });
    // Pooja spoke before Kamla: the grandmother takes Pooja's place, Kamla stays where she is.
    expect(grandmother).toEqual({ stage: { heroine: true, opposite: { figure: "kamla" }, beside: { figure: "grandmother" }, together: { recent: "grandmother" } },
      focus: { heroine: "listening", opposite: "listening", beside: "speaking" } });
    expect(poojaAgain.stage).toEqual({ heroine: true, opposite: { figure: "pooja" }, beside: { figure: "grandmother" }, together: { recent: "pooja" } });
  });

  it("lets a third person speak from off stage at a line with their own # leave:, the two staying (the voice from the window)", () => {
    const battle: StageScene = { heroineFromStart: true, enemyFigure: "kamla", enemyFromStart: true };
    const [, voice, after] = read(battle, [together(said("person", "pooja"), "enemy", { figure: "pooja" }),
      leaving(said("person", "grandmother"), { figure: "grandmother" }), narration]);
    expect(voice).toEqual({ stage: { heroine: true, opposite: { figure: "kamla" }, beside: { figure: "pooja" }, together: { recent: "pooja" } }, focus: {} });
    expect(after.stage).toEqual(voice.stage);
  });

  it("takes either off by # leave:, the other staying; brings them back beside them at their next line; ends when both are off", () => {
    const date: StageScene = { heroineFromStart: true };
    const [, sureshOff, meena, sureshBack, bothOff, next, other] = read(date, [together(narration, { figure: "suresh" }, { figure: "meena" }),
      leaving(narration, { figure: "suresh" }), said("person", "meena"), said("person", "suresh"),
      leaving(narration, { figure: "suresh" }, { figure: "meena" }), said("person", "suresh"), said("person", "dubey")]);
    expect(sureshOff).toEqual({ stage: { heroine: true, opposite: { figure: "meena" }, together: { recent: "meena" } }, focus: {} });
    expect(meena.focus).toEqual({ heroine: "listening", opposite: "speaking" });
    expect(sureshBack.stage).toEqual({ heroine: true, opposite: { figure: "meena" }, beside: { figure: "suresh" }, together: { recent: "suresh" } });
    expect(bothOff).toEqual({ stage: { heroine: true }, focus: {} });
    // The stretch is over: one at a time again.
    expect(next.stage).toEqual({ heroine: true, opposite: { figure: "suresh" } });
    expect(other.stage).toEqual({ heroine: true, opposite: { figure: "dubey" } });
  });

  it("keeps the two through lines said by no one on stage: the player, a phone's line, a person without a figure, an enemy without one", () => {
    const date: StageScene = { heroineFromStart: true };
    const stage = { heroine: true, opposite: { figure: "kunal" }, beside: { figure: "jasmeet" }, together: { recent: "jasmeet" } };
    for (const line of [said("player"), { speaker: "person" as const, personFigure: "kunal", read: true }, said("person"), said("enemy")])
      expect(read(date, [together(narration, { figure: "kunal" }, { figure: "jasmeet" }), line])[1], JSON.stringify(line)).toEqual({ stage, focus: {} });
  });

  it("lets the stranger stand for an enemy without a figure at a cue only where a place is free, for that line", () => {
    const encounter: StageScene = { enemyStandIn: "enemy" };
    const [, full] = read(encounter, [together(narration, { figure: "okami" }, { figure: "roohi" }), { speaker: "enemy", enemyCue: true }]);
    expect(full.stage).toMatchObject({ opposite: { figure: "okami" }, beside: { figure: "roohi" } });
    const [, , cue, next] = read(encounter, [together(narration, { figure: "okami" }, { figure: "roohi" }), leaving(narration, { figure: "roohi" }),
      { speaker: "enemy", enemyCue: true }, narration]);
    expect(cue.stage).toEqual({ heroine: false, opposite: { figure: "okami" }, beside: { figure: "enemy", standIn: true }, together: { recent: "okami" } });
    expect(cue.focus).toEqual({ opposite: "listening", beside: "speaking" });
    expect(next.stage).toEqual({ heroine: false, opposite: { figure: "okami" }, together: { recent: "okami" } });
  });

  it("brings the heroine on and off as without the tag (a talk: her first line)", () => {
    const [two, her, gone] = read({}, [together(narration, { figure: "okami" }, { figure: "roohi" }), said("heroine"), leaving(narration, "heroine")]);
    expect(two.stage.heroine).toBe(false);
    expect(her.stage).toMatchObject({ heroine: true, beside: { figure: "roohi" } });
    expect(gone.stage).toMatchObject({ heroine: false, opposite: { figure: "okami" }, beside: { figure: "roohi" } });
  });

  it("tells who stands for # leave: in either place", () => {
    const scene: StageScene = { enemyFigure: "kamla" };
    const stage: Stage = { heroine: true, opposite: { figure: "pooja" }, beside: { figure: "kamla" }, together: { recent: "kamla" } };
    expect(standsOnStage(stage, "enemy", scene)).toBe(true);
    expect(standsOnStage(stage, { figure: "pooja" }, scene)).toBe(true);
    expect(standsOnStage(stage, { figure: "aman" }, scene)).toBe(false);
  });

  it("reads the tag's people as the stage knows them (none for a person without a figure)", () => {
    expect(stageLine({ speaker: "narrator", together: ["smp_toma", "enemy"] }, people))
      .toEqual({ speaker: "narrator", together: [{ figure: "smp_toma_art" }, "enemy"] });
    expect(stageLine({ speaker: "narrator", together: ["smp_lili", "smp_ana"] }, people)).toEqual({ speaker: "narrator", together: [{ figure: "smp_ana_art" }] });
  });

  it("gives the same stage for the same line read again (a re-render, the choices after the line)", () => {
    const scenes: StageScene[] = [{}, { heroineFromStart: true }, { enemyStandIn: "enemy" }, { heroineFromStart: true, enemyFigure: "nidhi", enemyFromStart: true }];
    const lines: StageLine[] = [narration, said("heroine"), said("enemy"), { speaker: "enemy", enemyCue: true }, said("person", "toma"),
      said("person", "ana"), said("person", "guard"), { enemyCue: true }, together(narration, { figure: "toma" }, { figure: "ana" }),
      together(said("person", "guard"), "enemy", { figure: "toma" }), together(said("person", "ana"), { figure: "toma" }, { figure: "ana" }),
      leaving(narration, { figure: "toma" }), leaving(said("person", "guard"), { figure: "guard" }), leaving(narration, "enemy", "heroine")];
    for (const scene of scenes) {
      const starts = [together(narration, { figure: "toma" }, { figure: "ana" }), together(said("enemy"), "enemy", { figure: "ana" })]
        .map((line) => stageAfter(undefined, line, scene));
      for (const before of [...starts, ...starts.flatMap((start) => lines.map((line) => stageAfter(start, line, scene)))]) {
        for (const line of lines) {
          const once = stageAfter(before, line, scene);
          expect(stageAfter(once, line, scene), JSON.stringify({ scene, before, line })).toEqual(once);
        }
      }
    }
  });
});

describe("how a screen lays out who stands (stageCast) and the figures opposite her (oppositeFigures)", () => {
  it("keeps the two-person layout without # together:, and lays three in a row, or the two side by side without her", () => {
    expect(stageCast({ heroine: true })).toEqual({ two: false });
    expect(stageCast({ heroine: false, opposite: { figure: "toma" } })).toEqual({ two: false });
    expect(stageCast({ heroine: true, opposite: { figure: "toma" } })).toEqual({ two: true });
    expect(stageCast({ heroine: true, opposite: { figure: "toma" }, together: { recent: "toma" } })).toEqual({ two: true });
    expect(stageCast({ heroine: true, opposite: { figure: "toma" }, beside: { figure: "ana" }, together: { recent: "ana" } }))
      .toEqual({ two: false, together: "three" });
    expect(stageCast({ heroine: false, opposite: { figure: "toma" }, beside: { figure: "ana" }, together: { recent: "ana" } }))
      .toEqual({ two: false, together: "pair" });
  });

  it("lists each figure opposite her with its place and focus", () => {
    expect(oppositeFigures({ heroine: true }, {})).toEqual([]);
    expect(oppositeFigures({ heroine: true, opposite: { figure: "toma" } }, { opposite: "speaking" }))
      .toEqual([{ figure: { figure: "toma" }, place: "opposite", focus: "speaking" }]);
    expect(oppositeFigures({ heroine: true, opposite: { figure: "toma" }, beside: { figure: "ana" } }, { beside: "listening" }))
      .toEqual([{ figure: { figure: "toma" }, place: "opposite" }, { figure: { figure: "ana" }, place: "beside", focus: "listening" }]);
  });
});
