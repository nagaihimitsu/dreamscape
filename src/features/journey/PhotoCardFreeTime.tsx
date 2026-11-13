import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getCityContent } from "../../content";
import { getCityBackdropPath } from "../../content/city-backdrop";
import { HudScreenTool } from "../../components/HudScreenTool";
import { Icon } from "../../components/icons";
import type { GameState } from "../../domain/game";
import { getTourOffers } from "../../domain/tour";
import { getTravelWaitOptions } from "../../domain/travel-destinations";
import { CityProgress } from "./CityProgress";
import type { FreeTimeHubProps } from "./FreeTimeHub";
import { FreeTimeBackdrop } from "./FreeTimeBackdrop";
import { FreeTimeExtras } from "./FreeTimeExtras";
import { SIDE_BY_SIDE_QUERY } from "./free-time-layout";
import { timeOfDayTint } from "./time-of-day";
import { PhotoCardPicker, rowCardName } from "./PhotoCardPicker";
import { LockedCard, PlaceCard, sleepWayJa, StayCard, TourCard, WaitCard } from "./PlaceCard";
import { Announce, mapPlaces, PlaceMapDialog } from "./PlaceMap";
import { hintedLockedDates } from "../../domain/date-rules";
import {
  cardOfTarget, cardTarget, chooseArrangement, chooseSleepWay, chooseWait, defaultCardIndex, departureOf, joinedCardsJa, lockedCardJa, newCardIds, NO_PLAN,
  photoCardAnnouncement, photoCardEntries, refusalJa, refusalNoteJa, refusalReasonsJa, rowCards, sleepRefusalJa, sleepRefusalReasonsJa, syncRow, takesSwipe,
  TOUR_CHOSEN_JA, WAIT_REFUSAL_JA, WAIT_REFUSAL_REASON_JA, waitChosenJa, waitLabelJa,
  type CardArrangement, type DeparturePlan, type PhotoCardEntry, type RowCard,
} from "./photo-cards";
import { armedAt, type PressKind } from "./travel-selection";
import { TravelRentals } from "./TravelRentals";
import type { CardSwipe } from "./useCardGestures";
import { useTravelSelection, type PressScope } from "./useTravelSelection";
import { playSe } from "../../audio/sound-effects";
import { usePreloadDestination } from "../../media/preload-ahead";
import "./free-time-hub.css";
import "./photo-free-time.css";

/**
 * Free time as B案「写真札で旅先を選ぶ」 (docs/02 「自由時間の画面」): the epilogue's button, one row of photo cards (「待機」,
 * the places, sightseeing and dates alike, then the tour when the city has one, then 「ホテルに戻る」; the first place's
 * card is chosen first; the chosen card is the selection, and its card under the row has the waits, the event and the
 * way to choose and a small map, the booking, or the ways home; a swipe up departs with that event and way, waits the
 * chosen wait or rests by the chosen way home, only the chosen card flying; in the row a sideways drag or a swipe up may
 * start anywhere on the screen: useCardGestures), the rentals and the city's remaining actions. 「地図」 (today's
 * expanded map and 「地点を名前で探す」) sits in the header's second row while this screen shows (HudScreenTool). The background is the city's backdrop when it has one
 * (FreeTimeBackdrop: its own artwork or its photo, dimmed), else a map-like pattern, not a map, under the colour of the
 * game clock's time of day (timeOfDayTint). Every rule is today's: the
 * shared selection (useTravelSelection) travels and rests through the same handlers.
 */
