/**
 * Tests only: a date of the shared catalog made repeatable (`repeatable: true`), for the checks of the repeat
 * mechanism (a confession played again after a deferral, or after a rejection once a new date or a recovery has
 * followed). The journeys' confession dates are played once each (2026-11-13), so such a test puts this copy of the
 * catalog entry in its place (same ID, story and conditions) and the returned function puts the catalog's own back.
 */
import { dates } from "../../src/content";

export function installRepeatableDate(dateId: string): () => void {
  const index = dates.findIndex((date) => date.id === dateId);
  if (index < 0) throw new Error(`No date ${dateId} to make repeatable`);
  const original = dates[index];
  dates[index] = { ...original, repeatable: true };
  return () => { dates[index] = original; };
}
