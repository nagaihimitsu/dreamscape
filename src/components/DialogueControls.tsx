import type { CSSProperties, ReactNode } from "react";
import { DialogueLog, type DialogueLogEntry } from "./DialogueLog";
import type { NameBand } from "./name-band";
import { REMEMBERED_MARK } from "./speaker-plate";
import { DIALOGUE_TOOLS_ATTRIBUTE } from "./scene-tap";
import { AutoAdvanceButton, type useAutoAdvance } from "./useAutoAdvance";
import "./dialogue-controls.css";

/**
 * The dialogue window's head (UI redesign §3.3, decision H): the speaker's name band on the window's top edge, which it
 * straddles (--vn-head-overhang). The band stands over the speaker on the stage, in the colours of their clothes
 * (`band`, useNameBand; 2026-11-25 user decision), and stays inside the window; a long name wraps and the head grows
 * down into the window, never upward. The band is part of the window (a tap on it reads on, as on the window). The
 * window's controls are under the window (DialogueControls), not here.
 */
export function DialogueWindowHead({ speaker, band, narration = false, remembered = false, plateClassName }: {
  speaker: ReactNode;
  /** Where the band stands and its colours (name-band.ts); without it, at the window's left in the window's blue. */
  band?: NameBand;
  /**
   * The line is the narration (「旅の風景」): no band at all (2026-11-25 user decision: words no one says need no name over
   * them); the log still names it.
   */
  narration?: boolean;
  /**
   * The line is remembered (`# remembered`, speakerPlate's `remembered`): a small 「回想」 beside the name, a label (screen
   * readers read 「<name>（回想）」).
   */
  remembered?: boolean;
  plateClassName?: string;
}) {
  // Over no one: -1 holds the band at the left (dialogue-controls.css).
  const at = { "--band-x": band?.x === undefined ? -1 : Math.round(band.x * 1000) / 1000 } as CSSProperties;
  const colours = band?.fill ? { "--band-fill": band.fill, "--band-edge": band.edge, "--band-ink": band.ink } as CSSProperties : undefined;
  return <div className="vn-window-head" style={at}>
    {speaker && !narration && <div className={["speaker", plateClassName].filter(Boolean).join(" ")} style={colours}>
      {speaker}
      {remembered && <span className="speaker-remembered" data-testid="speaker-remembered">
        <span className="sr-only">（</span>{REMEMBERED_MARK}<span className="sr-only">）</span>
      </span>}
    </div>}
  </div>;
}

/**
 * Presentation-only tools of the talk, in a row at the scene's lower left corner,
 * wherever its window stands (2026-11-27 user decision; a child of the scene, not
 * of the window: dialogue-controls.css), in this order: 「隠す」 (U6; a
 * sightseeing guide's too since 2026-11-14), 「ログ」, 「高速送り」, a group named
 * 「会話の操作」. Round buttons of the window's glass showing their marks only;
 * their words stay as their names for screen readers and voice control
 * (dialogue-controls.css). A tap in the gaps between them is a near miss, not a
 * tap on the scene. They come after the talk in the reading order. `hidden` while
 * the window is (隠す) or covered: they go with it.
 */
export function DialogueControls({ close, entries, auto, hidden }: {
  close: ReactNode;
  entries: readonly DialogueLogEntry[];
  auto: ReturnType<typeof useAutoAdvance>;
  hidden?: boolean;
}) {
  return <div className="dialogue-controls" role="group" aria-label="会話の操作" data-no-advance {...{ [DIALOGUE_TOOLS_ATTRIBUTE]: "" }}
    inert={hidden || undefined} aria-hidden={hidden || undefined}>
    {close}
    <DialogueLog entries={entries} label="ログ" />
    <AutoAdvanceButton state={auto} />
  </div>;
}