export function PhotoCardFreeTime({
  game, onClaimRewards, onStartEpisode, onEpilogue, onBattle, onTravelEvent, onRent, onBookTour, onCancelTour, onTravelWait, onTravelSleep, nextCityName, onDepart,
  seenCards, debug = false,
}: FreeTimeHubProps) {
  const { city } = getCityContent(game.currentCityId);
  const backdrop = getCityBackdropPath(game.currentCityId) !== null;
  // 「待機」's wait and 「ホテルに戻る」's way home picked on their cards (a swipe up, 「待つ」 and 「休む」 take them; null: the
  // first that can, 「30分待つ」 and the fastest way home), picked afresh each time their card becomes the chosen one.
  const [waitPick, setWaitPick] = useState<string | null>(null);
  const [sleepPick, setSleepPick] = useState<string | null>(null);
  const [pickedOn, setPickedOn] = useState<string | null>(null);
  const api = useTravelSelection(game, { onTravelEvent, onTravelSleep }, {
    // 「ホテルに戻る」 says the way home its swipe up takes.
    announce: (target, name, openEventId) => {
      const way = target.kind === "sleep" ? chooseSleepWay(target.choices.options, sleepPick) : null;
      return photoCardAnnouncement(target, name, openEventId, way && sleepWayJa(game, way.route));
    },
  });
  const { layout, arrangement } = useFreeTimeArrangement();
  const [mapOpen, setMapOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  // Each place's chosen event and way (its card's choices; a swipe up and 「行く」 take them).
  const [plans, setPlans] = useState<ReadonlyMap<string, DeparturePlan>>(() => new Map());
  const planOf = (placeId: string) => plans.get(placeId) ?? NO_PLAN;
  const changePlan = (placeId: string, change: Partial<DeparturePlan>) =>
    setPlans((previous) => new Map(previous).set(placeId, { ...(previous.get(placeId) ?? NO_PLAN), ...change }));
  const { current, nearby, other, candidates, recommendedMainId } = api.destinations;
  const places = useMemo(() => [...nearby, ...other], [nearby, other]);
  const tour = getTourOffers(game).length > 0 || game.tour?.status === "booked";
  // The dates not open yet whose writer gave a hint (# hint:, 2026-11-13): with Debug mode on only, locked cards after the
  // places', never chosen to go (players never see them: a date joins the row as a new card once it opens).
  const locked = useMemo(() => (debug ? hintedLockedDates(game) : []), [game, debug]);
  const lockedKey = locked.map((date) => `${date.dateId}:${date.hintJa}`).join("\n");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cards = useMemo(() => rowCards(photoCardEntries(places, api.choices), { tour, locked, debug }), [places, api.choices, tour, lockedKey, debug]);
  const joining = useJoiningCards(game, cards, seenCards, (fresh) => {
    // The row turns to the first new card (quietly, as the screen's own choice), and the live region names them all.
    setPick(fresh[0].id);
    api.announce(joinedCardsJa(fresh.map((card) => rowCardName(game, card))));
  });
  // The card remembered while it is still in the row, else the first place's (photo-cards.ts defaultCardIndex).
  const chosen = cards.find((card) => card.id === pick) ?? cards[defaultCardIndex(cards)];
  // Another card chosen: 「待機」 and 「ホテルに戻る」 start again from their first choice (adjusted while rendering).
  if (pickedOn !== chosen.id) {
    setPickedOn(chosen.id);
    setWaitPick(null);
    setSleepPick(null);
  }
  // The chosen place's scenes load their first pictures and voices in the background (src/media/preload-ahead.ts): each
  // event that can be done now, by its first way.
  const chosenWays = useMemo(() => chosen.kind !== "place" ? [] : chosen.entry.events.flatMap((choice) => {
    const way = choice.available ? choice.routes.find((route) => route.available) : undefined;
    return way ? [{ eventId: choice.event.id, mode: way.route.mode }] : [];
  }), [chosen]);
  usePreloadDestination(game, chosenWays);
  const waitOptions = useMemo(() => getTravelWaitOptions(game), [game]);
  const wait = chooseWait(waitOptions, waitPick);
  const sleepWay = chooseSleepWay(api.sleep.options, sleepPick);
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
    playSe("ui_tap");
    setPick(cardId);
    api.choose(cardTarget(card));
    if (card.kind === "tour") api.announce(TOUR_CHOSEN_JA);
    if (card.kind === "locked") api.announce(lockedCardJa(card.hintJa));
    if (card.kind === "wait") {
      // The wait its swipe up takes (newly chosen: the first, 「30分待つ」).
      const shown = chooseWait(waitOptions, cardId === chosen.id ? waitPick : null);
      api.announce(waitChosenJa(shown && waitLabelJa(shown)));
    }
  }

  if (!current) return <p role="alert">現在地を確認できません。保存状態を確認してください。</p>;
  /** The card under the row (on the page: a visible name only in the row, where no chosen row above names it). */
  const cardOf = (card: RowCard, scope: PressScope = "page") => {
    const heading = scope === "dialog" || arrangement === "row";
    // In the row a swipe up on the photo card goes, waits or rests: the card's own button is for readers and keys only.
    const quietGo = scope === "page" && arrangement === "row";
    if (card.kind === "wait")
      return <WaitCard game={game} options={waitOptions} wait={wait} onPick={setWaitPick} onWait={(chosenWait) => onTravelWait(chosenWait.minutes)}
        heading={heading} quietGo={quietGo} />;
    if (card.kind === "stay") return <StayCard game={game} api={api} picked={sleepPick} onPick={setSleepPick} scope={scope} heading={heading} quietGo={quietGo} />;
    if (card.kind === "tour") return <TourCard game={game} onBook={onBookTour} onCancel={onCancelTour} heading={heading} />;
    if (card.kind === "locked") return <LockedCard hintJa={card.hintJa} heading={heading} />;
    return <PlaceCard game={game} entry={card.entry} api={api} scope={scope} map={scope === "page"} heading={heading}
      plan={planOf(card.id)} onPlan={(change) => changePlan(card.id, change)} quietGo={quietGo} />;
  };
  const readyAt = api.selection ? armedAt(api.selection) : 0;
  /** A place card's swipe up: its chosen event by its chosen way, while the place is the selection (else why not). */
  const swipeOf = (entry: PhotoCardEntry): CardSwipe => {
    const placeId = entry.place.id;
    const { event, way } = departureOf(entry, planOf(placeId));
    const go = way && api.isSelected({ kind: "place", placeId })
      ? (kind: PressKind) => api.pressRoute(placeId, event.event.id, way.route.mode, kind, "page") : null;
    return { go, readyAt, refuse: () => api.announce(refusalJa(event)), note: refusalNoteJa(refusalReasonsJa(event)) };
  };
  /**
   * The chosen card's swipe up (photo-cards.ts takesSwipe): a place's (swipeOf); 「待機」's waits the chosen wait (this
   * screen stays: its card comes back); 「ホテルに戻る」's rests by the chosen way home while it is the selection; or none.
   */
  const swipeFor = (card: RowCard): CardSwipe | null => {
    if (!takesSwipe(card)) return null;
    if (card.kind === "place") return swipeOf(card.entry);
    if (card.kind === "wait")
      return { go: wait ? () => onTravelWait(wait.minutes) : null, readyAt: 0, stays: true, refuse: () => api.announce(WAIT_REFUSAL_JA),
        note: refusalNoteJa(WAIT_REFUSAL_REASON_JA) };
    const go = sleepWay && api.isSelected({ kind: "sleep" })
      ? (kind: PressKind) => api.pressSleepRoute(sleepWay.route.mode, sleepWay.route.viaPlaceId ?? null, kind, "page") : null;
    return { go, readyAt, refuse: () => api.announce(sleepRefusalJa(api.sleep.options)), note: refusalNoteJa(sleepRefusalReasonsJa(api.sleep.options)) };
  };
  // The expanded map's 「選んだ行き先」: the selected card's card, or a line for the current place or for no selection.
  const selectedCard = cardOfTarget(cards, target);
  const slot = selectedCard ? cardOf(selectedCard, "dialog")
    : target?.kind === "place" ? <p>{current.nameJa}（現在地）には、ここで始められる予定はありません。</p>
    : <p>地図の印か「地点を名前で探す」で選ぶと、ここに行き先が出ます。</p>;

  return <section className="free-time-hub photo-free-time" data-testid="free-time-hub" ref={layout}>
    {backdrop ? <FreeTimeBackdrop cityId={game.currentCityId} /> : <div className="photo-backdrop" aria-hidden="true" />}
    {/* The colour of the time of day over it (time-of-day.ts; it eases over when the clock moves while the screen shows). */}
    <div className="free-time-tint" aria-hidden="true" style={{ backgroundColor: timeOfDayTint(game.travel.minute) }} />
    {/* The screen's name for readers and for the focus after a screen change (the row shows the rest). */}
    <h1 className="sr-only" tabIndex={-1}>{city.nameJa}の行き先</h1>
    <HudScreenTool>
      <button type="button" className="hud-tool" data-testid="map-expand" aria-label="地図を大きく見る" onClick={() => setMapOpen(true)}>
        <Icon name="map" /><span className="hud-tool-word">地図</span>
      </button>
    </HudScreenTool>
    <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} />

    <section className="photo-menu" aria-label={`${city.nameJa}の行き先`} data-testid="travel-menu">
      {/* 「待機」 is named only while one of its waits can be made (late in the evening none can). */}
      {!cards.some((card) => card.kind === "place" && card.entry.available) &&
        <p className="photo-menu-note">{wait ? "今すぐ行ける場所はありません。「ホテルに戻る」で休むか、「待機」で時間を待てます。" : "今すぐ行ける場所はありません。「ホテルに戻る」で休めます。"}</p>}
      <div className="photo-stage">
        <CardProbe />
        <PhotoCardPicker game={game} cards={cards} chosenId={chosen.id} onChoose={chooseCard} arrangement={arrangement}
          recommendedId={recommendedMainId} card={cardOf(chosen)} swipe={swipeFor(chosen)} joining={joining} />
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

