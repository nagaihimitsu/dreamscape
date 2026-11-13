import type { StoryStateCatalog } from "../content/scene-schemas";
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
};

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

/** Who is on stage: the heroine, and the one person opposite her (one at a time). */
export type Stage = { heroine: boolean; opposite?: { figure: string; standIn?: true } };

/** The focus of the figures on stage at a line; a figure without one stands as it is. */
export type StageFocus = { heroine?: PortraitFocus; opposite?: PortraitFocus };

/**
 * A frame as the stage reads it. `cues`: what the screen shows of the heroine and of the enemy on the line without
 * their saying it (their reactions; StageLine).
 */
export function stageLine(
  frame: Pick<StoryFrame, "speaker" | "speakerPersonId" | "phone" | "letter"> | null | undefined,
  people: StoryStateCatalog["people"],
  cues: { heroine?: boolean; enemy?: boolean } = {},
): StageLine {
  const personFigure = frame ? speakingPerson(people, frame) : undefined;
  return {
    ...(frame ? { speaker: frame.speaker } : {}),
    ...(frame?.phone || frame?.letter ? { read: true } : {}),
    ...(personFigure ? { personFigure } : {}),
    ...(cues.heroine ? { heroineCue: true } : {}),
    ...(cues.enemy ? { enemyCue: true } : {}),
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
 */
export function stageAfter(previous: Stage | undefined, line: StageLine, scene: StageScene): Stage {
  const said = !line.read;
  const heroine = !!scene.heroineFromStart || !!previous?.heroine || (said && line.speaker === "heroine") || !!line.heroineCue;
  let opposite = previous?.opposite?.standIn ? undefined : previous?.opposite;
  if (!opposite && scene.enemyFromStart && scene.enemyFigure) opposite = { figure: scene.enemyFigure };
  if (said && line.speaker === "person" && line.personFigure) opposite = { figure: line.personFigure };
  else if ((said && line.speaker === "enemy") || line.enemyCue)
    opposite = scene.enemyFigure ? { figure: scene.enemyFigure }
      : scene.enemyStandIn && line.enemyCue ? { figure: scene.enemyStandIn, standIn: true } : undefined;
  return opposite ? { heroine, opposite } : { heroine };
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
  const opposite = stage.opposite;
  const oppositeSpeaks = !!opposite && (line.speaker === "enemy" ? opposite.figure === scene.enemyFigure || !!opposite.standIn
    : line.speaker === "person" && !!line.personFigure && line.personFigure === opposite.figure);
  if (!heroineSpeaks && !oppositeSpeaks) return {};
  return {
    ...(stage.heroine ? { heroine: heroineSpeaks ? "speaking" as const : "listening" as const } : {}),
    ...(opposite ? { opposite: oppositeSpeaks ? "speaking" as const : "listening" as const } : {}),
  };
}

/** Whether the opposite on stage is the scene's enemy (or its stand-in): their expression and reaction mark are the enemy's. */
export const oppositeIsEnemy = (stage: Stage, scene: StageScene): boolean =>
  !!stage.opposite && (!!stage.opposite.standIn || stage.opposite.figure === scene.enemyFigure);
