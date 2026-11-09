import { useId, useLayoutEffect, useRef } from "react";
import { Icon } from "../../components/icons";
import { useMeasuredHeight } from "../../components/useMeasuredHeight";
import type { GameState } from "../../domain/game";
import { getTravelWaitOptions } from "../../domain/travel-destinations";
import { SleepChoice } from "./DestinationRow";
import { formatTravelTime } from "./travel-time";
import { pressKindOf, type TravelSelectionApi } from "./useTravelSelection";

/** The least height of the open sleep choices (px), when the map leaves less (they scroll inside). */
const SLEEP_MIN_PX = 96;

/**
 * Free time's bottom band (UI redesign §3.4 item 7): 待機 and 休む on an opaque band fixed
 * to the bottom of the screen. Its row's height is measured as `--bottom-h` (the page's
 * reserve at its end and the free-time scroll padding). The open 待機 menu rises above
 * the band; 休む selects the hotel (the same two steps as a destination, §3.5): the band
 * grows upward with the ways home, never over the map frame or its attribution.
 */
export function TravelActions({ game, api, onTravelWait }: {
  game: GameState;
  api: TravelSelectionApi;
  onTravelWait: (minutes: number) => boolean;
}) {
  const id = useId();
  const waitOptions = getTravelWaitOptions(game);
  const measured = useMeasuredHeight("--bottom-h");
  const selected = api.isSelected({ kind: "sleep" });
  const wait = useRef<HTMLDetailsElement>(null);
  const sleepBox = useRef<HTMLDivElement>(null);
  // The open sleep choices end where the map block ends (re-read on scroll and resize, once a frame).
  useLayoutEffect(() => {
    const box = sleepBox.current;
    if (!selected || !box) return;
    let frame = 0;
    const update = () => {
      const band = box.parentElement!.getBoundingClientRect();
      // The panel sits on the band's top edge (absolutely, so the band's measured height stays the row's).
      const map = document.querySelector(".free-time-hub .travel-map")?.getBoundingClientRect();
      const hud = document.querySelector(".journey-hud")?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(map ? map.bottom : 0, hud);
      box.style.maxHeight = `${Math.max(SLEEP_MIN_PX, band.top - top)}px`;
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
    };
  }, [selected]);
  return <div className="travel-band" data-testid="travel-actions" ref={measured} data-selected={selected ? "true" : undefined} data-armed={selected && api.armed ? "true" : undefined}>
    <div className="travel-band-row">
      {/* One panel at a time: opening 待機 clears a selected 休む (its ways home would lie under the menu). */}
      <details className="travel-wait" ref={wait} onToggle={(toggle) => { if (toggle.currentTarget.open && selected) api.clear(); }}>
        <summary aria-label="時間を進める"><Icon name="hourglass" /><span className="travel-band-word">待機</span></summary>
        <div className="travel-wait-actions">
          {waitOptions.map((option) => <button key={option.until ?? "minutes"} type="button" className="secondary" disabled={!option.available} onClick={() => onTravelWait(option.minutes)}>{option.until === null ? `${option.minutes}分待つ` : `${formatTravelTime(option.until)}まで待つ`}</button>)}
        </div>
      </details>
      <button type="button" className={`travel-sleep-toggle${selected ? " is-selected" : ""}`} aria-label="滞在先で休む" aria-expanded={selected}
        aria-controls={selected ? `${id}-sleep` : undefined} aria-describedby={selected ? `${id}-selected ${id}-hint` : undefined}
        onKeyDown={(key) => { if (key.repeat && (key.key === "Enter" || key.key === " ")) key.preventDefault(); }}
        onClick={(click) => {
          wait.current?.removeAttribute("open");
          api.pressSleep(pressKindOf(click));
        }}>
        <Icon name="bed" /><span className="travel-band-word">休む</span>
      </button>
      {selected && <span className="sr-only" id={`${id}-selected`}>選択中。</span>}
    </div>
    {/* After the buttons in the DOM (focus: the pressed control, then what it opened); drawn above them, on the band's top edge. */}
    {selected && <div className="travel-band-sleep" id={`${id}-sleep`} ref={sleepBox}>
      <SleepChoice game={game} sleep={api.sleep} api={api} hintId={`${id}-hint`} />
    </div>}
  </div>;
}
