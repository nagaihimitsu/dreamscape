import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { getCityContent } from "../../content";
import type { TravelRoute } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { getNextCity } from "../../domain/city-travel";
import { departureAfterTour } from "../../domain/tour";
import { Icon } from "../../components/icons";
import { CityProgress } from "./CityProgress";
import { FreeTimeBackdrop } from "./FreeTimeBackdrop";
import { mapSticks, SIDE_BY_SIDE_QUERY } from "./free-time-layout";
import { PendingRewards } from "./PendingRewards";
import { freeTimePhotos, PhotoCredits } from "./PhotoCredits";
import { TravelActions } from "./TravelActions";
import { TravelMenu } from "./TravelMenu";
import { useTravelSelection } from "./useTravelSelection";
import "./free-time-hub.css";

/**
 * Free time (UI redesign §3.4): the city's picture behind the screen, the visible
 * heading drawn as the map's banner, the destinations (map and list), the city's
 * remaining actions, 「写真の出典」 and the bottom band with 待機 and 休む.
 */
export function FreeTimeHub({
  game,
  onClaimRewards,
  onStartEpisode,
  onEpilogue,
  onBattle,
  onTravelEvent,
  onRent,
  onBookTour,
  onCancelTour,
  onTravelWait,
  onTravelSleep,
  nextCityName,
  onDepart,
}: {
  game: GameState;
  onClaimRewards: () => void;
  onStartEpisode: (id: string) => void;
  onEpilogue: (id: string) => void;
  onBattle: (id: string) => void;
  onTravelEvent: (id: string, mode: TravelRoute["mode"]) => void;
  onRent: (modeId: string) => boolean;
  onBookTour: (tourId: string, offerId: string) => boolean;
  onCancelTour: () => boolean;
  onTravelWait: (minutes: number) => boolean;
  onTravelSleep: (mode: TravelRoute["mode"], viaPlaceId: string | null) => boolean;
  nextCityName?: string;
  onDepart: () => void;
}) {
  const { city } = getCityContent(game.currentCityId);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const photos = useMemo(() => freeTimePhotos(game), [game]);
  const layout = useFreeTimeLayout();
  // A booked tour holds the departure (tour stage 2a): the line says what happens once it is over.
  const afterTour = departureAfterTour(game, getNextCity(game)?.city.nameJa);
  const extras = game.pendingApRewards.length > 0 || !!nextCityName || !!afterTour;
  // One selection for the list, both maps and the band's 休む (§3.5).
  const selection = useTravelSelection(game, { onTravelEvent, onTravelSleep });
  // Esc (outside a dialog) closes an open 待機 menu first, then clears the selection; focus goes to its name.
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || (event.target as Element).closest("dialog")) return;
    const hub = event.currentTarget;
    const wait = hub.querySelector("details.travel-wait[open]");
    if (wait) {
      wait.removeAttribute("open");
      hub.querySelector<HTMLElement>(".travel-wait summary")?.focus();
      return;
    }
    const cleared = selection.clear();
    if (!cleared) return;
    const name = cleared.kind === "sleep" ? hub.querySelector<HTMLElement>(".travel-sleep-toggle")
      : hub.querySelector<HTMLElement>(`[data-testid="travel-place-${cleared.placeId}"] .travel-destination-button`);
    name?.focus({ preventScroll: true });
  }
  return (
    <section className="free-time-hub" data-testid="free-time-hub" ref={layout} onKeyDown={onKeyDown}>
      <FreeTimeBackdrop cityId={game.currentCityId} />
      {/* The screen's heading, drawn as the map notebook's banner (not pressable: no edge, no chevron). */}
      <h1 className="free-time-banner" tabIndex={-1}>
        <Icon name="compass" />
        <span>{city.nameJa}の行き先</span>
        <Icon name="plane" className="free-time-banner-plane" />
      </h1>
      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} showNext={false} />

      <TravelMenu key={game.currentCityId} game={game} api={selection} onRent={onRent} onBookTour={onBookTour} onCancelTour={onCancelTour} />

      {extras && <div className="free-time-extras">
        <PendingRewards game={game} onClaim={onClaimRewards} compact />
        {nextCityName && <button type="button" className="secondary" onClick={onDepart}>{nextCityName}へ出発</button>}
        {afterTour && <p className="free-time-tour-wait" data-testid="tour-departure-wait">
          予約したツアーを終えるか取り消すと、{afterTour.cityNameJa}へ{afterTour.automatic ? "出発します" : "出発できます"}。</p>}
      </div>}
      {photos.length > 0 && <button type="button" className="free-time-credits-open" onClick={() => setCreditsOpen(true)}>
        <Icon name="credit" />写真の出典
      </button>}
      {creditsOpen && <PhotoCredits photos={photos} onClose={() => setCreditsOpen(false)} />}
      {/* Hidden: its height is the visible height with the browser's bars shown (100svh). */}
      <div className="free-time-svh-probe" aria-hidden="true" />
      <TravelActions game={game} api={selection} onTravelWait={onTravelWait} />
    </section>
  );
}

/**
 * Keeps the sticky map honest (§3.4 「When the map does not stick」): from the
 * measured header, bottom band and visible height (a hidden 100svh probe, so a
 * collapsing address bar never toggles it) it sets `data-map-sticky` on the hub,
 * writes the stuck map block's height as `--map-sticky-h` on the app shell, and
 * gives the page a scroll padding (header + stuck map at the top, the band at
 * the bottom) so focus moves and scrolling into view never leave a control under
 * them. Everything is removed when free time ends.
 */
function useFreeTimeLayout() {
  return useCallback((hub: HTMLElement | null) => {
    const shell = hub?.closest<HTMLElement>(".app-shell");
    if (!hub || !shell) return;
    const root = document.documentElement.style;
    const sideBySide = window.matchMedia(SIDE_BY_SIDE_QUERY);
    const height = (element: Element | null) => element?.getBoundingClientRect().height ?? 0;
    let frame = 0;
    const update = () => {
      const hud = height(shell.querySelector(".journey-hud"));
      const band = height(hub.querySelector('[data-testid="travel-actions"]'));
      const sticks = mapSticks({ viewport: height(hub.querySelector(".free-time-svh-probe")), hud, band, sideBySide: sideBySide.matches });
      hub.dataset.mapSticky = String(sticks);
      const stuck = sticks && !sideBySide.matches ? height(hub.querySelector(".travel-map")) : 0;
      shell.style.setProperty("--map-sticky-h", `${stuck}px`);
      root.scrollPaddingTop = `${hud + stuck}px`;
      root.scrollPaddingBottom = `${band}px`;
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const resized = new ResizeObserver(later);
    for (const element of [shell.querySelector(".journey-hud"), hub.querySelector('[data-testid="travel-actions"]'), hub.querySelector(".travel-map"), hub.querySelector(".free-time-svh-probe")])
      if (element) resized.observe(element);
    sideBySide.addEventListener("change", later);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      sideBySide.removeEventListener("change", later);
      shell.style.removeProperty("--map-sticky-h");
      root.scrollPaddingTop = "";
      root.scrollPaddingBottom = "";
    };
  }, []);
}
