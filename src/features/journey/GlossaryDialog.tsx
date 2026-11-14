import { useMemo, useState } from "react";
import { journeyTerms, tourismAssets } from "../../content";
import { GLOSSARY_CATEGORY_LABELS_JA, termSubtitle, type ListedTerm } from "../../content/glossary";
import { ImageCredit } from "../../components/ImageCredit";
import { Modal, ModalTitle } from "../../components/Modal";
import { glossaryBook, glossaryProgress, glossaryProgressSpoken } from "./glossary-book";
import "./glossary.css";

const photoOf = (term: ListedTerm) => tourismAssets.find((asset) => asset.id === term.imageId);
const source = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * 「旅の図鑑」 (⚙設定, 2026-11-13 user decision): the journey's terms as small cards by group (glossary-book.ts), with how
 * far the save has come (「12 / 30」). A term met shows its photo and name (「NEW」 on one met since 旅の図鑑 was last
 * opened, `newIds`); a term not met yet is an empty card with neither. A card opens larger in its own dialog: the photo
 * whole, the name with its reading or other name, its group, the line and the photo's credit, 「閉じる」 in its title
 * bar. In Debug mode (`revealAll`) every term shows, those not met marked 「未入手」. Opened from ⚙設定's panel, it takes
 * no press for a moment (settlePresses). It shows no relationship value.
 */
export function GlossaryDialog({ journeyId, met, newIds, revealAll = false, onClose }: {
  journeyId: string; met: readonly string[]; newIds: readonly string[]; revealAll?: boolean; onClose: () => void;
}) {
  const book = useMemo(() => glossaryBook(journeyTerms(journeyId), met, newIds), [journeyId, met, newIds]);
  const [opened, setOpened] = useState<{ term: ListedTerm; met: boolean } | null>(null);
  const openedPhoto = opened && photoOf(opened.term);
  const openedSubtitle = opened && termSubtitle(opened.term);
  return <>
    <Modal labelledBy="glossary-title" className="glossary-modal" onClose={onClose} settlePresses>
      <ModalTitle id="glossary-title" onClose={onClose} closeTestId="glossary-close">旅の図鑑</ModalTitle>
      <p className="glossary-progress" data-testid="glossary-progress">
        <span aria-hidden="true">{glossaryProgress(book)}</span><span className="sr-only">{glossaryProgressSpoken(book)}</span>
      </p>
      {revealAll && <p className="fine-print glossary-debug-note">Debug：まだ出会っていない言葉も「未入手」の印を付けて出しています。</p>}
      {book.met === 0 && !revealAll && <p className="glossary-empty">物語で初めて出会った言葉が、写真と一緒にここに入ります。</p>}
      {book.groups.map((group) => <section key={group.category} className="glossary-group" aria-labelledby={`glossary-group-${group.category}`}>
        <h3 id={`glossary-group-${group.category}`}>
          {group.titleJa}<span className="glossary-group-count" aria-hidden="true">{group.met} / {group.cards.length}</span>
        </h3>
        <ul className="glossary-grid">
          {group.cards.map(({ term, met: isMet, isNew }) => {
            const photo = photoOf(term);
            return <li key={term.id}>
              {isMet || revealAll
                ? <button type="button" className="glossary-card" data-testid={`glossary-card-${term.id}`} data-met={isMet || undefined}
                  onClick={() => setOpened({ term, met: isMet })}>
                  <span className="glossary-card-photo">{photo && <img src={source(photo.path)} alt="" loading="lazy" decoding="async" />}</span>
                  <span className="glossary-card-name">{term.nameJa}</span>
                  {isNew && <><span className="glossary-card-new" aria-hidden="true">NEW</span><span className="sr-only">、新しい言葉</span></>}
                  {!isMet && <span className="glossary-card-unmet">未入手</span>}
                </button>
                : <div className="glossary-card glossary-card-empty" data-testid={`glossary-card-${term.id}`}>
                  <span className="glossary-card-photo" aria-hidden="true">？</span>
                  <span className="sr-only">まだ出会っていない言葉</span>
                </div>}
            </li>;
          })}
        </ul>
      </section>)}
    </Modal>
    {opened && <Modal labelledBy="glossary-entry-title" className="glossary-entry" onClose={() => setOpened(null)}>
      <ModalTitle id="glossary-entry-title" eyebrow={GLOSSARY_CATEGORY_LABELS_JA[opened.term.category]} onClose={() => setOpened(null)}
        closeTestId="glossary-entry-close">{opened.term.nameJa}</ModalTitle>
      {openedSubtitle && <p className="glossary-entry-subtitle">{openedSubtitle}</p>}
      {openedPhoto && <img className="glossary-entry-photo" src={source(openedPhoto.path)} alt={openedPhoto.altJa} data-testid="glossary-entry-photo" />}
      <p className="glossary-entry-line">{opened.term.lineJa}</p>
      {!opened.met && <p className="fine-print">Debug：この言葉には、まだ出会っていません。</p>}
      {openedPhoto && <section className="glossary-entry-credit" aria-labelledby="glossary-entry-credit">
        <h3 id="glossary-entry-credit">写真の出典</h3>
        {openedPhoto.isPlaceholder && <p><strong>仮画像</strong></p>}
        <ImageCredit asset={openedPhoto} />
      </section>}
    </Modal>}
  </>;
}
