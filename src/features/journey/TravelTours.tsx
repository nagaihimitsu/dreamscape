import { useState } from "react";
import { getTour } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import { ConfirmActionButton } from "../../components/ConfirmActionButton";
import { Modal, ModalTitle } from "../../components/Modal";
import { meets } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { getTourOffers, type TourOfferChoice } from "../../domain/tour";
import { tourItinerary, tourSellerBadge } from "./tour-labels";

/**
 * Free time's tours (tour stage 2a), a place-action line like the rentals: 「ツアーを見る」 opens the city's tours (each card: name,
 * what it includes, the itinerary, tomorrow 9:00, the offers here with their seller and price for the party, the ones sold
 * elsewhere, any reason an offer cannot be taken), and booking asks once more in a dialog. Once booked, the line names tomorrow's
 * tour and offers its cancel (confirmed in a dialog: the price comes back, the booking is gone).
 */
export function TravelTours({ game, onBook, onCancel }: {
  game: GameState;
  onBook: (tourId: string, offerId: string) => boolean;
  onCancel: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<TourOfferChoice | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cityId = game.currentCityId;
  const offers = getTourOffers(game);
  const booked = game.tour?.status === "booked" ? game.tour : null;
  const bookedTour = booked && getTour(booked.tourId);
  if (!offers.length && !bookedTour) return null;
  const money = (amount: number) => formatMoneyForCity(cityId, amount);
  const forTwo = getJourneyForCity(cityId)?.farePartySize === 2 ? "（2人分）" : "";
  const tours = [...new Map(offers.map((choice) => [choice.tour.id, choice.tour])).values()];
  return <div className="travel-tours" data-testid="travel-tours">
    {booked && bookedTour && <>
      <p className="travel-tour-booked" data-testid="travel-tour-booked">
        明日の予定：{bookedTour.titleJa}（{bookedTour.offers.find((offer) => offer.id === booked.offerId)?.sellerJa ?? "予約先"}で予約）
      </p>
      <button type="button" className="secondary travel-tour-open" data-testid="travel-tour-cancel" onClick={() => setCancelling(true)}>予約を取り消す</button>
    </>}
    {offers.length > 0 && <button type="button" className="secondary travel-tour-open" data-testid="travel-tours-open" onClick={() => setOpen(true)}>ツアーを見る</button>}
    {open && !confirm && <Modal labelledBy="travel-tours-title" className="travel-choice-modal travel-tours-modal" onClose={() => setOpen(false)}>
      <ModalTitle id="travel-tours-title" onClose={() => setOpen(false)}>ツアー</ModalTitle>
      <p>明日の朝9:00に宿を出る日帰りのツアーです。予約すると代金を今払い、取り消すと戻ります。料金はゲーム内の目安です。</p>
      {tours.map((tour) => {
        const here = offers.filter((choice) => choice.tour.id === tour.id);
        // A desk elsewhere (its condition holding): the card names its price too, sold only there.
        const elsewhere = tour.offers.filter((offer) => offer.placeIds && !offer.placeIds.includes(game.travel.currentPlaceId) && meets(game, offer.when));
        const itinerary = tourItinerary(tour);
        return <section key={tour.id} className="travel-tour-card" data-testid={`travel-tour-${tour.id}`} aria-labelledby={`travel-tour-${tour.id}-title`}>
          <h3 id={`travel-tour-${tour.id}-title`}>{tour.titleJa}</h3>
          <p className="travel-tour-when">明日 9:00 から</p>
          <p>{tour.summaryJa}</p>
          <ol className="travel-tour-itinerary">
            {itinerary.lines.map((line) => <li key={line}>{line}</li>)}
            <li className="travel-tour-end">→ {itinerary.end}</li>
          </ol>
          <div className="travel-choice-routes">{here.map((choice) => <div key={choice.offer.id}>
            <button type="button" className="secondary travel-route travel-tour-offer" data-testid={`travel-tour-book-${choice.offer.id}`}
              disabled={!choice.available} onClick={() => setConfirm(choice)}>
              <span><span className="travel-tour-seller">{tourSellerBadge(choice.offer)}</span>で予約する</span>
              <span className="travel-route-cost">{money(choice.offer.price)}{forTwo}</span>
            </button>
            {!choice.available && <p className="fine-print">{choice.reason}</p>}
          </div>)}</div>
          {elsewhere.map((offer) => <p key={offer.id} className="fine-print">{offer.sellerJa}では{money(offer.price)}{forTwo}で予約できます。</p>)}
        </section>;
      })}
    </Modal>}
    {confirm && <Modal labelledBy="travel-tour-confirm-title" className="travel-choice-modal" onClose={() => setConfirm(null)}>
      <ModalTitle id="travel-tour-confirm-title">{confirm.tour.titleJa}を予約</ModalTitle>
      <p>明日の朝、このツアーに参加します。代金{money(confirm.offer.price)}{forTwo}を支払いますか？</p>
      <ConfirmActionButton className="primary" data-testid="travel-tour-confirm" onClick={() => {
        if (onBook(confirm.tour.id, confirm.offer.id)) { setConfirm(null); setOpen(false); }
      }}>予約する</ConfirmActionButton>
      <button type="button" className="secondary" onClick={() => setConfirm(null)}>やめる</button>
    </Modal>}
    {cancelling && booked && bookedTour && <Modal labelledBy="travel-tour-cancel-title" className="travel-choice-modal" onClose={() => setCancelling(false)}>
      <ModalTitle id="travel-tour-cancel-title">予約を取り消す</ModalTitle>
      <p>予約を取り消しますか？ 代金{money(booked.pricePaid)}は戻り、このツアーの予約はなくなります。</p>
      <ConfirmActionButton className="primary" data-testid="travel-tour-cancel-confirm" onClick={() => { if (onCancel()) setCancelling(false); }}>取り消す</ConfirmActionButton>
      <button type="button" className="secondary" onClick={() => setCancelling(false)}>やめる</button>
    </Modal>}
  </div>;
}
