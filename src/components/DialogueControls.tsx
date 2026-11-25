import type { CSSProperties, ReactNode } from "react";
import { DialogueLog, type DialogueLogEntry } from "./DialogueLog";
import { NameCutInPlate } from "./NameCutIn";
import type { NameBand } from "./name-band";
import { REMEMBERED_MARK, type NameCutIn } from "./speaker-plate";
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
export function DialogueWindowHead({ speaker, band, narration = false, remembered = false, plateClassName, cutIn }: {
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
  /** The line's name plate while it lasts (`# cutin: name`, useNameCutIn): shown in the band's place, over the speaker. */
  cutIn?: NameCutIn;
}) {
  // Over no one: -1 holds the band at the left, and the name plate stands in the middle (dialogue-controls.css).
  const x = band?.x === undefined ? undefined : Math.round(band.x * 1000) / 1000;
  const at = { "--band-x": x ?? -1, "--cutin-x": x ?? 0.5 } as CSSProperties;
  const colours = band?.fill ? { "--band-fill": band.fill, "--band-edge": band.edge, "--band-ink": band.ink } as CSSProperties : undefined;
  return <div className="vn-window-head" style={at}>
    <NameCutInPlate cutIn={cutIn} />
    {/* While the line's name plate shows, it stands in the band's place and the band waits under it (the name once). */}
    {speaker && !narration && <div className={["speaker", plateClassName].filter(Boolean).join(" ")} style={colours}
      data-under-cutin={cutIn ? "" : undefined}>
      {speaker}
      {remembered && <span className="speaker-remembered" data-testid="speaker-remembered">
        <span className="sr-only">（</span>{REMEMBERED_MARK}<span className="sr-only">）</span>
      </span>}
    </div>}
  </div>;
}

/**
 * Presentation-only tools of the talk, in a row under its window at the left
 * (2026-11-25 user decision: the window rises a little, the tools below it, the
 * name band free to stand over the speaker), in this order: 「隠す」 (U6; a
 * sightseeing guide's too since 2026-11-14), 「ログ」, 「高速送り」, a group named
 * 「会話の操作」. Round buttons of the window's glass showing their marks only;
 * their words stay as their names for screen readers and voice control
 * (dialogue-controls.css). A tap in the gaps between them is a near miss, not a
 * tap on the scene. They come after the line in the reading order.
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
