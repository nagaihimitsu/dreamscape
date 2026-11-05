import { battles, episodes, landmarks, getCityContent } from "../../content";
import type { TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { getTourismAvailability } from "../../domain/tourism";
import { CityProgress } from "./CityProgress";
import { PendingRewards } from "./PendingRewards";
import { TravelMenu } from "./TravelMenu";
import { showTravelEvent } from "./travel-visibility";
import "./free-time-hub.css";

/** The same compact destination for an unfinished or completed romance. */
export function FreeTimeHub({
  game,
  onClaimRewards,
  onStartEpisode,
  onEpilogue,
  onChooseDate,
  onTourism,
  onBattle,
  selectedLandmarkId,
  onSelectLandmark,
  placeFocusRequest,
  onTravelEvent,
  nextCityName,
  onDepart,
}: {
  game: GameState;
  onClaimRewards: () => void;
  onStartEpisode: (id: string) => void;
  onEpilogue: (id: string) => void;
  onChooseDate: (id: string) => void;
  onTourism: (id: string) => void;
  onBattle: (id: string) => void;
  selectedLandmarkId: string | null;
  onSelectLandmark: (id: string | null) => void;
  placeFocusRequest: number;
  onTravelEvent: (id: string, mode: TravelRoute["mode"]) => void;
  nextCityName?: string;
  onDepart: () => void;
}) {
  const { city, travel } = getCityContent(game.currentCityId);
  const localLandmarkIds = new Set(travel.events.filter((event) => event.placeId === game.travel.currentPlaceId && event.category === "main" && showTravelEvent(game, event)).flatMap((event) => {
    const landmarkId = episodes.find((episode) => episode.id === event.id)?.landmarkId ?? battles.find((battle) => battle.id === event.id)?.landmarkId;
    return landmarkId ? [landmarkId] : [];
  }));
  const localLandmarks = landmarks.filter((landmark) => localLandmarkIds.has(landmark.id));
  // Retain the existing callback contract for callers; direct navigation from
  // these callbacks is deliberately not presented in the destination list.
  void onChooseDate; void selectedLandmarkId; void onSelectLandmark; void placeFocusRequest;
  return (
    <section className="free-time-hub paper" data-testid="free-time-hub">
      <h1 className="sr-only">{city.nameJa}の行き先</h1>
      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} showSummary={false} />

      <TravelMenu key={game.currentCityId} game={game} onTravelEvent={onTravelEvent} />

      {localLandmarks.map((landmark) => {
        const canObserve = game.visitedLandmarkIds.includes(landmark.id) && getTourismAvailability(game, landmark.id).available;
        if (!canObserve) return null;
        return <section key={landmark.id} aria-label={`${landmark.nameJa}で過ごす`}>
          {canObserve && <button className="secondary" onClick={() => onTourism(landmark.id)}>{landmark.nameJa}を観察する</button>}
        </section>;
      })}

      <PendingRewards game={game} onClaim={onClaimRewards} compact />
      {nextCityName && <button type="button" className="secondary" onClick={onDepart}>{nextCityName}へ出発</button>}
    </section>
  );
}
