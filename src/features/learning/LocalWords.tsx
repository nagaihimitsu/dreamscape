import type { LocalWordGroup } from "./local-words";
import "./local-words.css";

/**
 * 「その国の言葉」 of the English notes (2026-11-11 user decision): the words of the country learned on this device, by
 * city in the order learned (localWordGroups): each word large in its own script, its reading, its meaning, its note
 * and its sources as links (the clue cards' 「根拠」 list). No score and no mastery.
 */
export function LocalWords({ groups }: { groups: readonly LocalWordGroup[] }) {
  if (!groups.length) return <p>まだ覚えた言葉はありません。</p>;
  return <div className="local-words" data-testid="local-words">
    {groups.map((group) => <section key={group.key} aria-labelledby={`local-words-${group.key}`}>
      <h3 id={`local-words-${group.key}`}>{group.titleJa}</h3>
      <ul className="local-words-list">
        {group.words.map((word) => <li key={word.id} className="local-word" data-testid="local-word">
          <p className="local-word-head">
            <span className="local-word-script">{word.word}</span>
            <span className="local-word-reading">{word.reading}</span>
          </p>
          <p className="local-word-meaning">{word.meaningJa}</p>
          {word.noteJa && <p className="local-word-note">{word.noteJa}</p>}
          <details className="clue-sources local-word-sources">
            <summary>出典</summary>
            {word.sources.map((source, index) => <div key={`${source.url}:${index}`}>
              <p>{source.claimJa}</p>
              <a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title}</a>
            </div>)}
          </details>
        </li>)}
      </ul>
    </section>)}
  </div>;
}
