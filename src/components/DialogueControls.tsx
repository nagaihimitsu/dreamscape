import type { ReactNode } from "react";
import { DialogueLog, type DialogueLogEntry } from "./DialogueLog";
import { Icon } from "./icons";
import { DIALOGUE_TOOLS_ATTRIBUTE } from "./scene-tap";
import { AutoAdvanceButton, type useAutoAdvance } from "./useAutoAdvance";
import "./dialogue-controls.css";

/**
 * The dialogue window's head (UI redesign §3.3, decision H): the speaker's
 * plate and the window's controls in one row on the window's top edge, which
 * it straddles by a fixed 22 px. The plate takes what the controls leave and
 * its name wraps there, so a long name never runs under the controls; the head
 * then grows down into the window, never upward. The plate is part of the
 * window (a tap on it reads on, as on the window); the controls are not.
 */
export function DialogueWindowHead({ speaker, controls, narration = false, plateClassName }: {
  speaker: ReactNode;
  controls: ReactNode;
  /** The line is the narration (「旅の風景」): its plate is slate instead of blue (D2). */
  narration?: boolean;
  plateClassName?: string;
}) {
  return <div className="vn-window-head">
    {speaker && <div className={["speaker", plateClassName].filter(Boolean).join(" ")} data-narration={narration || undefined}>{speaker}</div>}
    <span className="vn-plate-trail" aria-hidden="true"><Icon name="plane" /></span>
    {controls}
  </div>;
}

/**
 * Presentation-only tools in the window's head, in this order: 「隠す」 or, in a
 * sightseeing guide, 「閉じる」 (U6), 「ログ」, 「高速送り」. Words only in a
 * window narrower than 360 px, icon and word in a wider one (dialogue-controls.css).
 * A tap in the gaps between them is a near miss, not a tap on the scene.
 */
export function DialogueControls({ close, entries, auto }: {
  close: ReactNode;
  entries: readonly DialogueLogEntry[];
  auto: ReturnType<typeof useAutoAdvance>;
}) {
  return <div className="dialogue-controls" aria-label="会話の操作" data-no-advance {...{ [DIALOGUE_TOOLS_ATTRIBUTE]: "" }}>
    {close}
    <DialogueLog entries={entries} label="ログ" />
    <AutoAdvanceButton state={auto} />
  </div>;
}
