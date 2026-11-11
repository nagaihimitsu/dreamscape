import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getCityContent } from "../../content";
import { HudScreenTool } from "../../components/HudScreenTool";
import { Icon } from "../../components/icons";
import { getTourOffers } from "../../domain/tour";
import { CityProgress } from "./CityProgress";
import type { FreeTimeHubProps } from "./FreeTimeHub";
import { FreeTimeExtras } from "./FreeTimeExtras";
import { SIDE_BY_SIDE_QUERY } from "./free-time-layout";
import { PhotoCardPicker } from "./PhotoCardPicker";
import { PlaceCard, StayCard, TourCard } from "./PlaceCard";
import { Announce, mapPlaces, PlaceMapDialog } from "./PlaceMap";
import {
  cardOfTarget, cardTarget, chooseArrangement, photoCardAnnouncement, photoCardEntries, rowCards, syncRow, TOUR_CHOSEN_JA,
  type CardArrangement, type RowCard,
} from "./photo-cards";
import { TravelRentals } from "./TravelRentals";
import { useTravelSelection, type PressScope } from "./useTravelSelection";
import "./free-time-hub.css";
import "./photo-free-time.css";

/**
 * Free time as B案「写真札で旅先を選ぶ」 (docs/02 「自由時間の画面」): the epilogue's button, one row of photo cards (the
 * places, sightseeing and dates alike, then the tour when the city has one, then 「ホテルに戻る」; the chosen card is the
 * selection, and its card under the row has the way buttons and a small map, the booking, or the ways home and 待機),
 * the rentals and the city's remaining actions. 「地図」 (today's expanded map and 「地点を名前で探す」) sits in the
 * header's second row while this screen shows (HudScreenTool). The background is a map-like pattern, not a map. Every
 * rule is today's: the shared selection (useTravelSelection) travels and rests through the same handlers.
 */
export function PhotoCardFreeTime({
  game, onClaimRewards, onStartEpisode, onEpilogue, onBattle, onTravelEvent, onRent, onBookTour, onCancelTour, onTravelWait, onTravelSleep, nextCityName, onDepart,
}: FreeTimeHubProps) {
  const { city } = getCityContent(game.currentCityId);
  const api = useTravelSelection(game, { onTravelEvent, onTravelSleep }, { announce: photoCardAnnouncement });
  const { layout, arrangement } = useFreeTimeArrangement();
  const [mapOpen, setMapOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const { current, nearby, other, candidates, recommendedMainId } = api.destinations;
  const places = useMemo(() => [...nearby, ...other], [nearby, other]);
  const tour = getTourOffers(game).length > 0 || game.tour?.status === "booked";
  const cards = useMemo(() => rowCards(photoCardEntries(places, api.choices), { tour }), [places, api.choices, tour]);
  // The card remembered while it is still in the row, else the first.
  const chosen = cards.find((card) => card.id === pick) ?? cards[0];
  const mapMarks = useMemo(() => mapPlaces(game, candidates, api.destinations), [game, candidates, api.destinations]);
  const target = api.selection?.target ?? null;

  // The chosen card is the selection (quietly: the screen chose it, not the player). When the expanded map has chosen
  // another card's place (or the hotel), the row turns to that card; the map chooses for itself while it is open.
  useLayoutEffect(() => {
    if (mapOpen) return;
    const step = syncRow(cards, chosen, target);
    if (step && "turn" in step) setPick(step.turn);
    else if (step) api.choose(step.select, { quiet: true });
  });
  // A travel or a rest chosen in the expanded map closes it first.
  useEffect(() => {
    api.leaveRef.current = mapOpen ? () => setMapOpen(false) : null;
    return () => { api.leaveRef.current = null; };
  });

  /** A card the player chose (a press, a key, a flick): it becomes the selection, said in the live region. */
  function chooseCard(cardId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    setPick(cardId);
    api.choose(cardTarget(card));
    if (card.kind === "tour") api.announce(TOUR_CHOSEN_JA);
  }

  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  /** The card under the row (on the page: a visible name only in the row, where no chosen row above names it). */
  const cardOf = (card: RowCard, scope: PressScope = "page") => {
    const heading = scope === "dialog" || arrangement === "row";
    if (card.kind === "stay") return <StayCard game={game} api={api} onTravelWait={onTravelWait} scope={scope} heading={heading} />;
    if (card.kind === "tour") return <TourCard game={game} onBook={onBookTour} onCancel={onCancelTour} heading={heading} />;
    return <PlaceCard game={game} entry={card.entry} api={api} scope={scope} map={scope === "page"} heading={heading} />;
  };
  // The expanded map's 「選んだ行き先」: the selected card's card, or a line for the current place or for no selection.
  const selectedCard = cardOfTarget(cards, target);
  const slot = selectedCard ? cardOf(selectedCard, "dialog")
    : target?.kind === "place" ? <p>{current.nameJa}（現在地）には、ここで始められる予定はありません。</p>
    : <p>地図の印か「地点を名前で探す」で選ぶと、ここに行き先が出ます。</p>;

  return <section className="free-time-hub photo-free-time" data-testid="free-time-hub" ref={layout}>
    <div className="photo-backdrop" aria-hidden="true" />
    {/* The screen's name for readers and for the focus after a screen change (the row shows the rest). */}
    <h1 className="sr-only" tabIndex={-1}>{city.nameJa}の行き先</h1>
    <HudScreenTool>
      <button type="button" className="hud-tool" data-testid="map-expand" aria-label="地図を大きく見る" onClick={() => setMapOpen(true)}>
        <Icon name="map" /><span className="hud-tool-word">地図</span>
      </button>
    </HudScreenTool>
    <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} />

    <section className="photo-menu" aria-label={`${city.nameJa}の行き先`} data-testid="travel-menu">
      {!cards.some((card) => card.kind === "place" && card.entry.available) &&
        <p className="photo-menu-note">今すぐ行ける場所はありません。「ホテルに戻る」で休むか、時間を待てます。</p>}
      <div className="photo-stage">
        <CardProbe />
        <PhotoCardPicker game={game} cards={cards} chosenId={chosen.id} onChoose={chooseCard} arrangement={arrangement}
          recommendedId={recommendedMainId} card={cardOf(chosen)} />
      </div>
      <TravelRentals game={game} onRent={onRent} />
      <Announce message={api.message} testId="travel-announce" />
    </section>

    <FreeTimeExtras game={game} onClaimRewards={onClaimRewards} nextCityName={nextCityName} onDepart={onDepart} />
    {/* Hidden: its height is the visible height with the browser's bars shown (100svh). */}
    <div className="free-time-svh-probe" aria-hidden="true" />

    {mapOpen && <PlaceMapDialog game={game} events={candidates} places={mapMarks} selectedId={api.selectedMarkerId}
      onMarker={(placeId, kind) => api.pressMarker(placeId, kind, false, "dialog")} onFocusEnd={api.focusEnd} onClose={() => setMapOpen(false)}
      selection={{ message: api.message, slot }} />}
  </section>;
}

