import { z } from "zod";
import { balance } from "../content";
import { responseProfileSchema } from "../content/schemas";
import { storyFrameSchema } from "../story/runtime";
import { DAY_END } from "./travel";
import { activeEncounterSchema } from "./encounter-state";
import { activeEpilogueSchema } from "./epilogue";
import { activeTourismSchema } from "./tourism";
import { battleRewardReceiptSchema, pendingApRewardSchema } from "./rewards";
import {
  activeBattleSchema, legacyActiveBattleSchema, legacyBattleRecordSchema,
  phase6ActiveBattleSchema, battleRecordSchema,
} from "./battle";

const uniqueStrings = z
  .array(z.string().min(1))
  .refine((items) => new Set(items).size === items.length);
const frameSchema = storyFrameSchema;
const oldActiveSchema = z
  .object({
    dateId: z.string(),
    runId: z.string(),
    replay: z.boolean(),
    storyState: z.string().min(1),
    storyHash: z.string(),
    frame: frameSchema,
    choiceCount: z.number().int().min(0).max(2),
    step: z.number().int().positive(),
    appliedEffectIds: uniqueStrings,
  })
  .strict();
const activeDateSchema = oldActiveSchema
  .extend({
    choiceCount: z.number().int().nonnegative(),
    pendingOutcome: z.enum(["accepted", "deferred"]).nullable(),
  })
  .strict();
export const nameSchema = z.string().trim().min(1).max(balance.maxNameLength);
const oldStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    playerName: nameSchema,
    heroineName: nameSchema,
    ap: z.number().int().min(0).max(balance.apCap),
    affection: z.number().int(),
    romanceStage: z.literal(1),
    completedChapters: uniqueStrings,
    claimedRewardIds: uniqueStrings,
    playedDateIds: uniqueStrings,
    memories: uniqueStrings,
    activeDate: oldActiveSchema.nullable(),
  })
  .strict();
const phase2StateSchema = oldStateSchema
  .extend({
    schemaVersion: z.literal(2),
    romanceStage: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    activeDate: activeDateSchema.nullable(),
    unlockedEventIds: uniqueStrings,
    confessionStatus: z.enum(["none", "deferred", "accepted"]),
    endingReached: z.boolean(),
  })
  .strict();
const phase3StateSchema = phase2StateSchema
  .extend({
    schemaVersion: z.literal(3),
    activeBattle: legacyActiveBattleSchema.nullable(),
    battleRecords: z.array(legacyBattleRecordSchema),
  })
  .strict();
const phase4StateSchema = phase3StateSchema
  .extend({
    schemaVersion: z.literal(4),
    activeTourism: activeTourismSchema.nullable(),
    discoveredClueIds: uniqueStrings,
    visitedLandmarkIds: uniqueStrings,
  })
  .strict();
const phase5StateSchema = phase4StateSchema
  .extend({
    schemaVersion: z.literal(5),
    completedEpisodeIds: uniqueStrings,
    completedCityIds: uniqueStrings,
    completedGuideIds: uniqueStrings,
    pendingApRewards: z.array(pendingApRewardSchema),
    battleRewardReceipt: battleRewardReceiptSchema.nullable(),
  })
  .strict();
const phase6StateSchema = phase5StateSchema
  .extend({
    schemaVersion: z.literal(6),
    activeBattle: phase6ActiveBattleSchema.nullable(),
  })
  .strict();
const phase7StateSchema = phase6StateSchema
  .extend({
    schemaVersion: z.literal(7),
    activeBattle: activeBattleSchema.nullable(),
    battleRecords: z.array(battleRecordSchema),
    activeEpilogue: activeEpilogueSchema.nullable(),
    viewedEpilogueCityIds: uniqueStrings,
    legacyTrialAvailable: z.boolean(),
  })
  .strict();
