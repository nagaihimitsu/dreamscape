import type { LocalWord } from "../../content/local-words";
import type { LocalWordGroup } from "./local-words";
import "./local-words.css";

/**
 * 「旅のことば」 (≡メニュー's 「ノート」; 2026-11-11 user decision, 英語ノートの「その国の言葉」 until 2026-11-20): the words of the country learned on this device, by
 * city in the order learned (localWordGroups): each word large in its own script, its reading, its meaning, its note
 * and its sources as links (the clue cards' 「根拠」 list). No score and no mastery.
 */
export function LocalWords({ groups }: { groups: readonly LocalWordGroup[] }) {
  if (!groups.length) return <p>まだ覚えた言葉はありません。</p>;
  return <div className="local-words" data-testid="local-words">
    {groups.map((group) => <section key={group.key} aria-labelledby={`local-words-${group.key}`}>
      <h3 id={`local-words-${group.key}`}>{group.titleJa}</h3>
      <ul className="local-words-list">
        {group.words.map((word) => <li key={word.id} className="local-word" data-testid="local-word"><LocalWordBody word={word} /></li>)}
      </ul>
    </section>)}
  </div>;
}

/**
 * One word as its page shows it: large in its own script with its reading (`heading`: false where a dialog's title already
 * shows the word), its meaning, its note and its sources as links. Also a line's word opened larger (LineEntryDialog).
 */
export function LocalWordBody({ word, heading = true }: { word: LocalWord; heading?: boolean }) {
  return <>
    <p className="local-word-head">
      {heading && <span className="local-word-script">{word.word}</span>}
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
  </>;
}
