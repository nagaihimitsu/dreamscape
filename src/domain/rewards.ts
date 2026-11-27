import { z } from "zod";
import { allRewardRules, episodes } from "../content";
import type { GameState } from "./game";
import { rewardBattleId } from "./reward-rules";
import { rewardAp } from "./difficulty";

export const rewardCreditSchema = z
  .object({
    rewardId: z.string().min(1),
    earnedAp: z.number().int().positive(),
  })
  .strict();
export const battleRewardReceiptSchema = z
  .object({
    battleRunId: z.string().min(1),
    entries: z.array(rewardCreditSchema),
  })
  .strict();
export type RewardCredit = z.infer<typeof rewardCreditSchema>;

/** Record each entitlement once and add its AP to the wallet (no cap: 2026-11-27 user decision). No revision change here. */
export function earnRewards(
  state: GameState,
  rewardIds: string[],
): { state: GameState; entries: RewardCredit[] } {
  let next = state;
  const entries: RewardCredit[] = [];
  for (const rewardId of rewardIds) {
    if (next.claimedRewardIds.includes(rewardId)) continue;
    const rule = allRewardRules.find((item) => item.id === rewardId);
    if (!rule) throw new Error("報酬の定義が見つかりません。");
    // The difficulty's bonus (difficulty.ts) is part of what the reward gives.
    const earnedAp = rewardAp(next, rule);
    entries.push({ rewardId, earnedAp });
    next = {
      ...next,
      ap: next.ap + earnedAp,
      claimedRewardIds: [...next.claimedRewardIds, rewardId],
    };
  }
  return { state: next, entries };
}

/**
 * The AP of a tag that gives AP (`# ap: +N`, `# on_done: ap +N`; stage 3a), by its `scene_tag` rule, into the wallet.
 * Unlike earnRewards it writes no claimedRewardIds: a tag gives its AP each time it is newly played (a repeated scene,
 * a 「また今度」 choice; A24). The caller applies it in the action that passes the choice to Ink or closes the scene,
 * so a reload or a second tap never gives it twice.
 */
export function earnSceneTagAp(state: GameState, ruleId: string): GameState {
  const rule = allRewardRules.find((item) => item.id === ruleId && item.trigger === "scene_tag");
  if (!rule) throw new Error("報酬の定義が見つかりません。");
  return { ...state, ap: state.ap + rule.ap };
}

export function validateRewardState(state: GameState): void {
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
  }
}
