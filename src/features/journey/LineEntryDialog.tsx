import { glossaryTerms, localWords, tourismAssets } from "../../content";
import { GLOSSARY_CATEGORY_LABELS_JA, photoNote, termSubtitle, type ListedTerm } from "../../content/glossary";
import type { LocalWord } from "../../content/local-words";
import { Modal, ModalTitle } from "../../components/Modal";
import type { LineCard } from "../../components/LineCards";
import { LocalWordBody } from "../learning/LocalWords";
import "./glossary.css";
import "../learning/local-words.css";

const source = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * A term of 旅の図鑑 opened larger (its page's card, or a line's card or tab: 2026-11-28 user decision, looked up the moment it
 * comes up): the photo whole, the name with its reading or other name, its group and its line, 「閉じる」 in its title bar.
 * `met` false (Debug's view of a term not met yet) says so. A modal: the story under it waits, and closing it goes back to
 * the line as it was.
 */
export function GlossaryEntryDialog({ term, met = true, onClose }: { term: ListedTerm; met?: boolean; onClose: () => void }) {
  const photo = tourismAssets.find((asset) => asset.id === term.imageId);
  const subtitle = termSubtitle(term);
  return <Modal labelledBy="glossary-entry-title" className="glossary-entry" onClose={onClose} closeOnBackdrop>
    <ModalTitle id="glossary-entry-title" eyebrow={GLOSSARY_CATEGORY_LABELS_JA[term.category]} onClose={onClose}
      closeTestId="glossary-entry-close">{term.nameJa}</ModalTitle>
    {subtitle && <p className="glossary-entry-subtitle">{subtitle}</p>}
    {photo && <img className="glossary-entry-photo" src={source(photo.path)} alt={photo.altJa} data-testid="glossary-entry-photo" />}
    {photo && photoNote(term) && <p className="glossary-entry-photo-note" data-testid="glossary-entry-photo-note">{photoNote(term)}</p>}
    <p className="glossary-entry-line">{term.lineJa}</p>
    {!met && <p className="fine-print">Debug：この言葉には、まだ出会っていません。</p>}
  </Modal>;
}

/** A word of 旅のことば opened larger from a line (2026-11-28): as on its page, the word, its reading, meaning, note and sources. */
export function LocalWordEntryDialog({ word, onClose }: { word: LocalWord; onClose: () => void }) {
  return <Modal labelledBy="local-word-entry-title" className="glossary-entry local-word-entry" onClose={onClose} closeOnBackdrop>
    <ModalTitle id="local-word-entry-title" eyebrow="旅のことば" onClose={onClose} closeTestId="local-word-entry-close">{word.word}</ModalTitle>
    <div className="local-word"><LocalWordBody word={word} heading={false} /></div>
  </Modal>;
}

/** The entry a line's card or tab opens (GameApp): the term or the word it names; nothing for one the content does not have. */
export function LineEntryDialog({ entry, onClose }: { entry: LineCard; onClose: () => void }) {
  if (entry.kind === "term") {
    const term = glossaryTerms.find((item) => item.id === entry.id);
    return term ? <GlossaryEntryDialog term={term} onClose={onClose} /> : null;
  }
  const word = localWords.find((item) => item.id === entry.id);
  return word ? <LocalWordEntryDialog word={word} onClose={onClose} /> : null;
}
