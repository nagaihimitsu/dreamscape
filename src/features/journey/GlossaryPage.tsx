import { useMemo, useState } from "react";
import { journeyTerms, tourismAssets } from "../../content";
import type { ListedTerm } from "../../content/glossary";
import { GlossaryEntryDialog } from "./LineEntryDialog";
import { glossaryBook, glossaryProgress, glossaryProgressSpoken } from "./glossary-book";
import "./glossary.css";

const photoOf = (term: ListedTerm) => tourismAssets.find((asset) => asset.id === term.imageId);
const source = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * 「旅の図鑑」, the page of ≡メニュー's 「ノート」 (NoteDialog.tsx; its own item 2026-11-13, one dialog with 英語ノート since
 * 2026-11-20): the journey's terms as small cards by group (glossary-book.ts), with how
 * far the save has come (「12 / 30」). A term met shows its photo and name (「NEW」 on one met since 旅の図鑑 was last
 * opened, `newIds`); a term not met yet is an empty card with neither. A card opens larger in its own dialog: the photo
 * whole, the name with its reading or other name, its group and the line, 「閉じる」 in its title bar, over the note,
 * which it closes back to. The photo's credit is not shown here (2026-11-15 user decision): ゲームの設定 →
 * 出典・権利の一覧 lists every tourism photo the journey serves, these included. In Debug mode (`revealAll`) every term
 * shows, those not met marked 「未入手」. Children of the note's dialog, whose frame is `glossary-modal` while this page
 * shows. It shows no relationship value.
 */
export function GlossaryPage({ journeyId, met, newIds, revealAll = false }: {
  journeyId: string; met: readonly string[]; newIds: readonly string[]; revealAll?: boolean;
}) {
  const book = useMemo(() => glossaryBook(journeyTerms(journeyId), met, newIds), [journeyId, met, newIds]);
  const [opened, setOpened] = useState<{ term: ListedTerm; met: boolean } | null>(null);
  return <>
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
    {opened && <GlossaryEntryDialog term={opened.term} met={opened.met} onClose={() => setOpened(null)} />}
  </>;
}
