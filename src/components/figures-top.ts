import { useEffect, useLayoutEffect, type RefObject } from "react";

// A line's large photo and its item card stand above the heads of the people on stage (2026-11-25 user decision, after
// an iPhone: a card over their faces hid how they looked as they spoke). The layer measures where the highest standing
// picture begins (`.vn-character`'s picture: its head, as the pictures are drawn from near their top edge) and gives it
// to its CSS as --figures-top, in px from the layer's own top; the CSS fits the photo or the card above it, down to a
// smallest size it keeps (photo-show.css, item-show.css). No one on stage: the variable is unset and nothing limits it.

const PICTURES = ".vn-character > img, .vn-character > canvas, .vn-character > svg";

/** Where the highest standing picture in `layer`'s scene begins, in px from `layer`'s top; none on stage: undefined. */
export function figuresTopIn(layer: HTMLElement): number | undefined {
  const scene = layer.parentElement;
  if (!scene) return undefined;
  let top = Infinity;
  for (const picture of scene.querySelectorAll<Element>(PICTURES)) {
    const rect = picture.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) top = Math.min(top, rect.top);
  }
  return Number.isFinite(top) ? Math.round(top - layer.getBoundingClientRect().top) : undefined;
}

function measure(layer: HTMLElement | null) {
  if (!layer) return;
  const top = figuresTopIn(layer);
  if (top === undefined) layer.style.removeProperty("--figures-top");
  else layer.style.setProperty("--figures-top", `${top}px`);
}

/**
 * Keeps --figures-top on the layer (`ref`): measured on every render of its line (someone may come on stage or go) and
 * when the window is resized. The camera's zoom keeps the top of each picture where it stood whole (figure-zoom.ts), so
 * its moving does not move it.
 */
export function useFiguresTop(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => measure(ref.current));
  useEffect(() => {
    const onResize = () => measure(ref.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ref]);
}
