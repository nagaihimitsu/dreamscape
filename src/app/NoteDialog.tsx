import { lazy } from "react";
import { Modal, ModalTitle } from "../components/Modal";
import { LazyDialog } from "../components/LazyDialog";
import { NewDot } from "../components/fx";
import { EnglishReview } from "../features/learning/EnglishReview";
import { LocalWords } from "../features/learning/LocalWords";
import { localWordGroups } from "../features/learning/local-words";
import type { GameState } from "../domain/game";
import type { Learning } from "../features/learning/useLearning";
import "./note-dialog.css";

// 旅の図鑑's page, from a file of its own (the title page does not load it).
const GlossaryPage = lazy(() => import("../features/journey/GlossaryPage").then((module) => ({ default: module.GlossaryPage })));

/**
 * 英語ノート (the answered questions and their word book) is not shown for now (2026-11-20 user decision): no page of the
 * note, no button of a quiz to open it, no dot. Its records are kept as before. Its words of the country, which had no
 * place in an English note, are 旅のことば, a page of their own.
 */
export const ENGLISH_NOTE_SHOWN: boolean = false;

export type NoteTab = "english" | "words" | "glossary";

/** Each page's name, in the order the note shows them. */
export const NOTE_PAGE_NAMES: Readonly<Record<NoteTab, string>> = { english: "英語ノート", words: "旅のことば", glossary: "旅の図鑑" };

/** The menu item's and the dialog's name: the page's own for a note of one page, 「ノート」 for more. */
export const noteName = (pages: readonly NoteTab[]): string => (pages.length === 1 ? NOTE_PAGE_NAMES[pages[0]] : "ノート");

/**
 * 「ノート」 (≡メニュー; 2026-11-20 user decisions): what the journey taught, on the pages the journey has (`pages`), chosen
 * at its top: 「旅のことば」 (the words of the country learned on this device, LocalWords) and 「旅の図鑑」 (GlossaryPage);
 * 「英語ノート」 (EnglishReview) only while ENGLISH_NOTE_SHOWN. A page with something the player has not opened it on has
 * a dot (`newPages`). A note of one page has no buttons and that page's name. The page shown is GameApp's (`tab`).
 * Opened under the finger from the menu's panel, it takes no press for a moment (settlePresses); a dialog for viewing, a
 * tap on the dimmed page around also closes it.
 */
export function NoteDialog({ pages, tab, onTab, game, learning, learnedWords = [], readAloud, glossary, newPages, onClose }: {
  pages: readonly NoteTab[];
  tab: NoteTab;
  onTab: (tab: NoteTab) => void;
  game: GameState;
  learning: Learning;
  /** The words of the country learned on this device in this journey (useLocalWords), in the order learned. */
  learnedWords?: readonly string[];
  readAloud?: boolean;
  /** 旅の図鑑's page: the journey, the terms met, those new as the page opened, and Debug's showing of every term. */
  glossary?: { journeyId: string; met: readonly string[]; newIds: readonly string[]; revealAll: boolean };
  newPages: readonly NoteTab[];
  onClose: () => void;
}) {
  const shown: NoteTab = pages.includes(tab) ? tab : pages[0];
  const frame = shown === "english" ? "english-review" : shown === "glossary" ? "glossary-modal" : "words-note";
  return <Modal labelledBy="note-title" className={`${frame} note-dialog`} onClose={onClose} settlePresses closeOnBackdrop>
    <ModalTitle id="note-title" className={shown === "english" ? "english-review-header" : undefined} onClose={onClose}
      closeTestId="note-close">{noteName(pages)}</ModalTitle>
    {pages.length > 1 && <div className="note-tabs" role="group" aria-label="ノートのページ">
      {pages.map((page) => <button key={page} type="button" className="fx-host" aria-pressed={shown === page}
        data-testid={`note-tab-${page}`} onClick={() => onTab(page)}>
        {NOTE_PAGE_NAMES[page]}{newPages.includes(page) && shown !== page && <NewDot label="新しい項目あり" />}
      </button>)}
    </div>}
    {shown === "english" ? <EnglishReview game={game} learning={learning} readAloud={readAloud} />
      : shown === "words" ? <>
        <p className="fine-print">物語で覚えたその国の言葉です（この端末に残ります）。</p>
        <LocalWords groups={localWordGroups(learnedWords)} />
      </>
      : glossary && <LazyDialog onClose={() => onTab(pages[0])}><GlossaryPage {...glossary} /></LazyDialog>}
  </Modal>;
}
