import { useRef } from "react";
import { albumSwipeStep } from "./album-pages";

/**
 * A sideways swipe on an element (albumSwipeStep): `onStep` with +1 (to the left: the next) or -1, and the click the
 * release may still fire swallowed. A mouse never swipes. (旅の記録's photo opened larger, and the SNS's cards: their photo
 * band only.)
 */
export function useSwipe(onStep: (step: -1 | 1) => void) {
  const start = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    onPointerDown: (event: React.PointerEvent) => {
      swiped.current = false;
      start.current = event.isPrimary && event.pointerType !== "mouse" ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY } : null;
    },
    onPointerUp: (event: React.PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from || from.pointerId !== event.pointerId) return;
      const step = albumSwipeStep(event.clientX - from.x, event.clientY - from.y);
      if (!step) return;
      swiped.current = true;
      onStep(step);
    },
    onPointerCancel: () => { start.current = null; },
    onClickCapture: (event: React.MouseEvent) => {
      const afterSwipe = swiped.current;
      swiped.current = false;
      // A key's click (detail 0) is never the swipe's.
      if (!afterSwipe || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
