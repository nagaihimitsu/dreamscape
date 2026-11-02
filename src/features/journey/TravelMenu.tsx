import { useState } from "react";
import { battles, dates, episodes, journeyConfig, milanoTravelCatalog, milanoTravelSettings } from "../../content";
import type { TravelEvent, TravelRoute } from "../../content/travel-schemas";
import { isEventVisible, isUpdatedDateReplay, type GameState } from "../../domain/game";
import { getDirection, planOvernight, selectNearbyDestinations } from "../../domain/travel";
import { getTravelEventAvailability, getTravelHomeRoutes, waitForTravel } from "../../domain/travel-game";
import { Modal } from "../../components/Modal";
import { PlaceMap } from "./PlaceMap";
import "./travel-menu.css";

type Mode = TravelRoute["mode"];
const modes: Record<Mode, string> = { walk: "徒歩", rail: "鉄道・地下鉄", tram: "路面電車", bus: "バス", taxi: "タクシー" };
const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export function formatEndingWindows(windows: NonNullable<TravelEvent["endWindows"]>): string {
  return windows.length === 1 && windows[0].start === 0
    ? `${time(windows[0].end)}まで`
    : windows.map((window) => `${time(window.start)}〜${time(window.end)}`).join("・");
}

function description(event: TravelEvent): string {
  return episodes.find((item) => item.id === event.id)?.descriptionJa ??
    journeyConfig.storyBattles.find((item) => item.battleId === event.id)?.descriptionJa ??
    dates.find((item) => item.id === event.id)?.descriptionJa ?? "";
}

function showEvent(game: GameState, event: TravelEvent): boolean {
  const date = dates.find((item) => item.id === event.id);
  if (!date) return true;
  if (date.legacyOnly) return false;
  return date.kind === "normal" ? !game.playedDateIds.includes(date.id) || isEventVisible(game, date.id) : isEventVisible(game, date.id);
}

export function TravelMenu({ game, onTravelEvent, onTravelWait, onTravelSleep }: {
  game: GameState;
  onTravelEvent: (eventId: string, mode: Mode) => void;
  onTravelWait: (minutes: number) => void;
  onTravelSleep: (mode: Mode) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const current = milanoTravelCatalog.places.find((place) => place.id === game.travel.currentPlaceId);
  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  const events = milanoTravelCatalog.events.filter((event) => showEvent(game, event));
  const mapEvents = milanoTravelCatalog.events.filter((event) => {
    const date = dates.find((item) => item.id === event.id);
    return !date?.legacyOnly || game.playedDateIds.includes(event.id);
  });
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
  const homeRoutes = getTravelHomeRoutes(current.id, game.travel.hotelPlaceId);
  const snapshot = { ...game.travel, ap: game.ap, travelBudget: game.travelBudget };
  const nextTimes = [18 * 60, ...events.flatMap((event) => event.startWindows?.map((window) => window.start) ?? []), ...milanoTravelCatalog.places.flatMap((place) => place.openingWindows?.map((window) => window.start) ?? [])].filter((value) => value > game.travel.minute && value < 22 * 60);
  const nextTime = nextTimes.length ? Math.min(...nextTimes) : null;
  return <section className="travel-menu" aria-label="ミラノの行き先" data-testid="travel-menu">
    {game.travel.returnReserve > 0 && <p className="travel-reserve">帰路用に€{game.travel.returnReserve}を確保（所持金に含む）</p>}
    <div className="travel-utility">
      <details className="travel-wait">
        <summary>時間を進める</summary>
        <div className="travel-wait-actions">
          <button type="button" className="secondary" disabled={waitForTravel(game, 30, game.revision) === game} onClick={() => onTravelWait(30)}>30分待つ</button>
          {nextTime !== null && <button type="button" className="secondary" disabled={waitForTravel(game, nextTime - game.travel.minute, game.revision) === game} onClick={() => onTravelWait(nextTime - game.travel.minute)}>{time(nextTime)}まで待つ</button>}
        </div>
      </details>
      <button type="button" className="travel-sleep-toggle" onClick={() => setShowSleep(!showSleep)} aria-expanded={showSleep}>滞在先で休む</button>
    </div>
    {showSleep && <div className="travel-choices"><p>架空の滞在先へ戻り、翌日9:00に出発します。ゲーム内の宿泊費は€{milanoTravelSettings.lodgingCost}、APは使いません。予算の不足分は補助されます。</p>{homeRoutes.map((route) => {
      const result = planOvernight(snapshot, route, milanoTravelSettings.lodgingCost);
      const via = route.viaPlaceId ? milanoTravelCatalog.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
      return <div key={route.mode}><button type="button" className="secondary" disabled={!result.ok} onClick={() => { onTravelSleep(route.mode); setShowSleep(false); }}>{modes[route.mode]}{via ? `・${via}から徒歩` : ""} {route.minutes}分 · €{route.cost}{result.ok && result.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</button>{!result.ok && <p className="fine-print">{result.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}</div>;
    })}{homeRoutes.length === 0 && <p>滞在先への経路は確認されていません。</p>}</div>}
    <PlaceMap game={game} events={mapEvents} />
    <h2>どこへ行く？</h2>
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
  const episode = episodes.find((item) => item.id === event.id);
  const special = battles.find((item) => item.id === event.id);
  const apCost = date && isUpdatedDateReplay(game, event.id) ? 0 : event.apCost;
  const windows = event.startWindows;
  const opening = event.place.openingWindows;
  return <article className="travel-destination" data-testid={`travel-destination-${event.id}`}>
    <button type="button" className="travel-destination-button" onClick={onSelect}>
      <span className="travel-category">{event.category === "main" ? "◇ 観光" : "♡ デート"}</span>
      <span className="travel-destination-title">{event.titleJa}</span>
      <span className="travel-destination-meta">{event.place.nameJa} · 徒歩約{event.walkMinutes}分（{direction}） · {apCost ? `${apCost} AP` : "AP不要"} · 滞在{event.activityMinutes}分{opening?.length ? ` · 開館 ${opening.map((window) => `${time(window.start)}〜${time(window.end - 1)}`).join("・")}` : ""}{windows?.length ? ` · 開始 ${windows.map((window) => `${time(window.start)}〜${time(window.end - 1)}`).join("・")}` : ""}{event.endWindows?.length ? ` · 終了 ${formatEndingWindows(event.endWindows)}` : ""}</span>
      {recommended && <small>おすすめの観光地</small>}
      {event.available && event.routes.length === 1 && <small>タップで{modes[event.routes[0].mode]}移動 · €{event.routes[0].cost}</small>}
      {!event.available && <small>{event.unavailableReason || "今は行けません。"}</small>}
    </button>
    {(date || episode || special) && <p>{description(event)}</p>}
  </article>;
}
