import { useEffect, useLayoutEffect, type RefObject } from "react";

// A line's item card keeps clear of the faces of the people on stage (2026-11-25 user decisions, after an iPhone: a card
// over their faces hid how they looked as they spoke; a line's large photo no longer does, 2026-11-27: it shows at one
// size on every line). The layer measures the stage: where the highest head begins and where the lowest face ends (the
// standing pictures are drawn from near their top edge, the chin about a fifth down), and where the dialogue window
// begins. The card goes between the faces and the window when there is room enough there (alone or with others:
// 2026-11-25 user decision, the place under the chins reads better on a phone), and else in the larger room of the two.
// The room goes to the CSS as --room-top (only under the faces) and --room-bottom, in px from the layer's own top; it
// fits the card in it, down to a smallest size it keeps (item-show.css). Only on a line someone says: on the narration's
// lines no one's expression is read, so the card keeps its full size and place. No one on stage, or the narration: the
// variables are unset and nothing limits them.

/** How far down a standing picture its face ends (its chin, with a little air): about a fifth of its height. */
const FACE_BOTTOM = 0.22;
/** About where the photo or the card begins under the header: the room above the heads is counted from there. */
const ABOVE_FROM = 40;
/** Room enough under the faces for the photo or the card (px): it goes there even when the room above is larger. */
const BELOW_ENOUGH = 180;

export type Figure = { top: number; height: number };
/** The room for the photo or the card, in px from the layer's top: under the faces (`top`) or above the heads. */
export type StageRoom = { top?: number; bottom: number };

/** The room between the faces and the window's top (`windowTop`) when it is enough or the larger; else above the heads. */
export function stageRoom(figures: readonly Figure[], windowTop: number): StageRoom | undefined {
  if (figures.length === 0) return undefined;
  const headTop = Math.min(...figures.map((figure) => figure.top));
  const faceBottom = Math.max(...figures.map((figure) => figure.top + figure.height * FACE_BOTTOM));
  const above = headTop - ABOVE_FROM;
  const below = windowTop - faceBottom;
  return below >= BELOW_ENOUGH || below > above
    ? { top: Math.round(faceBottom), bottom: Math.round(windowTop) }
    : { bottom: Math.round(headTop) };
}

/**
 * The standing pictures in `layer`'s scene, in px from `layer`'s top: each still picture as it is drawn in its box
 * (contain, on the bottom edge; the moving picture's canvas lies over it in the same box).
 */
function figuresIn(scene: Element, origin: number): Figure[] {
  const figures: Figure[] = [];
  for (const picture of scene.querySelectorAll<HTMLImageElement | SVGElement>(".vn-character > img, .vn-character > svg")) {
    const rect = picture.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const drawn = picture instanceof HTMLImageElement && picture.naturalWidth > 0
      ? Math.min(rect.height, rect.width * picture.naturalHeight / picture.naturalWidth) : rect.height;
    figures.push({ top: rect.bottom - drawn - origin, height: drawn });
  }
  return figures;
}

function measure(layer: HTMLElement | null, active: boolean) {
  if (!layer) return;
  const scene = layer.parentElement;
  const origin = layer.getBoundingClientRect();
  const dialogue = scene?.querySelector("[data-dialogue-window]")?.getBoundingClientRect();
  const room = active && scene
    ? stageRoom(figuresIn(scene, origin.top), (dialogue && dialogue.height > 0 ? dialogue.top : origin.bottom) - origin.top - 8)
    : undefined;
  if (room?.top === undefined) layer.style.removeProperty("--room-top");
  else layer.style.setProperty("--room-top", `${room.top}px`);
  if (!room) layer.style.removeProperty("--room-bottom");
  else layer.style.setProperty("--room-bottom", `${room.bottom}px`);
}

/** Whether a line's photo or card keeps clear of the faces: a line someone says, not the narration's. */
export const keepsAboveHeads = (speaker: string | undefined): boolean => !!speaker && speaker !== "narrator";

/**
 * Keeps the stage's room on the layer (`ref`) while `active` (keepsAboveHeads): measured on every render of its line
 * (someone may come on stage or go), when the window is resized, and when a figure's box has moved (the camera comes in
 * after a scene's first line: its faces come down).
 */
export function useFiguresTop(ref: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => measure(ref.current, active));
  useEffect(() => {
    const scene = ref.current?.parentElement;
    const again = () => measure(ref.current, active);
    window.addEventListener("resize", again);
    scene?.addEventListener("transitionend", again);
    return () => {
      window.removeEventListener("resize", again);
      scene?.removeEventListener("transitionend", again);
    };
  }, [ref, active]);
}
