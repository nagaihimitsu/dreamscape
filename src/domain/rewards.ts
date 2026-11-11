import { z } from "zod";
import { allRewardRules, balance, episodes } from "../content";
import type { GameState } from "./game";
import { rewardBattleId } from "./reward-rules";

export const pendingApRewardSchema = z
  .object({
    rewardId: z.string().min(1),
    earnedAp: z.number().int().positive().max(balance.apCap),
    remainingAp: z.number().int().positive(),
  })
  .strict()
  .refine((item) => item.remainingAp <= item.earnedAp);
export const rewardCreditSchema = z
  .object({
    rewardId: z.string().min(1),
    earnedAp: z.number().int().positive().max(balance.apCap),
    creditedAp: z.number().int().nonnegative(),
    pendingAp: z.number().int().nonnegative(),
  })
  .strict()
  .refine((item) => item.earnedAp === item.creditedAp + item.pendingAp);
export const battleRewardReceiptSchema = z
  .object({
    battleRunId: z.string().min(1),
    entries: z.array(rewardCreditSchema),
  })
  .strict();
export type RewardCredit = z.infer<typeof rewardCreditSchema>;

/** Record each entitlement once. A full wallet defers AP instead of discarding it. No revision change here. */
export function earnRewards(
  state: GameState,
  rewardIds: string[],
  creditNow = true,
): { state: GameState; entries: RewardCredit[] } {
  let next = state;
  const entries: RewardCredit[] = [];
  for (const rewardId of rewardIds) {
    if (next.claimedRewardIds.includes(rewardId)) continue;
    const rule = allRewardRules.find((item) => item.id === rewardId);
    if (!rule) throw new Error("報酬の定義が見つかりません。");
    const creditedAp = creditNow
      ? Math.min(rule.ap, balance.apCap - next.ap)
      : 0;
    const pendingAp = rule.ap - creditedAp;
    entries.push({ rewardId, earnedAp: rule.ap, creditedAp, pendingAp });
    next = {
      ...next,
      ap: next.ap + creditedAp,
      claimedRewardIds: [...next.claimedRewardIds, rewardId],
      pendingApRewards: pendingAp
        ? [
            ...next.pendingApRewards,
            { rewardId, earnedAp: rule.ap, remainingAp: pendingAp },
          ]
        : next.pendingApRewards,
    };
  }
  return { state: next, entries };
}

/**
 * The AP of a tag that gives AP (`# ap: +N`, `# on_done: ap +N`; stage 3a), by its `scene_tag` rule:
 * up to the cap into the wallet, the rest stored as "<rule ID>@<revision>" (the revision the action
 * saves), like earnRewards but without claimedRewardIds: a tag gives its AP each time it is newly
 * played (a repeated scene, a 「また今度」 choice; A24). The caller applies it in the action that
 * passes the choice to Ink or closes the scene, so a reload or a second tap never gives it twice.
 */
export function earnSceneTagAp(state: GameState, ruleId: string, revision: number): GameState {
  const rule = allRewardRules.find((item) => item.id === ruleId && item.trigger === "scene_tag");
  if (!rule) throw new Error("報酬の定義が見つかりません。");
  const creditedAp = Math.min(rule.ap, balance.apCap - state.ap);
  const pendingAp = rule.ap - creditedAp;
  const rewardId = `${ruleId}@${revision}`;
  if (pendingAp && state.pendingApRewards.some((item) => item.rewardId === rewardId)) throw new Error("未受取の報酬が重複しています。");
  return {
    ...state,
    ap: state.ap + creditedAp,
    pendingApRewards: pendingAp ? [...state.pendingApRewards, { rewardId, earnedAp: rule.ap, remainingAp: pendingAp }] : state.pendingApRewards,
  };
}
/** A stored tag AP's record ("<rule ID>@<revision>"): checked by its shape only (its rule may have changed since). */
export const SCENE_TAG_PENDING = /^[a-z][a-z0-9_]*@\d+$/u;
/** The rule ID of a stored AP record (before the @ of a tag's AP). */
export const pendingRuleId = (rewardId: string) => rewardId.split("@")[0];

/** Pay only stored remainders. Their original amounts survive later balance-data tuning. */
export function settlePendingAp(state: GameState): GameState {
  let ap = state.ap;
  const pendingApRewards: GameState["pendingApRewards"] = [];
  for (const reward of state.pendingApRewards) {
    const credited = Math.min(reward.remainingAp, balance.apCap - ap);
    ap += credited;
    if (reward.remainingAp > credited)
      pendingApRewards.push({
        ...reward,
        remainingAp: reward.remainingAp - credited,
      });
  }
  return ap === state.ap ? state : { ...state, ap, pendingApRewards };
}

/** The 「受け取る」 button for stored AP: something is stored and the wallet is below its cap. */
export function canClaimPendingRewards(state: GameState): boolean {
  return state.pendingApRewards.length > 0 && state.ap < balance.apCap;
}

export function claimPendingRewards(
  state: GameState,
  expectedRevision: number,
): GameState {
  if (
    state.revision !== expectedRevision ||
    state.activeDate ||
    state.activeEpilogue ||
    state.activeTourism ||
    state.activeEncounter ||
    (state.activeBattle && state.activeBattle.phase !== "result")
  )
    return state;
  const next = settlePendingAp(state);
  return next === state ? state : { ...next, revision: state.revision + 1 };
}

export function validateRewardState(state: GameState): void {
  const ids = state.pendingApRewards.map((item) => item.rewardId);
  if (new Set(ids).size !== ids.length)
    throw new Error("未受取の報酬が重複しています。");
  for (const item of state.pendingApRewards) {
    // A tag's AP: its shape only, whatever its rule became (the earned and remaining AP are in the record).
    if (item.rewardId.includes("@")) {
      if (!SCENE_TAG_PENDING.test(item.rewardId)) throw new Error("未受取の報酬記録が一致しません。");
      continue;
    }
    const rule = allRewardRules.find((entry) => entry.id === item.rewardId);
    if (!rule || rule.trigger === "scene_tag" || !state.claimedRewardIds.includes(item.rewardId))
      throw new Error("未受取の報酬記録が一致しません。");
  }
  const receipt = state.battleRewardReceipt;
  if (!receipt) return;
  if (
    !state.activeBattle ||
    state.activeBattle.phase !== "result" ||
    receipt.battleRunId !== state.activeBattle.runId
  )
    throw new Error("クイズの報酬記録が一致しません。");
  const episode = episodes.find(
    (item) => item.battleId === state.activeBattle?.battleId,
  );
  const battleRules = allRewardRules.filter((rule) => rewardBattleId(rule) === state.activeBattle?.battleId);
  if (!episode && !battleRules.length) throw new Error("このクイズに報酬はありません。");
  if (
    new Set(receipt.entries.map((item) => item.rewardId)).size !==
    receipt.entries.length
  )
    throw new Error("クイズの報酬が重複しています。");
  for (const entry of receipt.entries) {
    if (
      !battleRules.some(
        (rule) =>
          rule.id === entry.rewardId &&
          rule.trigger !== "guide_read",
      ) ||
      !state.claimedRewardIds.includes(entry.rewardId)
    )
      throw new Error("受け取った報酬の定義が一致しません。");
    const pending = state.pendingApRewards.find(
      (item) => item.rewardId === entry.rewardId,
    );
    if (
      pending &&
      (pending.earnedAp !== entry.earnedAp ||
        pending.remainingAp > entry.pendingAp)
    )
      throw new Error("報酬の残額が一致しません。");
  }
}
