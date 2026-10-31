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

/** Validate the ordered city route while keeping episode and city rewards distinct. */
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
  unique(journey.storyBattles.map((encounter) => encounter.battleId), "story battle");
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
  const entry = journey.episodes.find(
    (episode) => episode.id === journey.entryEpisodeId,
  )!;
  if (entry.requiredEpisodeIds.length || journey.episodes[0].id !== entry.id)
    throw new Error("Entry episode must begin the route without prerequisites");
  const finales = journey.episodes.filter(
    (episode) => episode.kind === "city_finale",
  );
  unique(
    finales.map((episode) => episode.cityId),
    "city finale",
  );
  let previousStoryPosition = -1;
  for (const encounter of journey.storyBattles) {
    const after = journey.episodes.findIndex((episode) => episode.id === encounter.afterEpisodeId);
    const before = journey.episodes.findIndex((episode) => episode.id === encounter.beforeEpisodeId);
    const battle = battles.find((item) => item.id === encounter.battleId);
    if (after < 0 || before !== after + 1 || after < previousStoryPosition ||
      !journey.episodes[before].requiredEpisodeIds.includes(encounter.afterEpisodeId))
      throw new Error(`Unknown or unordered story battle position: ${encounter.battleId}`);
    if (!battle?.reasoning || journey.episodes.some((episode) => episode.battleId === encounter.battleId) ||
      !landmarks.some((landmark) => landmark.id === battle.landmarkId && landmark.cityId === journey.episodes[after].cityId))
      throw new Error(`Invalid story battle: ${encounter.battleId}`);
    previousStoryPosition = after;
  }
  for (const [index, episode] of journey.episodes.entries()) {
    unique(episode.requiredEpisodeIds, "episode prerequisite");
    for (const required of episode.requiredEpisodeIds) {
      const prerequisiteIndex = journey.episodes.findIndex(
        (item) => item.id === required,
      );
      if (prerequisiteIndex < 0 || prerequisiteIndex >= index)
        throw new Error(
          `Unknown or unordered episode prerequisite: ${episode.id}`,
        );
    }
    if (
      index > 0 &&
      !episode.requiredEpisodeIds.includes(journey.episodes[index - 1].id)
    )
      throw new Error(`Episode must follow the preceding stop: ${episode.id}`);
    const landmark = landmarks.find((item) => item.id === episode.landmarkId);
    const battle = battles.find((item) => item.id === episode.battleId);
    if (episode.cityId !== city.id || episode.legacyChapterId !== city.id) {
      throw new Error(`Unknown episode city/chapter: ${episode.id}`);
    }
    if (episode.kind === "city_finale") {
      const stops = journey.episodes.filter(
        (item) => item.cityId === episode.cityId && item.kind !== "city_finale",
      );
      if (
        index !== journey.episodes.length - 1 ||
        !battle ||
        battle.scope !== "city_finale" ||
        battle.cityId !== episode.cityId ||
        episode.landmarkId !== null ||
        episode.requiredEpisodeIds.length !== stops.length ||
        !stops.every((stop) => episode.requiredEpisodeIds.includes(stop.id))
      )
        throw new Error(
          `City finale must require every sightseeing episode: ${episode.id}`,
        );
    } else {
      if (
        !landmark ||
        landmark.cityId !== episode.cityId ||
        !battle ||
        battle.scope ||
        landmark.battleId !== battle.id ||
        battle.landmarkId !== landmark.id
      )
        throw new Error(`Episode tourism/battle mismatch: ${episode.id}`);
    }
    const rules = journey.rewards.filter(
      (rule) => rule.episodeId === episode.id,
    );
    const triggers =
      episode.kind === "city_finale"
        ? ["battle_complete", "battle_score", "city_clear"]
        : ["guide_read", "battle_complete", "battle_score", "episode_clear"];
    if (rules.some((rule) => !triggers.includes(rule.trigger)))
      throw new Error(`Reward trigger does not fit the episode: ${episode.id}`);
    for (const trigger of triggers) {
      if (rules.filter((rule) => rule.trigger === trigger).length !== 1) {
        throw new Error(`Episode needs one ${trigger} reward: ${episode.id}`);
      }
    }
    const quiz = battle ? quizzes[battle.quizId] : undefined;
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
