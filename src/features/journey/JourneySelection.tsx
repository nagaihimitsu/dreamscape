import { useEffect, useRef } from "react";
import { journeys } from "../../content/journeys";
import type { Journey } from "../../content/journey-catalog";

const journeyLabel = (journey: Journey) => `${journey.nameJa}${journey.status === "preparing" ? "（準備中）" : ""}`;

/**
 * Switching journeys rebuilds the screen, which removes the focused select.
 * While `restoreFocus` is set, each newly shown selector takes the focus back,
 * so keyboard users can keep choosing. The switch's final screen passes
 * `onFocusRestored` to end it; loading screens in between leave it out.
 */
export type SelectorFocus = { restoreFocus?: boolean; onFocusRestored?: () => void };

export function JourneySelection({ value, onChange, restoreFocus = false, onFocusRestored }: SelectorFocus & {
  value: string;
  onChange: (id: string) => void;
}) {
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!restoreFocus) return;
    select.current?.focus();
    onFocusRestored?.();
  }, [restoreFocus, onFocusRestored]);
  const selected = journeys.find((journey) => journey.id === value);
  // A closed native select cuts long names off on narrow phones. The box shows
  // the whole selected name, wrapped; the transparent select on top of it stays
  // the control (tap, keyboard, screen readers and the phone's own picker).
  return <label className="journey-selection">
    旅行編
    <span className="journey-select">
      <span className="journey-select-value" aria-hidden="true">{selected ? journeyLabel(selected) : ""}</span>
      <select ref={select} aria-label="旅行編" value={value} onChange={(event) => onChange(event.target.value)}>
        {journeys.map((journey) => <option key={journey.id} value={journey.id}>{journeyLabel(journey)}</option>)}
      </select>
    </span>
  </label>;
}
