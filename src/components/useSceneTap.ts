import { useCallback, useEffect, useRef, useState } from "react";
import type { DialogueTextHandle } from "./DialogueText";
import { dialogueObstructed, tapsObstructed } from "./dialogueObstructed";
import { DOUBLE_TAP_WINDOW_MS, isSecondTap } from "./double-tap";
import { DIALOGUE_LINE_ATTRIBUTE, ignoresWindowToolTap, pressesControl, shouldAdvanceOnTap, windowToolAt, type SceneTapState, type TapNode } from "./scene-tap";

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
 * the click there), and so is a tap whose pointer went down where something lay
 * over the scene (tapsObstructed: a log or the held-item detail it closes, the
 * travel transition's card). For DOUBLE_TAP_WINDOW_MS after either the scene
 * takes no reading tap: taps on the picture are ignored, and the line takes no
 * pointer events while the root carries `data-tap-settling` (styles.css), so the
 * second tap of a double tap never skips the line the press brought. The tap over
 * something does not reach the line either (the line reads on in its own click
 * handler, before the scene could ignore it). tapsObstructed is asked only where
 * a pointer goes down, and a click with no pointer behind it (`detail` 0: a screen
 * reader's activation, Enter on a button) is never taken for a tap over something;
 * the scene's own check when it reads on is dialogueObstructed, as for the keyboard.
 * Within that moment a tap on one of the window's own tools (隠す・閉じる・ログ・高速送り)
 * at the point of that press presses nothing either, unless it is the tool pressed first:
 * a reply or the log's 「閉じる」 can move the window's head under the finger.
 */
export function useSceneTap({ active, ...state }: Omit<SceneTapState, "obstructed" | "settling"> & { active: boolean }) {
  const line = useRef<DialogueTextHandle>(null);
  const root = useRef<HTMLElement | null>(null);
  const attach = useCallback((element: HTMLElement | null) => {
    root.current = element;
  }, []);
  // When a control was last pressed, and which.
  const pressedAt = useRef<number | null>(null);
  const pressed = useRef<TapNode | null>(null);
  const pressedPoint = useRef({ x: 0, y: 0 });
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
    if (shouldAdvanceOnTap(target, scene, { ...state, settling, obstructed: dialogueObstructed() }))
      line.current?.activate();
  }
  const readFromPage = useRef(read);
  readFromPage.current = read;
  useEffect(() => {
    // The pointer of this tap went down where something lay over the scene (until its click, or a pan cancels it).
    let overlaid = false;
    const onPointerDown = (event: PointerEvent) => {
      overlaid = tapsObstructed({ x: event.clientX, y: event.clientY });
    };
    const onPointerCancel = () => {
      overlaid = false;
    };
    const onPress = (event: MouseEvent) => {
      const target = elementOf(event.target);
      if (event.detail === 0) overlaid = false;
      // A tool of the window's head (隠す・閉じる・ログ・高速送り) tapped right after a press on another
      // control: the second tap of a double tap, landing on a tool the press moved under the finger (a
      // reply shrinks the window, the log's 「閉じる」 uncovers it). It presses nothing.
      const sincePress = pressedAt.current === null ? null : performance.now() - pressedAt.current;
      const distance = Math.hypot(event.clientX - pressedPoint.current.x, event.clientY - pressedPoint.current.y);
      if (event.detail > 0 && ignoresWindowToolTap(windowToolAt(target, root.current), pressed.current, sincePress, distance)) {
        event.preventDefault();
        event.stopPropagation();
        overlaid = false;
        return;
      }
      if (overlaid || pressesControl(target, root.current)) {
        pressed.current = windowToolAt(target, root.current) ?? target;
        pressedPoint.current = { x: event.clientX, y: event.clientY };
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
    document.addEventListener("pointercancel", onPointerCancel, true);
    document.addEventListener("click", onPress, true);
    document.addEventListener("click", onPageClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
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
