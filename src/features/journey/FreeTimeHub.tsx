import { battles, episodes, landmarks, milanoTravelCatalog } from "../../content";
import type { TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { getTourismAvailability } from "../../domain/tourism";
import { TrialMilestones } from "../romance/RomanceMenu";
import { CityProgress } from "./CityProgress";
import { EncounterMenu } from "./EncounterMenu";
import { PendingRewards } from "./PendingRewards";
import { TravelMenu } from "./TravelMenu";
import type { EncounterMenuEntry } from "./EncounterMenu";
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
  encounters,
  onEncounter,
  selectedLandmarkId,
  onSelectLandmark,
  placeFocusRequest,
  onTravelEvent,
  onTravelWait,
  onTravelSleep,
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
  encounters: EncounterMenuEntry[];
  onEncounter: (id: string) => void;
  selectedLandmarkId: string | null;
  onSelectLandmark: (id: string | null) => void;
  placeFocusRequest: number;
  onTravelEvent: (id: string, mode: TravelRoute["mode"]) => void;
  onTravelWait: (minutes: number) => void;
  onTravelSleep: (mode: TravelRoute["mode"]) => void;
}) {
  const localLandmarkIds = new Set(milanoTravelCatalog.events.filter((event) => event.placeId === game.travel.currentPlaceId).flatMap((event) => {
    const landmarkId = episodes.find((episode) => episode.id === event.id)?.landmarkId ?? battles.find((battle) => battle.id === event.id)?.landmarkId;
    return landmarkId ? [landmarkId] : [];
  }));
  const localLandmarks = landmarks.filter((landmark) => localLandmarkIds.has(landmark.id));
  // Retain the existing callback contract for callers; direct navigation from
  // these callbacks is deliberately not presented in the destination list.
  void onChooseDate; void selectedLandmarkId; void onSelectLandmark; void placeFocusRequest;
  return (
    <section className="free-time-hub paper" data-testid="free-time-hub">
      <header className="free-time-hub-heading">
        <h1>ふたりの自由時間</h1>
        {game.endingReached && <span>交際中</span>}
      </header>

      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} allowEpilogue={game.travel.currentPlaceId === "p_darsena"} />

      <TravelMenu game={game} onTravelEvent={onTravelEvent} onTravelWait={onTravelWait} onTravelSleep={onTravelSleep} />

      <div className="free-time-tools">
        <button className="secondary" onClick={onEnglish}>
          英語ノートを開く
        </button>
      </div>
      {localLandmarks.map((landmark) => {
        const localEncounters = encounters.filter((entry) => entry.landmarkId === landmark.id);
        const canObserve = game.visitedLandmarkIds.includes(landmark.id) && getTourismAvailability(game, landmark.id).available;
        if (!canObserve && localEncounters.length === 0) return null;
        return <section key={landmark.id} aria-label={`${landmark.nameJa}で過ごす`}>
          {canObserve && <button className="secondary" onClick={() => onTourism(landmark.id)}>{landmark.nameJa}を観察する</button>}
          {localEncounters.length > 0 && <EncounterMenu entries={localEncounters} place={landmark.nameJa} onStart={onEncounter} />}
        </section>;
      })}

      <PendingRewards game={game} onClaim={onClaimRewards} compact />
      <TrialMilestones game={game} onMilestone={onMilestone} />
    </section>
  );
}
