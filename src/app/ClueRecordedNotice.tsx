import { useEffect } from "react";
import "./hud-effects.css";

/** How long 「手がかり帳に「…」を記録しました。」 stays once shown (milliseconds; hud-effects.css plays its coming and going in that time). */
export const CLUE_NOTICE_MS = 5000;

/** One word that a clue was recorded (clueRecordedNotice), waiting in GameApp's queue. */
export type ClueNoticeWord = { key: number; text: string };

/**
 * 「手がかり帳に「{titleJa}」を記録しました。」 (3.11, 2026-11-18): right under the header like 「…を手に入れました」, for a clue
 * recorded outside the observation (a date, a walk or a scene has no clue book button that gleams; a player without sound or
 * vibration learns it here). It takes no presses and no focus; its status region stays mounted with the header, so screen
 * readers announce it politely. It is shown for CLUE_NOTICE_MS, long enough to read beside the line being read (the clue
 * stays readable in 手がかり帳), and it never lies over another notice: while `hold` (a 写真の札, 「ことばを覚えた」, an item's
 * card, the session's word, a quiet line) it waits, and shows again in full once the hold ends. `onDone` drops it from the queue.
 */
export function ClueRecordedNotice({ notice, hold, onDone }: { notice: ClueNoticeWord | null; hold: boolean; onDone: (key: number) => void }) {
  const shown = hold ? null : notice;
  const shownKey = shown?.key;
  // Once a notice shows: its time runs from then (again in full after a hold).
  useEffect(() => {
    if (shownKey === undefined) return;
    const timer = window.setTimeout(() => onDone(shownKey), CLUE_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [shownKey, onDone]);
  return (
    <div className="clue-notice-region" role="status" data-testid="clue-notice">
      {shown && <p key={shown.key} className="item-gain-notice hud-toast clue-notice">{shown.text}</p>}
    </div>
  );
}
