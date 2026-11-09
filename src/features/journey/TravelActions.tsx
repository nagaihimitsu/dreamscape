import { useState } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import type { TravelRoute } from "../../content/travel-schemas";
import { Modal } from "../../components/Modal";
import { Icon } from "../../components/icons";
import { useMeasuredHeight } from "../../components/useMeasuredHeight";
import type { GameState } from "../../domain/game";
import { getTravelWaitOptions } from "../../domain/travel-destinations";
import { getTravelSleepOptions } from "../../domain/travel-game";
import { formatTravelTime } from "./travel-time";
import { transportLabel } from "../../content/transport";

/**
 * Free time's bottom band (UI redesign §3.4 item 7): 待機 and 休む on an opaque
 * band fixed to the bottom of the screen, with the same game rules as the
 * destination menu. Its height is measured as `--bottom-h` (the page's reserve at
 * its end and the free-time scroll padding). The open 待機 menu rises above the
 * band; 休む still asks in its dialog (the two-step selection is step 1.6).
 */
export function TravelActions({ game, onTravelWait, onTravelSleep }: {
  game: GameState;
  onTravelWait: (minutes: number) => boolean;
  onTravelSleep: (mode: TravelRoute["mode"], viaPlaceId: string | null) => boolean;
}) {
  const { travel, travelSettings } = getCityContent(game.currentCityId);
  const [showSleep, setShowSleep] = useState(false);
  const waitOptions = getTravelWaitOptions(game);
  const sleepOptions = getTravelSleepOptions(game);
  const measured = useMeasuredHeight("--bottom-h");
  return <div className="travel-band" data-testid="travel-actions" ref={measured}>
    <div className="travel-band-row">
    <details className="travel-wait">
      <summary aria-label="時間を進める"><Icon name="hourglass" /><span className="travel-band-word">待機</span></summary>
      <div className="travel-wait-actions">
        {waitOptions.map((option) => <button key={option.until ?? "minutes"} type="button" className="secondary" disabled={!option.available} onClick={() => onTravelWait(option.minutes)}>{option.until === null ? `${option.minutes}分待つ` : `${formatTravelTime(option.until)}まで待つ`}</button>)}
      </div>
    </details>
    <button type="button" className="travel-sleep-toggle" aria-label="滞在先で休む" onClick={() => setShowSleep(true)}><Icon name="bed" /><span className="travel-band-word">休む</span></button>
    </div>
    {showSleep && <Modal labelledBy="travel-sleep-title" className="travel-choice-modal" onClose={() => setShowSleep(false)}>
      <div className="travel-choice-header"><h2 id="travel-sleep-title">滞在先で休む</h2><button type="button" className="secondary" onClick={() => setShowSleep(false)}>閉じる</button></div>
      <p>滞在先へ戻り、翌日9:00に出発します。ゲーム内の宿泊費は{formatMoneyForCity(game.currentCityId, travelSettings.lodgingCost)}、APは使いません。予算の不足分は補助されます。{getJourneyForCity(game.currentCityId)?.farePartySize === 2 && "移動料金は2人分のゲーム内の目安です。"}</p>
      <div className="travel-choice-routes">{sleepOptions.map(({ route, plan: result }) => {
        const via = route.viaPlaceId ? travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
        return <div key={JSON.stringify([route.mode, route.viaPlaceId ?? null])}><button type="button" className="secondary travel-route" disabled={!result.ok} onClick={() => { onTravelSleep(route.mode, route.viaPlaceId ?? null); setShowSleep(false); }}>{transportLabel(game.currentCityId, route.mode)}{route.transferNote ? `（${route.transferNote}）` : ""}{via ? `・${via}から徒歩` : ""} {route.minutes}分 · {formatMoneyForCity(game.currentCityId, route.cost)}{result.ok && result.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</button>{!result.ok && <p className="fine-print">{result.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}</div>;
      })}</div>
      {sleepOptions.length === 0 && <p>滞在先への経路は確認されていません。</p>}
    </Modal>}
  </div>;
}
