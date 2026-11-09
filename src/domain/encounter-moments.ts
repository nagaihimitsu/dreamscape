import type { VisitPriority } from "../content/encounter-entry-rules";
import { storyFileOf } from "../content/story-address";

/**
 * Where the encounters of a landmark's visit run (the unified event design, stage 1). Pure: it
 * reads only the list it is given, so a table test can use small fictional content.
 *
 * - `before`: negative priorities, from the map's departure to the landmark until its main part opens;
 * - `observe`: while observing (no priority, or `after observe`), returning to the observation;
 * - `afterGuide` / `afterBattle` (stage 3b): right after that main part, when it ran in the visit;
 * - `after`: positive priorities, after the visit's main group;
 * - `notAtVisit`: after a date or a logo (stage 4), never at a visit.
 */
export type VisitSlot = "before" | "afterGuide" | "observe" | "afterBattle" | "after" | "notAtVisit";

/**
 * What the order needs of an encounter: its landmark, its story (address; the same priority runs in
 * file-name order, and within one place file in written order: `order`) and its rule's priority.
 */
export type MomentEntry = { encounterId: string; landmarkId: string; storyId: string; priority?: VisitPriority; order?: number };

export function visitSlot(priority: VisitPriority | undefined): VisitSlot {
  if (priority === "after guide") return "afterGuide";
  if (priority === "after battle") return "afterBattle";
  // After a date or an arrival's logo (stage 4): a `place` scene of that kind never runs at a landmark's visit.
  if (priority === "after date" || priority === "after logo") return "notAtVisit";
  return typeof priority !== "number" ? "observe" : priority < 0 ? "before" : "after";
}

/** Story files compared by code units, the same everywhere (not by locale); within one file, in written order. */
const byStoryId = (left: MomentEntry, right: MomentEntry) => {
  const [a, b] = [storyFileOf(left.storyId), storyFileOf(right.storyId)];
  return a < b ? -1 : a > b ? 1 : (left.order ?? 0) - (right.order ?? 0);
};

/**
 * The encounters of one slot of a landmark's visit, in play order. Before and after the main
 * part: by priority (smaller first), the same priority by story file name. While observing:
 * the encounters without a priority in catalog order (as before stage 1), then those written
 * `after observe` by story file name.
 */
export function visitOrder(entries: readonly MomentEntry[], landmarkId: string, slot: VisitSlot): string[] {
  const own = entries.filter((entry) => entry.landmarkId === landmarkId && visitSlot(entry.priority) === slot);
  if (slot === "afterGuide" || slot === "afterBattle") return own.sort(byStoryId).map((entry) => entry.encounterId);
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
