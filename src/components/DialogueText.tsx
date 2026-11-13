import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { LineDelivery, SceneShakeSize } from "../content/tags";
import { vibrate } from "../audio/vibration";
import { SCENE_SHAKES, sceneShakeFrames } from "./scene-atmosphere";
import { dialogueObstructed } from "./dialogueObstructed";
import { DIALOGUE_LINE_ATTRIBUTE } from "./scene-tap";
import { useLineVoice, type VoiceLink } from "./useVoice";
import { useLineSounds } from "../audio/sound-effects";
import type { SystemSoundId } from "../content/sounds";

/** What a tap on the line does, for a tap elsewhere on the scene (useSceneTap). */
export interface DialogueTextHandle {
  activate(): void;
}

/** Marks a scene's dialogue window: a line's `# shake: window` shakes it (else the line itself). */
export const DIALOGUE_WINDOW_ATTRIBUTE = "data-dialogue-window";

/**
 * The one shake of a line's `# shake: window`: sideways only, short, on `translate` (it adds to
 * any transform the window has and never moves the layout). None under reduced motion.
 */
function shakeWindow(line: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || line.closest(".reduce-motion")) return;
  const target = line.closest<HTMLElement>(`[${DIALOGUE_WINDOW_ATTRIBUTE}]`) ?? line;
  target.animate?.(
    [{ translate: "0 0" }, { translate: "-6px 0" }, { translate: "5px 0" }, { translate: "-3px 0" }, { translate: "2px 0" }, { translate: "0 0" }],
    { duration: 320, easing: "ease-out" },
  );
}

/**
 * The layers of a story scene that a line's `# shake` moves (2026-11-13): its picture, its weather and its people,
 * never its window, its heading or the header. The picture grows a little meanwhile, so its edges never show.
 */
const SCENE_ROOT = ".vn-scene, .battle-screen";
const SHAKEN_PICTURE = ":scope > .vn-background, :scope > .battle-backdrop, :scope > .weather-layer";
const SHAKEN_PEOPLE = ":scope > .vn-character-layer, :scope > .battle-stage";

/** The one shake of a line's `# shake` (`size`): the scene's picture and people, briefly. None under reduced motion. */
function shakeScene(line: HTMLElement | null, size: SceneShakeSize) {
  const root = line?.closest<HTMLElement>(SCENE_ROOT);
  if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.closest(".reduce-motion")) return;
  const options = { duration: SCENE_SHAKES[size].ms, easing: "ease-out" };
  for (const layer of root.querySelectorAll<HTMLElement>(SHAKEN_PICTURE)) layer.animate?.(sceneShakeFrames(size, true), options);
  for (const layer of root.querySelectorAll<HTMLElement>(SHAKEN_PEOPLE)) layer.animate?.(sceneShakeFrames(size, false), options);
}

const NO_CUES: readonly SystemSoundId[] = [];

