import { useLayoutEffect, useRef, useState } from "react";
import { city, landmarks, tourismClues } from "../../content";
import { Modal } from "../../components/Modal";
import { ClueDetails } from "./ClueDetails";
import { ClueImage, ClueImageCredits } from "./ClueImage";
import "./notebook.css";

export interface NotebookReasoning {
  caseClueIds: string[];
  claimText: string;
  questionEn: string;
  selectedIds: string[];
  maxSelections: 1 | 2;
  selectionEnabled: boolean;
  onSelect: (id: string) => void;
  clues?: typeof tourismClues;
}

export function ClueNotebook({
  landmarkId,
  cityId,
  discoveredIds,
  onClose,
  onObserve,
  reasoning,
}: {
  landmarkId?: string;
  cityId?: string;
  discoveredIds: string[];
  onClose: () => void;
  onObserve?: () => void;
  reasoning?: NotebookReasoning;
}) {
  const landmark = landmarks.find((item) => item.id === landmarkId);
  const availableLandmarks = cityId
    ? landmarks.filter((item) => item.cityId === cityId).map((item) => item.id)
    : [landmarkId];
  const clues = (reasoning?.clues ?? tourismClues).filter(
    (clue) =>
      availableLandmarks.includes(clue.landmarkId) &&
      (discoveredIds.includes(clue.id) ||
        reasoning?.caseClueIds.includes(clue.id)),
  );
  const [currentId, setCurrentId] = useState(
    () => [...(reasoning?.selectedIds ?? [])].reverse().find((id) => clues.some((clue) => clue.id === id)) ?? clues[0]?.id ?? "",
  );
  const readingArea = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (readingArea.current) readingArea.current.scrollTop = 0;
  }, [currentId]);
  const currentIndex = Math.max(0, clues.findIndex((clue) => clue.id === currentId));
  const current = clues[currentIndex];
  const currentSelected = !!current && !!reasoning?.selectedIds.includes(current.id);
  const canSelectCurrent = !!current && !!reasoning?.caseClueIds.includes(current.id);
  return (
    <Modal
      labelledBy="cluebook-title"
      onClose={onClose}
      className={`clue-notebook${reasoning ? " case-notebook" : ""}`}
    >
      <div className="cluebook-header">
        <div>
          <p className="eyebrow">{landmark?.nameJa ?? city.nameJa}</p>
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
        <aside
          className="case-context"
          aria-label="照らし合わせる主張と問題"
          data-testid="case-context"
        >
          {reasoning.claimText && (
            <>
              <p className="case-context-label">敵の主張</p>
              <blockquote>{reasoning.claimText}</blockquote>
            </>
          )}
          <p className="case-question" lang="en">
            {reasoning.questionEn}
          </p>
        </aside>
      )}
      {clues.length > 0 && (
        <div className="clue-navigation" aria-label="手がかりの切り替え">
          <button
            type="button"
            className="clue-page-button"
            disabled={currentIndex === 0}
            aria-label="前の手がかり"
            onClick={() => setCurrentId(clues[currentIndex - 1].id)}
          >
            前へ
          </button>
          <label className="clue-picker">
            <span className="sr-only">表示する手がかり</span>
            <select
              data-testid="clue-picker"
              value={current?.id ?? ""}
              onChange={(event) => setCurrentId(event.target.value)}
            >
              {clues.map((clue, index) => (
                <option key={clue.id} value={clue.id}>
                  {index + 1}. {clue.titleJa}{reasoning?.selectedIds.includes(clue.id) ? "（選択中）" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="clue-page-button"
            disabled={currentIndex >= clues.length - 1}
            aria-label="次の手がかり"
            onClick={() => setCurrentId(clues[currentIndex + 1].id)}
          >
            次へ
          </button>
        </div>
      )}
      <div className="cluebook-body" data-testid="cluebook" ref={readingArea}>
        <p className="sr-only">
          {reasoning
            ? "ケース資料は未発見でも読めます。何度開いても、時間制限やペナルティはありません。"
            : "見つけたことは、何度でも読み返せます。"}
        </p>
        {clues.length === 0 ? (
          <p className="empty-clues">
            まだ手がかりはありません。観光画面の気になる場所や資料カードを調べると、ここに記録されます。
          </p>
        ) : (
          current && (
            <article
              className={`notebook-clue ${currentSelected ? "case-selected" : ""}`}
              data-testid={`notebook-${current.id}`}
              key={current.id}
            >
              {reasoning && (
                <p className="case-provenance">
                  {discoveredIds.includes(current.id) ? "観察済み" : "ケース資料"}
                </p>
              )}
              {cityId && (
                <p className="case-provenance">
                  {
                    landmarks.find((item) => item.id === current.landmarkId)
                      ?.nameJa
                  }
                </p>
              )}
              <ClueDetails
                clue={current}
                image={<ClueImage clue={current} />}
                imageCredits={<ClueImageCredits clue={current} />}
              />
            </article>
          )
        )}
      </div>
      {reasoning && (
        <footer className="case-footer">
          <p aria-live="polite">
            {reasoning.selectedIds.length} / {reasoning.maxSelections} 枚を選択
            {reasoning.selectionEnabled &&
              reasoning.maxSelections === 2 &&
              reasoning.selectedIds.length === 2 && (
                <span>変更するときは、選択中の証拠を外してください。</span>
              )}
          </p>
          <div className="case-footer-actions">
            {canSelectCurrent && current && (
              <button
                className="case-select"
                data-testid={`select-evidence-${current.id}`}
                aria-pressed={currentSelected}
                disabled={!reasoning.selectionEnabled || (reasoning.maxSelections === 2 && reasoning.selectedIds.length >= 2 && !currentSelected)}
                onClick={() => reasoning.onSelect(current.id)}
              >
                {currentSelected ? (reasoning.selectionEnabled ? "✓ 選択中 · 外す" : "✓ 提示した証拠") : "この証拠を選ぶ"}
              </button>
            )}
            <button className="primary" data-testid="case-return" onClick={onClose}>推理に戻る</button>
          </div>
        </footer>
      )}
      {!reasoning && onObserve && (
        <div className="clue-footer"><button className="secondary" onClick={onObserve}>観光に戻って調べる</button></div>
      )}
    </Modal>
  );
}
