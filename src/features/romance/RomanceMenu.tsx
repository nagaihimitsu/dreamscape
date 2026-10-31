import { dates, presentation, trialMilestones } from "../../content";
import {
  getDateAvailability,
  getMilestoneAvailability,
  isEventVisible,
  type GameState,
} from "../../domain/game";
import { MemoryList } from "./MemoryList";

export function withNames(text: string, game: GameState) {
  return text
    .replaceAll("{player_name}", game.playerName)
    .replaceAll("{heroine_name}", game.heroineName);
}

export function RomanceMenu({
  game,
  onChoose,
  onMilestone,
}: {
  game: GameState;
  onChoose: (id: string) => void;
  onMilestone: (id: string) => void;
}) {
  const visibleDates = dates.filter((date) => isEventVisible(game, date.id));
  const availableMoments = visibleDates.filter(
    (date) =>
      date.kind !== "normal" &&
      (!game.playedDateIds.includes(date.id) || date.repeatable),
  );
  const ordinaryDates = visibleDates.filter((date) => date.kind === "normal");
  return (
    <>
      {game.confessionStatus === "deferred" && (
        <aside className="deferred-note">
          <h2>{presentation.deferred.titleJa}</h2>
          <p>{withNames(presentation.deferred.descriptionJa, game)}</p>
        </aside>
      )}
      {availableMoments.map((date) => (
        <EventCard key={date.id} game={game} date={date} onChoose={onChoose} />
      ))}
      <p className="fine-print ap-help">APはデートに使うポイントです。</p>
      <div className="date-list">
        {ordinaryDates.map((date) => (
          <EventCard
            key={date.id}
            game={game}
            date={date}
            onChoose={onChoose}
          />
        ))}
      </div>
      {game.legacyTrialAvailable && (
        <section className="trial-progress" aria-label="試遊用の旅の進行">
          <div className="section-meta">
            <h2>旅をもう一歩</h2>
            <span className="pill">試遊専用の補助AP</span>
          </div>
          <p>
            以前の試遊から続けている旅の補助APです。各報酬は一度だけ受け取れます。観光を進めてもAPを獲得できます。
          </p>
          {trialMilestones.map((milestone) => {
            const eligibility = getMilestoneAvailability(game, milestone.id);
            const claimed = game.claimedRewardIds.includes(
              milestone.rewardSourceId,
            );
            return (
              <div className="milestone" key={milestone.id}>
                <h3>{milestone.titleJa}</h3>
                <p>{milestone.descriptionJa}</p>
                <button
                  className="secondary"
                  data-testid={`milestone-${milestone.id}`}
                  disabled={!eligibility.available}
                  onClick={() => onMilestone(milestone.id)}
                >
                  {claimed
                    ? "受け取り済み"
                    : `${milestone.titleJa}を進める ＋${milestone.ap}AP`}
                </button>
                {!claimed && !eligibility.available && (
                  <p className="fine-print">{eligibility.reason}</p>
                )}
              </div>
            );
          })}
        </section>
      )}
      {!!game.memories.length && (
        <details className="memories">
          <summary>旅のしおり · 思い出 {game.memories.length}件</summary>
          <MemoryList ids={game.memories} />
        </details>
      )}
    </>
  );
}
export function EventCard({
  game,
  date,
  onChoose,
}: {
  game: GameState;
  date: (typeof dates)[number];
  onChoose: (id: string) => void;
}) {
  const eligibility = getDateAvailability(game, date.id);
  const played = game.playedDateIds.includes(date.id);
  return (
    <article
      className={`date-card ${date.kind !== "normal" ? "invitation-card" : ""}`}
      data-testid={`event-${date.id}`}
    >
      <div className="section-meta">
        <span className="pill">
          {date.kind === "special"
            ? `${game.heroineName}からのお誘い`
            : date.kind === "confession"
              ? "大切な話"
              : date.kind === "reassurance"
                ? "もう一度、ふたりで"
                : played
                  ? "体験済み"
                  : "未体験"}
        </span>
        <span className="cost">
          {date.apCost ? `${date.apCost} AP` : "AP不要"}
        </span>
      </div>
      <h2>{date.titleJa}</h2>
      <p>{withNames(date.descriptionJa, game)}</p>
      {date.invitationJa && (
        <blockquote>{withNames(date.invitationJa, game)}</blockquote>
      )}
      <button
        className="primary"
        disabled={!eligibility.available}
        onClick={() => onChoose(date.id)}
      >
        {played && date.kind === "normal" ? "もう一度誘う" : date.actionLabelJa}
        <span aria-hidden="true"> →</span>
      </button>
      {!eligibility.available && (
        <p className="availability" role="status">
          {eligibility.reason}
        </p>
      )}
      {played && date.kind === "normal" && (
        <p className="fine-print">
          再鑑賞にもAPを使います。好感度や思い出の追加獲得はありません。
        </p>
      )}
    </article>
  );
}
