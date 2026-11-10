import { z } from "zod";
import { occasionSchema } from "./occasion-state";
import { balance } from "../content";
import { responseProfileSchema } from "../content/schemas";
import { storyFrameSchema } from "../story/runtime";
import { DAY_END } from "./travel";
import { activeEncounterSchema } from "./encounter-state";
import { stableContentId } from "./stable-id";
import { activeEpilogueSchema } from "./epilogue";
import { activeTourismSchema } from "./tourism";
import { battleRewardReceiptSchema, pendingApRewardSchema } from "./rewards";
import { activeBattleSchema, battleRecordSchema } from "./battle";

/** The only saved game format this build reads; older versions are not migrated. */
export const GAME_STATE_VERSION = 18;

const uniqueStrings = z
  .array(z.string().min(1))
  .refine((items) => new Set(items).size === items.length);
export const nameSchema = z.string().trim().min(1).max(balance.maxNameLength);
const relationshipValuesSchema = z.object({
  affection: z.number().int(), trust: z.number().int(), spark: z.number().int(),
}).strict();
const romanceRollTicketSchema = z.object({
  reaction: z.number().int().min(0).max(9999),
  affection: z.number().int().min(0).max(9999),
  trust: z.number().int().min(0).max(9999),
  spark: z.number().int().min(0).max(9999),
}).strict();
const resolvedChoiceSchema = z.object({
  choiceIndex: z.number().int().nonnegative(),
  /** Today's date effect (`# effect:`), or the option of a date written with tags (`# option:` and `# profile:`; stage 3a). */
  effectId: z.string().min(1).optional(),
  optionId: z.string().min(1).optional(),
  before: relationshipValuesSchema,
  result: z.enum(["positive", "negative"]),
  chance: z.number().min(0).max(100),
  deltas: relationshipValuesSchema,
}).strict();
const responseSnapshotSchema = z.object({
  profiles: z.array(responseProfileSchema).min(1),
  effectProfiles: z.record(stableContentId, stableContentId),
}).strict().refine(({ profiles, effectProfiles }) => {
  const ids = new Set(profiles.map((profile) => profile.id));
  return ids.size === profiles.length && Object.values(effectProfiles).every((id) => ids.has(id));
}, "保存された恋愛リアクション設定が不正です。");
const activeDateSchema = z.object({
  dateId: z.string(),
  runId: z.string(),
  replay: z.boolean(),
  storyState: z.string().min(1),
  storyHash: z.string(),
  frame: storyFrameSchema,
  /** The romance choices made (the random tickets used; the date's choiceCount at its end). */
  choiceCount: z.number().int().nonnegative(),
  /** Every choice passed to Ink, the in-scene choices of helper knots included (the saved Ink's turn; stage 3a). */
  turnCount: z.number().int().nonnegative(),
  step: z.number().int().positive(),
  appliedEffectIds: uniqueStrings,
  pendingOutcome: z.enum(["accepted", "deferred", "rejected"]).nullable(),
  // Confession conversations use fixed effects; other events use saved random tickets.
  resolutionMode: z.enum(["fixed", "random_v1"]),
  randomPlan: z.array(romanceRollTicketSchema),
  resolvedChoices: z.array(resolvedChoiceSchema),
  responseSnapshot: responseSnapshotSchema.nullable(),
}).strict();
const travelStateSchema = z.object({
  currentPlaceId: stableContentId,
  hotelPlaceId: stableContentId,
  day: z.number().int().positive().safe(),
  // Present only for journeys with a configured start weekday. Day one of the
  // journey is fictional; it is not the device's real-world date.
  calendar: z.object({
    journeyDay: z.number().int().positive().safe(),
    cityStartJourneyDay: z.number().int().positive().safe(),
    startWeekday: z.number().int().min(0).max(6),
  }).strict().optional(),
  minute: z.number().int().min(540).max(1980),
  returnReserve: z.number().int().nonnegative().safe(),
  returnDeadline: z.literal(DAY_END),
  activeEvent: z.object({
    eventId: stableContentId,
    placeId: stableContentId,
    endMinute: z.number().int().min(540).max(1320),
  }).strict().nullable(),
  // Rental transport modes rented in the current city (src/domain/transport.ts);
  // a rental lasts until the party leaves the city.
  rentedModeIds: uniqueStrings,
  // Rides by vehicle in the current city, per declared mode other than walking
  // (beginTravelEvent counts a trip that changes place; no key = no ride yet).
  rideCounts: z.record(stableContentId, z.number().int().positive().safe()),
  // Story flags that last the day or the stay in this city (common condition system, stage 3: declared in
  // progression/story.json, set by encounter effects, cleared by sleeping and departing). None is declared yet.
  temporaryFlags: uniqueStrings,
}).strict().superRefine((travel, context) => {
  if (travel.calendar && travel.calendar.journeyDay - travel.calendar.cityStartJourneyDay + 1 !== travel.day)
    context.addIssue({ code: "custom", message: "Travel day and journey calendar disagree", path: ["calendar"] });
});

