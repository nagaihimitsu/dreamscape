import { useEffect, useRef, type ReactNode } from "react";
import { useSettling } from "./ConfirmActionButton";
import { Icon } from "./icons";
import { playSe } from "../audio/sound-effects";
/**
 * Native modal keeps keyboard focus inside and the underlying page inert.
 *
 * `settlePresses`: the dialog opens under the finger that opened it (an item of the header's
 * ⚙設定 panel), so for a moment it takes no press, as a confirmation's action waits
 * (useSettling): the second tap of a double tap on the item would otherwise press what the
 * dialog shows at that point (at 320–390 px, 「ゲームの設定」's point is the autosave checkbox
 * of the settings). Keys and the first focus are not held.
 */
export function Modal({
  labelledBy,
  onClose,
  children,
  className = "",
  settlePresses = false,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  settlePresses?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const settling = useSettling(settlePresses ? true : null);
  useEffect(() => {
    const element = dialog.current!;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Opening a modal freezes the underlying scene. Restore its reading
    // position after close(): native dialog focus restoration may otherwise
    // scroll the previously focused control back into view.
    const scrollPositions: { element: HTMLElement; top: number; left: number }[] = [];
    for (let ancestor = previouslyFocused?.parentElement; ancestor; ancestor = ancestor.parentElement) {
      scrollPositions.push({ element: ancestor, top: ancestor.scrollTop, left: ancestor.scrollLeft });
    }
    const pagePosition = { top: window.scrollY, left: window.scrollX };
    element.showModal();
    // Its sounds: ui_open as it opens, ui_close once it has gone from the page (StrictMode's second run of this
    // effect leaves it on the page, and plays one ui_open: sound-effects.ts plays the same sound once within 80 ms).
    playSe("ui_open");
    return () => {
      element.close();
      window.setTimeout(() => {
        if (!element.isConnected) playSe("ui_close");
      });
      // If the trigger was replaced (for example by starting a date), the
      // new scene owns its own focus and scroll position.
      if (!previouslyFocused?.isConnected) return;
      previouslyFocused.focus({ preventScroll: true });
      for (const position of scrollPositions) {
        if (position.element.isConnected) {
          position.element.scrollTop = position.top;
          position.element.scrollLeft = position.left;
        }
      }
      if (window.scrollX !== pagePosition.left || window.scrollY !== pagePosition.top)
        window.scrollTo(pagePosition.left, pagePosition.top);
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`.trim()}
      aria-labelledby={labelledBy}
      data-settling={settling ? "" : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]',
          ),
        ).filter((target) => target.getClientRects().length > 0);
        const first = targets[0];
        const last = targets.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}

/**
 * The shared frame's title bar (UI redesign stage 2.3): the dialog's heading on a parchment
 * band at the top. A dialog whose close was at its top passes `onClose` and gets the 44-px
 * 「閉じる」 there; a dialog whose close sits at its foot keeps it there (within thumb reach,
 * and clear of the header's controls under the top of the dialog).
 */
export function ModalTitle({ id, children, eyebrow, onClose, closeTestId, className = "" }: {
  id: string;
  children: ReactNode;
  eyebrow?: ReactNode;
  onClose?: () => void;
  closeTestId?: string;
  className?: string;
}) {
  const heading = <h2 id={id}>{children}</h2>;
  return (
    <div className={`modal-title-bar ${className}`.trim()}>
      {eyebrow ? <div className="modal-title-text"><p className="eyebrow">{eyebrow}</p>{heading}</div> : heading}
      {onClose && (
        <button type="button" className="modal-close" data-testid={closeTestId} onClick={onClose}>
          <Icon name="close" />閉じる
        </button>
      )}
    </div>
  );
}
