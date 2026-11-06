import { z } from "zod";
import { balance } from "../content";
import { responseProfileSchema } from "../content/schemas";
import { storyFrameSchema } from "../story/runtime";
import { DAY_END } from "./travel";
import { activeEncounterSchema } from "./encounter-state";
import { activeEpilogueSchema } from "./epilogue";
import { activeTourismSchema } from "./tourism";
import { battleRewardReceiptSchema, pendingApRewardSchema } from "./rewards";
import { activeBattleSchema, battleRecordSchema } from "./battle";

/** The only saved game format this build reads; older versions are not migrated. */
export const GAME_STATE_VERSION = 13;

const uniqueStrings = z
  .array(z.string().min(1))
  .refine((items) => new Set(items).size === items.length);
const stableContentId = z.string().regex(/^[a-z][a-z0-9_]*$/);
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
  choiceIndex: z.number().int().min(0).max(2),
  effectId: z.string().min(1),
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
  choiceCount: z.number().int().nonnegative(),
  step: z.number().int().positive(),
  appliedEffectIds: uniqueStrings,
  pendingOutcome: z.enum(["accepted", "deferred", "rejected"]).nullable(),
  // Confession conversations use fixed effects; other events use saved random tickets.
  resolutionMode: z.enum(["legacy_fixed", "random_v1"]),
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
}).strict().superRefine((travel, context) => {
  if (travel.calendar && travel.calendar.journeyDay - travel.calendar.cityStartJourneyDay + 1 !== travel.day)
    context.addIssue({ code: "custom", message: "Travel day and journey calendar disagree", path: ["calendar"] });
});

export const gameStateSchema = z.object({
  schemaVersion: z.literal(GAME_STATE_VERSION),
  revision: z.number().int().nonnegative(),
  playerName: nameSchema,
  heroineName: nameSchema,
  ap: z.number().int().min(0).max(balance.apCap),
  affection: z.number().int(),
  romanceStage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  completedChapters: uniqueStrings,
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
  encounterRewards: z.record(stableContentId, z.object({
    roll: z.number().int().min(0).max(9999),
    chancePercent: z.number().int().min(0).max(100),
    won: z.boolean(),
  }).strict()),
  activeEncounter: activeEncounterSchema.nullable(),
  currentCityId: stableContentId,
  travel: travelStateSchema,
}).strict();
export type GameState = z.infer<typeof gameStateSchema>;
export type ActiveDate = NonNullable<GameState["activeDate"]>;
