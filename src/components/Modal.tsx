import { useEffect, useRef, type ReactNode } from "react";
/** Native modal keeps keyboard focus inside and the underlying page inert. */
export function Modal({
  labelledBy,
  onClose,
  children,
  className = "",
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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
