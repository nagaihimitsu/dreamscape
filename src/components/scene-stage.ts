import type { SceneKind, StoryStateCatalog } from "../content/scene-schemas";
import { speakingPerson } from "../domain/scene-person";
import type { Speaker, StoryFrame } from "../story/frame-reader";

/** How a figure on stage stands while a line is read (CharacterPortrait's `focus`). */
export type PortraitFocus = "speaking" | "listening";

/** A line as the stage reads it (stageLine). */
export type StageLine = {
  /** None: no line is on screen (a battle's quiz). */
  speaker?: Speaker;
  /** Read off a phone's screen or a sheet (`# phone:`, `# letter:`): nobody says it on stage. */
  read?: boolean;
  /** A person who says the line in their own name (`# speaker: <person ID>`): their figure, when they have one (speakingPerson). */
  personFigure?: string;
  /** The heroine shows herself on the line without saying it (her `# reaction:`; in a talk or an encounter also an emotion on a narrator's line). */
  heroineCue?: boolean;
  /**
   * The scene's opposite shows itself on the line: `# reaction: enemy` (in an encounter also an emotion on the enemy's own
   * line, which the stand-in needs; a battle: its quiz, where the opponent asks).
   */
  enemyCue?: boolean;
  /** Who goes off stage at the line (`# leave:`; stageExit). */
  leave?: StageExit[];
  /** The two who stand opposite her from the line (`# together:`, 2026-11-15; stagePerson), as written. */
  together?: StagePerson[];
};

/**
 * Someone who may stand opposite the heroine, as a line's tags name them: the scene's enemy (the figure of
 * `# speaker: enemy`, or the stranger standing in for them), or the person whose figure it is.
 */
export type StagePerson = "enemy" | { figure: string };

/** Who a line's `# leave:` takes off the stage (2026-11-13 user decision): the heroine or someone opposite her. */
export type StageExit = "heroine" | StagePerson;

/** What a scene's stage has apart from its lines. */
export type StageScene = {
  /** The heroine stands from the scene's start (a date, a guide, an arrival or epilogue, a battle's talk); else from her first line or cue (a talk, an encounter). */
  heroineFromStart?: boolean;
  /** The figure of `# speaker: enemy`: the scene's `# person:` (scenePerson), a battle's opponent. Without one, the enemy speaks off stage. */
  enemyFigure?: string;
  /** The enemy's figure stands from the scene's start (a battle's opponent) instead of from their first line or cue. */
  enemyFromStart?: boolean;
  /** Without an enemyFigure: who stands for the enemy at their cued lines only (an encounter's stranger: the generic figure). */
  enemyStandIn?: string;
};

/** A figure standing opposite her; the encounter's stranger (`standIn`) stands for the enemy at its cue line only. */
export type StageFigure = { figure: string; standIn?: true };

/**
 * Who is on stage: the heroine, and opposite her one person at a time; in a stretch of `# together:` (2026-11-15 user
 * decision) up to two, `opposite` the first and `beside` the second (only while two stand), and `together.recent` the
 * one of them who came on, spoke or showed themselves last (the other is the one a third person replaces).
 */
export type Stage = { heroine: boolean; opposite?: StageFigure; beside?: StageFigure; together?: { recent: string } };

/** The focus of the figures on stage at a line; a figure without one stands as it is. */
export type StageFocus = { heroine?: PortraitFocus; opposite?: PortraitFocus; beside?: PortraitFocus };

/**
 * A scene's stage by its kind (the screens' and content:build's one rule; 2026-11-13): the heroine from the start but in
 * a talk or an encounter; opposite her, `enemyFigure` for `# speaker: enemy` (the scene's `# person:` with a figure, a
 * battle's opponent from the start), in a talk or an encounter without one the generic stranger at the enemy's cued
 * lines. A date and a guide put no one there for `enemy` (their `# speaker: enemy` sends a person off).
 */
