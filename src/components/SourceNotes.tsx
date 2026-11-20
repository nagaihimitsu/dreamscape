/** What a source supports, as its pill names it (AGENTS.md: facts, interpretations, hypotheses and legends kept apart). */
export const claimLabels: Record<string, string> = {
  documented_fact: "確認された事実",
  interpretation: "美術史の解釈",
  hypothesis: "学説・仮説",
  legend: "伝承",
};

export interface SourceNote {
  publisher: string;
  title: string;
  url: string;
  claimType: string;
  claimJa: string;
}

/**
 * The sources of a clue or of a question's explanation: each one's kind (a pill), what it supports and its link. Shown in
 * ≡メニュー's 「画面の出典」 (2026-11-20 user decision: not on the clue book, the observation's clue or the quiz card).
 */
export function SourceNotes({ sources }: { sources: readonly SourceNote[] }) {
  return (
    <ul className="source-notes">
      {sources.map((source, index) => (
        <li key={`${source.url}:${index}`}>
          <span className="pill">{claimLabels[source.claimType]}</span>
          <p>{source.claimJa}</p>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.publisher} · {source.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
