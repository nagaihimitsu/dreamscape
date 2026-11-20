import { CharacterFace } from "../../components/CharacterPortrait";

/**
 * A few words of the heroine's by the quiz card: her small face and a speech bubble headed by
 * her name (user-set). With `hideLabel` the heading is kept for screen readers only, since her face
 * already says who speaks (the quiz hint and the town-walk place line; 2026-11-19 user decision). The text is shown as written: quotation marks are the author's to add.
 * Presentation only; it never holds input back.
 */
export function HeroineNote({ id, className, label, hideLabel = false, text, emotion, sceneId, cityId, testId }: {
  id?: string;
  className?: string;
  /** The bubble's heading, e.g. her name, or 「{name}の耳打ち」 for a hint. */
  label: string;
  /** Show no heading on screen; screen readers still hear it. */
  hideLabel?: boolean;
  text: string;
  emotion?: string;
  sceneId?: string;
  cityId?: string;
  testId?: string;
}) {
  return (
    <div id={id} className={`heroine-note${className ? ` ${className}` : ""}`} data-testid={testId}>
      <CharacterFace characterId="heroine" emotion={emotion} sceneId={sceneId} cityId={cityId} />
      <p className={`heroine-note-bubble${hideLabel ? " heroine-note-bubble--unlabeled" : ""}`}>
        <span className={hideLabel ? "sr-only" : "heroine-note-name"}>{label}<span className="sr-only">：</span></span>
        {text}
      </p>
    </div>
  );
}
