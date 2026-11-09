import { useState } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import { getTransportMode } from "../../content/transport";
import { Modal, ModalTitle } from "../../components/Modal";
import type { GameState } from "../../domain/game";
import { getRentalOffers } from "../../domain/transport";

/**
 * Free time's rentals: the rental modes rented in this city, and the offers at
 * the party's place. Renting asks once more in a dialog (one more tap against
 * a mis-tap, like 休む); the rental lasts until the party leaves the city.
 */
export function TravelRentals({ game, onRent }: { game: GameState; onRent: (modeId: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const { city } = getCityContent(game.currentCityId);
  const offers = getRentalOffers(game);
  const rented = game.travel.rentedModeIds.map((modeId) => getTransportMode(game.currentCityId, modeId)?.nameJa ?? modeId);
  if (!offers.length && !rented.length) return null;
  const forTwo = getJourneyForCity(game.currentCityId)?.farePartySize === 2;
  return <div className="travel-rentals" data-testid="travel-rentals">
    {rented.length > 0 && <p className="travel-rented">{rented.join("・")}を借りています（{city.nameJa}にいるあいだ）</p>}
    {offers.length > 0 && <button type="button" className="secondary travel-rent-open" onClick={() => setOpen(true)}>
      {offers.map((choice) => choice.mode.nameJa).join("・")}を借りる
    </button>}
    {open && <Modal labelledBy="travel-rent-title" className="travel-choice-modal" onClose={() => setOpen(false)}>
      <ModalTitle id="travel-rent-title" onClose={() => setOpen(false)}>乗り物を借りる</ModalTitle>
      <p>借りると、{city.nameJa}にいるあいだ乗れます。次の街へ出発するときに返します。料金はゲーム内の目安です。{forTwo && "料金は2人分です。"}</p>
      <div className="travel-choice-routes">{offers.map((choice) => <div key={choice.offer.modeId}>
        <button type="button" className="secondary travel-route" data-testid={`travel-rent-${choice.offer.modeId}`} disabled={!choice.available}
          onClick={() => { if (onRent(choice.offer.modeId)) setOpen(false); }}>
          {choice.mode.nameJa}を借りる · {formatMoneyForCity(game.currentCityId, choice.offer.cost)}
        </button>
        {!choice.available && <p className="fine-print">{choice.reason}</p>}
      </div>)}</div>
    </Modal>}
  </div>;
}
