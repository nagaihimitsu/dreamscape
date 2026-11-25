import type { TourismClue } from "../../content";
import type { ReactNode } from "react";
import { claimLabels } from "../../components/SourceNotes";
import { clueKindLabel, isHeardClue } from "./clue-source";
import { FitText } from "../../components/FitText";

/**
 * A clue's heading, kinds of claim, picture and words. Its sources are not here (2026-11-20 user decision: 「根拠と解釈を
 * 確認する」 went from the clue): ≡メニュー's 「画面の出典」 lists those of the clues the screen's clue book reads.
 * `heard`: the clue was heard in conversation (a scene gives it; clue-source.ts), read from the scene list when not given.
 * `kind: false`: no heading of its kind over its title (where a mark next to it already says where it came from).
 */
export function ClueDetails({ clue, action, image, heard = isHeardClue(clue.id), kind = true }: {
  clue: TourismClue; action?: ReactNode; image?: ReactNode; heard?: boolean; kind?: boolean;
}) {
  return (
    <>
      <div className="clue-heading">
        <div>
          {kind && <p className="clue-kind">{clueKindLabel(clue, heard)}</p>}
          <h3><FitText text={clue.titleJa} /></h3>
        </div>
        {action}
      </div>
      <div className="claim-types">
        {Array.from(
          new Set(clue.sources.map((source) => source.claimType)),
        ).map((type) => (
          <span key={type} className="pill">
            {claimLabels[type]}
          </span>
        ))}
      </div>
      {image}
      <p className="clue-description">{clue.descriptionJa}</p>
    </>
  );
}
