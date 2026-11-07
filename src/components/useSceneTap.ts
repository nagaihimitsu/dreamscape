import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { DialogueTextHandle } from "./DialogueText";
import { dialogueObstructed } from "./dialogueObstructed";
import { DOUBLE_TAP_WINDOW_MS, isSecondTap } from "./double-tap";
import { pressesSceneControl, shouldAdvanceOnTap, type SceneTapState } from "./scene-tap";

const targetOf = (event: MouseEvent<HTMLElement>) => event.target instanceof Element ? event.target : null;

/**
 * The click handlers of a story scene's root: a tap that is not on a control
 * does what a tap on the line does (DialogueText decides between completing
 * the line and going on). Mouse and touch taps arrive as clicks; a drag that
 * scrolls the window does not. Keyboards keep using the line and the buttons.
 *
 * A press on one of the scene's controls (a reply, a choice, a tool, the restore
 * control) is seen in the capture phase, before the control's own handler (the
 * restore control stops the click there). For DOUBLE_TAP_WINDOW_MS after it the
 * scene takes no reading tap: taps on the picture are ignored, and the line takes
 * no pointer events while the root carries `data-tap-settling` (styles.css), so
 * the second tap of a double tap never skips the line the press brought.
 */
export function useSceneTap(state: Omit<SceneTapState, "obstructed" | "settling">) {
  const line = useRef<DialogueTextHandle>(null);
  // When a control of this scene was last pressed.
  const pressedAt = useRef<number | null>(null);
  // The same press, shown as data-tap-settling until its double-tap window ends (tests wait for it).
  const [settlingFrom, setSettlingFrom] = useState<number | null>(null);
  useEffect(() => {
    if (settlingFrom === null) return;
    const timer = window.setTimeout(() => setSettlingFrom(null), DOUBLE_TAP_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [settlingFrom]);
  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (!pressesSceneControl(targetOf(event), event.currentTarget)) return;
    pressedAt.current = performance.now();
    setSettlingFrom(pressedAt.current);
  }
  function onClick(event: MouseEvent<HTMLElement>) {
    const settling = pressedAt.current !== null && isSecondTap(performance.now() - pressedAt.current);
    if (shouldAdvanceOnTap(targetOf(event), event.currentTarget, { ...state, settling, obstructed: dialogueObstructed() }))
      line.current?.activate();
  }
  return {
    line,
    /** Spread on the scene's root element. */
    props: { onClickCapture, onClick, "data-tap-settling": settlingFrom !== null || undefined },
  };
}
