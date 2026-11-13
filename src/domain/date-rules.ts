import { dates, dateDestinations, getCityContent, progression, type DateDefinition } from "../content";
import type { GameState, ActiveDate } from "./game-state-schema";
import { storyFingerprint } from "../story/runtime";
import type { Availability } from "./game";
import { meets } from "./conditions";
import { isLeaf, type Leaf } from "../content/condition-schemas";

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

function isConfessionOnCooldown(state: GameState, date: DateDefinition): boolean {
  return date.kind === "confession" && state.confessionStatus === "rejected" &&
    state.lastRejectedDateCount !== null && completedDateCount(state) <= state.lastRejectedDateCount &&
    !state.recoveryAfterRejection;
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
  return !!date && dateBelongsToCity(state, date) && !isConfessionOnCooldown(state, date) &&
    meetsDateConditions(state, date);
}

/** Count completed ordinary dates and up to three real recovery conversations. */
export function completedDateCount(state: GameState): number {
  const ordinary = state.playedDateIds.filter((id) => dates.some((date) => date.id === id && date.kind === "normal")).length;
  return ordinary + state.completedRecoveryCount;
}

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

export function canConfessSuccessfully(state: GameState): boolean {
  return (
    state.affection >= progression.confession.minAffection &&
    state.trust >= progression.confession.minTrust &&
    state.spark >= progression.confession.minSpark &&
    completedDateCount(state) >= progression.confession.minCompletedDates
  );
}

export function confessionResult(state: GameState): "accepted" | "deferred" | "rejected" {
  if (canConfessSuccessfully(state)) return "accepted";
  return state.affection >= progression.stages[2].minAffection && state.trust >= progression.stages[2].minTrust
    ? "deferred" : "rejected";
}

/** A repeatable conversation prevents random setbacks from permanently blocking recovery. */
function canRecoverRelationship(state: GameState): boolean {
  if (state.endingReached || completedDateCount(state) === 0) return false;
  const needsRepair = !canConfessSuccessfully(state) ||
    (state.confessionStatus === "rejected" && !state.recoveryAfterRejection &&
      state.lastRejectedDateCount !== null && completedDateCount(state) <= state.lastRejectedDateCount);
  if (!needsRepair) return false;
  return !dates.some((date) => date.kind === "normal" && getDateAvailability(state, date.id).available);
}

export function isEventVisible(state: GameState, dateId: string): boolean {
  const date = dates.find((item) => item.id === dateId);
  return Boolean(
    date && dateBelongsToCity(state, date) &&
      (!date.recovery || canRecoverRelationship(state)) &&
      (!state.endingReached || date.kind === "normal" || date.allowAfterEnding) &&
      !untilReached(state, date) &&
      (date.kind === "normal"
        ? !state.playedDateIds.includes(dateId) && meets(state, date.when)
        : state.unlockedEventIds.includes(dateId) || meetsDateConditions(state, date)),
  );
}

export function getDateAvailability(
  state: GameState,
  dateId: string,
): Availability {
  const date = dates.find((item) => item.id === dateId);
  if (!date) return { available: false, reason: "デートが見つかりません。" };
  if (!dateBelongsToCity(state, date)) return { available: false, reason: "この街では出かけられません。" };
  if (date.recovery && !canRecoverRelationship(state))
    return { available: false, reason: "今は別のひとときを選べます。" };
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
  // top-level parts of `when`), a reached `until`; any other unmet part gives
  // the general reason below.
  const parts: Leaf[] = !date.when ? [] : "all" in date.when ? date.when.all.filter(isLeaf) : isLeaf(date.when) ? [date.when] : [];
  if (parts.some((part) => "cityCompleted" in part && !meets(state, part)))
    return {
      available: false,
      reason: "都市の旅を終えると、このデートに誘えます。",
    };
  if (parts.some((part) => "episodeCompleted" in part && !meets(state, part)))
    return { available: false, reason: "旅を進めると、この場所に誘えます。" };
  if (untilReached(state, date))
    return { available: false, reason: "この機会は過ぎました。" };
  if (isConfessionOnCooldown(state, date))
    return { available: false, reason: "新しいひとときを過ごしてから、もう一度話せます。" };
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

