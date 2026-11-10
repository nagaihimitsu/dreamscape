import { useState } from "react";
import { Icon } from "../../components/icons";
import type { GameState } from "../../domain/game";
import { getNextCity } from "../../domain/city-travel";
import { departureAfterTour } from "../../domain/tour";
import { PendingRewards } from "./PendingRewards";
import { PhotoCredits, type ShownPhoto } from "./PhotoCredits";
import "./free-time-hub.css";

/** F20–F22: the city's remaining actions (保管中のAP, 「{次の都市}へ出発」, a booked tour's hold on the departure), one card. */
export function FreeTimeExtras({ game, onClaimRewards, nextCityName, onDepart }: {
  game: GameState;
  onClaimRewards: () => void;
  nextCityName?: string;
  onDepart: () => void;
}) {
  // A booked tour holds the departure (tour stage 2a): the line says what happens once it is over.
  const afterTour = departureAfterTour(game, getNextCity(game)?.city.nameJa);
  if (game.pendingApRewards.length === 0 && !nextCityName && !afterTour) return null;
  return <div className="free-time-extras">
    <PendingRewards game={game} onClaim={onClaimRewards} compact />
    {nextCityName && <button type="button" className="secondary" onClick={onDepart}>{nextCityName}へ出発</button>}
    {afterTour && <p className="free-time-tour-wait" data-testid="tour-departure-wait">
      予約したツアーを終えるか取り消すと、{afterTour.cityNameJa}へ{afterTour.automatic ? "出発します" : "出発できます"}。</p>}
  </div>;
}

/** 「写真の出典」 (UI redesign §3.4 item 6): the credits of the photos the screen shows, when it shows any. */
export function FreeTimeCredits({ photos }: { photos: ShownPhoto[] }) {
  const [open, setOpen] = useState(false);
  if (!photos.length) return null;
  return <>
    <button type="button" className="free-time-credits-open" onClick={() => setOpen(true)}>
      <Icon name="credit" />写真の出典
    </button>
    {open && <PhotoCredits photos={photos} onClose={() => setOpen(false)} />}
  </>;
}
