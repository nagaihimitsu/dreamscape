import { useState } from "react";
import { stageAfter, stageFocus, type Stage, type StageFocus, type StageLine, type StageScene } from "./scene-stage";

const sameStage = (a: Stage, b: Stage) =>
  a.heroine === b.heroine && a.opposite?.figure === b.opposite?.figure && !!a.opposite?.standIn === !!b.opposite?.standIn;

/**
 * Who stands on the scene's stage at the line on screen, and who comes forward (scene-stage.ts): the stage after the
 * lines read so far. It starts again when the screen is remounted (each scene) or `sceneKey` changes (a screen that
 * reads its scene again, such as a guide read once more); reading the same line again (a re-render, the choices after
 * a line) changes nothing.
 */
export function useSceneStage(line: StageLine, scene: StageScene, sceneKey = ""): { stage: Stage; focus: StageFocus } {
  const [kept, setKept] = useState<{ key: string; stage: Stage }>();
  const stage = stageAfter(kept?.key === sceneKey ? kept.stage : undefined, line, scene);
  if (kept?.key !== sceneKey || !sameStage(kept.stage, stage)) setKept({ key: sceneKey, stage });
  return { stage, focus: stageFocus(stage, line, scene) };
}
