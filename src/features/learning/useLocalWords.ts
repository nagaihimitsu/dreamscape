import { useCallback, useEffect, useRef, useState } from "react";
import { localWords as catalogWords, type LocalWord } from "../../content";
import type { StorageLike } from "../../persistence";
import { sceneCuesQuiet } from "../../audio/sound-effects";
import { openLearnedWords, rememberWords } from "./local-words";

/** The words just learned, to show as cards over their line (`id` changes with each line that teaches new words), and the story scene of that line. */
export type LocalWordNoticeState = { id: number; words: LocalWord[]; scene: string | null };

/**
 * This device's words of the country for the journey open (local-words.ts), read once when the game screen opens, and
 * the `# local_word:` words of the line on screen (`onScreen`, lineWordsOnScreen): a word not learned before is learned
 * as its line is shown and, unless 高速送り passes the line or a load has brought it back (sceneCuesQuiet, read after the
 * scene's own effects as 旅の図鑑's card is: a child's effects run before its parent's), put in `notice` till its cards
 * are put away (`dismiss`; LineCardWindow, 2026-11-27 user decision). A word learned before changes nothing. GameApp
 * passes its own storage: a journey's slot in normal play, Debug's isolated memory in a Debug session (so Debug never
 * reads or writes the normal record). One tab holds a journey (journey-lock.ts), so no other tab writes the same record
 * meanwhile. `scene`: the story scene on screen, kept with the notice (its cards belong to it).
 */
export function useLocalWords(storage: StorageLike, onScreen: readonly string[], scene: string | null) {
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const [record] = useState(() => openLearnedWords(storage));
  const [learned, setLearned] = useState(record.ids);
  const [notice, setNotice] = useState<LocalWordNoticeState | null>(null);
  const key = onScreen.join(" ");
  useEffect(() => {
    if (!key) return;
    const added = rememberWords(storage, record, key.split(" "));
    if (!added.length) return;
    setLearned(record.ids);
    if (sceneCuesQuiet()) return;
    const words = added.flatMap((id) => catalogWords.find((word) => word.id === id) ?? []);
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, words, scene: sceneRef.current }));
  }, [storage, record, key]);
  const dismiss = useCallback(() => setNotice(null), []);
  return { learned, notice, dismiss };
}
