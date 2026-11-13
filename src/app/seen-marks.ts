/**
 * What the player has looked at during this play (2026-11-13 user decision): the held items in the open items panel,
 * the clues in 手がかり帳 and the entries of 英語ノート. One not looked at yet has its mark: a small dot on its button
 * (and 「NEW」 beside a held item in the open panel). GameApp keeps this in its tab's memory only (never saved): a new
 * game, a load and Debug's return empty it, and then everything there is counts as seen (seenAll).
 */
export type MarkKind = "items" | "clues" | "english";
export type SeenMarks = Readonly<Record<MarkKind, ReadonlySet<string>>>;

/** Everything there is, seen: the memory after a new game, a load, Debug's return or the page's start. */
export const seenAll = (now: Readonly<Record<MarkKind, readonly string[]>>): SeenMarks =>
  ({ items: new Set(now.items), clues: new Set(now.clues), english: new Set(now.english) });

/** The IDs of `now` not seen yet, in `now`'s order; none while the memory waits for its start (`seen` undefined). */
export const unseenIds = (seen: ReadonlySet<string> | undefined, now: readonly string[]): string[] =>
  seen ? now.filter((id) => !seen.has(id)) : [];

/** `marks` with `ids` of `kind` seen too; the same object when none is new (so nothing renders again). */
export function markSeen(marks: SeenMarks, kind: MarkKind, ids: readonly string[]): SeenMarks {
  const fresh = unseenIds(marks[kind], ids);
  return fresh.length ? { ...marks, [kind]: new Set([...marks[kind], ...fresh]) } : marks;
}

/** The IDs of `after` that `before` did not have (a clue just recorded in 手がかり帳). */
export const addedIds = (before: readonly string[], after: readonly string[]): string[] => after.filter((id) => !before.includes(id));

/**
 * The entries of 英語ノート, as marks: each question answered (by its battle; answering it again adds nothing) and each
 * word of the country learned.
 */
export const englishNoteKeys = (questions: readonly { battle: { id: string }; question: { id: string } }[], localWordIds: readonly string[]): string[] =>
  [...questions.map(({ battle, question }) => `question:${battle.id}:${question.id}`), ...localWordIds.map((id) => `word:${id}`)];
