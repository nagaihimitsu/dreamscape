import { dates, dateDestinations, getCityContent, progression, type DateDefinition } from "../content";
import type { GameState, ActiveDate } from "./game-state-schema";
import { storyFingerprint } from "../story/runtime";
import type { Availability } from "./game";
import { canConfessSuccessfully, completedDateCount, meets } from "./conditions";
import { isLeaf, type Condition, type Leaf } from "../content/condition-schemas";

/** A true `until` closes the date for good (before its `when`, and even after an unlock was recorded). */
const untilReached = (state: GameState, date: DateDefinition) => !!date.until && meets(state, date.until);

/** The date's `when` and `until`, then its relationship requirements (hidden values: dates keep their own fields). */
function meetsDateConditions(state: GameState, date: DateDefinition): boolean {
  return (
    meets(state, date.when) && !untilReached(state, date) &&
    state.romanceStage >= date.minRomanceStage &&
    (date.minAffection === 0 || state.affection >= date.minAffection) &&
    (!date.needsDeferred || state.confessionStatus === "deferred")
  );
}

/** Destinations own their city; destination-less events belong to a city's travel catalog. */
export function dateBelongsToCity(state: GameState, date: DateDefinition): boolean {
  if (date.destinationId) return dateDestinations.some((destination) => destination.id === date.destinationId && destination.cityId === state.currentCityId);
  return getCityContent(state.currentCityId).travel.events.some((event) => event.id === date.id && event.category === "date");
}

/**
 * The dates of the current city that free time's row shows as a locked card with their writer's hint while Debug mode
 * is on (2026-11-13, `# hint:`; photo-cards.ts rowCards; players never see them): a date with a hint and a map condition (`when`) that does not hold yet, not unlocked nor
 * played, and that nothing closes for good first (its `until`, the ending for a date that does not go on after it). A
 * relationship repair never shows one. Read from the progress only: no relationship value decides it.
 */
export function hintedLockedDates(state: GameState): { dateId: string; hintJa: string }[] {
  return dates.flatMap((date) => date.hintJa && date.when && !date.recovery && dateBelongsToCity(state, date) &&
    !meets(state, date.when) && !untilReached(state, date) && !state.playedDateIds.includes(date.id) &&
    !state.unlockedEventIds.includes(date.id) && (!state.endingReached || date.kind === "normal" || date.allowAfterEnding)
    ? [{ dateId: date.id, hintJa: date.hintJa }] : []);
}

/** Progress and relationship requirements only; AP and opening hours do not hide a destination. */
export function isDateUnlockedForTravel(state: GameState, dateId: string): boolean {
  const date = dates.find((item) => item.id === dateId);
  return !!date && dateBelongsToCity(state, date) && meetsDateConditions(state, date);
}

/**
 * Count completed ordinary dates and up to three real recovery conversations, and whether a confession would succeed
 * (conditions.ts, beside the parts that read them: datesCompleted, confessionReady).
 */
export { canConfessSuccessfully, completedDateCount };

/** Re-evaluate only at durable event boundaries. Unlocks remain recorded after their first appearance. */
export function evaluateProgression(state: GameState): GameState {
  let romanceStage = state.romanceStage;
  for (const stage of progression.stages) {
    if (
      state.affection >= stage.minAffection &&
      state.trust >= stage.minTrust && state.spark >= stage.minSpark &&
      completedDateCount(state) >= stage.minCompletedDates
    ) {
      romanceStage = Math.max(
        romanceStage,
        stage.stage,
      ) as GameState["romanceStage"];
    }
  }
  const next = { ...state, romanceStage };
  const unlockedEventIds = [...state.unlockedEventIds];
  for (const date of dates) {
    if (
      date.kind !== "normal" && !date.recovery && dateBelongsToCity(state, date) &&
      meetsDateConditions(next, date) &&
      !unlockedEventIds.includes(date.id)
    )
      unlockedEventIds.push(date.id);
  }
  if (
    romanceStage === state.romanceStage &&
    unlockedEventIds.length === state.unlockedEventIds.length
  )
    return state;
  return { ...next, unlockedEventIds };
}

export function getPlayerAddress(state: GameState): string {
  const stage = progression.stages.find(
    (item) => item.stage === state.romanceStage,
  )!;
  return `${state.playerName}${stage.playerSuffix}`;
}

export function getMemoryCallback(state: GameState): string {
  return (
    progression.memoryCallbacks.find((item) =>
      state.memories.includes(item.memoryId),
    )?.textJa ?? progression.fallbackMemoryCallbackJa
  );
}

export function confessionResult(state: GameState): "accepted" | "deferred" | "rejected" {
  if (canConfessSuccessfully(state)) return "accepted";
  return state.affection >= progression.stages[2].minAffection && state.trust >= progression.stages[2].minTrust
    ? "deferred" : "rejected";
}

