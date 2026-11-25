import type { ReactNode } from "react";
import { DialogueLog, type DialogueLogEntry } from "./DialogueLog";
import { NameCutInPlate } from "./NameCutIn";
import { REMEMBERED_MARK, type NameCutIn } from "./speaker-plate";
import { DIALOGUE_TOOLS_ATTRIBUTE } from "./scene-tap";
import { AutoAdvanceButton, type useAutoAdvance } from "./useAutoAdvance";
import "./dialogue-controls.css";

/**
 * The dialogue window's head (UI redesign §3.3, decision H): the speaker's
 * name band and the window's controls in one row on the window's top edge, which
 * it straddles by a fixed 22 px. The band takes what the controls leave and
 * its name wraps there, so a long name never runs under the controls; the head
 * then grows down into the window, never upward. The band is part of the
 * window (a tap on it reads on, as on the window); the controls are not.
 */
export function DialogueWindowHead({ speaker, controls, narration = false, remembered = false, plateClassName, cutIn }: {
  speaker: ReactNode;
  controls: ReactNode;
  /** The line is the narration (「旅の風景」): its plate is slate instead of blue (D2). */
  narration?: boolean;
  /**
   * The line is remembered (`# remembered`, speakerPlate's `remembered`): a small 「回想」 beside the name, a label (screen
   * readers read 「<name>（回想）」).
   */
  remembered?: boolean;
  plateClassName?: string;
  /** The line's name plate while it lasts (`# cutin: name`, useNameCutIn): shown just above the head. */
  cutIn?: NameCutIn;
}) {
  return <div className="vn-window-head">
    <NameCutInPlate cutIn={cutIn} />
    {speaker && <div className={["speaker", plateClassName].filter(Boolean).join(" ")} data-narration={narration || undefined}>
      {speaker}
      {remembered && <span className="speaker-remembered" data-testid="speaker-remembered">
        <span className="sr-only">（</span>{REMEMBERED_MARK}<span className="sr-only">）</span>
      </span>}
    </div>}
    {controls}
  </div>;
}

/**
 * Presentation-only tools in the window's head, in this order: 「隠す」 (U6; a
 * sightseeing guide's too since 2026-11-14), 「ログ」, 「高速送り」, a group named
 * 「会話の操作」. Round buttons of the window's glass showing their marks only
 * (2026-11-25 user decision: the talk's tools step back); their words stay as
 * their names for screen readers and voice control (dialogue-controls.css). A tap
 * in the gaps between them is a near miss, not a tap on the scene.
 */
export function DialogueControls({ close, entries, auto }: {
  close: ReactNode;
  entries: readonly DialogueLogEntry[];
  auto: ReturnType<typeof useAutoAdvance>;
}) {
  return <div className="dialogue-controls" role="group" aria-label="会話の操作" data-no-advance {...{ [DIALOGUE_TOOLS_ATTRIBUTE]: "" }}>
    {close}
    <DialogueLog entries={entries} label="ログ" />
    <AutoAdvanceButton state={auto} />
  </div>;
}
