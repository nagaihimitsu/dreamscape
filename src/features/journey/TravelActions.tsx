import { useState } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import type { TravelRoute } from "../../content/travel-schemas";
import { Modal } from "../../components/Modal";
import type { GameState } from "../../domain/game";
import { getNextTravelWaitTime } from "../../domain/travel-destinations";
import { getTravelSleepOptions, waitForTravel } from "../../domain/travel-game";
import { formatTravelTime } from "./travel-time";
import { travelModeLabels } from "./travel-visibility";

/** Time and lodging use the same game rules as the destination menu. */
export function TravelActions({ game, onTravelWait, onTravelSleep }: {
  game: GameState;
  onTravelWait: (minutes: number) => boolean;
  onTravelSleep: (mode: TravelRoute["mode"], viaPlaceId: string | null) => boolean;
}) {
  const { travel, travelSettings } = getCityContent(game.currentCityId);
  const [showSleep, setShowSleep] = useState(false);
  const nextTime = getNextTravelWaitTime(game);
  const sleepOptions = getTravelSleepOptions(game);
  return <div className="travel-utility">
    <details className="travel-wait">
      <summary aria-label="時間を進める">待機</summary>
      <div className="travel-wait-actions">
        <button type="button" className="secondary" disabled={waitForTravel(game, 30, game.revision) === game} onClick={() => onTravelWait(30)}>30分待つ</button>
        {nextTime !== null && <button type="button" className="secondary" disabled={waitForTravel(game, nextTime - game.travel.minute, game.revision) === game} onClick={() => onTravelWait(nextTime - game.travel.minute)}>{formatTravelTime(nextTime)}まで待つ</button>}
      </div>
    </details>
    <button type="button" className="travel-sleep-toggle" aria-label="滞在先で休む" onClick={() => setShowSleep(true)}>休む</button>
    {showSleep && <Modal labelledBy="travel-sleep-title" className="travel-choice-modal" onClose={() => setShowSleep(false)}>
      <div className="travel-choice-header"><h2 id="travel-sleep-title">滞在先で休む</h2><button type="button" className="secondary" onClick={() => setShowSleep(false)}>閉じる</button></div>
      <p>滞在先へ戻り、翌日9:00に出発します。ゲーム内の宿泊費は{formatMoneyForCity(game.currentCityId, travelSettings.lodgingCost)}、APは使いません。予算の不足分は補助されます。{getJourneyForCity(game.currentCityId)?.farePartySize === 2 && "移動料金は2人分のゲーム内の目安です。"}</p>
      <div className="travel-choice-routes">{sleepOptions.map(({ route, plan: result }) => {
        const via = route.viaPlaceId ? travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
        return <div key={JSON.stringify([route.mode, route.viaPlaceId ?? null])}><button type="button" className="secondary travel-route" disabled={!result.ok} onClick={() => { onTravelSleep(route.mode, route.viaPlaceId ?? null); setShowSleep(false); }}>{travelModeLabels[route.mode]}{route.transferNote ? `（${route.transferNote}）` : ""}{via ? `・${via}から徒歩` : ""} {route.minutes}分 · {formatMoneyForCity(game.currentCityId, route.cost)}{result.ok && result.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</button>{!result.ok && <p className="fine-print">{result.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}</div>;
      })}</div>
      {sleepOptions.length === 0 && <p>滞在先への経路は確認されていません。</p>}
    </Modal>}
  </div>;
}
