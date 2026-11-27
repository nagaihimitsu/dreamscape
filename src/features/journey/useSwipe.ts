import { useRef } from "react";
import { albumSwipeStep, swipeOffset } from "./album-pages";
import { FLICK_WINDOW_MS, flickSpeed, type SwipeSample } from "./photo-cards";

/** The element's mark while it goes along with a finger (its CSS leaves out its transition meanwhile). */
const SWIPING_MARK = "data-swiping";
/** How far (px) the element's page goes along with the finger, for its CSS to move it by. */
const OFFSET_VAR = "--swipe-dx";

/** A finger's press on the element: where it started, its last moments (the flick's speed), whether the page goes along. */
type Press = { pointerId: number; x: number; y: number; element: HTMLElement; samples: SwipeSample[]; following: boolean };

const sampleOf = (event: React.PointerEvent): SwipeSample => ({ t: event.timeStamp, x: event.clientX, y: event.clientY });

/**
 * A sideways swipe on an element (albumSwipeStep): `onStep` with +1 (to the left: the next) or -1, on a long enough move or
 * a quick flick, and the click the release may still fire swallowed. While the finger moves sideways, the element carries
 * `data-swiping` and `--swipe-dx` (swipeOffset: how far its page goes along; only a little towards a side `canStep` has
 * nothing on), for its CSS to move the page with the finger; both go as it lets go (the CSS's transition takes the page
 * back, or the next comes in). A press that took the page along presses nothing. A mouse never swipes. (旅の記録's photo
 * opened larger, and the SNS's cards: their photo band only.)
 */
export function useSwipe(onStep: (step: -1 | 1) => void, { canStep = () => true }: { canStep?: (step: -1 | 1) => boolean } = {}) {
  const press = useRef<Press | null>(null);
  const swiped = useRef(false);
  const letGo = () => {
    const current = press.current;
    press.current = null;
    if (!current?.following) return;
    current.element.removeAttribute(SWIPING_MARK);
    current.element.style.removeProperty(OFFSET_VAR);
  };
  return {
    onPointerDown: (event: React.PointerEvent) => {
      // A second finger (a pinch) ends the swipe.
      letGo();
      swiped.current = false;
      if (!event.isPrimary || event.pointerType === "mouse") return;
      press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, element: event.currentTarget as HTMLElement,
        samples: [sampleOf(event)], following: false };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const current = press.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const sample = sampleOf(event);
      current.samples = [...current.samples.filter((before) => sample.t - before.t <= FLICK_WINDOW_MS), sample];
      const offset = swipeOffset(sample.x - current.x, sample.y - current.y, current.following, canStep);
      if (offset === null) return;
      if (!current.following) {
        current.following = true;
        swiped.current = true;
        current.element.setAttribute(SWIPING_MARK, "");
      }
      current.element.style.setProperty(OFFSET_VAR, `${offset}px`);
    },
    onPointerUp: (event: React.PointerEvent) => {
      const current = press.current;
      if (!current || current.pointerId !== event.pointerId) return;
      letGo();
      const step = albumSwipeStep(event.clientX - current.x, event.clientY - current.y,
        flickSpeed([...current.samples, sampleOf(event)], "x"));
      if (!step) return;
      swiped.current = true;
      onStep(step);
    },
    onPointerCancel: letGo,
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
