import { CharacterFace } from "../../components/CharacterPortrait";

/**
 * A few words of the heroine's by the quiz card: her small face and a speech bubble headed by
 * her name (user-set). The text is shown as written: quotation marks are the author's to add.
 * Presentation only; it never holds input back.
 */
export function HeroineNote({ id, className, label, text, emotion, sceneId, cityId, testId }: {
  id?: string;
  className?: string;
  /** The bubble's heading, e.g. her name, or 「{name}の耳打ち」 for a hint. */
  label: string;
  text: string;
  emotion?: string;
  sceneId?: string;
  cityId?: string;
  testId?: string;
}) {
  return (
    <div id={id} className={`heroine-note${className ? ` ${className}` : ""}`} data-testid={testId}>
      <CharacterFace characterId="heroine" emotion={emotion} sceneId={sceneId} cityId={cityId} />
      <p className="heroine-note-bubble">
        <span className="heroine-note-name">{label}<span className="sr-only">：</span></span>
        {text}
      </p>
    </div>
  );
}
