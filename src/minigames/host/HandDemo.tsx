import type { MiniGameControl } from "../contract";

// The instruction card's small hand (docs/13 2.6; group3 6.3-1): how a game is played, in one shared SVG per kind of
// control, moving once round every 2.4 s (host.css). With less motion it stands still at the press. Decorative: the card's
// goal line says the same in words.

/** A pointing hand, its fingertip at (34, 16); dark-edged like the drawn art. */
const HAND = "M30 34v-14a4 4 0 0 1 8 0v10l7 1.5a5 5 0 0 1 4 5.5l-1.5 10a8 8 0 0 1-8 7h-6a8 8 0 0 1-6.5-3.5l-6-9a3.5 3.5 0 0 1 5-4.5z";

function Target({ kind }: { kind: MiniGameControl }) {
  switch (kind) {
    case "tap":
      return <>
        <circle className="minigame-hand-ripple" cx="32" cy="20" r="10" />
        <circle className="minigame-hand-button" cx="32" cy="20" r="10" />
      </>;
    case "tap-target":
      return <>
        {[12, 32, 52].map((x) => <rect key={x} className={`minigame-hand-spot${x === 32 ? " minigame-hand-spot-hit" : ""}`} x={x - 6} y="12" width="12" height="16" rx="2" />)}
      </>;
    case "drag":
      return <path className="minigame-hand-trail" d="M10 26C20 6 30 30 40 14S54 12 56 18" pathLength="100" />;
    case "timing":
      return <>
        <rect className="minigame-hand-meter" x="8" y="6" width="48" height="7" rx="3.5" />
        <rect className="minigame-hand-zone" x="38" y="6" width="8" height="7" rx="2" />
        <rect className="minigame-hand-needle" x="41" y="3" width="2.5" height="13" rx="1" />
        <circle className="minigame-hand-button" cx="32" cy="26" r="7" />
      </>;
    case "rhythm":
      return <>
        {[14, 26, 38, 50].map((x, index) => <circle key={x} className="minigame-hand-beat" style={{ animationDelay: `${index * 0.6}s` }} cx={x} cy="10" r="4" />)}
        <circle className="minigame-hand-button" cx="32" cy="26" r="7" />
      </>;
  }
}

export function HandDemo({ kind, still }: { kind: MiniGameControl; still: boolean }) {
  return (
    <svg className="minigame-hand" data-kind={kind} data-still={still || undefined} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <Target kind={kind} />
      <path className="minigame-hand-finger" d={HAND} />
    </svg>
  );
}
