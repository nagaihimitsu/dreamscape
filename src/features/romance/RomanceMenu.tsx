import { useEffect, useState } from "react";
import { dateDestinations, dates, presentation } from "../../content";
import {
  getDateAvailability,
  isEventVisible,
  type GameState,
} from "../../domain/game";
import "./romance-menu.css";

const DATES_PER_PAGE = 5;

export function withNames(text: string, game: GameState) {
  return text
    .replaceAll("{player_name}", game.playerName)
    .replaceAll("{heroine_name}", game.heroineName);
}

export function RomanceMenu({
  game,
  onChoose,
}: {
  game: GameState;
  onChoose: (id: string) => void;
}) {
  const visibleDates = dates.filter((date) => isEventVisible(game, date.id));
  const availableMoments = visibleDates.filter(
    (date) =>
      date.kind !== "normal" &&
      (!game.playedDateIds.includes(date.id) || date.repeatable),
  );
  const ordinaryDates = visibleDates.filter((date) => date.kind === "normal");
  const choices = [...availableMoments, ...ordinaryDates];
  const [datePage, setDatePage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(choices.length / DATES_PER_PAGE));
  const currentPage = Math.min(datePage, pageCount - 1);
  const firstIndex = currentPage * DATES_PER_PAGE;
  const pageDates = choices.slice(firstIndex, firstIndex + DATES_PER_PAGE);

  // A played event disappears from the pool. Keep the current page in range
  // if returning to free time reduces the number of pages.
  useEffect(() => {
    setDatePage((page) => Math.min(page, pageCount - 1));
  }, [pageCount]);
  return (
    <>
      {game.confessionStatus === "deferred" && (
        <p className="romance-status" role="status">
          {withNames(presentation.deferred.descriptionJa, game)}
        </p>
      )}
      {game.confessionStatus === "rejected" && (
        <p className="romance-status" role="status">
          今は恋人として付き合えない、と返事を受け取りました。旅は続けられます。
        </p>
      )}
      {choices.length === 0 && (
        <p className="fine-print">今選べるデートはありません。旅を続けましょう。</p>
      )}
      {choices.length > 0 && (
        <>
          <p className="fine-print ap-help">APはデートに使うポイントです。</p>
          <div className="date-list" id="date-destinations">
            {pageDates.map((date) => (
              <EventCard
                key={date.id}
                game={game}
                date={date}
                onChoose={onChoose}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <nav className="date-pagination" aria-label="デート候補のページ">
              <button
                type="button"
                className="secondary"
                aria-controls="date-destinations"
                aria-disabled={currentPage === 0}
                onClick={() => { if (currentPage > 0) setDatePage(currentPage - 1); }}
              >
                前の候補
              </button>
              <span aria-live="polite">{currentPage + 1} / {pageCount}</span>
              <button
                type="button"
                className="secondary"
                aria-controls="date-destinations"
                aria-disabled={currentPage >= pageCount - 1}
                onClick={() => { if (currentPage < pageCount - 1) setDatePage(currentPage + 1); }}
              >
                次の候補
              </button>
            </nav>
          )}
        </>
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
  const cost = date.apCost;
  const destination = date.destinationId
    ? dateDestinations.find((item) => item.id === date.destinationId)
    : undefined;
  return (
    <article
      className={`date-card${date.kind !== "normal" ? " invitation-card" : ""}${!eligibility.available ? " date-unavailable" : ""}`}
      data-testid={`event-${date.id}`}
    >
      {date.kind !== "normal" && (
        <p className="event-context">
          {date.eventLabelJa
            ? withNames(date.eventLabelJa, game)
            : date.kind === "special"
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
        aria-label={destination
          ? `${destination.nameJa}へ（${cost ? `${cost} AP` : "AP不要"}）`
          : `${date.actionLabelJa}（${date.titleJa}、${cost ? `${cost} AP` : "AP不要"}）`}
      >
        <span className="date-option-title">{destination?.nameJa ?? date.titleJa}</span>
        <span className="date-option-cost">{cost ? `${cost} AP` : "AP不要"}</span>
        {eligibility.available && <span aria-hidden="true">→</span>}
      </button>
      {eligibility.available && (
        <p className="event-description">{withNames(date.descriptionJa, game)}</p>
      )}
      {!eligibility.available && (
        <p className="availability" role="status">
          {eligibility.reason}
        </p>
      )}
    </article>
  );
}
