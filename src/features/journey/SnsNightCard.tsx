import { CharacterFace } from "../../components/CharacterPortrait";
import { Icon } from "../../components/icons";
import type { SnsNightCard } from "./sns";

/**
 * The night screen's SNS card (2026-11-27 user decision; snsNightCard): the faces of who wrote tonight, overlapped (no count),
 * 「SNS にコメントが届きました」 and the first comment, two lines at most. A press opens 旅の記録's 「SNS」 at that post
 * (`onOpen`); without it (the screen fading to the morning) it only shows, in the same place.
 */
export function SnsNightCardView({ card, onOpen }: { card: SnsNightCard; onOpen?: (postId: string) => void }) {
  const body = <>
    <span className="night-sns-faces" aria-hidden="true">
      {card.faces.slice(0, 3).map((face) => <span key={face.id} className="night-sns-face">
        {face.characterId ? <CharacterFace characterId={face.characterId} costume={face.costume} fixed />
          : <span className="night-sns-initial">{[...face.nameJa][0]}</span>}
      </span>)}
    </span>
    <span className="night-sns-text">
      <span className="night-sns-title">{card.titleJa}</span>
      <span className="night-sns-first"><b>{card.first.nameJa}</b> {card.first.textJa}</span>
    </span>
    {onOpen && <Icon name="chevron-right" />}
  </>;
  return onOpen
    ? <button type="button" className="night-sns" data-testid="night-sns" onClick={() => onOpen(card.postId)}>{body}</button>
    : <div className="night-sns" data-testid="night-sns">{body}</div>;
}
