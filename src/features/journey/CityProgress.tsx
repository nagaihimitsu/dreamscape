import { getCityContent } from "../../content";
import type { GameState } from "../../domain/game";
import { canReadCityEpilogue } from "../../domain/epilogue";
import { playSe } from "../../audio/sound-effects";
import "./city.css";

/**
 * 「エピローグを読む」 once the city's epilogue can be read (free time's primary action then); nothing before.
 * The next stop and special battle are reached on the map (travel events), not from here.
 */
export function CityProgress({ game, onEpilogue }: { game: GameState; onEpilogue: (cityId: string) => void }) {
  const { city } = getCityContent(game.currentCityId);
  if (!canReadCityEpilogue(game, city.id)) return null;
  return (
    <section
      className="city-progress paper"
      aria-label={`${city.nameJa}の旅の記録`}
    >
      <div className="city-complete">
        <button
          className="secondary"
          data-testid="city-epilogue"
          onClick={() => {
            playSe("ui_confirm");
            onEpilogue(city.id);
          }}
        >
          エピローグを読む
        </button>
      </div>
    </section>
  );
}
