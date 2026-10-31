import { landmarks } from "../../content";
import type { GameState } from "../../domain/game";
import { getTourismAvailability } from "../../domain/tourism";

export function TourismEntry({
  game,
  onStart,
}: {
  game: GameState;
  onStart: (id: string) => void;
}) {
  const available = landmarks.filter(
    (landmark) => getTourismAvailability(game, landmark.id).available,
  );
  if (!available.length) return null;
  return (
    <section className="tourism-entry revisit-group" aria-label="観光と観察の再訪">
      <h2>観光・観察</h2>
      <ul className="revisit-list">
        {available.map((landmark) => (
          <li key={landmark.id}>
            <span>{landmark.nameJa}</span>
            <button
              className="secondary"
              data-testid={`revisit-tourism-${landmark.id}`}
              aria-label={`${landmark.nameJa}を観察する`}
              onClick={() => onStart(landmark.id)}
            >
              観察する <span aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
