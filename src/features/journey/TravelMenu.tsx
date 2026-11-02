import { useState } from "react";
import { battles, dates, episodes, journeyConfig, milanoTravelCatalog, milanoTravelSettings } from "../../content";
import type { TravelEvent, TravelRoute } from "../../content/travel-schemas";
import { isEventVisible, isUpdatedDateReplay, type GameState } from "../../domain/game";
import { getDirection, planOvernight, selectNearbyDestinations } from "../../domain/travel";
import { getTravelEventAvailability, getTravelHomeRoutes, waitForTravel } from "../../domain/travel-game";
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

function PlaceMap({ game, events }: { game: GameState; events: TravelEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(game.travel.currentPlaceId);
  const places = milanoTravelCatalog.places.filter((place) => place.id === game.travel.hotelPlaceId || place.id === game.travel.currentPlaceId || events.some((event) => event.placeId === place.id));
  const latitude = places.reduce((sum, place) => sum + place.latitude, 0) / places.length;
  const scale = Math.cos(latitude * Math.PI / 180);
  const xs = places.map((place) => place.longitude * scale);
  const ys = places.map((place) => -place.latitude);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const unit = Math.min(290 / Math.max(maxX - minX, 0.00001), 190 / Math.max(maxY - minY, 0.00001));
  const x = (value: number) => 160 + (value * scale - (minX + maxX) / 2) * unit;
  const y = (value: number) => 110 + (-value - (minY + maxY) / 2) * unit;
  const selectedPlace = places.find((place) => place.id === selected);
  const atPlace = events.filter((event) => event.placeId === selected);
  return (
    <details className="travel-map" data-testid="travel-map">
      <summary>ミラノの位置関係を見る</summary>
      <div className={expanded ? "travel-map-frame expanded" : "travel-map-frame"}>
        <svg viewBox="0 0 320 220" role="img" aria-label="ミラノの地点図。上が北です。">
          <rect width="320" height="220" rx="12" fill="#eff4ed" />
          <text x="14" y="20" className="travel-map-north">北 ↑</text>
          {places.map((place) => {
            const here = place.id === game.travel.currentPlaceId;
            const categories = new Set(events.filter((event) => event.placeId === place.id).map((event) => event.category));
            const visited = events.some((event) => event.placeId === place.id && (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || game.battleRecords.some((record) => record.battleId === event.id && record.attempts > 0)));
            const px = x(place.longitude), py = y(place.latitude);
            return <g key={place.id} role="button" tabIndex={0} aria-label={`${place.nameJa}${here ? "、現在地" : ""}${categories.has("main") ? "、観光" : ""}${categories.has("date") ? "、デート" : ""}${visited ? "、訪問済み" : "、未訪問"}`} onClick={() => setSelected(place.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(place.id); } }}>
              {here && <circle cx={px} cy={py} r="11" className="map-here" />}
              {categories.has("main") && <polygon points={`${px},${py - 7} ${px + 7},${py} ${px},${py + 7} ${px - 7},${py}`} className="map-main" />}
              {categories.has("date") && <text x={px + (categories.has("main") ? 5 : 0)} y={py + (categories.has("main") ? -4 : 4)} textAnchor="middle" className="map-heart">♥</text>}
              {!categories.size && !here && <circle cx={px} cy={py} r="5" className="map-main" />}
              {visited && <circle cx={x(place.longitude)} cy={y(place.latitude)} r="3" fill="white" />}
              {selected === place.id && <circle cx={x(place.longitude)} cy={y(place.latitude)} r="11" className="map-selected" />}
            </g>;
          })}
        </svg>
      </div>
      <p>緑の輪：現在地　◆：観光　♥：デート　白い点：訪問済み</p>
      <label className="travel-map-places">地点を選ぶ <select value={selected} onChange={(event) => setSelected(event.currentTarget.value)}>{places.map((place) => <option key={place.id} value={place.id}>{place.nameJa}</option>)}</select></label>
      <button type="button" className="secondary travel-map-zoom" onClick={() => setExpanded(!expanded)}>{expanded ? "地図を小さくする" : "地図を大きくする"}</button>
      <p aria-live="polite"><strong>{selectedPlace?.nameJa ?? "地点"}</strong>{selected === game.travel.currentPlaceId ? "（現在地）" : ""}{atPlace.length > 0 ? `：${atPlace.map((event) => event.titleJa).join("、")}` : ""}</p>
      <small>位置関係の目安・上が北。© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> / OpenSidewalkMap</small>
    </details>
  );
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
  const homeRoutes = getTravelHomeRoutes(current.id, game.travel.hotelPlaceId);
  const snapshot = { ...game.travel, ap: game.ap, travelBudget: game.travelBudget };
  const nextTimes = [18 * 60, ...events.flatMap((event) => event.startWindows?.map((window) => window.start) ?? []), ...milanoTravelCatalog.places.flatMap((place) => place.openingWindows?.map((window) => window.start) ?? [])].filter((value) => value > game.travel.minute && value < 22 * 60);
  const nextTime = nextTimes.length ? Math.min(...nextTimes) : null;
  return <section className="travel-menu" aria-label="ミラノの行き先" data-testid="travel-menu">
    <div className="travel-clock"><strong>{game.travel.day}日目 {time(game.travel.minute)}</strong><span>現在地：{current.id === game.travel.hotelPlaceId ? "滞在先（架空）" : current.nameJa}</span>{game.travel.returnReserve > 0 && <span>帰路用に€{game.travel.returnReserve}を確保（所持金に含む）</span>}</div>
    <div className="travel-utility">
      <button type="button" className="secondary" disabled={waitForTravel(game, 30, game.revision) === game} onClick={() => onTravelWait(30)}>30分待つ</button>
      {nextTime !== null && <button type="button" className="secondary" disabled={waitForTravel(game, nextTime - game.travel.minute, game.revision) === game} onClick={() => onTravelWait(nextTime - game.travel.minute)}>{time(nextTime)}まで待つ</button>}
      <button type="button" className="secondary" onClick={() => setShowSleep(!showSleep)} aria-expanded={showSleep}>滞在先で休む</button>
    </div>
    {showSleep && <div className="travel-choices"><p>架空の滞在先へ戻り、翌日9:00に出発します。ゲーム内の宿泊費は€{milanoTravelSettings.lodgingCost}、APは使いません。予算の不足分は補助されます。</p>{homeRoutes.map((route) => {
      const result = planOvernight(snapshot, route, milanoTravelSettings.lodgingCost);
      const via = route.viaPlaceId ? milanoTravelCatalog.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
      return <div key={route.mode}><button type="button" className="secondary" disabled={!result.ok} onClick={() => { onTravelSleep(route.mode); setShowSleep(false); }}>{modes[route.mode]}{via ? `・${via}から徒歩` : ""} {route.minutes}分 · €{route.cost}{result.ok && result.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</button>{!result.ok && <p className="fine-print">{result.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}</div>;
    })}{homeRoutes.length === 0 && <p>滞在先への経路は確認されていません。</p>}</div>}
    <PlaceMap game={game} events={mapEvents} />
    <h2>どこへ行く？</h2>
    {eligible.length === 0 && <p>今すぐ行ける場所はありません。時間を待つか、滞在先で休めます。</p>}
    <div className="travel-list">{nearby.map((event) => <Destination key={event.id} event={event} game={game} current={current} recommended={event.id === recommendedMainId} onSelect={() => setSelectedId(event.id)} />)}</div>
    {(other.length > 0 || unavailable.length > 0) && <details open={showOther} onToggle={(event) => setShowOther(event.currentTarget.open)}><summary>ほかの行き先を見る</summary><div className="travel-list">{[...other, ...unavailable].map((event) => <Destination key={event.id} event={event} game={game} current={current} onSelect={() => setSelectedId(event.id)} />)}</div></details>}
    {selected && <section className="travel-choices" aria-label={`${selected.titleJa}への移動`}><div className="travel-choice-header"><h3>{selected.place.nameJa}へ</h3><button type="button" className="secondary" onClick={() => setSelectedId(null)}>閉じる</button></div><p>移動手段を選んでください。時間・料金はゲーム内の目安です。</p>{selected.routes.map((route) => {
      const availability = getTravelEventAvailability(game, selected.id, route.mode);
      return <div key={route.mode}><button type="button" className="secondary travel-route" disabled={!availability.available} onClick={() => { onTravelEvent(selected.id, route.mode); setSelectedId(null); }}>{modes[route.mode]} {route.minutes}分 · €{route.cost}</button>{!availability.available && <p className="fine-print">{availability.reason}</p>}</div>;
    })}</section>}
  </section>;
}

function Destination({ event, game, current, recommended, onSelect }: {
  event: TravelEvent & { walkMinutes: number; place: (typeof milanoTravelCatalog.places)[number]; available: boolean; unavailableReason?: string };
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
      {!event.available && <small>{event.unavailableReason || "今は行けません。"}</small>}
    </button>
    {(date || episode || special) && <p>{description(event)}</p>}
  </article>;
}
