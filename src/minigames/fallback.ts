import type { AnyMiniGameDefinition } from "./contract";

// An outcome whose choice cannot be taken now (docs/13 4.2, 2026-11-13: a haggle's price the player cannot pay): a game
// declares, per outcome, the outcome a play that ends there takes instead (`fallback`). The host tells the play which
// outcomes are available and takes the fallback of one that is not; 「おまかせ」 and Debug's outcome buttons go the same way;
// content:build checks that every outcome not always choosable reaches one that is. Pure and light (the story reader,
// content:build and the host read it).

/**
 * The outcome a play that ends on `outcome` takes when only `available` can be taken: the outcome itself when available,
 * else the first available one along its fallbacks; null when none is (no fallback, or the fallbacks run out or loop).
 */
export function availableOutcome(definition: Pick<AnyMiniGameDefinition, "outcomes">, outcome: string, available: readonly string[]): string | null {
  const seen = new Set<string>();
  for (let current: string | undefined = outcome; current !== undefined && !seen.has(current);) {
    if (available.includes(current)) return current;
    seen.add(current);
    current = definition.outcomes.find((item) => item.id === current)?.fallback;
  }
  return null;
}

/** What is wrong with a game's fallbacks (none: fine): a fallback that is no outcome of the game, or one that comes back to where it began. */
export function fallbackProblems(definition: Pick<AnyMiniGameDefinition, "outcomes">): string[] {
  const ids = definition.outcomes.map((outcome) => outcome.id);
  const problems: string[] = [];
  for (const outcome of definition.outcomes) {
    if (outcome.fallback === undefined) continue;
    if (!ids.includes(outcome.fallback)) {
      problems.push(`${outcome.id}'s fallback ${outcome.fallback} is not an outcome`);
      continue;
    }
    // Following the fallbacks from here must end (an outcome without one), never come back.
    const seen = new Set([outcome.id]);
    for (let next: string | undefined = outcome.fallback; next !== undefined; next = definition.outcomes.find((item) => item.id === next)?.fallback) {
      if (seen.has(next)) {
        problems.push(`${outcome.id}'s fallbacks come back to ${next}`);
        break;
      }
      seen.add(next);
    }
  }
  return problems;
}
