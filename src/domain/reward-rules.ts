import { battles, episodes, type RewardRule } from "../content";

/** Resolve either kind of reward owner without merging their progress records. */
export function rewardBattleId(rule: RewardRule): string | undefined {
  return rule.battleId ?? episodes.find((episode) => episode.id === rule.episodeId)?.battleId;
}

export function rewardLandmarkId(rule: RewardRule): string | null | undefined {
  return rule.battleId
    ? battles.find((battle) => battle.id === rule.battleId)?.landmarkId
    : episodes.find((episode) => episode.id === rule.episodeId)?.landmarkId;
}