export function sceneStageOf(kind: SceneKind, enemyFigure?: string): StageScene {
  const figure = enemyFigure ? { enemyFigure } : {};
  switch (kind) {
    case "talk":
    case "encounter":
      return enemyFigure ? { enemyFigure } : { enemyStandIn: "enemy" };
    case "battle":
      return { heroineFromStart: true, ...figure, enemyFromStart: true };
    case "arrival":
    case "epilogue":
    case "tour_leg":
      return { heroineFromStart: true, ...figure };
    case "date":
    case "guide":
      return { heroineFromStart: true };
  }
}

/** Who a `# together:` names opposite her: the enemy, or a person's figure (none for a person without one, who never stands there). */
export function stagePerson(who: string, people: StoryStateCatalog["people"]): StagePerson | undefined {
  if (who === "enemy") return who;
  const figure = people.find((person) => person.id === who)?.characterId;
  return figure ? { figure } : undefined;
}

/** Who a `# leave:` names on the stage: none for a person without a figure, who never stands there. */
export function stageExit(who: string, people: StoryStateCatalog["people"]): StageExit | undefined {
  return who === "heroine" ? who : stagePerson(who, people);
}

/**
 * A frame as the stage reads it. `cues`: what the screen shows of the heroine and of the enemy on the line without
 * their saying it (their reactions; StageLine).
 */
export function stageLine(
  frame: Pick<StoryFrame, "speaker" | "speakerPersonId" | "phone" | "letter" | "leave" | "together"> | null | undefined,
  people: StoryStateCatalog["people"],
  cues: { heroine?: boolean; enemy?: boolean } = {},
): StageLine {
  const personFigure = frame ? speakingPerson(people, frame) : undefined;
  const leave = (frame?.leave ?? []).flatMap((who) => stageExit(who, people) ?? []);
  const together = (frame?.together ?? []).flatMap((who) => stagePerson(who, people) ?? []);
  return {
    ...(frame ? { speaker: frame.speaker } : {}),
    ...(frame?.phone || frame?.letter ? { read: true } : {}),
    ...(personFigure ? { personFigure } : {}),
    ...(cues.heroine ? { heroineCue: true } : {}),
    ...(cues.enemy ? { enemyCue: true } : {}),
    ...(leave.length ? { leave } : {}),
    ...(together.length ? { together } : {}),
  };
}

/**
 * Who stands on a scene's stage after a line (2026-11-13 user decision), from who stood there before it (`previous`;
 * none at the scene's start: each screen is remounted for each scene, and after a reload in the middle of a scene the
 * people come back at their next line or cue). The same line read again gives the same stage.
 * - The heroine: on stage from the first line she says (with her neutral face when the line has no emotion) or the
 *   first time she shows herself (heroineCue) to the scene's end; from its start where the scene has her from the
 *   start. A line of hers read off a phone or a sheet is not said here and brings her on no more than the narration
 *   does (the writer's way to keep her out of a scene until she comes: a call, a message, a letter).
 * - Opposite her, one person at a time: a person with a figure who says a line in their own name, from that line;
 *   the scene's enemy (its `# person:`, a battle's opponent) at their line or cue. Each stays, listening or as they
 *   are, until the other comes in. An enemy without a figure speaks off stage and leaves the place empty, or puts the
 *   stand-in there for that line only when they show a feeling (enemyCue).
 * - A line's `# leave:` takes who it names off the stage from that line (2026-11-13 user decision), even at a line they
 *   say or react on (they speak from off stage); they come on again by the rules above, not by the scene's start: the
 *   heroine at her next line or cue, a person at their next line, the enemy at their next line or cue (a battle's
 *   opponent also when they ask a question).
 * - A line's `# together:` puts two people opposite her (2026-11-15 user decision; togetherAfter) until no one stands there.
 */
