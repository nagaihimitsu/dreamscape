import { dates, presentation, trialMilestones } from "../../content";
import {
  getDateAvailability,
  getMilestoneAvailability,
  isEventVisible,
  type GameState,
} from "../../domain/game";
import { MemoryList } from "./MemoryList";
import "./romance-menu.css";

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
      {availableMoments.length === 0 && ordinaryDates.length === 0 && (
        <p className="fine-print">今選べるデートはありません。旅を続けましょう。</p>
      )}
      {ordinaryDates.length > 0 && (
        <>
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
        </>
      )}
      {game.legacyTrialAvailable && (
        <section className="trial-progress" aria-label="試遊用の旅の進行">
          <h2>試遊用の補助AP</h2>
          <p>以前の試遊向けの報酬です。観光報酬とは別に、各1回受け取れます。</p>
          {trialMilestones.map((milestone) => {
            const eligibility = getMilestoneAvailability(game, milestone.id);
            const claimed = game.claimedRewardIds.includes(
              milestone.rewardSourceId,
            );
            return (
              <div className="milestone" key={milestone.id}>
                <button
                  className="milestone-option"
                  data-testid={`milestone-${milestone.id}`}
                  disabled={!eligibility.available}
                  onClick={() => onMilestone(milestone.id)}
                  aria-label={claimed ? `${milestone.titleJa}：受け取り済み` : `${milestone.titleJa}：${milestone.ap} APを受け取る`}
                >
                  <span>{milestone.titleJa}</span>
                  <span>{claimed ? "受け取り済み" : `＋${milestone.ap} AP`}</span>
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
  return (
    <article
      className={`date-card${date.kind !== "normal" ? " invitation-card" : ""}${!eligibility.available ? " date-unavailable" : ""}`}
      data-testid={`event-${date.id}`}
    >
      {date.kind !== "normal" && (
        <p className="event-context">
          {date.kind === "special"
            ? `${game.heroineName}からのお誘い`
            : date.kind === "confession"
              ? "大切な話"
              : "もう一度、ふたりで"}
        </p>
      )}
      <button
        className="date-option"
        disabled={!eligibility.available}
        onClick={() => onChoose(date.id)}
        aria-label={`${date.actionLabelJa}（${date.titleJa}、${date.apCost ? `${date.apCost} AP` : "AP不要"}）`}
      >
        <span className="date-option-title">{date.titleJa}</span>
        <span className="date-option-cost">{date.apCost ? `${date.apCost} AP` : "AP不要"}</span>
        {eligibility.available && <span aria-hidden="true">→</span>}
      </button>
      {eligibility.available && (
        <p className="event-description">{withNames(date.descriptionJa, game)}</p>
      )}
      {date.invitationJa && (
        <blockquote>{withNames(date.invitationJa, game)}</blockquote>
      )}
      {!eligibility.available && (
        <p className="availability" role="status">
          {eligibility.reason}
        </p>
      )}
    </article>
  );
}
