import { describe, expect, it } from "vitest";
import type { TagContext } from "../../content/tags";
import type { MiniGameDefinition, MiniGameRules } from "../contract";

// The rules template (docs/13 6.2): a game's rules.test.ts calls describeMiniGameRules once, then adds its own tests.

/** A context that lists nothing: a game's examples read without the content's lists (as at run time, unchecked). */
const EMPTY_CONTEXT: TagContext = { effectIds: [], backgroundIds: [], emotionIds: [] };

/**
 * Checks a game's rules against its definition: for every example's params, 「おまかせ」 reaches every outcome
 * (outcomeOf(autoRecord(o, p), p) === o); the given edge records (nothing done, ended at once, timed out…) give a declared
 * outcome without throwing; the same record gives the same outcome every time.
 */
export function describeMiniGameRules<Params, Outcome extends string, PlayRecord>(
  definition: MiniGameDefinition<Params, Outcome>,
  rules: MiniGameRules<Params, Outcome, PlayRecord>,
  { records, context = EMPTY_CONTEXT }: { records: readonly PlayRecord[]; context?: TagContext },
): void {
  const outcomes = definition.outcomes.map((outcome) => outcome.id);
  const examples = () => definition.examples.map((raw) => ({ raw, params: definition.params(context).parse(raw) }));
  describe(`the rules of ${definition.id} (the rules template)`, () => {
    it("reaches every outcome with 「おまかせ」, for every example's params", () => {
      expect(definition.examples.length, "examples").toBeGreaterThan(0);
      for (const { raw, params } of examples()) for (const outcome of outcomes)
        expect(rules.outcomeOf(rules.autoRecord(outcome, params), params), `${JSON.stringify(raw)}: ${outcome}`).toBe(outcome);
    });

    it("gives a declared outcome for every edge record, the same every time", () => {
      expect(records.length, "edge records").toBeGreaterThan(0);
      for (const { params } of examples()) for (const record of records) {
        const outcome = rules.outcomeOf(record, params);
        expect(outcomes, `${String(record)}`).toContain(outcome);
        expect(rules.outcomeOf(record, params)).toBe(outcome);
      }
    });

    // The result card's ★ (docs/13 2.4): a rate, when the rules have one, gives ★1–3 (or null) for every record, the same
    // every time, and a score line in Japanese or numbers. Display only: never saved, never in Ink.
    it.runIf(!!rules.rate)("rates every record (おまかせ's of each outcome and the edge ones) with ★1–3 or nothing, the same every time", () => {
      const rate = rules.rate!;
      for (const { raw, params } of examples()) {
        for (const record of [...outcomes.map((outcome) => rules.autoRecord(outcome, params)), ...records]) {
          const rating = rate(record, params);
          const where = `${JSON.stringify(raw)}: ${String(record)}`;
          expect(rate(record, params), where).toEqual(rating);
          if (rating === null) continue;
          expect([1, 2, 3], where).toContain(rating.stars);
          if (rating.scoreJa !== undefined) expect(rating.scoreJa, where).toMatch(/[\d぀-ヿ一-鿿]/u);
        }
      }
    });
  });
}
