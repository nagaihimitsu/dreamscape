// The mini-games a line's `# minigame:` starts (2026-11-13 user decision: 「ゲームの結果によって結末が変わるようにしたい」).
// A mini-game takes the place of the choice set right after its line: the player plays instead of choosing, and the
// game takes the choice whose `# option:` is the game's outcome. Everything after that is the choice's ordinary path
// (Ink, save, effects and a date's `# profile:`, log). The outcome comes from how the player played, never from randomness.
// Light module (no content loading): src/content/tags.ts and content:build read it.

/** One way a mini-game can end: the `# option:` ID of its choice, and a short label (the result's moment, Debug's picker). */
export interface MiniGameOutcome {
  id: string;
  labelJa: string;
}

export interface MiniGameDefinition {
  /** Every outcome, each one choice of the choice set (content:build checks the option IDs are exactly these). */
  outcomes: readonly MiniGameOutcome[];
  /** The outcome of 「ミニゲームをおまかせにする」 when the tag names none (`# minigame: <id> auto <outcome>` names one). */
  auto: string;
  /** The button that starts a play, where the choices would be. */
  startJa: string;
  /** The line under it: how to play, in a few words. */
  hintJa: string;
}

/**
 * `cricket_batting`: the player bats one ball (the one opposite bowls it) with one tap, timed against a meter.
 * A good hit straight back (`six`), a little early pulled over the side (`over_wall`), a little late off the edge
 * (`edge`), a swing that misses (`bowled`), no swing at all (`no_swing`). src/domain/cricket-batting.ts has the timing.
 */
export const MINI_GAMES = {
  cricket_batting: {
    outcomes: [
      { id: "six", labelJa: "まっすぐ打ち返した" },
      { id: "over_wall", labelJa: "横へ高く上がった" },
      { id: "edge", labelJa: "板の端に当たった" },
      { id: "bowled", labelJa: "空振り" },
      { id: "no_swing", labelJa: "振らなかった" },
    ],
    auto: "six",
    startJa: "構える",
    hintJa: "針が金色の所に来たら「振る」",
  },
} as const satisfies Record<string, MiniGameDefinition>;

export type MiniGameId = keyof typeof MINI_GAMES;
export const MINI_GAME_IDS = Object.keys(MINI_GAMES) as MiniGameId[];

/**
 * A line's `# minigame:`: the game, the outcome 「おまかせ」 gives (the tag's `auto`, else the game's own) and, for a second
 * choice set of the same game in one scene (option IDs are unique in a scene), the prefix of its option IDs.
 */
export interface MiniGameTag {
  id: MiniGameId;
  auto: string;
  /** `prefix again`: the choice set's option IDs are `again_<outcome>` (`again_six`, …); none: the outcome IDs. */
  prefix?: string;
}

const isMiniGameId = (value: string): value is MiniGameId => Object.hasOwn(MINI_GAMES, value);
const PREFIX = /^[a-z][a-z0-9]*$/u;

/** The outcome IDs of a game, in its order. */
export const miniGameOutcomeIds = (id: MiniGameId): string[] => MINI_GAMES[id].outcomes.map((outcome) => outcome.id);

/** The `# option:` ID of an outcome's choice: the outcome, after the tag's prefix and `_` when it has one. */
export const miniGameOptionId = (tag: Pick<MiniGameTag, "prefix">, outcome: string): string => (tag.prefix ? `${tag.prefix}_${outcome}` : outcome);

/**
 * Read a `# minigame:` value: `<game>`, then optionally `auto <outcome>` and `prefix <word>` (in either order). Throws
 * for an unknown game or outcome, a prefix that is not lowercase letters and digits, a repeated word or any other words
 * (the message says how to write it).
 */
export function parseMiniGameTag(value: string): MiniGameTag {
  const [id, ...rest] = value.trim().split(/\s+/u);
  const how = `write # minigame: <game>, then optionally auto <outcome> and prefix <word>; games: ${MINI_GAME_IDS.join(", ")}`;
  if (!id || !isMiniGameId(id)) throw new Error(`Unknown minigame: ${id ?? ""} (${how})`);
  const outcomes = miniGameOutcomeIds(id);
  const tag: MiniGameTag = { id, auto: MINI_GAMES[id].auto };
  const seen = new Set<string>();
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const word = rest[index + 1];
    if ((key !== "auto" && key !== "prefix") || word === undefined || seen.has(key)) throw new Error(`Invalid minigame tag: ${value} (${how})`);
    seen.add(key);
    if (key === "auto") {
      if (!outcomes.includes(word)) throw new Error(`Unknown outcome of the minigame ${id}: auto ${word} (its outcomes: ${outcomes.join(", ")})`);
      tag.auto = word;
    } else {
      if (!PREFIX.test(word)) throw new Error(`Invalid minigame prefix: ${word} (lowercase letters and digits, like prefix again: the option IDs are again_<outcome>)`);
      tag.prefix = word;
    }
  }
  return tag;
}

/**
 * The choice a mini-game's outcome takes (the unit the game picks for the player): the frame's choice whose option ID
 * is the outcome's (miniGameOptionId); undefined when the choice set has none (content:build stops such a set).
 */
export function miniGameChoice<T extends { index: number; optionId?: string }>(choices: readonly T[], tag: Pick<MiniGameTag, "prefix">, outcome: string): T | undefined {
  const optionId = miniGameOptionId(tag, outcome);
  return choices.find((choice) => choice.optionId === optionId);
}
