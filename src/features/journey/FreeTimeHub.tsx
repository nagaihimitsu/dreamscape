import { getCityContent } from "../../content";
import type { TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { CityProgress } from "./CityProgress";
import { PendingRewards } from "./PendingRewards";
import { TravelMenu } from "./TravelMenu";
import "./free-time-hub.css";

/** The same compact destination for an unfinished or completed romance. */
export function FreeTimeHub({
  game,
  onClaimRewards,
  onStartEpisode,
  onEpilogue,
  onBattle,
  onTravelEvent,
  onRent,
  nextCityName,
  onDepart,
}: {
  game: GameState;
  onClaimRewards: () => void;
  onStartEpisode: (id: string) => void;
  onEpilogue: (id: string) => void;
  onBattle: (id: string) => void;
  onTravelEvent: (id: string, mode: TravelRoute["mode"]) => void;
  onRent: (modeId: string) => boolean;
  nextCityName?: string;
  onDepart: () => void;
}) {
  const { city } = getCityContent(game.currentCityId);
  return (
    <section className="free-time-hub paper" data-testid="free-time-hub">
      <h1 className="sr-only">{city.nameJa}の行き先</h1>
      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} />

      <TravelMenu key={game.currentCityId} game={game} onTravelEvent={onTravelEvent} onRent={onRent} />

      <PendingRewards game={game} onClaim={onClaimRewards} compact />
      {nextCityName && <button type="button" className="secondary" onClick={onDepart}>{nextCityName}へ出発</button>}
    </section>
  );
}
