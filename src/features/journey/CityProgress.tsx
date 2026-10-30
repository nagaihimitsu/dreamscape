import {
  battles,
  battleQuizzes,
  city,
  episodes,
  landmarks,
} from "../../content";
import { getEpisodeAvailability, getNextEpisode } from "../../domain/chapter";
import type { GameState } from "../../domain/game";
import "./city.css";

export function CityProgress({
  game,
  onStart,
  onEpilogue,
  showNext = true,
}: {
  game: GameState;
  onStart: (id: string) => void;
  onEpilogue: (cityId: string) => void;
  showNext?: boolean;
}) {
  const next = getNextEpisode(game);
  const stops = episodes.filter((episode) => episode.kind !== "city_finale");
  const completed = stops.filter((episode) =>
    game.completedEpisodeIds.includes(episode.id),
  ).length;
  const cityCompleted = game.completedCityIds.includes(city.id);
  return (
    <section
      className="city-progress paper"
      data-testid="city-progress"
      aria-label={`${city.nameJa}の旅の記録`}
    >
      <div className="section-meta">
        <h2>{city.nameJa}の旅</h2>
        <span className="pill">
          {cityCompleted ? "都市クリア" : `観光 ${completed} / ${stops.length}`}
        </span>
      </div>
      {showNext && next && (
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
      {cityCompleted && (
        <div className="city-complete" data-testid="city-complete">
          <p>
            四つの場所を巡り、街の最後の対決を終えました。見つけたことも、交わした言葉も、この旅の記録に。
          </p>
          <button
            className="secondary"
            data-testid="city-epilogue"
            onClick={() => onEpilogue(city.id)}
          >
            {game.viewedEpilogueCityIds.includes(city.id)
              ? "エピローグを読み返す"
              : "エピローグを読む"}
          </button>
        </div>
      )}
      <details className="city-records">
        <summary>観光地・発見・戦績を見る</summary>
        <ol>
          {episodes.map((episode, index) => {
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
                  <button
                    className="text-button"
                    data-testid={`city-visit-${episode.id}`}
                    disabled={!availability.available}
                    onClick={() => onStart(episode.id)}
                  >
                    {cleared
                      ? episode.kind === "city_finale"
                        ? "再戦する"
                        : "もう一度訪ねる"
                      : episode.kind === "city_finale"
                        ? "対決へ進む"
                        : "訪ねる"}
                  </button>
                  {!availability.available && (
                    <p className="fine-print">{availability.reason}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}
