import type { JourneyConfig } from "../src/content/journey-schemas";
import type {
  BattleDefinition,
  QuizDefinition,
  TrialMilestone,
} from "../src/content/schemas";
import type { LandmarkDefinition } from "../src/content/tourism-schemas";

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}

/** Validate integration references without changing the existing scenario or quiz contracts. */
export function validateJourney(
  journey: JourneyConfig,
  city: {
    id: string;
    firstClearReward: { rewardSourceId: string; ap: number };
  },
  apCap: number,
  landmarks: LandmarkDefinition[],
  battles: BattleDefinition[],
  quizzes: Record<string, QuizDefinition>,
  trialMilestones: TrialMilestone[],
): void {
  unique(
    journey.episodes.map((episode) => episode.id),
    "episode ID",
  );
  unique(
    journey.episodes.map((episode) => episode.battleId),
    "episode battle",
  );
  unique(
    journey.rewards.map((rule) => rule.id),
    "journey reward ID",
  );
  unique(
    [
      ...journey.rewards.map((rule) => rule.id),
      ...trialMilestones.map((rule) => rule.rewardSourceId),
    ],
    "journey/trial reward ID",
  );
  if (
    !journey.episodes.some((episode) => episode.id === journey.entryEpisodeId)
  ) {
    throw new Error("Unknown entry episode");
  }
  for (const episode of journey.episodes) {
    const landmark = landmarks.find((item) => item.id === episode.landmarkId);
    const battle = battles.find((item) => item.id === episode.battleId);
    if (episode.cityId !== city.id || episode.legacyChapterId !== city.id) {
      throw new Error(`Unknown episode city/chapter: ${episode.id}`);
    }
    if (
      !landmark ||
      landmark.cityId !== episode.cityId ||
      !battle ||
      landmark.battleId !== battle.id ||
      battle.landmarkId !== landmark.id
    ) {
      throw new Error(`Episode tourism/battle mismatch: ${episode.id}`);
    }
    const rules = journey.rewards.filter(
      (rule) => rule.episodeId === episode.id,
    );
    for (const trigger of [
      "guide_read",
      "battle_complete",
      "battle_score",
      "episode_clear",
    ]) {
      if (rules.filter((rule) => rule.trigger === trigger).length !== 1) {
        throw new Error(`Episode needs one ${trigger} reward: ${episode.id}`);
      }
    }
    const quiz = quizzes[battle.quizId];
    for (const rule of rules) {
      if (rule.ap > apCap)
        throw new Error(`Journey reward exceeds AP cap: ${rule.id}`);
      if (
        rule.minScore !== null &&
        (!quiz || rule.minScore > quiz.questions.length)
      ) {
        throw new Error(`Unreachable score reward: ${rule.id}`);
      }
    }
  }
  for (const rule of journey.rewards) {
    if (!journey.episodes.some((episode) => episode.id === rule.episodeId)) {
      throw new Error(`Unknown reward episode: ${rule.id}`);
    }
    if (
      rule.id === city.firstClearReward.rewardSourceId &&
      (rule.trigger !== "episode_clear" || rule.ap !== city.firstClearReward.ap)
    ) {
      throw new Error(
        "Legacy chapter reward must keep its ID, trigger and amount",
      );
    }
  }
  // Exactly one trial episode inherits the Phase 1–4 reward ID. It is not a new city-clear reward.
  if (
    journey.rewards.filter(
      (rule) => rule.id === city.firstClearReward.rewardSourceId,
    ).length !== 1
  ) {
    throw new Error("Missing legacy chapter reward alias");
  }
}