export function stageAfter(previous: Stage | undefined, line: StageLine, scene: StageScene): Stage {
  if (line.together?.length || previous?.together) return togetherAfter(previous, line, scene);
  const said = !line.read;
  const heroine = (!previous && !!scene.heroineFromStart) || !!previous?.heroine || (said && line.speaker === "heroine") || !!line.heroineCue;
  let opposite = previous?.opposite?.standIn ? undefined : previous?.opposite;
  if (!previous && scene.enemyFromStart && scene.enemyFigure) opposite = { figure: scene.enemyFigure };
  if (said && line.speaker === "person" && line.personFigure) opposite = { figure: line.personFigure };
  else if ((said && line.speaker === "enemy") || line.enemyCue)
    opposite = scene.enemyFigure ? { figure: scene.enemyFigure }
      : scene.enemyStandIn && line.enemyCue ? { figure: scene.enemyStandIn, standIn: true } : undefined;
  const arrived: Stage = opposite ? { heroine, opposite } : { heroine };
  const leave = line.leave ?? [];
  if (!leave.length) return arrived;
  const herself = arrived.heroine && !leave.includes("heroine");
  const oppositeGoes = leave.some((exit) => exit !== "heroine" && standsOnStage(arrived, exit, scene));
  return arrived.opposite && !oppositeGoes ? { heroine: herself, opposite: arrived.opposite } : { heroine: herself };
}

/** Whether `who` names the figure standing opposite her: the enemy names theirs (or its stand-in), a person their own. */
const names = (who: StagePerson, figure: StageFigure, scene: StageScene): boolean =>
  who === "enemy" ? figureIsEnemy(figure, scene) : figure.figure === who.figure;

/**
 * Who stands on the stage after a line of a stretch of `# together:` (2026-11-15 user decision): two places opposite her
 * instead of one, from the line of the tag until no one stands there (each taken off by `# leave:`) or the scene ends.
 * - At the tag's line the two it names stand there, in the order written (the first nearer her), whoever stood before.
 * - Each stays, listening or as they are, while the other speaks: no one goes but by `# leave:`.
 * - Someone else who comes on (a person with a figure at their line, the enemy at their line or cue) takes a free place,
 *   or, both taken, the place of the one of the two who came on, spoke or showed themselves less recently. One whose
 *   `# leave:` is on their own line speaks from off stage and takes no one's place. The encounter's stranger stands for
 *   the enemy's cue line only, and only where a place is free.
 * - One taken off comes on again by the same rule; the other stays (alone, they stand as one person does).
 * The heroine comes and goes as without the tag.
 */
function togetherAfter(previous: Stage | undefined, line: StageLine, scene: StageScene): Stage {
  const said = !line.read;
  const heroine = (!previous && !!scene.heroineFromStart) || !!previous?.heroine || (said && line.speaker === "heroine") || !!line.heroineCue;
  let standing = [previous?.opposite, previous?.beside].filter((figure): figure is StageFigure => !!figure && !figure.standIn);
  if (!previous && scene.enemyFromStart && scene.enemyFigure) standing = [{ figure: scene.enemyFigure }];
  let recent = previous?.together?.recent;
  const named = [...new Set((line.together ?? []).flatMap((who) => (who === "enemy" ? scene.enemyFigure : who.figure) ?? []))].slice(0, 2);
  if (named.length) {
    standing = named.map((figure) => ({ figure }));
    recent = named[named.length - 1];
  }
  const comer: StageFigure | undefined = said && line.speaker === "person" && line.personFigure ? { figure: line.personFigure }
    : !((said && line.speaker === "enemy") || line.enemyCue) ? undefined
      : scene.enemyFigure ? { figure: scene.enemyFigure }
        : scene.enemyStandIn && line.enemyCue ? { figure: scene.enemyStandIn, standIn: true } : undefined;
  const leave = (line.leave ?? []).filter((exit): exit is StagePerson => exit !== "heroine");
  const goes = (figure: StageFigure) => leave.some((who) => names(who, figure, scene));
  if (comer && standing.some((figure) => figure.figure === comer.figure)) recent = comer.figure;
  else if (comer && !goes(comer) && (!comer.standIn || standing.length < 2)) {
    if (standing.length < 2) standing.push(comer);
    else standing[standing.findIndex((figure) => figure.figure !== recent)] = comer;
    if (!comer.standIn) recent = comer.figure;
  }
  standing = standing.filter((figure) => !goes(figure));
  const [opposite, beside] = standing;
  const herself = heroine && !(line.leave ?? []).includes("heroine");
  if (!opposite) return { heroine: herself };
  const last = standing.some((figure) => figure.figure === recent) ? recent! : standing[standing.length - 1].figure;
  return { heroine: herself, opposite, ...(beside ? { beside } : {}), together: { recent: last } };
}

