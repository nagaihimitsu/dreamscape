import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getCityContent } from "../../content";
import { Icon } from "../../components/icons";
import { Modal, ModalTitle } from "../../components/Modal";
import { getTourOffers } from "../../domain/tour";
import { CityProgress } from "./CityProgress";
import { SleepChoice } from "./DestinationRow";
import type { FreeTimeHubProps } from "./FreeTimeHub";
import { FreeTimeBand } from "./FreeTimeBand";
import { FreeTimeCredits, FreeTimeExtras } from "./FreeTimeExtras";
import { SIDE_BY_SIDE_QUERY } from "./free-time-layout";
import { PhotoCardPicker } from "./PhotoCardPicker";
import { freeTimePhotos } from "./PhotoCredits";
import { PlaceCard } from "./PlaceCard";
import { Announce, mapPlaces, PlaceMapDialog } from "./PlaceMap";
import { bandItems, chooseArrangement, photoCardAnnouncement, photoCardEntries, photoCardEntry, type CardArrangement, type PhotoCardEntry } from "./photo-cards";
import { TravelRentals } from "./TravelRentals";
import { TourBookedLine } from "./TravelTours";
import { useTravelSelection } from "./useTravelSelection";
import "./free-time-hub.css";
import "./photo-free-time.css";

/** The chosen card of a row: the one remembered while it is still there, else the first. */
const chosenOf = (entries: readonly PhotoCardEntry[], placeId: string | null) =>
  entries.find((entry) => entry.place.id === placeId)?.place.id ?? entries[0]?.place.id ?? null;

/**
 * Free time as B案「写真札で旅先を選ぶ」 (docs/02 「自由時間の画面」): the heading with 「地図」 (today's expanded map and
 * 「地点を名前で探す」), the epilogue's button, a booked tour's line, the sightseeing photo cards (the chosen card is the
 * selection; its introduction card has the way buttons and a small map), the rentals, the city's remaining actions,
 * 「写真の出典」 and the bottom band (待機, 休む, デート, ツアー). The background is a map-like pattern, not a map. Every
 * rule is today's: the shared selection (useTravelSelection) travels and rests through the same handlers.
 */
