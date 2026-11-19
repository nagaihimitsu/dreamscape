import { useEffect, useRef } from "react";
import type { MeshAvatar } from "mesh-avatar";
import { lineVoiceLevel, lineVoicePlaying } from "./useVoice";

// The moving standing picture (2026-11-19 user decision; authoring/LIVE_PORTRAIT_TRIAL.md): a pose's mesh-avatar folder
// (characters.json `avatar`) drawn with WebGL over its still picture. It breathes, blinks and lets its hair sway on its
// own; the line's expression picks its whole-face drawing (built/sprites/face_<expression>.png, the base face for
// neutral); while its character says a line with a voice, the mouth follows that voice's loudness. Presentation only:
// under reduced motion (the system's, or 「演出を短縮する」), without WebGL, or when its files cannot load, the still
// picture stays (onFail), so nothing about the game depends on it. Its runtime is loaded only when a portrait needs it.

/** Whether a portrait at `node` may move: not under reduced motion. */
function mayMove(node: Element): boolean {
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && !node.closest(".reduce-motion");
}

/** The whole-face drawing of an expression; neutral (and none) is the base face. */
function showFace(avatar: MeshAvatar, emotion: string | undefined) {
  avatar.setFace(emotion && emotion !== "neutral" ? emotion : null);
}

export function LivePortrait({ folder, emotion, speaking, onReady, onFail }: {
  /** The pose's mesh-avatar folder below public/ (characters.json `avatar`, ending in "/"). */
  folder: string;
  emotion?: string;
  /** The line on screen is this character's: her mouth follows its voice. */
  speaking: boolean;
  /** It is drawing: the still picture under it can be hidden. */
  onReady: () => void;
  /** It will not move here: the still picture stays. */
  onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<MeshAvatar | null>(null);
  const latest = useRef({ emotion, speaking, onReady, onFail });
  latest.current = { emotion, speaking, onReady, onFail };

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    if (!mayMove(node)) {
      latest.current.onFail();
      return;
    }
    let gone = false;
    let frame = 0;
    let made: MeshAvatar | null = null;
    import("mesh-avatar")
      // The folder fills the portrait's box as its still picture does (contain, standing on the bottom edge).
      .then(({ loadMeshAvatar }) => loadMeshAvatar(node, `${import.meta.env.BASE_URL}${folder}`, { padTop: 0, padSide: 0 }))
      .then((loaded) => {
        if (gone) {
          loaded.destroy();
          return;
        }
        made = loaded;
        avatar.current = loaded;
        showFace(loaded, latest.current.emotion);
        latest.current.onReady();
        const follow = () => {
          const voiced = latest.current.speaking && lineVoicePlaying();
          loaded.setSpeaking(voiced);
          loaded.setVoiceLevel(voiced ? lineVoiceLevel() : 0);
          frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.warn(`動く立ち絵を表示できませんでした: ${folder}`, error);
        if (!gone) latest.current.onFail();
      });
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      made?.destroy();
      avatar.current = null;
    };
  }, [folder]);

  useEffect(() => {
    if (avatar.current) showFace(avatar.current, emotion);
  }, [emotion]);

  return <canvas ref={canvas} className="live-portrait" aria-hidden="true" />;
}
