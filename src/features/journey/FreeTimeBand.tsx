import { useId, useRef, useState } from "react";
import { Icon } from "../../components/icons";
import { useMeasuredHeight } from "../../components/useMeasuredHeight";
import type { GameState } from "../../domain/game";
import { getTravelWaitOptions } from "../../domain/travel-destinations";
import { SleepChoice } from "./DestinationRow";
import type { BandItem } from "./photo-cards";
import { formatTravelTime } from "./travel-time";
import { TourBooking } from "./TravelTours";
import { pressKindOf, type TravelSelectionApi } from "./useTravelSelection";
import "./travel-menu.css";

/**
 * B案's bottom band (docs/02 「自由時間の画面」): icons with a small word, only those that lead somewhere now
 * (photo-cards.ts bandItems). 待機 and 休む work as today's band (TravelActions): the open 待機 menu rises above the
 * band; 休む selects the hotel and the band grows upward with the ways home (休む again with one way, or a way home,
 * rests). デート opens the date sheet; ツアー opens today's tours sheet. The row's height is measured as `--bottom-h`.
 */
export function FreeTimeBand({ game, api, items, onTravelWait, onOpenDates, onBookTour }: {
  game: GameState;
  api: TravelSelectionApi;
  items: readonly BandItem[];
  onTravelWait: (minutes: number) => boolean;
  onOpenDates: () => void;
  onBookTour: (tourId: string, offerId: string) => boolean;
}) {
  const id = useId();
  const measured = useMeasuredHeight("--bottom-h");
  const wait = useRef<HTMLDetailsElement>(null);
  const [toursOpen, setToursOpen] = useState(false);
  const resting = api.isSelected({ kind: "sleep" });
  const closeWait = () => wait.current?.removeAttribute("open");
  return <div className="travel-band photo-band" data-testid="travel-actions" ref={measured} data-selected={resting ? "true" : undefined} data-armed={resting && api.armed ? "true" : undefined}>
    <div className="travel-band-row">
      {items.includes("wait") && <details className="travel-wait" ref={wait} onToggle={(toggle) => { if (toggle.currentTarget.open && resting) api.clear(); }}>
        {/* One panel at a time: opening 待機 closes 休む's ways home (they would lie under the menu). */}
        <summary aria-label="時間を進める"><Icon name="hourglass" /><span className="travel-band-word">待機</span></summary>
        <div className="travel-wait-actions">
          {getTravelWaitOptions(game).map((option) => <button key={option.until ?? "minutes"} type="button" className="secondary" disabled={!option.available}
            onClick={() => onTravelWait(option.minutes)}>{option.until === null ? `${option.minutes}分待つ` : `${formatTravelTime(option.until)}まで待つ`}</button>)}
        </div>
      </details>}
      {items.includes("sleep") && <button type="button" className={`travel-sleep-toggle${resting ? " is-selected" : ""}`} aria-label="滞在先で休む" aria-expanded={resting}
        aria-controls={resting ? `${id}-sleep` : undefined} aria-describedby={resting ? `${id}-selected ${id}-hint` : undefined}
        onKeyDown={(key) => { if (key.repeat && (key.key === "Enter" || key.key === " ")) key.preventDefault(); }}
        onClick={(click) => {
          closeWait();
          api.pressSleep(pressKindOf(click));
        }}>
        <Icon name="bed" /><span className="travel-band-word">休む</span>
      </button>}
      {items.includes("dates") && <button type="button" className="photo-band-item" data-testid="free-time-dates-open" onClick={() => { closeWait(); onOpenDates(); }}>
        <Icon name="heart" /><span className="travel-band-word">デート</span>
      </button>}
      {items.includes("tours") && <button type="button" className="photo-band-item" data-testid="travel-tours-open" onClick={() => { closeWait(); setToursOpen(true); }}>
        <Icon name="ticket" /><span className="travel-band-word">ツアー</span>
      </button>}
      {resting && <span className="sr-only" id={`${id}-selected`}>選択中。</span>}
    </div>
    {/* After the buttons in the DOM (focus: the pressed control, then what it opened); drawn above them, on the band's top edge. */}
    {resting && <div className="travel-band-sleep" id={`${id}-sleep`}>
      <SleepChoice game={game} sleep={api.sleep} api={api} hintId={`${id}-hint`} />
    </div>}
    {toursOpen && <TourBooking game={game} onBook={onBookTour} onClose={() => setToursOpen(false)} settlePresses />}
  </div>;
}
