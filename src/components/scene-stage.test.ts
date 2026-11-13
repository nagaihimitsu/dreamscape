import { describe, expect, it } from "vitest";
import { oppositeIsEnemy, stageAfter, stageFocus, stageLine, type Stage, type StageLine, type StageScene } from "./scene-stage";

const people = [
  { id: "smp_lili", cityId: "mihon", nameJa: "リリ" },
  { id: "smp_toma", cityId: "mihon", nameJa: "トーマ", characterId: "smp_toma_art" },
  { id: "smp_toma_alias", cityId: "mihon", nameJa: "青年", characterId: "smp_toma_art" },
  { id: "smp_ana", cityId: "mihon", nameJa: "アナ", characterId: "smp_ana_art" },
];
const said = (speaker: StageLine["speaker"], personFigure?: string): StageLine => ({ speaker, ...(personFigure ? { personFigure } : {}) });
const narration = said("narrator");

/** The stage and focus at each line of a scene read from its start. */
function read(scene: StageScene, lines: StageLine[]) {
  let stage: Stage | undefined;
  return lines.map((line) => {
    stage = stageAfter(stage, line, scene);
    return { stage, focus: stageFocus(stage, line, scene) };
  });
}

describe("the stage of a talk or an encounter (her from her first line)", () => {
  const talk: StageScene = {};

  it("brings the heroine on at a plain line of hers, with no emotion, and keeps her there to the scene's end", () => {
    // Delhi's station scam: the young man and the suit man have figures; she says 「けっこうです」 with no emotion tag.
    const [first, man, her, quiet, suit, again] = read(talk, [narration, said("person", "young_man"), said("heroine"), narration,
      said("person", "suit_man"), said("heroine")]);
    expect(first).toEqual({ stage: { heroine: false }, focus: {} });
    expect(man).toEqual({ stage: { heroine: false, opposite: { figure: "young_man" } }, focus: { opposite: "speaking" } });
    expect(her).toEqual({ stage: { heroine: true, opposite: { figure: "young_man" } }, focus: { heroine: "speaking", opposite: "listening" } });
    // The narration leaves both as they are.
    expect(quiet).toEqual({ stage: { heroine: true, opposite: { figure: "young_man" } }, focus: {} });
    expect(suit).toEqual({ stage: { heroine: true, opposite: { figure: "suit_man" } }, focus: { heroine: "listening", opposite: "speaking" } });
    expect(again.focus).toEqual({ heroine: "speaking", opposite: "listening" });
  });

  it("dims no one for a line said off stage: the player, a person without a figure, an enemy without one", () => {
    const [, , player, voice, enemy] = read(talk, [said("heroine"), said("person", "suit_man"), said("player"), said("person"), said("enemy")]);
    expect(player).toEqual({ stage: { heroine: true, opposite: { figure: "suit_man" } }, focus: {} });
    // A person without a figure (the phone's voice) leaves the stage as it is.
    expect(voice).toEqual({ stage: { heroine: true, opposite: { figure: "suit_man" } }, focus: {} });
    // An enemy without a figure speaks off stage; the one who stood opposite goes (as before), and no one is dimmed.
    expect(enemy).toEqual({ stage: { heroine: true }, focus: {} });
  });

  it("puts the scene's person opposite her at their lines, and a person who speaks in their own name in between", () => {
    // Delhi's hotel morning: # person: Roohi (`# speaker: enemy`); the okami speaks in her own name.
    const morning: StageScene = { enemyFigure: "roohi" };
    const [opening, okami, roohi, okamiAgain, quiet, her, roohiLast] = read(morning, [narration, said("person", "okami"), said("enemy"),
      said("person", "okami"), narration, said("heroine"), said("enemy")]);
    expect(opening.stage).toEqual({ heroine: false });
    expect(okami).toEqual({ stage: { heroine: false, opposite: { figure: "okami" } }, focus: { opposite: "speaking" } });
    expect(roohi).toEqual({ stage: { heroine: false, opposite: { figure: "roohi" } }, focus: { opposite: "speaking" } });
    expect(okamiAgain.stage.opposite).toEqual({ figure: "okami" });
    expect(quiet).toEqual({ stage: { heroine: false, opposite: { figure: "okami" } }, focus: {} });
    expect(her).toEqual({ stage: { heroine: true, opposite: { figure: "okami" } }, focus: { heroine: "speaking", opposite: "listening" } });
    expect(roohiLast).toEqual({ stage: { heroine: true, opposite: { figure: "roohi" } }, focus: { heroine: "listening", opposite: "speaking" } });
    expect(oppositeIsEnemy(roohiLast.stage, morning)).toBe(true);
    expect(oppositeIsEnemy(okamiAgain.stage, morning)).toBe(false);
  });

  it("brings the scene's person on at their reaction, and her at hers or at an emotion on the narration", () => {
    const scene: StageScene = { enemyFigure: "roohi" };
    expect(stageAfter(undefined, { speaker: "narrator", enemyCue: true }, scene)).toEqual({ heroine: false, opposite: { figure: "roohi" } });
    expect(stageAfter(undefined, { speaker: "player", heroineCue: true }, scene)).toEqual({ heroine: true });
  });

  it("keeps her off stage at her lines read off a phone, and brings her on when she comes", () => {
    // Delhi's sick night: two messages from her, then she is in the corridor.
    const [message, between, second, there, after] = read(talk, [{ speaker: "heroine", read: true }, narration,
      { speaker: "heroine", read: true }, said("heroine"), narration]);
    expect([message, between, second].map((step) => step.stage.heroine)).toEqual([false, false, false]);
    expect(message.focus).toEqual({});
    expect(there).toEqual({ stage: { heroine: true }, focus: { heroine: "speaking" } });
    expect(after).toEqual({ stage: { heroine: true }, focus: {} });
  });

  it("brings no one in for a person's message or sheet, and dims no one at it", () => {
    const [her, message] = read(talk, [said("heroine"), { speaker: "person", personFigure: "aman", read: true }]);
    expect(her.stage).toEqual({ heroine: true });
    expect(message).toEqual({ stage: { heroine: true }, focus: {} });
  });

  it("shows an encounter's stranger without a figure only at their lines that show a feeling", () => {
    const encounter: StageScene = { enemyStandIn: "enemy" };
    const [plain, feeling, next, her] = read(encounter, [said("enemy"), { speaker: "enemy", enemyCue: true }, narration, said("heroine")]);
    expect(plain).toEqual({ stage: { heroine: false }, focus: {} });
    expect(feeling).toEqual({ stage: { heroine: false, opposite: { figure: "enemy", standIn: true } }, focus: { opposite: "speaking" } });
    expect(oppositeIsEnemy(feeling.stage, encounter)).toBe(true);
    expect(next.stage).toEqual({ heroine: false });
    expect(her.stage).toEqual({ heroine: true });
  });
});

