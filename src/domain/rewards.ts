import { z } from "zod";
import { balance, episodes, rewardRules } from "../content";
import type { GameState } from "./game";

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
    const rule = rewardRules.find((item) => item.id === rewardId);
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

export function claimPendingRewards(
  state: GameState,
  expectedRevision: number,
): GameState {
  if (
    state.revision !== expectedRevision ||
    state.activeDate ||
    state.activeTourism ||
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
    if (
      !rewardRules.some((rule) => rule.id === item.rewardId) ||
      !state.claimedRewardIds.includes(item.rewardId)
    )
      throw new Error("未受取の報酬記録が一致しません。");
  }
  const receipt = state.battleRewardReceipt;
  if (!receipt) return;
  if (
    !state.activeBattle ||
    state.activeBattle.phase !== "result" ||
    receipt.battleRunId !== state.activeBattle.runId
  )
    throw new Error("バトルの報酬記録が一致しません。");
  const episode = episodes.find(
    (item) => item.battleId === state.activeBattle?.battleId,
  );
  if (!episode) throw new Error("この対決に章報酬はありません。");
  if (
    new Set(receipt.entries.map((item) => item.rewardId)).size !==
    receipt.entries.length
  )
    throw new Error("バトルの報酬が重複しています。");
  for (const entry of receipt.entries) {
    if (
      !rewardRules.some(
        (rule) =>
          rule.id === entry.rewardId &&
          rule.trigger !== "guide_read" &&
          rule.episodeId === episode.id,
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
