import { useState } from "react";
import { balance, getCityContent } from "../content";
import { formatMoneyForCity } from "../content/currency";
import { getJourneyForCity } from "../content/journeys";
import { validateGameState } from "../domain/game";
import { getGameWeekday, planTravel } from "../domain/travel";
import { minimumHomeFare } from "../domain/travel-routes";
import { getTravelHomeRoutes, sleepAtHotel } from "../domain/travel-game";
import { PlaceMap } from "../features/journey/PlaceMap";
import { travelModeLabels } from "../features/journey/travel-visibility";
import { loadGame, saveGame } from "../persistence";
import { prototypePreviewState } from "./prototype-preview-state";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); } };
}

/** Real prototype locations and authored routes, without starting an unfinished scene. */
export function PrototypePreview({ cityId, onClose }: { cityId: string; onClose: () => void }) {
  const [session] = useState(() => {
    const storage = memoryStorage();
    const state = prototypePreviewState(cityId);
    const result = saveGame(storage, state);
    if (!result.ok) throw new Error(result.message);
    return { storage, state };
  });
  const [game, setGame] = useState(session.state);
  const { city, travel } = getCityContent(cityId);
  const [placeId, setPlaceId] = useState(() => travel.places.find((place) => place.id !== game.travel.currentPlaceId)?.id ?? game.travel.currentPlaceId);
  const [message, setMessage] = useState("");
  const current = travel.places.find((place) => place.id === game.travel.currentPlaceId)!;
  const routes = travel.routes.filter((route) => route.fromPlaceId === current.id && route.toPlaceId === placeId);
  const homeRoutes = getTravelHomeRoutes(current.id, game.travel.hotelPlaceId, cityId);
  const weekday = getGameWeekday(game.travel.calendar);

  function commit(next: typeof game, success: string) {
    if (next === game) { setMessage("この時間・予算では休めません。"); return; }
    const saved = saveGame(session.storage, next, game);
    if (!saved.ok) { setMessage(saved.message); return; }
    setGame(next);
    setMessage(success);
  }

  function move(route: (typeof routes)[number]) {
    const result = planTravel({ ...game.travel, ap: game.ap, travelBudget: game.travelBudget }, route);
    if (!result.ok) { setMessage("この時間・予算では移動できません。"); return; }
    const returnReserve = minimumHomeFare(travel.routes, route.toPlaceId, game.travel.hotelPlaceId, result.arrivalMinute);
    if (returnReserve === undefined || returnReserve > result.remainingBudget) {
      setMessage("滞在先への帰路と費用を確保できません。"); return;
    }
    const next = validateGameState({ ...game, revision: game.revision + 1, travelBudget: result.remainingBudget,
      travel: { ...game.travel, currentPlaceId: route.toPlaceId, minute: result.arrivalMinute, returnReserve } });
    commit(next, "一時データで移動を確認しました。");
  }

  return <main className="debug-panel" data-testid="debug-prototype-preview">
    <header className="debug-session-bar"><strong>{city.nameJa} · 都市データの確認</strong><button type="button" onClick={onClose}>設定へ戻る</button></header>
    <p>制作中の地点・ゲーム用推定経路です。{getJourneyForCity(cityId)?.farePartySize === 2 && "料金は2人分です。"}観光やデートの物語は始まりません。操作と保存はこの画面だけの一時データです。</p>
    <p data-testid="debug-prototype-status">現在地：{current.nameJa}　{game.travel.day}日目{weekday === undefined ? "" : `（${["月", "火", "水", "木", "金", "土", "日"][weekday]}）`} {String(Math.floor(game.travel.minute / 60)).padStart(2, "0")}:{String(game.travel.minute % 60).padStart(2, "0")}　{formatMoneyForCity(cityId, game.travelBudget)}　{Math.min(balance.apCap, game.ap)} AP</p>
    <PlaceMap game={game} events={travel.events} />
    <label>移動先 <select data-testid="debug-prototype-destination" value={placeId} onChange={(event) => setPlaceId(event.target.value)}>
      {travel.places.map((place) => <option key={place.id} value={place.id}>{place.nameJa}</option>)}
    </select></label>
    <div>{routes.map((route) => <button type="button" className="secondary" key={route.mode} onClick={() => move(route)}>
      {travelModeLabels[route.mode]}{route.transferNote ? `（${route.transferNote}）` : ""} {route.minutes}分 · {formatMoneyForCity(cityId, route.cost)}
    </button>)}</div>
    {routes.length === 0 && <p>登録された移動手段はありません。</p>}
    <div>{homeRoutes.map((route) => {
      const via = route.viaPlaceId ? travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
      return <button type="button" className="secondary" key={JSON.stringify([route.mode, route.viaPlaceId ?? null])} onClick={() =>
        commit(sleepAtHotel(game, route.mode, game.revision, route.viaPlaceId ?? null), "一時データで翌日になりました。") }>
        滞在先で休む（{travelModeLabels[route.mode]}{route.transferNote ? `・${route.transferNote}` : ""}{via ? `・${via}から徒歩` : ""} {route.minutes}分 · {formatMoneyForCity(cityId, route.cost)}）
      </button>;
    })}</div>
    <button type="button" onClick={() => {
      const result = loadGame(session.storage);
      if (result.status === "loaded") { setGame(result.state); setMessage("一時データから再開しました。"); }
      else setMessage("一時データを読み込めませんでした。");
    }}>一時データを読み直す</button>
    {message && <p role="status">{message}</p>}
  </main>;
}