/**
 * Her answer to a deferred confession (a date of kind `answer`; 2026-11-13): she says yes when the relationship meets
 * the confession's success condition, else a gentle, final "not as lovers, for now" (`rejected`). Never random, never
 * another deferral.
 */
export function deferralAnswer(state: GameState): "accepted" | "rejected" {
  return canConfessSuccessfully(state) ? "accepted" : "rejected";
}

/** The outcome a date that decides the confession fixes when it starts (decidesConfession): a confession's, or her answer. */
export function decidingOutcome(state: GameState, date: Pick<DateDefinition, "kind">): "accepted" | "deferred" | "rejected" {
  return date.kind === "answer" ? deferralAnswer(state) : confessionResult(state);
}

/**
 * An ordinary date of the current city can be started now (the leaf normalDateAvailable): its availability below, AP
 * included. Until 2026-11-15 a relationship repair (`recovery`) showed only when this was false, the relationship needed
 * repair and a date had been completed; now its writer writes that in its `when` (Milan's milano_recovery_01). A normal
 * date's own conditions never read this (content:build stops it), so it does not read itself.
 */
export function normalDateAvailable(state: Readonly<GameState>): boolean {
  return dates.some((date) => date.kind === "normal" && getDateAvailability(state, date.id).available);
}

export function isEventVisible(state: GameState, dateId: string): boolean {
  const date = dates.find((item) => item.id === dateId);
  return Boolean(
    date && dateBelongsToCity(state, date) &&
      (!state.endingReached || date.kind === "normal" || date.allowAfterEnding) &&
      !untilReached(state, date) &&
      // A date that needs a pending deferral (a reassurance, her answer) closes once it is answered, even if it was shown.
      (!date.needsDeferred || state.confessionStatus === "deferred") &&
      (date.kind === "normal"
        ? !state.playedDateIds.includes(dateId) && meets(state, date.when)
        : state.unlockedEventIds.includes(dateId) || meetsDateConditions(state, date)),
  );
}

export function getDateAvailability(
  state: Readonly<GameState>,
  dateId: string,
): Availability {
  const date = dates.find((item) => item.id === dateId);
  if (!date) return { available: false, reason: "デートが見つかりません。" };
  if (!dateBelongsToCity(state, date)) return { available: false, reason: "この街では出かけられません。" };
  if (state.endingReached && date.kind !== "normal" && !date.allowAfterEnding)
    return {
      available: false,
      reason: "ふたりの物語は、交際エンディングを迎えました。",
    };
  if (
    state.activeDate ||
    state.activeBattle ||
    state.activeTourism ||
    state.activeEpilogue ||
    state.activeEncounter
  )
    return {
      available: false,
      reason: "途中の会話・クイズを再開してください。",
    };
  if ((date.kind === "normal" || !date.repeatable) && state.playedDateIds.includes(dateId))
    return {
      available: false,
      reason: "このひとときは、もう思い出になりました。",
    };
  // The reasons keep their order: an unmet city clear, an unmet episode (the
  // top-level parts of `when`), a reached `until`, then an unmet wait after a
  // rejection (a top-level `dateSinceRejection` its writer wrote; 2026-11-15),
  // then an ordinary date that can be chosen instead (a top-level
  // `not normalDateAvailable`, as a relationship repair's; 2026-11-15); any other
  // unmet part gives the general reason below.
  const top: Condition[] = !date.when ? [] : "all" in date.when ? date.when.all : [date.when];
  const parts: Leaf[] = top.filter(isLeaf);
  if (parts.some((part) => "cityCompleted" in part && !meets(state, part)))
    return {
      available: false,
      reason: "都市の旅を終えると、このデートに誘えます。",
    };
  if (parts.some((part) => "episodeCompleted" in part && !meets(state, part)))
    return { available: false, reason: "旅を進めると、この場所に誘えます。" };
  if (untilReached(state, date))
    return { available: false, reason: "この機会は過ぎました。" };
  if (parts.some((part) => "dateSinceRejection" in part && !meets(state, part)))
    return { available: false, reason: "新しいひとときを過ごしてから、もう一度話せます。" };
  if (top.some((part) => "not" in part && isLeaf(part.not) && "normalDateAvailable" in part.not && !meets(state, part)))
    return { available: false, reason: "今は別のひとときを選べます。" };
  if (!meetsDateConditions(state, date))
    return { available: false, reason: "もう少し、一緒の時間を過ごしてから。" };
  if (state.ap < date.apCost)
    return { available: false, reason: "APが足りません。" };
  return { available: true, reason: "" };
}


/** Resume only when the current story exactly matches the saved fingerprint. */
export function activeDateStoryId(date: DateDefinition, active: Pick<ActiveDate, "storyHash">): string {
  if (storyFingerprint(date.storyId) !== active.storyHash)
    throw new Error("シナリオが更新されています。以前の途中データはそのまま保管されています。");
  return date.storyId;
}