const phase8StateSchema = phase7StateSchema.extend({
  schemaVersion: z.literal(8),
  trust: z.number().int(),
  spark: z.number().int(),
  lastRejectedDateCount: z.number().int().nonnegative().nullable(),
  confessionStatus: z.enum(["none", "deferred", "rejected", "accepted"]),
  activeDate: activeDateSchema.extend({ pendingOutcome: z.enum(["accepted", "deferred", "rejected"]).nullable() }).nullable(),
}).strict();
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
  effectProfiles: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.string().regex(/^[a-z][a-z0-9_]*$/)),
}).strict().refine(({ profiles, effectProfiles }) => {
  const ids = new Set(profiles.map((profile) => profile.id));
  return ids.size === profiles.length && Object.values(effectProfiles).every((id) => ids.has(id));
}, "保存された恋愛リアクション設定が不正です。");
const phase9ActiveDateSchema = activeDateSchema.extend({
  pendingOutcome: z.enum(["accepted", "deferred", "rejected"]).nullable(),
  resolutionMode: z.enum(["legacy_fixed", "random_v1"]),
  randomPlan: z.array(romanceRollTicketSchema),
  resolvedChoices: z.array(resolvedChoiceSchema),
  responseSnapshot: responseSnapshotSchema.nullable(),
}).strict();
const phase9StateSchema = phase8StateSchema.extend({
  schemaVersion: z.literal(9),
  recoveryAfterRejection: z.boolean(),
  completedRecoveryCount: z.number().int().min(0).max(3),
  activeDate: phase9ActiveDateSchema.nullable(),
}).strict();
const stableContentId = z.string().regex(/^[a-z][a-z0-9_]*$/);
const phase10StateSchema = phase9StateSchema.extend({
  schemaVersion: z.literal(10),
  travelBudget: z.number().int().nonnegative().safe(),
  inventory: z.record(stableContentId, z.enum(["held", "gifted", "used", "left_behind"])),
  completedEncounterIds: uniqueStrings,
  encounterRewards: z.record(stableContentId, z.object({
    roll: z.number().int().min(0).max(9999),
    chancePercent: z.number().int().min(0).max(100),
    won: z.boolean(),
  }).strict()),
  activeEncounter: activeEncounterSchema.nullable(),
}).strict();
const phase11StateSchema = phase10StateSchema.extend({
  schemaVersion: z.literal(11),
  updatedDateIds: uniqueStrings,
}).strict();
export const gameStateSchema = phase11StateSchema.extend({
  schemaVersion: z.literal(12),
  currentCityId: stableContentId.default("milano"),
  travel: z.object({
    currentPlaceId: stableContentId,
    hotelPlaceId: stableContentId,
    day: z.number().int().positive().safe(),
    // Optional for existing v12 saves. Day one of the journey is fictional;
    // it is not the device's real-world date.
    calendar: z.object({
      journeyDay: z.number().int().positive().safe(),
      cityStartJourneyDay: z.number().int().positive().safe(),
      startWeekday: z.number().int().min(0).max(6),
    }).strict().optional(),
    minute: z.number().int().min(540).max(1980),
    returnReserve: z.number().int().nonnegative().safe(),
    returnDeadline: z.literal(DAY_END).optional(),
    activeEvent: z.object({
      eventId: stableContentId,
      placeId: stableContentId,
      endMinute: z.number().int().min(540).max(1320),
    }).strict().nullable(),
  }).strict().superRefine((travel, context) => {
    if (travel.calendar && travel.calendar.journeyDay - travel.calendar.cityStartJourneyDay + 1 !== travel.day)
      context.addIssue({ code: "custom", message: "Travel day and journey calendar disagree", path: ["calendar"] });
  }),
}).strict();
export type GameState = z.infer<typeof gameStateSchema>;
export type ActiveDate = NonNullable<GameState["activeDate"]>;
/** Recognize only a structurally valid historical format for a non-destructive notice. */
export function isKnownLegacyGameState(input: unknown): boolean {
  if (typeof input !== "object" || input === null || !("schemaVersion" in input)) return false;
  const schemas: Record<number, z.ZodType> = {
    1: oldStateSchema, 2: phase2StateSchema, 3: phase3StateSchema,
    4: phase4StateSchema, 5: phase5StateSchema, 6: phase6StateSchema,
    7: phase7StateSchema, 8: phase8StateSchema, 9: phase9StateSchema, 10: phase10StateSchema, 11: phase11StateSchema,
  };
  const version = input.schemaVersion;
  return typeof version === "number" && !!schemas[version]?.safeParse(input).success;
}

