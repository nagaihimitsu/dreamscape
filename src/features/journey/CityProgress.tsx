import {
  battles,
  battleQuizzes,
  getCityContent,
  episodes,
  landmarks,
} from "../../content";
import { getEpisodeAvailability, getNextEpisode, getNextStoryBattle, storyBattlesForCity } from "../../domain/chapter";
import type { GameState } from "../../domain/game";
import { canReadCityEpilogue } from "../../domain/epilogue";
import type { CityProgressCounts } from "./city-progress-label";
import "./city.css";

export function CityProgress({
  game,
  onStart,
  onStoryBattle,
  onEpilogue,
  showNext = true,
}: {
  game: GameState;
  onStart: (id: string) => void;
  onStoryBattle: (id: string) => void;
  onEpilogue: (cityId: string) => void;
  showNext?: boolean;
}) {
  const { city } = getCityContent(game.currentCityId);
  const next = getNextEpisode(game);
  const nextBattle = getNextStoryBattle(game);
  const epilogue = canReadCityEpilogue(game, city.id);
  if (!showNext && !epilogue) return null;
  return (
    <section
      className="city-progress paper"
      aria-label={`${city.nameJa}の旅の記録`}
    >
      {showNext && nextBattle && (
        <div className="next-destination">
          <p className="eyebrow">旅の続き</p>
          <h3>{nextBattle.titleJa}</h3>
          <p>{nextBattle.descriptionJa}</p>
          <button
            className="primary"
            data-testid={`next-story-battle-${nextBattle.battleId}`}
            onClick={() => onStoryBattle(nextBattle.battleId)}
          >
            {nextBattle.actionLabelJa} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      {showNext && !nextBattle && next && (
        <div className="next-destination">
          <p className="eyebrow">
            {next.kind === "city_finale" ? "旅を結ぶ最後の対決" : "次の目的地"}
          </p>
          <h3>{next.titleJa}</h3>
          <p>{next.descriptionJa}</p>
          <button
            className="primary"
            data-testid={`next-episode-${next.id}`}
            onClick={() => onStart(next.id)}
          >
            {next.kind === "city_finale"
              ? "都市ボスに挑む"
              : "次の観光地へ進む"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <p className="fine-print">自由時間は、この下から楽しめます。</p>
        </div>
      )}
      {epilogue && (
        <div className="city-complete">
          <button
            className="secondary"
            data-testid="city-epilogue"
            onClick={() => onEpilogue(city.id)}
          >
            エピローグを読む
          </button>
        </div>
      )}
    </section>
  );
}

/** The current city's cleared stops and special battles (the header's progress shows them). */
export function cityProgressCounts(game: GameState): CityProgressCounts {
  const { city } = getCityContent(game.currentCityId);
  const stops = episodes.filter((episode) => episode.cityId === city.id && episode.kind !== "city_finale");
  const storyBattles = storyBattlesForCity(city.id);
  return {
    completedStops: stops.filter((episode) => game.completedEpisodeIds.includes(episode.id)).length,
    stops: stops.length,
    completedSpecialBattles: storyBattles.filter((item) => game.battleRecords.some((record) => record.battleId === item.battleId && record.attempts > 0)).length,
    specialBattles: storyBattles.length,
    cityCompleted: game.completedCityIds.includes(city.id),
  };
}

/** Journey records can be positioned independently of the progress summary. */
export function CityRecords({ game }: { game: GameState }) {
  return (
    <div className="city-records">
      <ol>
        {episodes.filter((episode) => episode.cityId === game.currentCityId).map((episode, index) => {
          const cleared = game.completedEpisodeIds.includes(episode.id);
          const availability = getEpisodeAvailability(game, episode.id);
          const landmark = landmarks.find(
            (item) => item.id === episode.landmarkId,
          );
          const battle = battles.find(
            (item) => item.id === episode.battleId,
          )!;
          const record = game.battleRecords.find(
            (item) => item.battleId === episode.battleId,
          );
          return (
            <li key={episode.id} data-testid={`city-stop-${episode.id}`}>
              <span
                className={`stop-number ${cleared ? "complete" : ""}`}
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="stop-info">
                <p className="fine-print">
                  {cleared
                    ? "クリア"
                    : availability.available
                      ? "訪問できる"
                      : "この先"}
                </p>
                <h3>{landmark?.nameJa ?? "都市フィナーレ"}</h3>
                {landmark && (
                  <p>
                    手がかり{" "}
                    {
                      landmark.clueIds.filter((id) =>
                        game.discoveredClueIds.includes(id),
                      ).length
                    }{" "}
                    / {landmark.clueIds.length}
                  </p>
                )}
                {record ? (
                  <p>
                    挑戦 {record.attempts}回 · 最高 {record.bestScore} /{" "}
                    {battleQuizzes[battle.quizId].questions.length}問
                  </p>
                ) : (
                  <p>バトル未完了</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
