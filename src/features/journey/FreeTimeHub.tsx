import { dates } from "../../content";
import type { GameState } from "../../domain/game";
import { BattleEntry } from "../battle/BattleEntry";
import { EventCard, RomanceMenu } from "../romance/RomanceMenu";
import { TourismEntry } from "../tourism/TourismEntry";
import { CityProgress } from "./CityProgress";
import { PendingRewards } from "./PendingRewards";
import "./free-time-hub.css";

/** The same compact destination for an unfinished or completed romance. */
export function FreeTimeHub({
  game,
  onEnglish,
  onClaimRewards,
  onStartEpisode,
  onEpilogue,
  onChooseDate,
  onMilestone,
  onTourism,
  onBattle,
}: {
  game: GameState;
  onEnglish: () => void;
  onClaimRewards: () => void;
  onStartEpisode: (id: string) => void;
  onEpilogue: (id: string) => void;
  onChooseDate: (id: string) => void;
  onMilestone: (id: string) => void;
  onTourism: (id: string) => void;
  onBattle: (id: string) => void;
}) {
  const afterEndingDates = game.endingReached
    ? dates.filter((date) =>
        date.allowAfterEnding &&
        !(date.kind === "normal" && game.playedDateIds.includes(date.id)) &&
        (date.requiredCompletedCityIds ?? []).every((id) => game.completedCityIds.includes(id)) &&
        (date.requiredCompletedEpisodeIds ?? []).every((id) => game.completedEpisodeIds.includes(id)),
      )
    : [];

  return (
    <section className="free-time-hub paper" data-testid="free-time-hub">
      <header className="free-time-hub-heading">
        <h1>ふたりの自由時間</h1>
        {game.endingReached && <span>交際中</span>}
      </header>

      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} />

      <div className="free-time-tools">
        <button className="secondary" onClick={onEnglish}>
          英語ノートを開く
        </button>
        <details className="revisit-menu">
          <summary>旅先を再訪する</summary>
          <p className="fine-print">初回報酬は再取得できません。</p>
          <TourismEntry game={game} onStart={onTourism} />
          <BattleEntry game={game} onStart={onBattle} />
        </details>
      </div>

      {(!game.endingReached || afterEndingDates.length > 0) && (
        <section className="free-time-romance" aria-label="デート">
          <h2>デート</h2>
          {game.endingReached ? <div className="date-list">{afterEndingDates.map((date) => (
            <EventCard key={date.id} game={game} date={date} onChoose={onChooseDate} />
          ))}</div> : (
            <RomanceMenu game={game} onChoose={onChooseDate} onMilestone={onMilestone} />
          )}
        </section>
      )}

      <PendingRewards game={game} onClaim={onClaimRewards} compact />
    </section>
  );
}