const tourBase = {
  tourId: stableContentId,
  offerId: stableContentId,
  pricePaid: z.number().int().nonnegative().safe(),
  bookedDay: z.number().int().positive().safe(),
};
const tourRecordSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("booked"), ...tourBase }).strict(),
  z.object({ status: z.literal("running"), ...tourBase, contentHash: z.string().min(1), step: z.number().int().nonnegative().safe() }).strict(),
]);

export const gameStateSchema = z.object({
  schemaVersion: z.literal(GAME_STATE_VERSION),
  revision: z.number().int().nonnegative(),
  playerName: nameSchema,
  heroineName: nameSchema,
  ap: z.number().int().min(0).max(balance.apCap),
  affection: z.number().int(),
  romanceStage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  claimedRewardIds: uniqueStrings,
  playedDateIds: uniqueStrings,
  memories: uniqueStrings,
  activeDate: activeDateSchema.nullable(),
  unlockedEventIds: uniqueStrings,
  confessionStatus: z.enum(["none", "deferred", "rejected", "accepted"]),
  endingReached: z.boolean(),
  activeBattle: activeBattleSchema.nullable(),
  battleRecords: z.array(battleRecordSchema),
  activeTourism: activeTourismSchema.nullable(),
  discoveredClueIds: uniqueStrings,
  visitedLandmarkIds: uniqueStrings,
  completedEpisodeIds: uniqueStrings,
  completedCityIds: uniqueStrings,
  completedGuideIds: uniqueStrings,
  pendingApRewards: z.array(pendingApRewardSchema),
  battleRewardReceipt: battleRewardReceiptSchema.nullable(),
  activeEpilogue: activeEpilogueSchema.nullable(),
  viewedEpilogueCityIds: uniqueStrings,
  trust: z.number().int(),
  spark: z.number().int(),
  lastRejectedDateCount: z.number().int().nonnegative().nullable(),
  recoveryAfterRejection: z.boolean(),
  completedRecoveryCount: z.number().int().min(0).max(3),
  travelBudget: z.number().int().nonnegative().safe(),
  inventory: z.record(stableContentId, z.enum(["held", "gifted", "used", "left_behind"])),
  completedEncounterIds: uniqueStrings,
  // Every encounter finished, with any choice (「また今度」 included); completedEncounterIds is a subset.
  seenEncounterIds: uniqueStrings,
  // The encounter and option that gave away or used each gifted/used item, written with its inventory status.
  // A scene's `# on_done: use` records the scene without an option (stage 3a); the field keeps its name.
  itemUses: z.record(stableContentId, z.object({ encounterId: stableContentId, optionId: stableContentId.optional() }).strict()),
  // The authored story state of the common condition system (stage 3: lines → reached step, permanent flags,
  // declared in progression/story.json and written by encounter effects). None is declared yet, so it stays empty.
  storyProgress: z.object({ lines: z.record(stableContentId, stableContentId), flags: uniqueStrings }).strict(),
  encounterRewards: z.record(stableContentId, z.object({
    roll: z.number().int().min(0).max(9999),
    chancePercent: z.number().int().min(0).max(100),
    won: z.boolean(),
  }).strict()),
  activeEncounter: activeEncounterSchema.nullable(),
  // The moment record (stage 3b): the visit, finale or date running now, with its main group and position.
  occasion: occasionSchema.nullable(),
  // The tour system's records (tour stage 2a, save v18; src/domain/tour.ts): the tour booked or running (its offer and the price
  // paid; running: the fingerprint of its steps and the event step it is at), and the tours finished in this journey.
  tour: tourRecordSchema.nullable(),
  completedTourIds: z.array(stableContentId).refine((items) => new Set(items).size === items.length),
  currentCityId: stableContentId,
  travel: travelStateSchema,
}).strict();
export type GameState = z.infer<typeof gameStateSchema>;
export type ActiveDate = NonNullable<GameState["activeDate"]>;

/** A scene is in progress: a map event, a date, a battle, a tourism scene, an encounter, an epilogue or a moment. */
export function hasActiveScene(state: GameState): boolean {
  return !!(state.travel.activeEvent || isSceneOpen(state));
}

/**
 * Whether a scene is open (4.1): any of the scene fields, or the moment record. Every watcher that
 * starts something by itself (the city's automatic epilogue and departure, the entries of 4.2)
 * does nothing while this holds.
 */
export function isSceneOpen(state: Pick<GameState, "activeDate" | "activeBattle" | "activeTourism" | "activeEncounter" | "activeEpilogue" | "occasion">): boolean {
  return !!(state.activeDate || state.activeBattle || state.activeTourism || state.activeEncounter || state.activeEpilogue || state.occasion);
}
