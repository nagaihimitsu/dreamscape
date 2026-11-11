import { useState } from "react";
import { DERIVED_PHOTO_NOTE_JA } from "../../content/credits";
import { derivedImagePath } from "../../content/derived-images";
import { ImageCredit } from "../../components/ImageCredit";
import { wordBookGroups, wordBookPhotos, type AnsweredWordSource, type WordBookGroup, type WordCard } from "./word-book";

/**
 * 「単語帳」 of the English notes (2026-11-11 user decision): a card for each word of the questions answered, grouped by
 * the place where they were met (word-book.ts), with the place's photo (its reduced card copy; a plain tile without one)
 * and name. A card is a button: pressing it turns it between the English word and its meaning with the sentence it came
 * from (a flip that stops under reduced motion and 「演出を短縮する」). Its name is the face it shows, with what pressing
 * does; the turned face is said once in a status line. No score and no mastery. The photos' credits close the book.
 */
export function WordBook({ answered }: { answered: readonly AnsweredWordSource[] }) {
  const groups = wordBookGroups(answered);
  const photos = wordBookPhotos(groups);
  const [said, setSaid] = useState("");
  if (!groups.length) return <p>答えた問題には、まだ単語がありません。</p>;
  return <div className="word-book" data-testid="word-book">
    {groups.map((group) => <section key={group.key} className="word-book-place" aria-labelledby={`word-book-${group.key}`}>
      <h3 id={`word-book-${group.key}`}>{group.cityNameJa} ／ {group.placeNameJa}</h3>
      <ul className="word-book-cards">
        {group.cards.map((card) => <li key={card.key}><WordFlipCard card={card} group={group} onTurn={setSaid} /></li>)}
      </ul>
    </section>)}
    <p className="sr-only" role="status">{said}</p>
    {photos.length > 0 && <details className="word-book-credits">
      <summary>写真の出典</summary>
      <p className="fine-print">{DERIVED_PHOTO_NOTE_JA}</p>
      <ul>
        {photos.map(({ asset, placeNameJa }) => <li key={asset.id}>
          <h4>{placeNameJa}</h4>
          <ImageCredit asset={asset} />
        </li>)}
      </ul>
    </details>}
  </div>;
}

/** One word's card: the place's photo or tile, its name and the word; turned, the meaning and the sentence. */
function WordFlipCard({ card, group, onTurn }: { card: WordCard; group: WordBookGroup; onTurn: (said: string) => void }) {
  const [turned, setTurned] = useState(false);
  return <button type="button" className="word-card" data-turned={turned || undefined} data-testid="word-card"
    onClick={() => {
      setTurned(!turned);
      onTurn(turned ? card.word : `${card.word}：${card.meaningJa}。${card.sentenceEn}`);
    }}>
    <span className="word-card-inner">
      <span className="word-card-face is-front" aria-hidden={turned || undefined}>
        <span className="word-card-photo">
          {group.photo
            ? <img src={`${import.meta.env.BASE_URL}${derivedImagePath(group.photo, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" />
            : <span className="word-card-plain" style={group.tileColor ? { backgroundColor: group.tileColor } : undefined} aria-hidden="true">◇</span>}
        </span>
        <span className="word-card-place">{group.placeNameJa}</span>
        <span className="word-card-word" lang="en">{card.word}</span>
        <span className="sr-only">（押すと意味）</span>
        <span className="word-card-turn" aria-hidden="true">↻</span>
      </span>
      <span className="word-card-face is-back" aria-hidden={!turned || undefined}>
        <span className="word-card-place">{group.placeNameJa}</span>
        <span className="word-card-meaning">{card.meaningJa}</span>
        <span className="word-card-sentence" lang="en">{card.sentenceEn}</span>
        <span className="sr-only">（押すと英単語）</span>
        <span className="word-card-turn" aria-hidden="true">↻</span>
      </span>
    </span>
  </button>;
}
