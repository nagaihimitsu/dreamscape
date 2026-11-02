import { battles, episodes, journeyConfig, landmarks } from "../../content";
import type { GameState } from "../../domain/game";
import { getTourismAvailability } from "../../domain/tourism";
import { EncounterMenu, type EncounterMenuEntry } from "../journey/EncounterMenu";

export function TourismEntry({
  game,
  onStart,
  encounters,
  selectedLandmarkId,
  onSelectLandmark,
  onEncounter,
}: {
  game: GameState;
  onStart: (id: string) => void;
  encounters: EncounterMenuEntry[];
  selectedLandmarkId: string | null;
  onSelectLandmark: (id: string | null) => void;
  onEncounter: (id: string) => void;
}) {
  const currentSpecialBattles = new Set(journeyConfig.storyBattles.map((entry) => entry.battleId));
  const available = landmarks.filter((landmark) => {
    // Older saves can record a finished episode or battle without a separate
    // visit; the current B/C battles also count even when observation was skipped.
    const visited = game.visitedLandmarkIds.includes(landmark.id) ||
      episodes.some((episode) => episode.landmarkId === landmark.id && game.completedEpisodeIds.includes(episode.id)) ||
      battles.some((battle) => battle.landmarkId === landmark.id &&
        (!battle.reasoning || currentSpecialBattles.has(battle.id)) &&
        game.battleRecords.some((record) => record.battleId === battle.id && record.attempts > 0));
    return visited && getTourismAvailability(game, landmark.id).available;
  });
  if (!available.length) return null;
  return (
    <section className="tourism-entry revisit-group" aria-label="観光と観察の再訪">
      <h2>観光・観察</h2>
      <ul className="revisit-list">
        {available.map((landmark) => {
          const atPlace = encounters.filter((entry) => entry.landmarkId === landmark.id);
          const selected = selectedLandmarkId === landmark.id;
          return (
            <li className="revisit-place-row" key={landmark.id}>
              <div className="revisit-place-heading">
                {atPlace.length || selected ? (
                  <button
                    className="revisit-place-select"
                    type="button"
                    aria-expanded={selected}
                    data-testid={`revisit-place-${landmark.id}`}
                    onClick={() => onSelectLandmark(selected ? null : landmark.id)}
                  >
                    <span>{landmark.nameJa}</span>
                    <small>交流 {atPlace.length}件</small>
                  </button>
                ) : <span>{landmark.nameJa}</span>}
                <button
                  className="secondary"
                  data-testid={`revisit-tourism-${landmark.id}`}
                  aria-label={`${landmark.nameJa}を観察する`}
                  onClick={() => onStart(landmark.id)}
                >
                  観察する <span aria-hidden="true">→</span>
                </button>
              </div>
              {selected && <EncounterMenu entries={atPlace} place={landmark.nameJa} onStart={onEncounter} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
