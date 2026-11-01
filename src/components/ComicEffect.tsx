import type { ReactionMark } from "../content/dialogue-reactions";
import "./comic-effect.css";

/** Decorative cue inside the character layer; a stable cueKey survives rerenders. */
export function ComicEffect({ effect, cueKey, reduceMotion = false }: {
  effect: ReactionMark;
  cueKey?: string | number;
  reduceMotion?: boolean;
}) {
  return (
    <span className={`comic-effect${reduceMotion ? " is-reduced" : ""}`} aria-hidden="true" data-effect={effect}>
      <img
        key={`${cueKey ?? ""}:${effect}`}
        src={`${import.meta.env.BASE_URL}assets/effects/${effect}.svg`}
        alt=""
        draggable={false}
        onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
      />
    </span>
  );
}
