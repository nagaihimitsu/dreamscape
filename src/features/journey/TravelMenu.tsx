import { useState } from "react";
import { dates, episodes, journeyConfig, getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import type { TravelPlace, TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { getDirection } from "../../domain/travel";
import { getTravelEventAvailability, getTravelEventDefinition } from "../../domain/travel-game";
import { getTravelDestinations, type TravelDestinationPlace } from "../../domain/travel-destinations";
import { compareRouteTime } from "../../domain/travel-routes";
import { Modal } from "../../components/Modal";
import { withNames } from "../romance/names";
import { PlaceMap } from "./PlaceMap";
import { TravelRentals } from "./TravelRentals";
import { transportLabel } from "../../content/transport";
import "./travel-menu.css";

type Mode = TravelRoute["mode"];
export function TravelMenu({ game, onTravelEvent, onRent }: {
  game: GameState;
  onTravelEvent: (eventId: string, mode: Mode) => void;
  onRent: (modeId: string) => boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const { city } = getCityContent(game.currentCityId);
  const { current, candidates, places, nearby, other, recommendedMainId } = getTravelDestinations(game);
  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  const selected = candidates.find((event) => event.id === selectedId);
  const selectedPlace = places.find((place) => place.id === selectedPlaceId);
  function selectDestination(event: (typeof candidates)[number]) {
    setSelectedPlaceId(null);
    if (event.routes.length === 1 && event.available) {
      onTravelEvent(event.id, event.routes[0].mode);
      return;
    }
    setSelectedId(event.id);
  }
  function selectPlace(place: (typeof places)[number]) {
    if (place.events.length === 1) selectDestination(place.events[0]);
    else setSelectedPlaceId(place.id);
  }
  return <section className="travel-menu" aria-label={`${city.nameJa}の行き先`} data-testid="travel-menu">
    {game.travel.returnReserve > 0 && <p className="travel-reserve">帰路用に{formatMoneyForCity(game.currentCityId, game.travel.returnReserve)}を確保（所持金に含む）</p>}
    <TravelRentals game={game} onRent={onRent} />
    <PlaceMap game={game} events={candidates} />
    <div className="travel-list-card">
      <h2>近くの行き先</h2>
      {nearby.length === 0 && <p>今すぐ行ける場所はありません。時間を待つか、滞在先で休めます。</p>}
      <div className="travel-list">{nearby.map((place) => <Destination key={place.id} place={place} game={game} current={current} recommended={place.id === recommendedMainId} onSelect={() => selectPlace(place)} />)}</div>
      {other.length > 0 && <details className="travel-other" open={showOther} onToggle={(event) => setShowOther(event.currentTarget.open)}><summary>ほかの行き先を見る</summary><div className="travel-list">{other.map((place) => <Destination key={place.id} place={place} game={game} current={current} onSelect={() => selectPlace(place)} />)}</div></details>}
    </div>
    {selectedPlace && <Modal labelledBy="travel-events-title" className="travel-choice-modal" onClose={() => setSelectedPlaceId(null)}>
      <div className="travel-choice-header"><h2 id="travel-events-title">{selectedPlace.events[0].place.nameJa}のイベント</h2><button type="button" className="secondary" onClick={() => setSelectedPlaceId(null)}>閉じる</button></div>
      <div className="travel-event-list">{selectedPlace.events.map((event) => {
        const date = dates.find((item) => item.id === event.id);
        const episode = episodes.find((item) => item.id === event.id);
        const storyBattle = journeyConfig.storyBattles.find((item) => item.battleId === event.id);
        const description = date?.descriptionJa ?? episode?.descriptionJa ?? storyBattle?.descriptionJa ?? "";
        const definition = getTravelEventDefinition(game, event.id) ?? event;
        return <div className="travel-event" key={event.id}>
          <button type="button" className="secondary travel-event-button" data-testid={`travel-event-${event.id}`} disabled={!event.available} onClick={() => selectDestination(event)}>
            <span>{event.category === "main" ? "◇ 観光" : "♡ デート"} · {withNames(event.titleJa, game)}</span>
            <small>{definition.apCost ? `${definition.apCost} AP` : "AP不要"} · {definition.activityMinutes}分{definition.admissionCost ? ` · 入場料 ${formatMoneyForCity(game.currentCityId, definition.admissionCost)}（2人分・ゲーム設定）` : ""}</small>
          </button>
          {description && <p>{withNames(description, game)}</p>}
          {!event.available && <p className="fine-print">{event.unavailableReason || "今は利用できません。"}</p>}
        </div>;
      })}</div>
    </Modal>}
    {selected && <Modal labelledBy="travel-choice-title" className="travel-choice-modal" onClose={() => setSelectedId(null)}><div className="travel-choice-header"><h2 id="travel-choice-title">{selected.place.nameJa}へ</h2><button type="button" className="secondary" onClick={() => setSelectedId(null)}>閉じる</button></div><p>移動手段を選んでください。時間・料金はゲーム内の目安です。{getJourneyForCity(game.currentCityId)?.farePartySize === 2 && "料金は2人分です。"}</p>{selected.admissionCost ? <p>入場料 {formatMoneyForCity(game.currentCityId, selected.admissionCost)}（2人分・ゲーム設定）</p> : null}<div className="travel-choice-routes">{selected.routes.map((route) => {
      const availability = getTravelEventAvailability(game, selected.id, route.mode);
      return <div key={route.mode}><button type="button" className="secondary travel-route" disabled={!availability.available} onClick={() => { onTravelEvent(selected.id, route.mode); setSelectedId(null); }}>{transportLabel(game.currentCityId, route.mode)}{route.transferNote ? `（${route.transferNote}）` : ""} {route.minutes}分 · {formatMoneyForCity(game.currentCityId, route.cost)}{route.estimation === "game_model" ? "（ゲーム内の推定）" : ""}</button>{!availability.available && <p className="fine-print">{availability.reason}</p>}</div>;
    })}</div></Modal>}
  </section>;
}

function Destination({ place, game, current, recommended, onSelect }: {
  place: TravelDestinationPlace;
  game: GameState;
  current: TravelPlace;
  recommended?: boolean;
  onSelect: () => void;
}) {
  const event = place.events[0];
  const direction = getDirection(current, event.place);
  const apCost = getTravelEventDefinition(game, event.id)?.apCost ?? event.apCost;
  const categories = new Set(place.events.map((item) => item.category));
  // The line describes the routes the party can ride now (a rental mode once rented).
  const routes = event.describedRoutes;
  const onlyRoute = routes.length === 1 ? routes[0] : undefined;
  const fastestRoute = event.walkMinutes === null ? [...routes].sort(compareRouteTime)[0] : undefined;
  const shownRoute = onlyRoute ?? fastestRoute ?? routes.find((route) => route.mode === "walk");
  return <article className="travel-destination" data-testid={`travel-place-${place.id}`}>
    <button type="button" className="travel-destination-button" onClick={onSelect}>
      <span className="travel-category">{categories.has("main") && "◇ 観光"}{categories.size > 1 && " · "}{categories.has("date") && "♡ デート"}</span>
      <span className="travel-destination-title">{event.place.nameJa}</span>
      <span className="travel-destination-meta">{onlyRoute ? `${transportLabel(game.currentCityId, onlyRoute.mode)}約${onlyRoute.minutes}分 · ${formatMoneyForCity(game.currentCityId, onlyRoute.cost)}` : fastestRoute ? `${transportLabel(game.currentCityId, fastestRoute.mode)}約${fastestRoute.minutes}分` : `徒歩約${event.walkMinutes}分`}{shownRoute?.transferNote && `（${shownRoute.transferNote}）`}{shownRoute?.estimation === "game_model" && "（ゲーム内の推定）"}{event.walkMinutes === null && " · 徒歩の所要時間不明"}（{direction}）{place.events.length === 1 && apCost ? ` · ${apCost} AP` : ""}{place.events.length === 1 && event.admissionCost ? ` · 入場料 ${formatMoneyForCity(game.currentCityId, event.admissionCost)}（2人分・ゲーム設定）` : ""}</span>
      {recommended && <small>おすすめ</small>}
      {!place.available && <small>{event.unavailableReason || "今は行けません。"}</small>}
    </button>
  </article>;
}
