/**
 * Runs `run` once `element` has a width: at once, or on a later frame (a dialog's children mount before its
 * showModal(), so they have no size yet), at most `frames` frames later. Returns the cancel (for an effect's cleanup).
 */
export function whenLaidOut(element: HTMLElement, run: () => void, frames = 30): () => void {
  let frame = 0;
  const attempt = (left: number) => {
    if (element.clientWidth > 0 || left <= 0) run();
    else frame = requestAnimationFrame(() => attempt(left - 1));
  };
  attempt(frames);
  return () => cancelAnimationFrame(frame);
}
