import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import type { GameState } from "../../domain/game";
import { Icon } from "../../components/icons";
import { DestinationRow, SleepChoice } from "./DestinationRow";
import { PlaceMap } from "./PlaceMap";
import { TravelRentals } from "./TravelRentals";
import { TravelTours } from "./TravelTours";
import type { TravelSelectionApi } from "./useTravelSelection";
import "./travel-menu.css";

/**
 * The city's destinations (UI redesign §3.4–§3.6): the return reserve, rentals, tours, the
 * map block and the list card. A destination is chosen in two steps (the shared
 * selection of FreeTimeHub): the first press shows it on the map, the second goes.
 */
export function TravelMenu({ game, api, onRent, onBookTour, onCancelTour }: {
  game: GameState;
  api: TravelSelectionApi;
  onRent: (modeId: string) => boolean;
  onBookTour: (tourId: string, offerId: string) => boolean;
  onCancelTour: () => boolean;
}) {
  const { city } = getCityContent(game.currentCityId);
  const { current, candidates, nearby, other, recommendedMainId } = api.destinations;
  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  const row = (place: (typeof nearby)[number], recommended = false) =>
    <DestinationRow key={place.id} game={game} place={place} choices={api.choices.get(place.id)!} current={current} recommended={recommended} api={api} />;
  // The expanded map's 「選んだ行き先」: the selected row (its own testids), or the ways home.
  const target = api.target;
  const selectedRow = target?.kind === "place" ? [...nearby, ...other].find((place) => place.id === target.placeId) : undefined;
  const slot = target?.kind === "sleep" ? <SleepChoice game={game} sleep={api.sleep} api={api} scope="dialog" />
    : selectedRow ? <DestinationRow game={game} place={selectedRow} choices={api.choices.get(selectedRow.id)!} current={current} api={api} scope="dialog" testId="map-selection-place" />
    : target?.kind === "place" ? <p>{current.nameJa}（現在地）には、ここで始められる予定はありません。</p>
    : <p>地図の印か「地点を名前で探す」で選ぶと、ここに行き先が出ます。</p>;
  return <section className="travel-menu" aria-label={`${city.nameJa}の行き先`} data-testid="travel-menu">
    {game.travel.returnReserve > 0 && <p className="travel-reserve">帰路用に{formatMoneyForCity(game.currentCityId, game.travel.returnReserve)}を確保（所持金に含む）</p>}
    <TravelRentals game={game} onRent={onRent} />
    <TravelTours game={game} onBook={onBookTour} onCancel={onCancelTour} />
    <PlaceMap game={game} events={candidates} selection={{ api, slot }}><div className="travel-list-card">
      <h2>近くの行き先</h2>
      {nearby.length === 0 && <p>今すぐ行ける場所はありません。時間を待つか、滞在先で休めます。</p>}
      <div className="travel-list">{nearby.map((place) => row(place, place.id === recommendedMainId))}</div>
      {other.length > 0 && <details className="travel-other" open={api.showOther} onToggle={(event) => api.setShowOther(event.currentTarget.open)}>
        <summary>ほかの行き先を見る<Icon name="chevron-down" /></summary>
        <div className="travel-list">{other.map((place) => row(place))}</div>
      </details>}
    </div></PlaceMap>
  </section>;
}
