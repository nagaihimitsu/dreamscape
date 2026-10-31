import type { TourismClue } from "../../content";
import type { ReactNode } from "react";

const claimLabels: Record<string, string> = {
  documented_fact: "確認された事実",
  interpretation: "美術史の解釈",
  hypothesis: "学説・仮説",
  legend: "伝承",
};

export function ClueDetails({ clue, action }: { clue: TourismClue; action?: ReactNode }) {
  return (
    <>
      <div className="clue-heading">
        <div>
          <p className="clue-kind">
            {clue.kind === "document" ? "資料カード" : "観察での発見"}
          </p>
          <h3>{clue.titleJa}</h3>
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
      <p className="clue-description">{clue.descriptionJa}</p>
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
    </>
  );
}
