import { fnvHash } from "../content/fingerprint";
import { READ_LINES_KEY, type StorageLike } from "../persistence";

/**
 * Read-skip (既読スキップ; 2026-11-11 user decision). This device remembers which lines it has shown in full, per
 * journey (READ_LINES_KEY, a per-device record apart from the save and the English notes), so that 高速送り stops at
 * the first line not read before; 「未読の台詞も高速送りする」 (ゲームの設定) lets it run through unread lines too.
 * Never part of the game save. A failing or unreadable storage never stops reading: the record then lives in this
 * tab's memory only, and an unreadable stored record is never overwritten (AGENTS.md).
 */

/** The most lines remembered; beyond it the oldest are dropped. About 11 characters a line in storage. */
export const READ_LINES_CAP = 8000;
const LINE_ID = /^[0-9a-f]{8}$/u;

/**
 * A line's identity: the 32-bit FNV-1a hash of its story and its text, as 8 hex digits. Stable and cheap; an edited
 * line gets another identity and counts as unread. (Two lines sharing a hash, rare, count as read together.)
 */
export function readLineId(storyId: string, text: string): string {
  return fnvHash(`${storyId}\u0000${text}`).padStart(8, "0");
}

/**
 * Whether fast-forward stops on arriving at a line: it runs (`fast`), the line was not read before it appeared
 * (`readBefore` false; null for a line without an identity, which never stops it) and the reader did not choose to
 * fast-forward through unread lines (`skipUnread`). The line where the reader pressed 高速送り is where it starts, not
 * an arrival: fast-forward always leaves it.
 */
export function stopsFastForward({ fast, readBefore, skipUnread }: { fast: boolean; readBefore: boolean | null; skipUnread: boolean }): boolean {
  return fast && readBefore === false && !skipUnread;
}

/** The lines of a stored record, oldest first; null for a text this build does not read (kept as it is). */
export function parseReadLines(raw: string | null): string[] | null {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const { schemaVersion, ids, ...other } = data as Record<string, unknown>;
    if (schemaVersion !== 1 || Object.keys(other).length || !Array.isArray(ids) ||
        !ids.every((id): id is string => typeof id === "string" && LINE_ID.test(id))) return null;
    return ids;
  } catch {
    return null;
  }
}

/** The stored text of a record. */
export function serializeReadLines(ids: readonly string[]): string {
  return JSON.stringify({ schemaVersion: 1, ids });
}

/** A new line read: added last, the oldest dropped beyond `cap` (returned in `dropped`). The caller adds each line once. */
export function addReadLine(ids: readonly string[], id: string, cap = READ_LINES_CAP): { ids: string[]; dropped: string[] } {
  const next = [...ids, id];
  const over = Math.max(0, next.length - cap);
  return { ids: next.slice(over), dropped: next.slice(0, over) };
}

/** The record a screen reads and writes: its lines in order and as a set, and whether storage may be written. */
export type ReadRecord = { ids: string[]; read: Set<string>; writable: boolean };

/**
 * Open the record in `storage` (a journey's scoped storage, or Debug's isolated memory: Debug never reaches the
 * normal record). An empty slot starts a new record; a storage that cannot be read, or a record this build does not
 * read, gives an empty record kept in memory only (never written over the stored one).
 */
export function openReadLines(storage: StorageLike): ReadRecord {
  let raw: string | null;
  try {
    raw = storage.getItem(READ_LINES_KEY);
  } catch {
    return { ids: [], read: new Set(), writable: false };
  }
  const ids = parseReadLines(raw);
  return ids ? { ids, read: new Set(ids), writable: true } : { ids: [], read: new Set(), writable: false };
}

/** Remember a line shown in full (once) and write the record; a failed write keeps it in memory and stops no reading. */
export function markLineRead(storage: StorageLike, record: ReadRecord, id: string, cap = READ_LINES_CAP): void {
  if (record.read.has(id)) return;
  const { ids, dropped } = addReadLine(record.ids, id, cap);
  record.ids = ids;
  record.read.add(id);
  for (const old of dropped) if (!ids.includes(old)) record.read.delete(old);
  if (!record.writable) return;
  try {
    storage.setItem(READ_LINES_KEY, serializeReadLines(ids));
  } catch {
    // Full or blocked storage: the record stays in this tab's memory.
  }
}

/** What fast-forward reads (useAutoAdvance): the device's record and the reader's choice. */
export type ReadSkip = {
  /** Whether this device has read the line before. */
  isRead(id: string): boolean;
  /** Remember the line as read (it has been shown in full). */
  markRead(id: string): void;
  /** 「未読の台詞も高速送りする」: fast-forward does not stop at unread lines. */
  skipUnread: boolean;
};
