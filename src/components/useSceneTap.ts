import { useCallback, useEffect, useRef, useState } from "react";
import type { DialogueTextHandle } from "./DialogueText";
import { tapsObstructed } from "./dialogueObstructed";
import { DOUBLE_TAP_WINDOW_MS, isSecondTap } from "./double-tap";
import { DIALOGUE_LINE_ATTRIBUTE, pressesControl, shouldAdvanceOnTap, type SceneTapState } from "./scene-tap";

const elementOf = (target: EventTarget | null) => target instanceof Element ? target : null;

/**
 * The click handling of a story scene: a tap that is not on a control does what
 * a tap on the line does (DialogueText decides between completing the line and
 * going on), on the scene and on the page's own margin beside it. While the
 * window is hidden, its restore control covers the whole scene (the guide, the
 * only scene with a heading or a margin beside it, cannot hide its window).
 * Mouse and touch taps arrive as clicks; a drag that scrolls the window does
 * not. Keyboards keep using the line and the buttons. `active`: the scene shows
 * its dialogue (a battle between its talks and a guide's observation do not read
 * on; an encounter's quiz has no line, and its answers are choices).
 *
 * A press on any control of the page (a reply, a choice, a tool, the restore
 * control; the header's buttons, a modal's 「閉じる」) is seen in the capture phase
 * at the document, before the control's own handler (the restore control stops
 * the click there), and so is a tap whose pointer went down while something lay
 * over the scene (tapsObstructed: a log or the held-item detail it closes, the
 * travel transition). For DOUBLE_TAP_WINDOW_MS after either the scene takes no
 * reading tap: taps on the picture are ignored, and the line takes no pointer
 * events while the root carries `data-tap-settling` (styles.css), so the second
 * tap of a double tap never skips the line the press brought. The tap over
 * something does not reach the line either (the line reads on in its own click
 * handler, before the scene could ignore it).
 */
export function useSceneTap({ active, ...state }: Omit<SceneTapState, "obstructed" | "settling"> & { active: boolean }) {
  const line = useRef<DialogueTextHandle>(null);
  const root = useRef<HTMLElement | null>(null);
  const attach = useCallback((element: HTMLElement | null) => {
    root.current = element;
  }, []);
  // When a control was last pressed.
  const pressedAt = useRef<number | null>(null);
  // The same press, shown as data-tap-settling until its double-tap window ends (tests wait for it).
  const [settlingFrom, setSettlingFrom] = useState<number | null>(null);
  useEffect(() => {
    if (settlingFrom === null) return;
    const timer = window.setTimeout(() => setSettlingFrom(null), DOUBLE_TAP_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [settlingFrom]);
  function read(target: Element | null) {
    const scene = root.current;
    if (!active || !scene) return;
    const settling = pressedAt.current !== null && isSecondTap(performance.now() - pressedAt.current);
    if (shouldAdvanceOnTap(target, scene, { ...state, settling, obstructed: tapsObstructed() }))
      line.current?.activate();
  }
  const readFromPage = useRef(read);
  readFromPage.current = read;
  useEffect(() => {
    // The pointer of this tap went down while something lay over the scene.
    let overlaid = false;
    const onPointerDown = () => {
      overlaid = tapsObstructed();
    };
    const onPress = (event: Event) => {
      const target = elementOf(event.target);
      if (overlaid || pressesControl(target, root.current)) {
        pressedAt.current = performance.now();
        setSettlingFrom(pressedAt.current);
        const tappedLine = target?.closest(`[${DIALOGUE_LINE_ATTRIBUTE}]`);
        if (overlaid && tappedLine && root.current?.contains(tappedLine)) event.stopPropagation();
      }
      overlaid = false;
    };
    // Clicks inside the scene reach its root's onClick; this one hears the rest of the page (its margin).
    const onPageClick = (event: Event) => {
      const target = elementOf(event.target);
      if (target && !root.current?.contains(target)) readFromPage.current(target);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onPress, true);
    document.addEventListener("click", onPageClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onPress, true);
      document.removeEventListener("click", onPageClick);
    };
  }, []);
  return {
    line,
    /** Spread on the scene's root element. */
    props: {
      ref: attach,
      onClick: (event: { target: EventTarget | null }) => read(elementOf(event.target)),
      "data-tap-settling": active && settlingFrom !== null || undefined,
    },
  };
}
