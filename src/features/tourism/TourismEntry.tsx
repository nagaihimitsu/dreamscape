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
  return (
    <section className="tourism-entry" aria-label="観光と観察の試遊">
      {landmarks.map((landmark) => {
        const availability = getTourismAvailability(game, landmark.id);
        return (
          <div key={landmark.id}>
            <div className="section-meta">
              <span className="eyebrow">絵の前で、ひと休み</span>
              <span className="pill">再訪・観察</span>
            </div>
            <h2>{landmark.nameJa}</h2>
            <p>{landmark.descriptionJa}</p>
            <button
              className="primary"
              data-testid={`revisit-tourism-${landmark.id}`}
              onClick={() => onStart(landmark.id)}
              disabled={!availability.available}
            >
              観光・観察を試す <span aria-hidden="true">→</span>
            </button>
            <p className="fine-print">
              気になる場所を調べたら、英語3択バトルへ。観察は好きなだけ。
            </p>
            {!availability.available && (
              <p className="fine-print">{availability.reason}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
