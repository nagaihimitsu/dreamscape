import { lazy } from "react";
import { Modal, ModalTitle } from "../components/Modal";
import { LazyDialog } from "../components/LazyDialog";
import { NewDot } from "../components/fx";
import { EnglishReview } from "../features/learning/EnglishReview";
import type { GameState } from "../domain/game";
import type { Learning } from "../features/learning/useLearning";
import "./note-dialog.css";

// 旅の図鑑's page, from a file of its own (the title page does not load it).
const GlossaryPage = lazy(() => import("../features/journey/GlossaryPage").then((module) => ({ default: module.GlossaryPage })));

export type NoteTab = "english" | "glossary";

/**
 * 「ノート」 (≡メニュー; 2026-11-20 user decision, one item in place of 英語ノート and 旅の図鑑): what the journey taught, on
 * two pages chosen at its top, 「英語ノート」 (EnglishReview) and 「旅の図鑑」 (GlossaryPage), each with its dot while it has
 * something the player has not opened it on. A journey without terms (`glossary` absent) has 英語ノート alone, under that
 * name. The page shown is GameApp's (`tab`): a quiz result's 「英語ノート」 opens this dialog on its page. Opened under the
 * finger from the menu's panel, it takes no press for a moment (settlePresses); a dialog for viewing, a tap on the dimmed
 * page around also closes it.
 */
export function NoteDialog({ tab, onTab, game, learning, learnedWords, readAloud, glossary, englishNew, glossaryNew, onClose }: {
  tab: NoteTab;
  onTab: (tab: NoteTab) => void;
  game: GameState;
  learning: Learning;
  learnedWords?: readonly string[];
  readAloud?: boolean;
  /** 旅の図鑑's page: the journey, the terms met, those new as the page opened, and Debug's showing of every term. */
  glossary?: { journeyId: string; met: readonly string[]; newIds: readonly string[]; revealAll: boolean };
  englishNew: boolean;
  glossaryNew: boolean;
  onClose: () => void;
}) {
  const shown: NoteTab = glossary ? tab : "english";
  const pages: { tab: NoteTab; labelJa: string; isNew: boolean }[] = [
    { tab: "english", labelJa: "英語ノート", isNew: englishNew },
    { tab: "glossary", labelJa: "旅の図鑑", isNew: glossaryNew },
  ];
  return <Modal labelledBy="note-title" className={shown === "english" ? "english-review note-dialog" : "glossary-modal note-dialog"}
    onClose={onClose} settlePresses closeOnBackdrop>
    <ModalTitle id="note-title" className={shown === "english" ? "english-review-header" : undefined} onClose={onClose}
      closeTestId="note-close">{glossary ? "ノート" : "英語ノート"}</ModalTitle>
    {glossary && <div className="note-tabs" role="group" aria-label="ノートのページ">
      {pages.map((page) => <button key={page.tab} type="button" className="fx-host" aria-pressed={shown === page.tab}
        data-testid={`note-tab-${page.tab}`} onClick={() => onTab(page.tab)}>
        {page.labelJa}{page.isNew && shown !== page.tab && <NewDot label="新しい項目あり" />}
      </button>)}
    </div>}
    {shown === "english"
      ? <EnglishReview game={game} learning={learning} learnedWords={learnedWords} readAloud={readAloud} />
      : glossary && <LazyDialog onClose={() => onTab("english")}><GlossaryPage {...glossary} /></LazyDialog>}
  </Modal>;
}
