import type { ReactNode } from "react";
import { DialogueLog, type DialogueLogEntry } from "./DialogueLog";
import { AutoAdvanceButton, type useAutoAdvance } from "./useAutoAdvance";
import "./dialogue-controls.css";

/** Presentation-only tools stay beside the speaker, without adding a footer.
 * A tap in the gaps between them is a near miss, not a tap on the scene. */
export function DialogueControls({ close, entries, auto }: {
  close: ReactNode;
  entries: readonly DialogueLogEntry[];
  auto: ReturnType<typeof useAutoAdvance>;
}) {
  return <div className="dialogue-controls" aria-label="会話の操作" data-no-advance>
    {close}
    <DialogueLog entries={entries} label="ログ" />
    <AutoAdvanceButton state={auto} />
  </div>;
}