/** Whether the one a `# leave:` names (StageExit) stands on the stage. */
export function standsOnStage(stage: Stage, exit: StageExit, scene: StageScene): boolean {
  if (exit === "heroine") return stage.heroine;
  return [stage.opposite, stage.beside].some((figure) => !!figure && names(exit, figure, scene));
}

/**
 * Who comes forward at a line (2026-11-13 user decision): a figure on stage that says the line comes slightly forward
 * and the other figure on stage listens, slightly dimmed. A line said by no one on stage — the narration, the player,
 * a person or an enemy without a figure, anything read off a phone or a sheet — leaves every figure as it is: no one is
 * dimmed because the speaker is off stage.
 */
export function stageFocus(stage: Stage, line: StageLine, scene: StageScene): StageFocus {
  if (line.read) return {};
  const heroineSpeaks = stage.heroine && line.speaker === "heroine";
  const speaks = (figure: StageFigure | undefined) => !!figure && (line.speaker === "enemy" ? figureIsEnemy(figure, scene)
    : line.speaker === "person" && !!line.personFigure && line.personFigure === figure.figure);
  const oppositeSpeaks = speaks(stage.opposite);
  const besideSpeaks = speaks(stage.beside);
  if (!heroineSpeaks && !oppositeSpeaks && !besideSpeaks) return {};
  const focus = (speaking: boolean): PortraitFocus => (speaking ? "speaking" : "listening");
  return {
    ...(stage.heroine ? { heroine: focus(heroineSpeaks) } : {}),
    ...(stage.opposite ? { opposite: focus(oppositeSpeaks) } : {}),
    ...(stage.beside ? { beside: focus(besideSpeaks) } : {}),
  };
}

/** Whether a figure standing opposite her is the scene's enemy (or its stand-in): their expression and reaction mark are the enemy's. */
export const figureIsEnemy = (figure: StageFigure | undefined, scene: StageScene): boolean =>
  !!figure && (!!figure.standIn || figure.figure === scene.enemyFigure);

/** Whether the (first) figure opposite her is the scene's enemy (figureIsEnemy). */
export const oppositeIsEnemy = (stage: Stage, scene: StageScene): boolean => figureIsEnemy(stage.opposite, scene);

/**
 * How a screen lays out who stands (encounter.css, battle.css): `two` for her and one person side by side (as without
 * `# together:`); `together` while two stand opposite her (2026-11-15): `three` with her (in a row: her, `opposite`,
 * `beside`), `pair` without her (the two side by side).
 */
export function stageCast(stage: Stage): { two: boolean; together?: "three" | "pair" } {
  if (stage.beside) return { two: false, together: stage.heroine ? "three" : "pair" };
  return { two: stage.heroine && !!stage.opposite };
}

/** The figures standing opposite her in their places (the first nearer her), each with its focus at the line. */
export function oppositeFigures(stage: Stage, focus: StageFocus): { figure: StageFigure; place: "opposite" | "beside"; focus?: PortraitFocus }[] {
  return (["opposite", "beside"] as const).flatMap((place) => {
    const figure = stage[place];
    const at = focus[place];
    return figure ? [{ figure, place, ...(at ? { focus: at } : {}) }] : [];
  });
}