export function PhotoCardFreeTime({
  game, onClaimRewards, onStartEpisode, onEpilogue, onBattle, onTravelEvent, onRent, onBookTour, onCancelTour, onTravelWait, onTravelSleep, nextCityName, onDepart,
}: FreeTimeHubProps) {
  const { city } = getCityContent(game.currentCityId);
  const api = useTravelSelection(game, { onTravelEvent, onTravelSleep }, { announce: photoCardAnnouncement });
  const { layout, arrangement } = useFreeTimeArrangement();
  const [mapOpen, setMapOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [mainPick, setMainPick] = useState<string | null>(null);
  const [datePick, setDatePick] = useState<string | null>(null);
  const { current, nearby, other, candidates, recommendedMainId } = api.destinations;
  const places = useMemo(() => [...nearby, ...other], [nearby, other]);
  const mainCards = useMemo(() => photoCardEntries(places, api.choices, "main"), [places, api.choices]);
  const dateCards = useMemo(() => photoCardEntries(places, api.choices, "date"), [places, api.choices]);
  const mainId = chosenOf(mainCards, mainPick);
  const dateId = chosenOf(dateCards, datePick);
  // The photos this screen shows (the cards'; the backdrop photo of the previous screen is not drawn here).
  const photos = useMemo(() => freeTimePhotos(game).filter((photo) => photo.kind !== "backdrop"), [game]);
  const items = bandItems({ dates: dateCards, tourOffers: getTourOffers(game).length });
  /** The date sheet's chosen card while the sheet is open. */
  const openDateId = datesOpen ? dateId : null;
  const mapMarks = useMemo(() => mapPlaces(game, candidates, api.destinations), [game, candidates, api.destinations]);
  const target = api.selection?.target;

  // The chosen card is the selection (quietly: the screen chose it, not the player). While the date sheet is open its
  // card is; otherwise the sightseeing row's, unless 休む has the hotel or the expanded map has just chosen a card of
  // the row (the row then turns to it). The expanded map chooses for itself while it is open.
  useLayoutEffect(() => {
    if (mapOpen) return;
    if (openDateId !== null) {
      if (!(target?.kind === "place" && target.placeId === openDateId)) api.choose(openDateId, { quiet: true });
      return;
    }
    if (target?.kind === "sleep" || (target?.kind === "place" && target.placeId === mainId)) return;
    if (target?.kind === "place" && mainCards.some((entry) => entry.place.id === target.placeId)) setMainPick(target.placeId);
    else if (mainId) api.choose(mainId, { quiet: true });
  });
  // A travel or a rest chosen in the expanded map or the date sheet closes it first (as today's expanded map).
  useEffect(() => {
    api.leaveRef.current = mapOpen || openDateId !== null ? () => { setMapOpen(false); setDatesOpen(false); } : null;
    return () => { api.leaveRef.current = null; };
  });

  /** A card the player chose (a press, a key, a flick): it becomes the selection, said in the live region. */
  const chooseMain = (placeId: string) => {
    setMainPick(placeId);
    api.choose(placeId);
  };
  const chooseDate = (placeId: string) => {
    setDatePick(placeId);
    api.choose(placeId);
  };
  const closeDates = () => {
    setDatesOpen(false);
    if (mainId) api.choose(mainId, { quiet: true });
  };
  // Esc (outside a dialog) closes an open 待機 menu first, then 休む's ways home; the focus goes back to its button.
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || (event.target as Element).closest("dialog")) return;
    const hub = event.currentTarget;
    const wait = hub.querySelector("details.travel-wait[open]");
    if (wait) {
      wait.removeAttribute("open");
      hub.querySelector<HTMLElement>(".travel-wait summary")?.focus();
    } else if (api.isSelected({ kind: "sleep" })) {
      api.clear();
      hub.querySelector<HTMLElement>(".travel-sleep-toggle")?.focus({ preventScroll: true });
    }
  }

  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  const card = (entry: PhotoCardEntry | undefined) => entry && <PlaceCard game={game} entry={entry} api={api} heading={arrangement === "row"} />;
  const mainCard = mainCards.find((entry) => entry.place.id === mainId);
  const dateCard = dateCards.find((entry) => entry.place.id === dateId);
  const nothingNow = !mainCards.some((entry) => entry.available);
  // The expanded map's 「選んだ行き先」: the selected place's card (every event there), the ways home, or a hint.
  const selectedPlace = target?.kind === "place" ? places.find((place) => place.id === target.placeId) : undefined;
  const slotEntry = selectedPlace && api.target?.kind === "place" && api.target.choices ? photoCardEntry(selectedPlace, api.target.choices, "any") : null;
  const slot = target?.kind === "sleep" ? <SleepChoice game={game} sleep={api.sleep} api={api} scope="dialog" />
    : slotEntry ? <PlaceCard game={game} entry={slotEntry} api={api} scope="dialog" map={false} />
    : target?.kind === "place" ? <p>{current.nameJa}（現在地）には、ここで始められる予定はありません。</p>
    : <p>地図の印か「地点を名前で探す」で選ぶと、ここに行き先が出ます。</p>;

  return <section className="free-time-hub photo-free-time" data-testid="free-time-hub" ref={layout} onKeyDown={onKeyDown}>
    <div className="photo-backdrop" aria-hidden="true" />
    <div className="photo-heading">
      {/* The screen's heading (not pressable), and the expanded map beside it. */}
      <h1 className="free-time-banner" tabIndex={-1}>
        <Icon name="compass" />
        <span>{city.nameJa}の行き先</span>
      </h1>
      <button type="button" className="photo-map-open" data-testid="map-expand" aria-label="地図を大きく見る" onClick={() => setMapOpen(true)}>
        <Icon name="map" /><span>地図</span>
      </button>
    </div>
    <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} />

    <section className="photo-menu" aria-label={`${city.nameJa}の行き先`} data-testid="travel-menu">
      {game.tour?.status === "booked" && <div className="travel-tours" data-testid="travel-tours"><TourBookedLine game={game} onCancel={onCancelTour} /></div>}
      {nothingNow && <p className="photo-menu-note">{items.includes("dates")
        ? "今すぐ行ける観光地はありません。デートは下の「デート」から選べます。"
        : "今すぐ行ける場所はありません。時間を待つか、滞在先で休めます。"}</p>}
      <div className="photo-stage">
        <CardProbe />
        {mainId && <PhotoCardPicker game={game} entries={mainCards} chosenId={mainId} onChoose={chooseMain} arrangement={arrangement}
          label="観光の行き先" testIdPrefix="travel-place" recommendedId={recommendedMainId} card={card(mainCard)} />}
      </div>
      <TravelRentals game={game} onRent={onRent} />
      <Announce message={api.message} testId="travel-announce" />
    </section>

    <FreeTimeExtras game={game} onClaimRewards={onClaimRewards} nextCityName={nextCityName} onDepart={onDepart} />
    <FreeTimeCredits photos={photos} />
    {/* Hidden: its height is the visible height with the browser's bars shown (100svh). */}
    <div className="free-time-svh-probe" aria-hidden="true" />
    <FreeTimeBand game={game} api={api} items={items} onTravelWait={onTravelWait} onOpenDates={() => setDatesOpen(true)} onBookTour={onBookTour} />

    {mapOpen && <PlaceMapDialog game={game} events={candidates} places={mapMarks} selectedId={api.selectedMarkerId}
      onMarker={(placeId, kind) => api.pressMarker(placeId, kind, false, "dialog")} onFocusEnd={api.focusEnd} onClose={() => setMapOpen(false)}
      selection={{ message: api.message, slot }} />}
    {openDateId !== null && <Modal labelledBy="free-time-dates-title" className="photo-date-sheet" onClose={closeDates} settlePresses>
      <ModalTitle id="free-time-dates-title" onClose={closeDates}>デート</ModalTitle>
      <div className="photo-stage">
        <PhotoCardPicker game={game} entries={dateCards} chosenId={openDateId} onChoose={chooseDate} arrangement={arrangement}
          label="デートの行き先" testIdPrefix="date-place" card={card(dateCard)} />
      </div>
    </Modal>}
  </section>;
}

