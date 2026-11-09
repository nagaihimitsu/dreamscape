import type { VisitPriority } from "../content/encounter-entry-rules";

/**
 * Where the encounters of a landmark's visit run (the unified event design, stage 1). Pure: it
 * reads only the list it is given, so a table test can use small fictional content.
 *
 * - `before`: negative priorities, from the map's departure to the landmark until its main part opens;
 * - `observe`: while observing (no priority, or `after observe`), returning to the observation;
 * - `after`: positive priorities, from the landmark battle result's 「自由時間へ」.
 */
export type VisitSlot = "before" | "observe" | "after";

/** What the order needs of an encounter: its landmark, its story file (the same priority runs in file-name order) and its rule's priority. */
export type MomentEntry = { encounterId: string; landmarkId: string; storyId: string; priority?: VisitPriority };

export function visitSlot(priority: VisitPriority | undefined): VisitSlot {
  return typeof priority !== "number" ? "observe" : priority < 0 ? "before" : "after";
}

/** Story IDs compared by code units, the same everywhere (not by locale). */
const byStoryId = (left: MomentEntry, right: MomentEntry) => (left.storyId < right.storyId ? -1 : left.storyId > right.storyId ? 1 : 0);

/**
 * The encounters of one slot of a landmark's visit, in play order. Before and after the main
 * part: by priority (smaller first), the same priority by story file name. While observing:
 * the encounters without a priority in catalog order (as before stage 1), then those written
 * `after observe` by story file name.
 */
export function visitOrder(entries: readonly MomentEntry[], landmarkId: string, slot: VisitSlot): string[] {
  const own = entries.filter((entry) => entry.landmarkId === landmarkId && visitSlot(entry.priority) === slot);
  if (slot === "observe")
    return [...own.filter((entry) => entry.priority === undefined), ...own.filter((entry) => entry.priority !== undefined).sort(byStoryId)]
      .map((entry) => entry.encounterId);
  return own.sort((left, right) => (left.priority as number) - (right.priority as number) || byStoryId(left, right))
    .map((entry) => entry.encounterId);
}

/**
 * The next encounter to run in an order: the first one after `afterId` (from the start without
 * it) that `eligible` accepts now. Progress through a moment is derived from this order alone,
 * so an encounter ended with 「また今度」 never comes back within the same moment.
 */
export function nextInOrder(order: readonly string[], afterId: string | undefined, eligible: (id: string) => boolean): string | undefined {
  const start = afterId === undefined ? 0 : order.indexOf(afterId) + 1;
  if (afterId !== undefined && start === 0) return undefined;
  return order.slice(start).find(eligible);
}
