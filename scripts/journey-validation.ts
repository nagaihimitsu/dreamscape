import { getAllRewardRules, type JourneyConfig, type RewardRule } from "../src/content/journey-schemas";
import type {
  BattleDefinition,
  QuizDefinition,
} from "../src/content/schemas";
import type { LandmarkDefinition } from "../src/content/tourism-schemas";

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}

function validateRewardAmount(rule: RewardRule, quiz: QuizDefinition | undefined, apCap: number) {
  if (rule.ap > apCap)
    throw new Error(`Journey reward exceeds AP cap: ${rule.id}`);
  if (rule.minScore !== null && (!quiz || rule.minScore > quiz.questions.length))
    throw new Error(`Unreachable score reward: ${rule.id}`);
}

/** Validate independent stops and prerequisites while keeping rewards distinct. */
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
      ...journey.storyBattles.flatMap((battle) => battle.completionReward ? [battle.completionReward.id] : []),
    ],
    "journey reward ID",
  );
  // The city's first episode is where a new arrival begins.
  if (journey.episodes[0].requiredEpisodeIds.length)
    throw new Error("Entry episode must begin the route without prerequisites");
  const finales = journey.episodes.filter(
    (episode) => episode.kind === "city_finale",
  );
  unique(
    finales.map((episode) => episode.cityId),
    "city finale",
  );
  for (const encounter of journey.storyBattles) {
    const battle = battles.find((item) => item.id === encounter.battleId);
    if (encounter.completionReward && encounter.completionReward.ap > apCap)
      throw new Error(`Journey reward exceeds AP cap: ${encounter.completionReward.id}`);
    unique(encounter.requiredEpisodeIds, "story battle prerequisite");
    if (encounter.requiredEpisodeIds.some((id) => !journey.episodes.some((episode) => episode.id === id && episode.kind !== "city_finale")))
      throw new Error(`Unknown story battle prerequisite: ${encounter.battleId}`);
    if (!battle?.reasoning || journey.episodes.some((episode) => episode.battleId === encounter.battleId) ||
      !landmarks.some((landmark) => landmark.id === battle.landmarkId && landmark.cityId === city.id))
      throw new Error(`Invalid story battle: ${encounter.battleId}`);
    const rules = getAllRewardRules(journey).filter((rule) => rule.battleId === encounter.battleId);
    unique(rules.map((rule) => rule.trigger), "story battle reward trigger");
    for (const rule of rules) {
      if (rule.trigger === "city_clear")
        throw new Error(`Reward trigger does not fit the story battle: ${encounter.battleId}`);
      validateRewardAmount(rule, quizzes[battle.quizId], apCap);
    }
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
    const landmark = landmarks.find((item) => item.id === episode.landmarkId);
    const battle = battles.find((item) => item.id === episode.battleId);
    if (episode.cityId !== city.id) {
      throw new Error(`Unknown episode city: ${episode.id}`);
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
      const count = rules.filter((rule) => rule.trigger === trigger).length;
      // A city whose first-clear AP is 0 may leave the episode-clear reward
      // unspecified; a positive first-clear AP needs exactly one per episode.
      const optionalEpisodeReward = trigger === "episode_clear" && city.firstClearReward.ap === 0;
      if (optionalEpisodeReward ? count > 1 : count !== 1) {
        throw new Error(`Episode needs one ${trigger} reward: ${episode.id}`);
      }
    }
    const quiz = battle ? quizzes[battle.quizId] : undefined;
    for (const rule of rules) validateRewardAmount(rule, quiz, apCap);
  }
  for (const rule of journey.rewards) {
    if (rule.episodeId !== undefined && !journey.episodes.some((episode) => episode.id === rule.episodeId)) {
      throw new Error(`Unknown reward episode: ${rule.id}`);
    }
    if (rule.battleId !== undefined && !journey.storyBattles.some((battle) => battle.battleId === rule.battleId))
      throw new Error(`Unknown reward story battle: ${rule.id}`);
    if (
      rule.id === city.firstClearReward.rewardSourceId &&
      (rule.episodeId === undefined || rule.trigger !== "episode_clear" || rule.ap !== city.firstClearReward.ap)
    ) {
      throw new Error(
        "First-clear reward must keep its ID, trigger and amount",
      );
    }
  }
  // A positive first-clear AP is granted by exactly one episode-clear rule with
  // the city's reward ID. It is not the city-clear reward.
  const firstClearRules = journey.rewards.filter((rule) => rule.id === city.firstClearReward.rewardSourceId);
  if (city.firstClearReward.ap === 0 ? firstClearRules.length !== 0 : firstClearRules.length !== 1) {
    throw new Error("Missing first-clear reward rule");
  }
}
