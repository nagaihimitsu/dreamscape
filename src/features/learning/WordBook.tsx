import { useState } from "react";
import { DERIVED_PHOTO_NOTE_JA } from "../../content/credits";
import { derivedImagePath } from "../../content/derived-images";
import { ImageCredit } from "../../components/ImageCredit";
import { wordBookGroups, wordBookPhotos, type AnsweredWordSource, type WordCard } from "./word-book";

/**
 * 「単語帳」 of the English notes (2026-11-11 user decision): a card for each word of the questions answered, grouped by
 * the place where they were met (word-book.ts). Each place's heading shows its photo once (its reduced card copy; a plain
 * tile without one) and its name; the cards hold words only (2026-11-13 user decision). A card is a button: pressing it
 * turns it between the English word and its meaning with the sentence it came from (a flip that stops under reduced
 * motion and 「演出を短縮する」). Its name is the face it shows, with what pressing does; the turned face is said once in
 * a status line. No score and no mastery. The photos' credits close the book.
 */
export function WordBook({ answered }: { answered: readonly AnsweredWordSource[] }) {
  const groups = wordBookGroups(answered);
  const photos = wordBookPhotos(groups);
  const [said, setSaid] = useState("");
  if (!groups.length) return <p>答えた問題には、まだ単語がありません。</p>;
  return <div className="word-book" data-testid="word-book">
    {groups.map((group) => <section key={group.key} className="word-book-place" aria-labelledby={`word-book-${group.key}`}>
      <div className="word-book-place-head">
        <span className="word-book-place-photo" aria-hidden="true">
          {group.photo
            ? <img src={`${import.meta.env.BASE_URL}${derivedImagePath(group.photo, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" />
            : <span className="word-book-place-plain" style={group.tileColor ? { backgroundColor: group.tileColor } : undefined}>◇</span>}
        </span>
        <h3 id={`word-book-${group.key}`}>{group.cityNameJa} ／ {group.placeNameJa}</h3>
      </div>
      <ul className="word-book-cards">
        {group.cards.map((card) => <li key={card.key}><WordFlipCard card={card} onTurn={setSaid} /></li>)}
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

/** One word's card: the word; turned, the meaning and the sentence (the place is the heading's). */
function WordFlipCard({ card, onTurn }: { card: WordCard; onTurn: (said: string) => void }) {
  const [turned, setTurned] = useState(false);
  return <button type="button" className="word-card" data-turned={turned || undefined} data-testid="word-card"
    onClick={() => {
      setTurned(!turned);
      onTurn(turned ? card.word : `${card.word}：${card.meaningJa}。${card.sentenceEn}`);
    }}>
    <span className="word-card-inner">
      <span className="word-card-face is-front" aria-hidden={turned || undefined}>
        <span className="word-card-word" lang="en">{card.word}</span>
        <span className="sr-only">（押すと意味）</span>
        <span className="word-card-turn" aria-hidden="true">↻</span>
      </span>
      <span className="word-card-face is-back" aria-hidden={!turned || undefined}>
        <span className="word-card-meaning">{card.meaningJa}</span>
        <span className="word-card-sentence" lang="en">{card.sentenceEn}</span>
        <span className="sr-only">（押すと英単語）</span>
        <span className="word-card-turn" aria-hidden="true">↻</span>
      </span>
    </span>
  </button>;
}
