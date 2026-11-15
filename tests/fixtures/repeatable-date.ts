/**
 * Tests only: a date of the shared catalog made repeatable (`repeatable: true`), for the checks of the repeat
 * mechanism (a confession played again after a deferral, or after a rejection). The journeys' confession dates are
 * played once each (2026-11-13), so such a test puts this copy of the catalog entry in its place (same ID, story and
 * conditions) and the returned function puts the catalog's own back.
 *
 * `waitsAfterRejection`: the copy also waits after a rejection for a new ordinary date or a recovery, as its writer
 * would write it (`# when: date_since_rejection`, a top-level part of its `when`; 2026-11-15: the game makes no
 * confession wait by itself).
 */
import { dates } from "../../src/content";
import type { Condition } from "../../src/content/condition-schemas";

const WAIT: Condition = { dateSinceRejection: true };

export function installRepeatableDate(dateId: string, { waitsAfterRejection = false } = {}): () => void {
  const index = dates.findIndex((date) => date.id === dateId);
  if (index < 0) throw new Error(`No date ${dateId} to make repeatable`);
  const original = dates[index];
  const when = !original.when ? WAIT : "all" in original.when ? { all: [...original.when.all, WAIT] } : { all: [original.when, WAIT] };
  dates[index] = waitsAfterRejection ? { ...original, repeatable: true, when } : { ...original, repeatable: true };
  return () => { dates[index] = original; };
}
