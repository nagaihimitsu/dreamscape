import type { ReactNode } from "react";
import { DialogueLog, type DialogueLogEntry } from "./DialogueLog";
import { AutoAdvanceButton, type useAutoAdvance } from "./useAutoAdvance";
import "./dialogue-controls.css";

/** Presentation-only tools stay beside the speaker, without adding a footer. */
export function DialogueControls({ close, entries, auto }: {
  close: ReactNode;
  entries: readonly DialogueLogEntry[];
  auto: ReturnType<typeof useAutoAdvance>;
}) {
  return <div className="dialogue-controls" aria-label="会話の操作">
    {close}
    <DialogueLog entries={entries} label="ログ" />
    <AutoAdvanceButton state={auto} />
  </div>;
}