/** A hidden card with a two-line name: its height (larger text included) chooses row or list. */
function CardProbe() {
  return <div className="photo-card-probe" aria-hidden="true">
    <span className="photo-card">
      <span className="photo-card-photo" />
      <span className="photo-card-text">
        <span className="photo-card-name">行き先の<br />名前</span>
      </span>
    </span>
  </div>;
}

/**
 * Row or list (photo-cards.ts chooseArrangement), from the measured header, reference card and visible height (the
 * hidden 100svh probe, so a collapsing address bar never switches it), re-measured when any of them changes size or
 * the phone turns. Also gives the page a top scroll padding (the header) so focus moves and scrolling into view never
 * leave a control under it. Removed when free time ends.
 */
function useFreeTimeArrangement() {
  const [arrangement, setArrangement] = useState<CardArrangement>("row");
  const layout = useCallback((hub: HTMLElement | null) => {
    const shell = hub?.closest<HTMLElement>(".app-shell");
    if (!hub || !shell) return;
    const root = document.documentElement.style;
    const sideways = window.matchMedia(SIDE_BY_SIDE_QUERY);
    const height = (element: Element | null) => element?.getBoundingClientRect().height ?? 0;
    const parts = () => [shell.querySelector(".journey-hud"), hub.querySelector(".photo-card-probe"), hub.querySelector(".free-time-svh-probe")];
    let frame = 0;
    const update = () => {
      const [hudBox, cardBox, viewportBox] = parts();
      const hud = height(hudBox);
      root.scrollPaddingTop = `${hud}px`;
      setArrangement(chooseArrangement({ viewport: height(viewportBox), hud, card: height(cardBox), sideways: sideways.matches }));
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const resized = new ResizeObserver(later);
    for (const element of parts()) if (element) resized.observe(element);
    sideways.addEventListener("change", later);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      sideways.removeEventListener("change", later);
      root.scrollPaddingTop = "";
    };
  }, []);
  return { layout, arrangement };
}
