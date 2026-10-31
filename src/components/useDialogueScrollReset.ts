import { useLayoutEffect, useRef } from "react";

/** A new Ink position starts at the top; opening a panel does not move it. */
export function useDialogueScrollReset<T extends HTMLElement>(storyState: string | null) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [storyState]);
  return ref;
}