/** When a joining card's motion starts (photo-free-time.css photo-card-join's delay: the screen has appeared). */
const JOIN_DELAY_MS = 220;
/** How long the cards count as joining (the motion's delay and length, with some room). */
const JOIN_MS = 1400;

/**
 * The cards new to the row (2026-11-13, photo-cards.ts newCardIds): a destination the story opened (a date whose `when:`
 * came true, a night's encounter...) or a tour on offer, found against the cards the row has shown in this city during
 * this play (`seenCards`, GameApp's memory; without it nothing joins). When some appear (as the screen opens after a
 * scene, or while it shows), `onJoin` hears them in the row's order, they are dealt in (photo-free-time.css) and
 * card_new sounds once as they come. Returns the ids joining now.
 */
function useJoiningCards(game: GameState, cards: readonly RowCard[], seenCards: FreeTimeHubProps["seenCards"],
  onJoin: (fresh: readonly RowCard[]) => void): readonly string[] {
  const [joining, setJoining] = useState<readonly string[]>([]);
  const cityId = game.currentCityId;
  useLayoutEffect(() => {
    if (!seenCards) return;
    const seen = seenCards.current.get(cityId) ?? null;
    const ids = cards.map((card) => card.id);
    seenCards.current.set(cityId, new Set([...(seen ?? []), ...ids]));
    const fresh = newCardIds(seen, ids);
    if (!fresh.length) return;
    setJoining(fresh);
    onJoin(fresh.map((id) => cards.find((card) => card.id === id)!));
  // Each row as it shows (the memory makes a second look find nothing new).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);
  useEffect(() => {
    if (!joining.length) return;
    const sound = window.setTimeout(() => playSe("card_new"), JOIN_DELAY_MS);
    const done = window.setTimeout(() => setJoining([]), JOIN_MS);
    return () => {
      window.clearTimeout(sound);
      window.clearTimeout(done);
    };
  }, [joining]);
  return joining;
}

/** A hidden middle card with a two-line name and its swipe cue: its height (larger text included) chooses row or list. */
function CardProbe() {
  return <div className="photo-card-probe" aria-hidden="true">
    <span className="photo-card is-story">
      <span className="photo-card-photo" />
      <span className="photo-card-text">
        <span className="photo-card-name">行き先の<br />名前</span>
        <span className="photo-card-cue" />
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
