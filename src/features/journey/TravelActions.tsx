import { useState } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import type { TravelRoute } from "../../content/travel-schemas";
import { Modal } from "../../components/Modal";
import type { GameState } from "../../domain/game";
import { DAY_END, canReturnByDayEnd, planOvernight } from "../../domain/travel";
import { getTravelHomeRoutes, waitForTravel } from "../../domain/travel-game";
import { formatTravelTime } from "./travel-time";
import { showTravelEvent, travelModeLabels } from "./travel-visibility";
import { TimePassage } from "./TimePassage";

/** Time and lodging use the same game rules as the destination menu. */
export function TravelActions({ game, onTravelWait, onTravelSleep, reduceMotion = false }: {
  game: GameState;
  reduceMotion?: boolean;
  onTravelWait: (minutes: number) => boolean;
  onTravelSleep: (mode: TravelRoute["mode"], viaPlaceId: string | null) => boolean;
}) {
  const { travel, travelSettings } = getCityContent(game.currentCityId);
  const [showSleep, setShowSleep] = useState(false);
  const [transition, setTransition] = useState(0);
  const [transitionVisible, setTransitionVisible] = useState(false);
  function showTimePassage() {
    setTransition((current) => current + 1);
    setTransitionVisible(true);
  }
  const events = travel.events.filter((event) => showTravelEvent(game, event));
  const nextTimes = [18 * 60, ...events.flatMap((event) => event.startWindows?.map((window) => window.start) ?? []), ...travel.places.flatMap((place) => place.openingWindows?.map((window) => window.start) ?? [])]
    .filter((value) => value > game.travel.minute && value < DAY_END);
  const nextTime = nextTimes.length ? Math.min(...nextTimes) : null;
  const homeRoutes = getTravelHomeRoutes(game.travel.currentPlaceId, game.travel.hotelPlaceId, game.currentCityId);
  const snapshot = { ...game.travel, ap: game.ap, travelBudget: game.travelBudget };
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
      <p>滞在先へ戻り、翌日9:00に出発します。ゲーム内の宿泊費は{formatMoneyForCity(game.currentCityId, travelSettings.lodgingCost)}、APは使いません。予算の不足分は補助されます。{getJourneyForCity(game.currentCityId)?.id === "golden_triangle" && "移動料金は2人分のゲーム内の目安です。"}</p>
      <div className="travel-choice-routes">{homeRoutes.map((route) => {
        const result = planOvernight(snapshot, route, travelSettings.lodgingCost, !canReturnByDayEnd(snapshot, homeRoutes));
        const via = route.viaPlaceId ? travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
        return <div key={JSON.stringify([route.mode, route.viaPlaceId ?? null])}><button type="button" className="secondary travel-route" disabled={!result.ok} onClick={() => { if (onTravelSleep(route.mode, route.viaPlaceId ?? null)) showTimePassage(); setShowSleep(false); }}>{travelModeLabels[route.mode]}{route.transferNote ? `（${route.transferNote}）` : ""}{via ? `・${via}から徒歩` : ""} {route.minutes}分 · {formatMoneyForCity(game.currentCityId, route.cost)}{result.ok && result.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</button>{!result.ok && <p className="fine-print">{result.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}</div>;
      })}</div>
      {homeRoutes.length === 0 && <p>滞在先への経路は確認されていません。</p>}
    </Modal>}
    {transitionVisible && <TimePassage key={transition} reduceMotion={reduceMotion} onEnd={() => setTransitionVisible(false)} />}
  </div>;
}
