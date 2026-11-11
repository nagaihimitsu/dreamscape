import { useMemo, useState } from "react";
import type { StorageLike } from "../persistence";
import { markLineRead, openReadLines, type ReadSkip } from "./read-skip";

/**
 * This device's read lines for the journey open (read-skip.ts), read once when the game screen opens. Marking a line
 * read writes the record without a render. GameApp passes its own storage: a journey's slot in normal play, Debug's
 * isolated memory in a Debug session (so Debug never reads or writes the normal record). One tab holds a journey
 * (journey-lock.ts), so no other tab writes the same record meanwhile.
 */
export function useReadLines(storage: StorageLike, skipUnread: boolean): ReadSkip {
  const [record] = useState(() => openReadLines(storage));
  return useMemo(() => ({
    isRead: (id: string) => record.read.has(id),
    markRead: (id: string) => markLineRead(storage, record, id),
    skipUnread,
  }), [storage, record, skipUnread]);
}
