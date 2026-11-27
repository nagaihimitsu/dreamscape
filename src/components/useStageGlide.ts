import { useLayoutEffect, useRef, type RefObject } from "react";

/** How long someone takes to walk to a new place on the stage. */
export const STAGE_GLIDE_MS = 900;
const GLIDE_EASING = "cubic-bezier(0.45, 0, 0.3, 1)";

/** The game's 「演出を短縮する」 (the screen's `reduceMotion`) or the system's reduced motion. */
export function motionReduced(reduceMotion: boolean): boolean {
  return reduceMotion || (typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

type Box = { x: number; bottom: number; height: number };

const boxOf = (element: Element): Box => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, bottom: rect.bottom, height: rect.height };
};

/** Where each figure on the stage is seen now (those going off left out). */
function figuresSeen(root: HTMLElement): Map<string, Box> {
  const seen = new Map<string, Box>();
  for (const figure of root.querySelectorAll<HTMLElement>("[data-figure]:not(.is-leaving)")) seen.set(figure.dataset.figure!, boxOf(figure));
  return seen;
}

/**
 * People on a stage walk to their new places (2026-11-27 user decision: never in an instant). When the stage's layout
 * changes (`layout`: who stands where; someone came on or went off, `# together:`), each figure (a portrait's
 * `[data-figure]`) that stood before and stands now at another place or size glides there from where it was seen, over
 * STAGE_GLIDE_MS: its slot (the figure's parent, positioned, one figure each) is moved back to where the figure was seen
 * and eased into the new place (bottom centre and height, so its feet travel along the ground). Where it was seen is
 * read while the new stage is being drawn, before the page changes (so a walk or the camera's coming in, still under way,
 * is taken from where it is); where it goes, with the figure's own transitions held for that reading (the camera's size
 * change is then part of the walk). A figure that just came on fades in as before (character-portrait.css); one going
 * off is not moved (useSceneStage's `leaving`). Off (`enabled` false, as in a battle's quiz) or under reduced motion,
 * places change at once.
 */
export function useStageGlide(layer: RefObject<HTMLElement | null>, layout: string, { enabled = true, reduceMotion = false } = {}): void {
  const committed = useRef(layout);
  const seenBefore = useRef<Map<string, Box> | null>(null);
  const running = useRef<Animation[]>([]);
  const active = enabled && !motionReduced(reduceMotion);
  // While the new stage is drawn the page still shows the old one: where everyone is seen now.
  if (active && layout !== committed.current && !seenBefore.current && layer.current) seenBefore.current = figuresSeen(layer.current);
  useLayoutEffect(() => {
    const before = seenBefore.current;
    seenBefore.current = null;
    const changed = committed.current !== layout;
    committed.current = layout;
    const root = layer.current;
    if (!changed || !before || !active || !root) return;
    for (const animation of running.current) animation.cancel();
    running.current = [];
    const moves: { slot: HTMLElement; from: Box; to: Box; slotBox: DOMRect }[] = [];
    for (const figure of root.querySelectorAll<HTMLElement>("[data-figure]:not(.is-leaving)")) {
      const from = before.get(figure.dataset.figure!);
      const slot = figure.parentElement;
      if (!from || !slot || slot === root || typeof slot.animate !== "function" || getComputedStyle(slot).position === "static") continue;
      // Its new place as it will be: its transitions (the camera's size, a `# stand:` step) held for the reading.
      figure.style.transition = "none";
      const to = boxOf(figure);
      figure.style.transition = "";
      if (Math.abs(from.x - to.x) < 1 && Math.abs(from.bottom - to.bottom) < 1 && Math.abs(from.height - to.height) < 1) continue;
      moves.push({ slot, from, to, slotBox: slot.getBoundingClientRect() });
    }
    for (const { slot, from, to, slotBox } of moves) {
      const scale = to.height > 0 ? from.height / to.height : 1;
      const origin = `${to.x - slotBox.left}px ${to.bottom - slotBox.top}px`;
      running.current.push(slot.animate([
        { transform: `translate(${from.x - to.x}px, ${from.bottom - to.bottom}px) scale(${scale})`, transformOrigin: origin },
        { transform: "none", transformOrigin: origin },
      ], { duration: STAGE_GLIDE_MS, easing: GLIDE_EASING }));
    }
  });
}