describe("the stage of a scene with her from the start (a date, a guide, an arrival, an epilogue)", () => {
  const date: StageScene = { heroineFromStart: true };

  it("has her there from the first line, a person with a figure opposite from their line", () => {
    const [opening, toma, quiet, player, her] = read(date, [narration, said("person", "toma"), narration, said("player"), said("heroine")]);
    expect(opening).toEqual({ stage: { heroine: true }, focus: {} });
    expect(toma).toEqual({ stage: { heroine: true, opposite: { figure: "toma" } }, focus: { heroine: "listening", opposite: "speaking" } });
    expect(quiet.focus).toEqual({});
    // The player has no figure: nobody is dimmed for their line.
    expect(player.focus).toEqual({});
    expect(her.focus).toEqual({ heroine: "speaking", opposite: "listening" });
  });

  it("keeps her on stage at a line of hers read off a phone, dimming no one", () => {
    expect(read(date, [{ speaker: "heroine", read: true }])[0]).toEqual({ stage: { heroine: true }, focus: {} });
  });

  it("brings an arrival's or epilogue's person on at their first line and keeps them", () => {
    const epilogue: StageScene = { heroineFromStart: true, enemyFigure: "aman" };
    const [opening, aman, quiet] = read(epilogue, [narration, said("enemy"), narration]);
    expect(opening.stage).toEqual({ heroine: true });
    expect(aman).toEqual({ stage: { heroine: true, opposite: { figure: "aman" } }, focus: { heroine: "listening", opposite: "speaking" } });
    expect(quiet.stage.opposite).toEqual({ figure: "aman" });
  });
});

