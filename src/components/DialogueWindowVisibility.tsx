import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import "./dialogue-window-visibility.css";

/** Presentation only: hiding the window never changes the saved Ink state. */
export function useDialogueWindow() {
  const [hidden, setHidden] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const restoreButton = useRef<HTMLButtonElement | null>(null);

  const hide = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const menu = button.closest("details");
    const summary = menu?.querySelector<HTMLElement>(":scope > summary");
    // Close the expanded tool menu before hiding. Otherwise it remains an
    // invisible obstruction when the dialogue window is restored.
    returnFocus.current = summary ?? button;
    if (menu) menu.open = false;
    setHidden(true);
  }, []);
  const show = useCallback(() => {
    setHidden(false);
  }, []);

  useEffect(() => {
    if (hidden) {
      restoreButton.current?.focus({ preventScroll: true });
    } else if (returnFocus.current) {
      returnFocus.current.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [hidden]);

  return { hidden, hide, show, restoreButton };
}

type DialogueWindow = ReturnType<typeof useDialogueWindow>;

export function DialogueWindowHide({
  state,
  onHide,
}: {
  state: DialogueWindow;
  onHide?: () => void;
}) {
  return (
    <button
      className="text-button vn-window-hide"
      type="button"
      onClick={(event) => {
        state.hide(event);
        onHide?.();
      }}
    >
      ウィンドウを隠す
    </button>
  );
}

export function DialogueWindowRestore({ state }: { state: DialogueWindow }) {
  if (!state.hidden) return null;
  return (
    <button
      ref={state.restoreButton}
      className="vn-window-restore"
      type="button"
      aria-label="会話ウィンドウを表示"
      onClick={(event) => {
        event.stopPropagation();
        state.show();
      }}
    >
      <span>タップして会話を表示</span>
    </button>
  );
}
