import type { ReactNode } from "react";
import type { MiniGameTag } from "../tag";
import { MiniGameHost } from "./MiniGameHost";
import { useMiniGameContext } from "./MiniGameProvider";

/**
 * Who stands on the scene's stage, as a screen gives it (docs/13 1.5): the heroine's look on the line (its emotion, the
 * scene's outfit: CharacterFigure's sceneId and cityId) and the person speaking. The host draws her from it, her face
 * following her reactions while the game plays (react).
 */
export interface MiniGameStageCast {
  heroine: { emotion?: string; sceneId?: string; cityId?: string };
  person?: ReactNode;
}

/**
 * A scene's choice point, the same in all five story screens (docs/13 1.5): with the frame's `# minigame:`, the game's
 * start (and its play over the scene, in the screen's MiniGameSlot); else the screen's own choices (`children`).
 */
export function ChoicePoint({ minigame, ready, cast, children }: {
  /** The frame's `# minigame:` (the line before the choice set). */
  minigame: MiniGameTag | undefined;
  /** The line is shown: the start waits for the choices' short guard after it. */
  ready: boolean;
  /** Who is on the scene's stage (the heroine's look; the person speaking). */
  cast: MiniGameStageCast;
  children?: ReactNode;
}) {
  const context = useMiniGameContext();
  if (!minigame || !context) return <>{children}</>;
  return <MiniGameHost key={`${context.environment.revision}:${minigame.id}:${minigame.prefix ?? ""}`} tag={minigame} ready={ready} cast={cast}
    environment={context.environment} slot={context.slot} />;
}
