import { getCityContent } from "../../content";
import type { TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { Icon } from "../../components/icons";
import { CityProgress } from "./CityProgress";
import { FreeTimeBackdrop } from "./FreeTimeBackdrop";
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
  const extras = game.pendingApRewards.length > 0 || !!nextCityName;
  return (
    <section className="free-time-hub" data-testid="free-time-hub">
      <FreeTimeBackdrop cityId={game.currentCityId} />
      {/* The screen's heading, drawn as the map notebook's banner (not pressable: no edge, no chevron). */}
      <h1 className="free-time-banner" tabIndex={-1}>
        <Icon name="compass" />
        <span>{city.nameJa}の行き先</span>
        <Icon name="plane" className="free-time-banner-plane" />
      </h1>
      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} />

      <TravelMenu key={game.currentCityId} game={game} onTravelEvent={onTravelEvent} onRent={onRent} />

      {extras && <div className="free-time-extras">
        <PendingRewards game={game} onClaim={onClaimRewards} compact />
        {nextCityName && <button type="button" className="secondary" onClick={onDepart}>{nextCityName}へ出発</button>}
      </div>}
    </section>
  );
}