export function DialogueText({
  text,
  speed,
  onReady,
  onAdvance,
  delivery,
  voiceId,
  seId,
  cues = NO_CUES,
  voice,
  ref,
}: {
  text: string;
  speed: number;
  onReady: (ready: boolean) => void;
  /** Clicking text reveals it first; a subsequent click advances. */
  onAdvance?: () => void;
  /** The line's `# pause:`, `# shake:` and `# size:` (the frame's delivery). */
  delivery?: LineDelivery;
  /** The line's `# voice:` (the frame's voiceId): its recording plays as its text starts (useVoice.ts). */
  voiceId?: string;
  /** The line's `# se:` (the frame's seId): its sound plays as its text starts (src/audio/sound-effects.ts). */
  seId?: string;
  /** The sounds of the line's scene tags (line-staging.ts lineCues), played as its text starts too. */
  cues?: readonly SystemSoundId[];
  /** useAutoAdvance's `voice`: no voice and no sound during 高速送り, and auto mode waits for the voice playing (not for a sound). */
  voice?: VoiceLink;
  ref?: Ref<DialogueTextHandle>;
}) {
  const timerRef = useRef<number | undefined>(undefined);
  const pauseRef = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [count, setCount] = useState(0);
  // `paused`: the line's pause is over (or was cut short); `shaken`: its shake has played.
  const progressRef = useRef({ text, count: 0, paused: false, shaken: false });
  const chars = Array.from(text);
  const pauseMs = delivery?.pauseMs ?? 0;
  const shake = !!delivery?.shake;
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (progressRef.current.text !== text) progressRef.current = { text, count: 0, paused: false, shaken: false };
    const progress = progressRef.current;
    const length = Array.from(text).length;
    const showAll = () => {
      progress.count = length;
      setCount(length);
      onReady(true);
    };
    // 一括表示 and 高速送り show the line at once, without its pause.
    if (!speed) {
      showAll();
      return;
    }
    let timer: number | undefined;
    const write = () => {
      if (reduced) {
        showAll();
        return;
      }
      let revealed = progress.count;
      setCount(revealed);
      if (revealed >= length) { onReady(true); return; }
      onReady(false);
      timer = window.setInterval(() => {
        // A modal or hidden scene must not keep revealing text behind the
        // player's back. Keep the counter and resume from the same character.
        if (
          dialogueObstructed() ||
          textRef.current?.closest("[inert]")
        ) return;
        revealed += 1;
        progress.count = revealed;
        setCount(revealed);
        if (revealed >= length) {
          window.clearInterval(timer);
        }
      }, speed);
      timerRef.current = timer;
    };
    // The line's pause (# pause:) comes before its first character, also where the
    // text then shows at once (reduced motion); a tap ends it (activate).
    let pause: number | undefined;
    if (pauseMs && !progress.paused && progress.count === 0 && length > 0) {
      setCount(0);
      onReady(false);
      pause = window.setTimeout(() => {
        progress.paused = true;
        write();
      }, pauseMs);
      pauseRef.current = pause;
    } else write();
    return () => {
      window.clearTimeout(pause);
      window.clearInterval(timer);
    };
  }, [text, speed, onReady, pauseMs]);
  const ready = count >= chars.length;
  // The line's shake (# shake: window) plays once, as its text starts to show.
  useEffect(() => {
    const progress = progressRef.current;
    if (!shake || progress.shaken || count === 0 || !textRef.current) return;
    progress.shaken = true;
    shakeWindow(textRef.current);
  }, [shake, count]);
  // The line's voice (# voice:) starts with its text too: after its pause, or at once when the text shows at once.
  useLineVoice(voiceId, count > 0, voice?.muted ?? false, voice?.onState);
  // Its sounds (# se: and its scene tags' cues) start with its text as well, once; auto-advance does not wait for them.
  // Its scene shake (# shake) is one of its cues: once, with a short vibration (its own setting; also under reduced
  // motion, which has no shake), never for a line a load brought back nor during 高速送り.
  const sceneShake = delivery?.sceneShake;
  useLineSounds(text, seId, cues, count > 0, voice?.muted ?? false, sceneShake ? () => {
    shakeScene(textRef.current, sceneShake);
    vibrate("shake");
  } : undefined);
  function activate() {
    // A compact settings menu is not a native modal, so its open state must
    // also block taps on the text behind it.
    if (dialogueObstructed() || textRef.current?.closest("[inert]")) return;
    if (!ready) {
      window.clearTimeout(pauseRef.current);
      window.clearInterval(timerRef.current);
      setCount(chars.length);
      progressRef.current.paused = true;
      progressRef.current.count = chars.length;
      onReady(true);
    } else {
      onAdvance?.();
    }
  }
  useImperativeHandle(ref, () => ({ activate }));
  useEffect(() => {
    if (ready) onReady(true);
  }, [ready, onReady]);
  return (
    <>
      <p
        ref={textRef}
        className="dialogue-text"
        data-testid="dialogue-text"
        {...{ [DIALOGUE_LINE_ATTRIBUTE]: "" }}
        data-ready={ready}
        role={onAdvance ? "button" : undefined}
        tabIndex={onAdvance ? 0 : undefined}
        onClick={onAdvance ? activate : undefined}
        onKeyDown={
          onAdvance
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activate();
                }
              }
            : undefined
        }
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" className={delivery?.large ? "dialogue-large" : undefined}>
          {chars.slice(0, count).join("")}
          <span className="unrevealed">{chars.slice(count).join("")}</span>
        </span>
        {onAdvance && (
          <span
            className="dialogue-next-mark"
            aria-hidden="true"
            style={{ visibility: ready ? "inherit" : "hidden" }}
          >
            ▼
          </span>
        )}
      </p>
    </>
  );
}
