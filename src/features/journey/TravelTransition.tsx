import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TravelMode } from "../../domain/travel-game";
import "./travel-transition.css";

const labels: Record<TravelMode, string> = {
  walk: "歩いて移動中", rail: "電車で移動中", tram: "路面電車で移動中",
  bus: "バスで移動中", taxi: "タクシーで移動中",
};

/** Small, decorative transition; movement and saving are handled by the caller. */
export function TravelTransition({ mode, reduceMotion = false, onEnd }: {
  mode: TravelMode;
  reduceMotion?: boolean;
  onEnd: () => void;
}) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const [systemReduced, setSystemReduced] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setSystemReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  const reduced = reduceMotion || systemReduced;
  useEffect(() => {
    const timer = window.setTimeout(() => onEndRef.current(), reduced ? 450 : 1800);
    return () => window.clearTimeout(timer);
  }, [mode, reduced]);

  return createPortal(<div className={`travel-transition${reduced ? " is-reduced" : ""}`}
    data-testid="travel-transition" data-mode={mode} aria-hidden="true">
    <div className="travel-transition-scene">
      <span className="travel-transition-label">{labels[mode]}</span>
      <span className="travel-transition-hill travel-transition-hill-back" />
      <span className="travel-transition-hill travel-transition-hill-front" />
      {(mode === "rail" || mode === "tram") && <span className="travel-transition-wire" />}
      <div className={`travel-transition-vehicle is-${mode}`}>
        <TravelIllustration mode={mode} />
      </div>
      <span className={`travel-transition-ground${mode === "rail" || mode === "tram" ? " is-rail" : ""}`} />
    </div>
  </div>, document.body);
}

function TravelIllustration({ mode }: { mode: TravelMode }) {
  if (mode === "walk") return <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">
    <g transform="translate(32 0)"><Walker coat="#426a5a" bag="#d8b378" /></g>
    <g transform="translate(61 2)"><Walker coat="#9f7567" bag="#e6d9bd" /></g>
  </svg>;
  if (mode === "rail") return <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">
    <path d="M13 20 Q13 13 20 13 H91 Q99 13 106 26 L112 38 V47 H13 Z" fill="#f9f5e8" stroke="#375c50" strokeWidth="3" strokeLinejoin="round" />
    <path d="M14 36 H110 V43 H14 Z" fill="#5e8b79" />
    <path d="M21 19 H36 V31 H21 Z M42 19 H57 V31 H42 Z M63 19 H78 V31 H63 Z M84 19 H92 Q97 19 101 29 H84 Z" fill="#7eaab1" />
    <path d="M11 49 H112" stroke="#375c50" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="49" r="4" fill="#30473e" /><circle cx="90" cy="49" r="4" fill="#30473e" />
  </svg>;
  if (mode === "tram") return <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">
    <path d="M54 14 L67 5 L80 14 M67 5 H77" fill="none" stroke="#4b6155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="18" y="16" width="87" height="34" rx="7" fill="#e4b969" stroke="#4e6555" strokeWidth="3" />
    <path d="M25 22 H40 V34 H25 Z M45 22 H60 V34 H45 Z M65 22 H80 V34 H65 Z M85 22 H98 V34 H85 Z" fill="#d9eee9" />
    <path d="M20 39 H103" stroke="#f7efd9" strokeWidth="4" /><path d="M79 17 V49" stroke="#4e6555" strokeWidth="2" />
    <circle cx="35" cy="51" r="4" fill="#30473e" /><circle cx="89" cy="51" r="4" fill="#30473e" />
  </svg>;
  if (mode === "bus") return <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">
    <path d="M18 19 Q18 13 25 13 H96 Q104 13 106 23 L110 42 V48 H18 Z" fill="#6b927b" stroke="#36594c" strokeWidth="3" strokeLinejoin="round" />
    <path d="M26 20 H41 V32 H26 Z M46 20 H61 V32 H46 Z M66 20 H81 V32 H66 Z M86 20 H97 Q100 20 102 30 L103 32 H86 Z" fill="#e6f0e7" />
    <path d="M20 38 H107" stroke="#f6ead0" strokeWidth="3" /><path d="M81 17 V46" stroke="#36594c" strokeWidth="2" />
    <circle cx="37" cy="49" r="6" fill="#30473e" /><circle cx="91" cy="49" r="6" fill="#30473e" /><circle cx="37" cy="49" r="2" fill="#ede9d9" /><circle cx="91" cy="49" r="2" fill="#ede9d9" />
  </svg>;
  return <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">
    <path d="M29 35 L41 22 Q44 19 50 19 H75 Q81 19 87 28 L92 35 H101 Q107 35 108 42 V48 H21 V43 Q21 37 29 35 Z" fill="#e9be6b" stroke="#765c37" strokeWidth="3" strokeLinejoin="round" />
    <path d="M46 24 H59 V34 H37 L44 26 Q45 24 46 24 Z M64 24 H75 Q79 24 83 34 H64 Z" fill="#e4f0e9" />
    <rect x="55" y="13" width="18" height="6" rx="2" fill="#f6f1df" stroke="#765c37" strokeWidth="2" />
    <path d="M60 37 V44 M65 37 V44" stroke="#765c37" strokeWidth="2" />
    <circle cx="39" cy="49" r="6" fill="#343e37" /><circle cx="91" cy="49" r="6" fill="#343e37" /><circle cx="39" cy="49" r="2" fill="#f8efdc" /><circle cx="91" cy="49" r="2" fill="#f8efdc" />
  </svg>;
}

function Walker({ coat, bag }: { coat: string; bag: string }) {
  return <>
    <circle cx="12" cy="12" r="5" fill="#e6c6a2" />
    <path d="M9 20 Q12 18 15 20 L19 38 H5 Z" fill={coat} />
    <path className="travel-transition-arm is-first" d="M8 23 L3 34" fill="none" stroke="#e6c6a2" strokeWidth="3" strokeLinecap="round" />
    <path className="travel-transition-arm is-second" d="M16 23 L21 32" fill="none" stroke="#e6c6a2" strokeWidth="3" strokeLinecap="round" />
    <path className="travel-transition-leg is-first" d="M9 37 L5 53" fill="none" stroke="#344e42" strokeWidth="4" strokeLinecap="round" />
    <path className="travel-transition-leg is-second" d="M15 37 L19 53" fill="none" stroke="#344e42" strokeWidth="4" strokeLinecap="round" />
    <path d="M6 21 L16 33 M14 29 H20 V37 H14 Z" fill={bag} stroke="#795e48" strokeWidth="1.5" />
  </>;
}
