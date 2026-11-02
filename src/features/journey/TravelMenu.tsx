import { useState } from "react";
import { dates, episodes, journeyConfig, getCityContent } from "../../content";
import type { TravelEvent, TravelPlace, TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { getDirection, groupDestinationEvents, selectNearbyDestinations } from "../../domain/travel";
import { getTravelEventAvailability, getTravelEventDefinition, isUnclearedMainTravelEvent } from "../../domain/travel-game";
import { Modal } from "../../components/Modal";
import { withNames } from "../romance/RomanceMenu";
import { PlaceMap } from "./PlaceMap";
import { showTravelEvent, travelModeLabels as modes } from "./travel-visibility";
import "./travel-menu.css";

type Mode = TravelRoute["mode"];
export function TravelMenu({ game, onTravelEvent }: {
  game: GameState;
  onTravelEvent: (eventId: string, mode: Mode) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const { city, travel } = getCityContent(game.currentCityId);
  const current = travel.places.find((place) => place.id === game.travel.currentPlaceId);
  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  const events = travel.events.filter((event) => showTravelEvent(game, event));
  const outgoing = travel.routes.filter((route) => route.fromPlaceId === current.id);
  const candidates = events.flatMap((event) => {
    const walk = outgoing.find((route) => route.toPlaceId === event.placeId && route.mode === "walk");
    const place = travel.places.find((item) => item.id === event.placeId);
    if (!walk || !place) return [];
    const routes = outgoing.filter((route) => route.toPlaceId === event.placeId);
    const availability = routes.map((route) => getTravelEventAvailability(game, event.id, route.mode));
    const available = availability.some((result) => result.available);
    return [{ ...event, walkMinutes: walk.minutes, place, routes, available, unavailableReason: availability[0]?.reason,
      unclearedMain: isUnclearedMainTravelEvent(game, event.id) }];
  });
  const places = groupDestinationEvents(candidates);
  const { nearby, other, recommendedMainId } = selectNearbyDestinations(places);
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
    {game.travel.returnReserve > 0 && <p className="travel-reserve">帰路用に€{game.travel.returnReserve}を確保（所持金に含む）</p>}
    <PlaceMap game={game} events={events} />
    {nearby.length === 0 && <p>今すぐ行ける場所はありません。時間を待つか、滞在先で休めます。</p>}
    <div className="travel-list">{nearby.map((place) => <Destination key={place.id} place={place} game={game} current={current} recommended={place.id === recommendedMainId} onSelect={() => selectPlace(place)} />)}</div>
    {other.length > 0 && <details open={showOther} onToggle={(event) => setShowOther(event.currentTarget.open)}><summary>ほかの行き先を見る</summary><div className="travel-list">{other.map((place) => <Destination key={place.id} place={place} game={game} current={current} onSelect={() => selectPlace(place)} />)}</div></details>}
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
            <small>{definition.apCost ? `${definition.apCost} AP` : "AP不要"} · {definition.activityMinutes}分</small>
          </button>
          {description && <p>{withNames(description, game)}</p>}
          {!event.available && <p className="fine-print">{event.unavailableReason || "今は利用できません。"}</p>}
        </div>;
      })}</div>
    </Modal>}
    {selected && <Modal labelledBy="travel-choice-title" className="travel-choice-modal" onClose={() => setSelectedId(null)}><div className="travel-choice-header"><h2 id="travel-choice-title">{selected.place.nameJa}へ</h2><button type="button" className="secondary" onClick={() => setSelectedId(null)}>閉じる</button></div><p>移動手段を選んでください。時間・料金はゲーム内の目安です。</p><div className="travel-choice-routes">{selected.routes.map((route) => {
      const availability = getTravelEventAvailability(game, selected.id, route.mode);
      return <div key={route.mode}><button type="button" className="secondary travel-route" disabled={!availability.available} onClick={() => { onTravelEvent(selected.id, route.mode); setSelectedId(null); }}>{modes[route.mode]} {route.minutes}分 · €{route.cost}</button>{!availability.available && <p className="fine-print">{availability.reason}</p>}</div>;
    })}</div></Modal>}
  </section>;
}

type Candidate = TravelEvent & { walkMinutes: number; place: TravelPlace; routes: TravelRoute[]; available: boolean; unavailableReason?: string; unclearedMain: boolean };
type PlaceCandidate = { id: string; walkMinutes: number; events: Candidate[]; available: boolean };

function Destination({ place, game, current, recommended, onSelect }: {
  place: PlaceCandidate;
  game: GameState;
  current: TravelPlace;
  recommended?: boolean;
  onSelect: () => void;
}) {
  const event = place.events[0];
  const direction = getDirection(current, event.place);
  const apCost = getTravelEventDefinition(game, event.id)?.apCost ?? event.apCost;
  const categories = new Set(place.events.map((item) => item.category));
  const onlyRoute = event.routes.length === 1 ? event.routes[0] : undefined;
  return <article className="travel-destination" data-testid={`travel-place-${place.id}`}>
    <button type="button" className="travel-destination-button" onClick={onSelect}>
      <span className="travel-category">{categories.has("main") && "◇ 観光"}{categories.size > 1 && " · "}{categories.has("date") && "♡ デート"}</span>
      <span className="travel-destination-title">{event.place.nameJa}</span>
      <span className="travel-destination-meta">{onlyRoute ? `${modes[onlyRoute.mode]}約${onlyRoute.minutes}分 · €${onlyRoute.cost}` : `徒歩約${event.walkMinutes}分`}（{direction}）{place.events.length === 1 && apCost ? ` · ${apCost} AP` : ""}</span>
      {recommended && <small>おすすめ</small>}
      {!place.available && <small>{event.unavailableReason || "今は行けません。"}</small>}
    </button>
  </article>;
}
