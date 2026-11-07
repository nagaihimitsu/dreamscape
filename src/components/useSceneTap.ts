import { useRef, type MouseEvent } from "react";
import type { DialogueTextHandle } from "./DialogueText";
import { dialogueObstructed } from "./dialogueObstructed";
import { shouldAdvanceOnTap, type SceneTapState } from "./scene-tap";

/**
 * One click handler on a story scene's root: a tap that is not on a control
 * does what a tap on the line does (DialogueText decides between completing
 * the line and going on). Mouse and touch taps arrive as clicks; a drag that
 * scrolls the window does not. Keyboards keep using the line and the buttons.
 */
export function useSceneTap(state: Omit<SceneTapState, "obstructed">) {
  const line = useRef<DialogueTextHandle>(null);
  function onClick(event: MouseEvent<HTMLElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (shouldAdvanceOnTap(target, event.currentTarget, { ...state, obstructed: dialogueObstructed() }))
      line.current?.activate();
  }
  return { line, onClick };
}
