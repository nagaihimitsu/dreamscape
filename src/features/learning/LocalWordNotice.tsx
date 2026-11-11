import { learnedNoticeText } from "./local-words";
import type { LocalWordNoticeState } from "./useLocalWords";
import "./local-words.css";

/**
 * 「ことばを覚えた：नमस्ते（ナマステ）」 (2026-11-11 user decision): a small notice right under the header when a line
 * teaches words of the country (useLocalWords). It takes no taps and no focus, so it never holds input back (a tap on it
 * reaches the scene below). GameApp keeps its status region mounted through the story scene, so screen readers announce
 * the words politely when they are put into it. It comes in with a short motion (none under reduced motion and
 * 「演出を短縮する」) and goes after LOCAL_WORD_NOTICE_MS.
 */
export function LocalWordNotice({ notice }: { notice: LocalWordNoticeState | null }) {
  return (
    <div className="local-word-notice-region" role="status" data-testid="local-word-notice">
      {notice && notice.words.length > 0 && <p key={notice.id} className="local-word-notice">{learnedNoticeText(notice.words)}</p>}
    </div>
  );
}
