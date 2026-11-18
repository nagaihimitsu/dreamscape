import type { TourismClue } from "../../content";
import type { ReactNode } from "react";
import { clueKindLabel, isHeardClue } from "./clue-source";

const claimLabels: Record<string, string> = {
  documented_fact: "確認された事実",
  interpretation: "美術史の解釈",
  hypothesis: "学説・仮説",
  legend: "伝承",
};

/**
 * `heard`: the clue was heard in conversation (a scene gives it; clue-source.ts), read from the scene list when not given.
 * `kind: false`: no heading of its kind over its title (where a mark next to it already says where it came from).
 */
export function ClueDetails({ clue, action, image, heard = isHeardClue(clue.id), kind = true }: {
  clue: TourismClue; action?: ReactNode; image?: ReactNode; heard?: boolean; kind?: boolean;
}) {
  const sources = (
    <details className="clue-sources">
      <summary>根拠と解釈を確認する</summary>
      {clue.sources.map((source, index) => (
        <div key={`${source.url}:${index}`}>
          <span className="pill">{claimLabels[source.claimType]}</span>
          <p>{source.claimJa}</p>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.publisher} · {source.title}
          </a>
        </div>
      ))}
    </details>
  );
  return (
    <>
      <div className="clue-heading">
        <div>
          {kind && <p className="clue-kind">{clueKindLabel(clue, heard)}</p>}
          <h3>{clue.titleJa}</h3>
        </div>
        {action}
      </div>
      <div className={image ? "clue-meta" : undefined}>
        <div className="claim-types">
          {Array.from(
            new Set(clue.sources.map((source) => source.claimType)),
          ).map((type) => (
            <span key={type} className="pill">
              {claimLabels[type]}
            </span>
          ))}
        </div>
        {image && sources}
      </div>
      {image}
      <p className="clue-description">{clue.descriptionJa}</p>
      {!image && sources}
    </>
  );
}
