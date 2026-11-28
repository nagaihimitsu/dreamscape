import { useEffect, useRef, useState } from "react";
import { OPPOSITE_PLACES, stageAfter, stageFocus, type Stage, type StageFocus, type StageLine, type StageScene } from "./scene-stage";
import { motionReduced } from "./useStageGlide";
import { MOTION } from "./motion";

/** How long someone who goes off stage takes to step back and fade (character-portrait.css, --motion-slow). */
export const STAGE_LEAVE_MS = MOTION.slow;

const sameFigure = (a: Stage["opposite"], b: Stage["opposite"]) => a?.figure === b?.figure && !!a?.standIn === !!b?.standIn;
const sameStage = (a: Stage, b: Stage) => a.heroine === b.heroine && OPPOSITE_PLACES.every((place) => sameFigure(a[place], b[place])) &&
  a.together?.places === b.together?.places && a.together?.recent.join(" ") === b.together?.recent.join(" ");

/** Who stands on a stage, by figure (`heroine` for her). */
export const stageFigures = (stage: Stage): string[] =>
  [stage.heroine ? "heroine" : undefined, ...OPPOSITE_PLACES.map((place) => stage[place]?.figure)].filter((figure): figure is string => !!figure);

/** Who stands where on a stage (useStageGlide's `layout`): a change of it is a change of places. */
export const stageLayout = (stage: Stage): string =>
  [stage.heroine ? "heroine" : "-", ...OPPOSITE_PLACES.map((place) => stage[place]?.figure ?? "-"), stage.together?.places ?? ""].join(" ");

/**
 * Who stands on the scene's stage at the line on screen, and who comes forward (scene-stage.ts): the stage after the
 * lines read so far. It starts again when the screen is remounted (each scene) or `sceneKey` changes (a screen that
 * reads its scene again, such as a guide read once more); reading the same line again (a re-render, the choices after
 * a line) changes nothing.
 *
 * Someone going off stage (a `# leave:`, or giving their place to another) does not vanish at once (2026-11-27 user
 * decision): the stage as it was stays drawn for STAGE_LEAVE_MS, those going (`leaving`) stepping back as they fade, and
 * then the stage as it is now comes (the others gliding to their new places: useStageGlide). Under reduced motion the
 * stage changes at once, as before.
 */
export function useSceneStage(line: StageLine, scene: StageScene, sceneKey = "", reduceMotion = false): { stage: Stage; focus: StageFocus; leaving: string[] } {
  const [kept, setKept] = useState<{ key: string; stage: Stage }>();
  const stage = stageAfter(kept?.key === sceneKey ? kept.stage : undefined, line, scene);
  if (kept?.key !== sceneKey || !sameStage(kept.stage, stage)) setKept({ key: sceneKey, stage });
  const shown = useLeavingStage(stage, sceneKey, reduceMotion);
  return { stage: shown.stage, focus: stageFocus(shown.stage, line, scene), leaving: shown.leaving };
}

/** The stage to draw: the one before while those who go off it step back (STAGE_LEAVE_MS), then the stage as it is. */
function useLeavingStage(stage: Stage, sceneKey: string, reduceMotion: boolean): { stage: Stage; leaving: string[] } {
  const [shown, setShown] = useState({ key: sceneKey, stage });
  const latest = useRef(stage);
  useEffect(() => { latest.current = stage; });
  const now = stageFigures(stage);
  const leaving = shown.key !== sceneKey || motionReduced(reduceMotion) ? [] : stageFigures(shown.stage).filter((figure) => !now.includes(figure));
  if (!leaving.length && (shown.key !== sceneKey || !sameStage(shown.stage, stage))) setShown({ key: sceneKey, stage });
  const holding = leaving.length > 0;
  useEffect(() => {
    if (!holding) return;
    const timer = window.setTimeout(() => setShown({ key: shown.key, stage: latest.current }), STAGE_LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [holding, shown]);
  return holding ? { stage: shown.stage, leaving } : { stage, leaving: [] };
}
