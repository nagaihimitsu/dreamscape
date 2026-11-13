import { useEffect, useState } from "react";
import { localWords as catalogWords, type LocalWord } from "../../content";
import type { StorageLike } from "../../persistence";
import { openLearnedWords, rememberWords, shownWordNotice } from "./local-words";

/** How long 「ことばを覚えた」 stays on screen (milliseconds). */
export const LOCAL_WORD_NOTICE_MS = 4000;

/** The words just learned, said for a moment (`id` changes with each new notice). */
export type LocalWordNoticeState = { id: number; words: LocalWord[] };

/**
 * This device's words of the country for the journey open (local-words.ts), read once when the game screen opens, and
 * the `# local_word:` words of the line on screen (`onScreen`, lineWordsOnScreen): a word not learned before is learned
 * as its line is shown and said for a moment in `notice`; a word learned before changes nothing. While `held` (旅の図鑑's
 * card over the line, 2026-11-13) the word is learned all the same and its notice waits: it shows once the card has
 * closed, for its whole time (shownWordNotice). GameApp passes its own
 * storage: a journey's slot in normal play, Debug's isolated memory in a Debug session (so Debug never reads or writes
 * the normal record). One tab holds a journey (journey-lock.ts), so no other tab writes the same record meanwhile.
 */
export function useLocalWords(storage: StorageLike, onScreen: readonly string[], held = false) {
  const [record] = useState(() => openLearnedWords(storage));
  const [learned, setLearned] = useState(record.ids);
  const [notice, setNotice] = useState<LocalWordNoticeState | null>(null);
  const key = onScreen.join(" ");
  useEffect(() => {
    if (!key) return;
    const added = rememberWords(storage, record, key.split(" "));
    if (!added.length) return;
    setLearned(record.ids);
    const words = added.flatMap((id) => catalogWords.find((word) => word.id === id) ?? []);
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, words }));
  }, [storage, record, key]);
  const shown = shownWordNotice(notice, held);
  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setNotice(null), LOCAL_WORD_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);
  return { learned, notice: shown };
}