/** A hidden card with a two-line name and one line under it: its height (larger text included) chooses row or list. */
function CardProbe() {
  return <div className="photo-card-probe" aria-hidden="true">
    <span className="photo-card">
      <span className="photo-card-photo" />
      <span className="photo-card-text">
        <span className="photo-card-name">行き先の<br />名前</span>
        <span className="photo-card-summary">徒歩約5分</span>
      </span>
    </span>
  </div>;
}

/**
 * Row or list (photo-cards.ts chooseArrangement), from the measured header, bottom band, reference card and visible
 * height (the hidden 100svh probe, so a collapsing address bar never switches it), re-measured when any of them
 * changes size or the phone turns. Also gives the page a scroll padding (the header at the top, the band at the
 * bottom) so focus moves and scrolling into view never leave a control under them. Removed when free time ends.
 */
function useFreeTimeArrangement() {
  const [arrangement, setArrangement] = useState<CardArrangement>("row");
  const layout = useCallback((hub: HTMLElement | null) => {
    const shell = hub?.closest<HTMLElement>(".app-shell");
    if (!hub || !shell) return;
    const root = document.documentElement.style;
    const sideways = window.matchMedia(SIDE_BY_SIDE_QUERY);
    const height = (element: Element | null) => element?.getBoundingClientRect().height ?? 0;
    const parts = () => [shell.querySelector(".journey-hud"), hub.querySelector('[data-testid="travel-actions"]'), hub.querySelector(".photo-card-probe"), hub.querySelector(".free-time-svh-probe")];
    let frame = 0;
    const update = () => {
      const [hudBox, bandBox, cardBox, viewportBox] = parts();
      const hud = height(hudBox);
      const band = height(bandBox);
      root.scrollPaddingTop = `${hud}px`;
      root.scrollPaddingBottom = `${band}px`;
      setArrangement(chooseArrangement({ viewport: height(viewportBox), hud, band, card: height(cardBox), sideways: sideways.matches }));
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
      root.scrollPaddingBottom = "";
    };
  }, []);
  return { layout, arrangement };
}