describe("the stage of a battle's talk (the opponent from the start)", () => {
  const battle: StageScene = { heroineFromStart: true, enemyFigure: "nidhi", enemyFromStart: true };

  it("has the opponent there from the start; a person takes their place until the opponent speaks, reacts or asks", () => {
    const [opening, guard, quiet, back, guardAgain, quiz] = read(battle, [narration, said("person", "guard"), narration, said("enemy"),
      said("person", "guard"), { enemyCue: true }]);
    expect(opening).toEqual({ stage: { heroine: true, opposite: { figure: "nidhi" } }, focus: {} });
    expect(guard.stage.opposite).toEqual({ figure: "guard" });
    expect(quiet.stage.opposite).toEqual({ figure: "guard" });
    expect(back).toEqual({ stage: { heroine: true, opposite: { figure: "nidhi" } }, focus: { heroine: "listening", opposite: "speaking" } });
    expect(guardAgain.stage.opposite).toEqual({ figure: "guard" });
    // The quiz (no line): the opponent asks, standing as they are.
    expect(quiz).toEqual({ stage: { heroine: true, opposite: { figure: "nidhi" } }, focus: {} });
  });

  it("takes a person whose figure is the opponent's own as the opponent speaking under another name", () => {
    const [alias] = read(battle, [said("person", "nidhi")]);
    expect(alias).toEqual({ stage: { heroine: true, opposite: { figure: "nidhi" } }, focus: { heroine: "listening", opposite: "speaking" } });
    expect(oppositeIsEnemy(alias.stage, battle)).toBe(true);
  });
});

describe("a line as the stage reads it", () => {
  it("takes the speaker, the figure of a person who says it, a phone or a sheet, and the screen's cues", () => {
    expect(stageLine({ speaker: "heroine" }, people)).toEqual({ speaker: "heroine" });
    expect(stageLine({ speaker: "person", speakerPersonId: "smp_toma" }, people)).toEqual({ speaker: "person", personFigure: "smp_toma_art" });
    expect(stageLine({ speaker: "person", speakerPersonId: "smp_toma_alias" }, people)).toEqual({ speaker: "person", personFigure: "smp_toma_art" });
    expect(stageLine({ speaker: "person", speakerPersonId: "smp_lili" }, people)).toEqual({ speaker: "person" });
    expect(stageLine({ speaker: "person", speakerPersonId: "smp_toma", phone: { side: "received" } }, people)).toEqual({ speaker: "person", read: true });
    expect(stageLine({ speaker: "heroine", letter: { kind: "note" } }, people, { heroine: true })).toEqual({ speaker: "heroine", read: true, heroineCue: true });
    expect(stageLine({ speaker: "enemy" }, people, { enemy: true })).toEqual({ speaker: "enemy", enemyCue: true });
    expect(stageLine(null, people, { enemy: true })).toEqual({ enemyCue: true });
  });

  it("gives the same stage for the same line read again (a re-render, the choices after the line)", () => {
    const scenes: StageScene[] = [{}, { heroineFromStart: true }, { enemyFigure: "roohi" }, { enemyStandIn: "enemy" },
      { heroineFromStart: true, enemyFigure: "nidhi", enemyFromStart: true }];
    const lines: StageLine[] = [narration, said("heroine"), said("enemy"), { speaker: "enemy", enemyCue: true }, said("person", "toma"),
      said("person"), said("player"), { speaker: "heroine", read: true }, { speaker: "narrator", heroineCue: true }, { enemyCue: true }];
    for (const scene of scenes) {
      for (const before of [undefined, ...lines.map((line) => stageAfter(undefined, line, scene))]) {
        for (const line of lines) {
          const once = stageAfter(before, line, scene);
          expect(stageAfter(once, line, scene), JSON.stringify({ scene, before, line })).toEqual(once);
        }
      }
    }
  });
});
