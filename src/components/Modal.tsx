import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { useSettling } from "./ConfirmActionButton";
import { Icon } from "./icons";
import { holdTaps } from "./tap-hold";

/** A press on the dialog's ::backdrop: the event's target is the dialog itself, at a point outside its box. */
function onBackdrop(event: { target: EventTarget; currentTarget: HTMLDialogElement; clientX: number; clientY: number }) {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

/**
 * Native modal keeps keyboard focus inside and the underlying page inert.
 *
 * `settlePresses`: the dialog opens under the finger that opened it (an item of the header's
 * メニュー panel), so for a moment it takes no press, as a confirmation's action waits
 * (useSettling): the second tap of a double tap on the item would otherwise press what the
 * dialog shows at that point (at 320–390 px, 「ゲームの設定」's point is the autosave checkbox
 * of the settings). Keys and the first focus are not held.
 *
 * `closeOnBackdrop` (2026-11-14 user decision): a dialog for viewing (旅の記録, 会話ログ, the credits...)
 * also closes on a tap on the dimmed page around it, as the header's panels do, and then holds the page's taps for a
 * moment (holdTaps) as its 「× 閉じる」 does. Never a confirmation, never a dialog with a form (ゲームの設定's names).
 * A press that starts inside the dialog and ends outside (a scroll, a text selection) does not close it.
 *
 * A dialog opened from another dialog stacks over it (the browser's top layer) and closes back to it, which keeps its
 * scroll position, and the focus returns to the button that opened it (2026-11-14 user decision).
 */
export function Modal({
  labelledBy,
  onClose,
  children,
  className = "",
  settlePresses = false,
  closeOnBackdrop = false,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  settlePresses?: boolean;
  closeOnBackdrop?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const settling = useSettling(settlePresses ? true : null);
  // Whether the press now going on started on the backdrop (outside the dialog's box).
  const pressOnBackdrop = useRef(false);
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
    // No sound as it opens or closes (2026-11-15 user decision, as ≡メニュー's panel since 2026-11-14).
    element.showModal();
    return () => {
      element.close();
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
      onPointerDown={closeOnBackdrop ? (event) => { pressOnBackdrop.current = event.isPrimary && onBackdrop(event); } : undefined}
      // Closed as the finger lifts, not on the click that follows: iPhone Safari does not always send a click for a tap
      // on the dimmed page (2026-11-15). A press that turns into a scroll is cancelled and closes nothing.
      onPointerUp={closeOnBackdrop ? (event) => {
        const fromBackdrop = pressOnBackdrop.current;
        pressOnBackdrop.current = false;
        if (!fromBackdrop || !onBackdrop(event)) return;
        holdTaps();
        onClose();
      } : undefined}
      onPointerCancel={closeOnBackdrop ? () => { pressOnBackdrop.current = false; } : undefined}
    >
      {children}
    </dialog>
  );
}

/**
 * The shared frame's title bar (UI redesign stage 2.3): the dialog's heading on a parchment
 * band at the top. A dialog for viewing passes `onClose` and gets the 44-px 「× 閉じる」 there,
 * and has no other close (2026-11-14 user decision); a confirmation passes none and keeps its
 * two answers at its foot (ModalAnswers). `subline`: a line that stays in the band under the
 * heading while the dialog scrolls (旅の音楽室's 「流しています」 and its 止める). `headingRef`: a
 * dialog that changes its step moves the focus onto its heading (it can take the focus then).
 */
export function ModalTitle({ id, children, eyebrow, onClose, closeTestId, className = "", subline, headingRef }: {
  id: string;
  children: ReactNode;
  eyebrow?: ReactNode;
  onClose?: () => void;
  closeTestId?: string;
  className?: string;
  subline?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const heading = <h2 id={id} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{children}</h2>;
  return (
    <div className={`modal-title-bar${subline ? " has-subline" : ""} ${className}`.trim()}>
      {eyebrow ? <div className="modal-title-text"><p className="eyebrow">{eyebrow}</p>{heading}</div> : heading}
      {onClose && (
        <button type="button" className="modal-close" data-testid={closeTestId} onClick={() => {
          // At the top right, over the top bar's ≡メニュー: the second tap of a quick double tap would open its panel again.
          holdTaps();
          onClose();
        }}>
          <Icon name="close" />閉じる
        </button>
      )}
      {subline && <div className="modal-title-subline">{subline}</div>}
    </div>
  );
}

/**
 * A confirmation's two answers at its foot, side by side (2026-11-14 user decision): the one that changes nothing
 * (「やめる」「消去せず戻る」「この街に残る」…) on the left, the action on the right, in every confirmation. Each keeps its
 * own guard against the second tap of a double tap (a ConfirmActionButton's wait, a dialog's settlePresses).
 */
export function ModalAnswers({ cancel, action }: { cancel: ReactNode; action: ReactNode }) {
  return <div className="modal-answers">{cancel}{action}</div>;
}
