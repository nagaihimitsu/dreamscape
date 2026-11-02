import { useState } from "react";
import { dates, milanoTravelCatalog } from "../../content";
import type { TravelEvent, TravelRoute } from "../../content/travel-schemas";
import { isUpdatedDateReplay, type GameState } from "../../domain/game";
import { getDirection, selectNearbyDestinations } from "../../domain/travel";
import { getTravelEventAvailability } from "../../domain/travel-game";
import { Modal } from "../../components/Modal";
import { PlaceMap } from "./PlaceMap";
import { showTravelEvent, travelModeLabels as modes } from "./travel-visibility";
import "./travel-menu.css";

type Mode = TravelRoute["mode"];
export function TravelMenu({ game, onTravelEvent }: {
  game: GameState;
  onTravelEvent: (eventId: string, mode: Mode) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const current = milanoTravelCatalog.places.find((place) => place.id === game.travel.currentPlaceId);
  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  const events = milanoTravelCatalog.events.filter((event) => showTravelEvent(game, event));
  const mapEvents = milanoTravelCatalog.events.filter((event) => showTravelEvent(game, event) ||
    game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) ||
    game.battleRecords.some((record) => record.battleId === event.id && record.attempts > 0));
  const outgoing = milanoTravelCatalog.routes.filter((route) => route.fromPlaceId === current.id);
  const candidates = events.flatMap((event) => {
    const walk = outgoing.find((route) => route.toPlaceId === event.placeId && route.mode === "walk");
    const place = milanoTravelCatalog.places.find((item) => item.id === event.placeId);
    if (!walk || !place) return [];
    const routes = outgoing.filter((route) => route.toPlaceId === event.placeId);
    const availability = routes.map((route) => getTravelEventAvailability(game, event.id, route.mode));
    const available = availability.some((result) => result.available);
    return [{ ...event, walkMinutes: walk.minutes, place, routes, available, unavailableReason: availability[0]?.reason }];
  });
  const eligible = candidates.filter((candidate) => candidate.available);
  const unavailable = candidates.filter((candidate) => !candidate.available);
  const { nearby, other, recommendedMainId } = selectNearbyDestinations(eligible);
  const selected = candidates.find((event) => event.id === selectedId);
  function selectDestination(event: (typeof candidates)[number]) {
    if (event.routes.length === 1 && event.available) {
      onTravelEvent(event.id, event.routes[0].mode);
      return;
    }
    setSelectedId(event.id);
  }
  return <section className="travel-menu" aria-label="ミラノの行き先" data-testid="travel-menu">
    {game.travel.returnReserve > 0 && <p className="travel-reserve">帰路用に€{game.travel.returnReserve}を確保（所持金に含む）</p>}
    <PlaceMap game={game} events={mapEvents} />
    {eligible.length === 0 && <p>今すぐ行ける場所はありません。時間を待つか、滞在先で休めます。</p>}
    <div className="travel-list">{nearby.map((event) => <Destination key={event.id} event={event} game={game} current={current} recommended={event.id === recommendedMainId} onSelect={() => selectDestination(event)} />)}</div>
    {(other.length > 0 || unavailable.length > 0) && <details open={showOther} onToggle={(event) => setShowOther(event.currentTarget.open)}><summary>ほかの行き先を見る</summary><div className="travel-list">{[...other, ...unavailable].map((event) => <Destination key={event.id} event={event} game={game} current={current} onSelect={() => selectDestination(event)} />)}</div></details>}
    {selected && <Modal labelledBy="travel-choice-title" className="travel-choice-modal" onClose={() => setSelectedId(null)}><div className="travel-choice-header"><h2 id="travel-choice-title">{selected.place.nameJa}へ</h2><button type="button" className="secondary" onClick={() => setSelectedId(null)}>閉じる</button></div><p>移動手段を選んでください。時間・料金はゲーム内の目安です。</p><div className="travel-choice-routes">{selected.routes.map((route) => {
      const availability = getTravelEventAvailability(game, selected.id, route.mode);
      return <div key={route.mode}><button type="button" className="secondary travel-route" disabled={!availability.available} onClick={() => { onTravelEvent(selected.id, route.mode); setSelectedId(null); }}>{modes[route.mode]} {route.minutes}分 · €{route.cost}</button>{!availability.available && <p className="fine-print">{availability.reason}</p>}</div>;
    })}</div></Modal>}
  </section>;
}

function Destination({ event, game, current, recommended, onSelect }: {
  event: TravelEvent & { walkMinutes: number; place: (typeof milanoTravelCatalog.places)[number]; routes: TravelRoute[]; available: boolean; unavailableReason?: string };
  game: GameState;
  current: (typeof milanoTravelCatalog.places)[number];
  recommended?: boolean;
  onSelect: () => void;
}) {
  const direction = getDirection(current, event.place);
  const date = dates.find((item) => item.id === event.id);
  const apCost = date && isUpdatedDateReplay(game, event.id) ? 0 : event.apCost;
  const samePlace = milanoTravelCatalog.events.filter((item) => item.placeId === event.placeId && item.category === event.category);
  const category = event.category === "main" ? "観光" : "デート";
  const numberedCategory = samePlace.length > 1 ? `${category}${samePlace.findIndex((item) => item.id === event.id) + 1}` : category;
  const onlyRoute = event.routes.length === 1 ? event.routes[0] : undefined;
  return <article className="travel-destination" data-testid={`travel-destination-${event.id}`}>
    <button type="button" className="travel-destination-button" onClick={onSelect}>
      <span className="travel-category">{event.category === "main" ? "◇" : "♡"} {numberedCategory}</span>
      <span className="travel-destination-title">{event.place.nameJa}</span>
      <span className="travel-destination-meta">{onlyRoute ? `${modes[onlyRoute.mode]}約${onlyRoute.minutes}分 · €${onlyRoute.cost}` : `徒歩約${event.walkMinutes}分`}（{direction}）{apCost ? ` · ${apCost} AP` : ""}</span>
      {recommended && <small>おすすめ</small>}
      {!event.available && <small>{event.unavailableReason || "今は行けません。"}</small>}
    </button>
  </article>;
}
