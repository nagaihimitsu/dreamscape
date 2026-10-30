import { landmarks, tourismClues } from "../../content";
import { Modal } from "../../components/Modal";
import { ClueDetails } from "./ClueDetails";
import { ClueImage } from "./ClueImage";
import "./notebook.css";

export interface NotebookReasoning {
  caseClueIds: string[];
  claimText: string;
  questionEn: string;
  selectedIds: string[];
  maxSelections: 1 | 2;
  selectionEnabled: boolean;
  onSelect: (id: string) => void;
}

export function ClueNotebook({
  landmarkId,
  discoveredIds,
  onClose,
  onObserve,
  reasoning,
}: {
  landmarkId: string;
  discoveredIds: string[];
  onClose: () => void;
  onObserve?: () => void;
  reasoning?: NotebookReasoning;
}) {
  const landmark = landmarks.find((item) => item.id === landmarkId)!;
  const clues = tourismClues.filter(
    (clue) => clue.landmarkId === landmarkId && (
      discoveredIds.includes(clue.id) || reasoning?.caseClueIds.includes(clue.id)
    ),
  );
  return (
    <Modal labelledBy="cluebook-title" onClose={onClose} className={reasoning ? "case-notebook" : ""}>
      <div className="cluebook-header">
        <div>
          <p className="eyebrow">{landmark.nameJa}</p>
          <h2 id="cluebook-title">手がかり帳</h2>
        </div>
        <button
          className="text-button"
          data-testid="cluebook-close"
          autoFocus
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
      {reasoning && (
        <aside className="case-context" aria-label="照らし合わせる主張と問題" data-testid="case-context">
          {reasoning.claimText && <>
            <p className="case-context-label">敵の主張</p>
            <blockquote>{reasoning.claimText}</blockquote>
          </>}
          <p className="case-question" lang="en">{reasoning.questionEn}</p>
        </aside>
      )}
      <div className="cluebook-body" data-testid="cluebook">
        <p className="fine-print">
          {reasoning
            ? "ケース資料は未発見でも読めます。何度開いても、時間制限やペナルティはありません。"
            : "見つけたことは、何度でも読み返せます。"}
        </p>
        {clues.length === 0 ? (
          <p className="empty-clues">
            まだ手がかりはありません。観光画面の気になる場所や資料カードを調べると、ここに記録されます。
          </p>
        ) : (
          clues.map((clue) => (
            <article
              className={`notebook-clue ${reasoning?.selectedIds.includes(clue.id) ? "case-selected" : ""}`}
              data-testid={`notebook-${clue.id}`}
              key={clue.id}
            >
              {reasoning && <p className="case-provenance">
                {discoveredIds.includes(clue.id) ? "観察済み" : "ケース資料"}
              </p>}
              <ClueDetails clue={clue} />
              {reasoning && <ClueImage clue={clue} />}
              {reasoning?.caseClueIds.includes(clue.id) && (
                <button
                  className="case-select"
                  data-testid={`select-evidence-${clue.id}`}
                  aria-pressed={reasoning.selectedIds.includes(clue.id)}
                  disabled={!reasoning.selectionEnabled || (
                    reasoning.maxSelections === 2 &&
                    reasoning.selectedIds.length >= 2 &&
                    !reasoning.selectedIds.includes(clue.id)
                  )}
                  onClick={() => reasoning.onSelect(clue.id)}
                >
                  {reasoning.selectedIds.includes(clue.id)
                    ? reasoning.selectionEnabled ? "✓ 選択中 · 外す" : "✓ 提示した証拠"
                    : "この証拠を選ぶ"}
                </button>
              )}
            </article>
          ))
        )}
        {onObserve && (
          <button className="secondary" onClick={onObserve}>
            観光に戻って調べる
          </button>
        )}
      </div>
      {reasoning && <footer className="case-footer">
        <p aria-live="polite">
          {reasoning.selectedIds.length} / {reasoning.maxSelections} 枚を選択
          {reasoning.selectionEnabled && reasoning.maxSelections === 2 && reasoning.selectedIds.length === 2 &&
            <span>変更するときは、選択中の証拠を外してください。</span>}
        </p>
        <button className="primary" data-testid="case-return" onClick={onClose}>
          推理に戻る
        </button>
      </footer>}
    </Modal>
  );
}
