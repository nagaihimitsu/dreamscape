/** The requirements in versions 1–7, retained only to migrate saved progress. */
const legacyConfessionDates = [
  "milano_cafe_01",
  "milano_walk_01",
  "milano_invitation_01",
  "milano_night_01",
] as const;

type LegacyRomance = {
  affection: number;
  romanceStage: number;
  playedDateIds: readonly string[];
};

type RomanceThresholds = {
  stages: readonly { stage: number; minTrust: number; minSpark: number }[];
  confession: { minTrust: number; minSpark: number };
};

/** Version 1 could only store stage 1; recover the old earned stage once. */
export function legacyPhase1Stage(state: LegacyRomance): 1 | 2 | 3 | 4 {
  let stage: 1 | 2 | 3 | 4 = 1;
  if (state.affection >= 2 && state.playedDateIds.includes("milano_cafe_01")) stage = 2;
  if (state.affection >= 4 && legacyConfessionDates.slice(0, 2).every((id) => state.playedDateIds.includes(id))) stage = 3;
  if (state.affection >= 6 && legacyConfessionDates.every((id) => state.playedDateIds.includes(id))) stage = 4;
  return stage;
}

/**
 * Earlier saves recorded neither trust nor spark. Preserve the attained stage
 * and an already-earned opportunity to confess without inventing memories or
 * assigning every past choice a score. These values are used only once when
 * upgrading a validated version 1–7 save.
 */
export function legacyRomanceValues(
  state: LegacyRomance,
  progression: RomanceThresholds,
): { trust: number; spark: number; lastRejectedDateCount: null } {
  const stage = progression.stages.find((item) => item.stage === state.romanceStage);
  if (!stage) throw new Error("以前の恋愛段階を確認できません。");
  const couldConfess =
    state.romanceStage === 4 &&
    state.affection >= 8 &&
    legacyConfessionDates.every((id) => state.playedDateIds.includes(id));
  return {
    trust: Math.max(stage.minTrust, couldConfess ? progression.confession.minTrust : 0),
    spark: Math.max(stage.minSpark, couldConfess ? progression.confession.minSpark : 0),
    lastRejectedDateCount: null,
  };
}
