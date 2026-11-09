import { createPortal } from "react-dom";
import "./dismiss-layer.css";

/**
 * A transparent layer over the whole page, under the header, while one of the
 * header's popovers is open (the ⚙設定 panel, the held items' detail). A tap on it
 * only closes the popover: the layer is outside every scene root (a portal on
 * `document.body`), so the story does not read on, and nothing under it is
 * pressed, since the layer stays until its own click. A pan that starts on it
 * closes the popover too (the browser cancels the pointer, no click follows).
 *
 * While it is there the page carries `data-obstructs-dialogue`, which
 * dialogueObstructed counts as something open over the scene: the typewriter,
 * the auto-advance and 高速送り wait as for an open dialog, and the tap that
 * closes the popover counts as a tap over something (tapsObstructed), so the
 * second tap of a double tap does not read on either.
 *
 * The press keeps the focus where it is (the layer is not focusable and its
 * mousedown does not move the focus), so `onClose(focusWasInside)` can tell
 * whether the focus was inside the popover (`owner`) and give it back to the
 * popover's button rather than leave it on a hidden element.
 */
export function DismissLayer({ owner, onClose }: { owner: Element | null; onClose: (focusWasInside: boolean) => void }) {
  const close = () => onClose(!!owner && owner.contains(document.activeElement));
  return createPortal(
    <div
      className="dismiss-layer"
      data-obstructs-dialogue=""
      data-testid="dismiss-layer"
      aria-hidden="true"
      onMouseDown={(event) => event.preventDefault()}
      onPointerCancel={close}
      onClick={close}
    />,
    document.body,
  );
}
