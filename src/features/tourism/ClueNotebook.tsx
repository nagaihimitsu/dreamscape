import { landmarks, tourismClues } from "../../content";
import { Modal } from "../../components/Modal";
import { ClueDetails } from "./ClueDetails";

export function ClueNotebook({
  landmarkId,
  discoveredIds,
  onClose,
  onObserve,
}: {
  landmarkId: string;
  discoveredIds: string[];
  onClose: () => void;
  onObserve?: () => void;
}) {
  const landmark = landmarks.find((item) => item.id === landmarkId)!;
  const clues = tourismClues.filter(
    (clue) => clue.landmarkId === landmarkId && discoveredIds.includes(clue.id),
  );
  return (
    <Modal labelledBy="cluebook-title" onClose={onClose}>
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
      <div className="cluebook-body" data-testid="cluebook">
        <p className="fine-print">見つけたことは、何度でも読み返せます。</p>
        {clues.length === 0 ? (
          <p className="empty-clues">
            まだ手がかりはありません。観光画面の気になる場所や資料カードを調べると、ここに記録されます。
          </p>
        ) : (
          clues.map((clue) => (
            <article
              className="notebook-clue"
              data-testid={`notebook-${clue.id}`}
              key={clue.id}
            >
              <ClueDetails clue={clue} />
            </article>
          ))
        )}
        {onObserve && (
          <button className="secondary" onClick={onObserve}>
            観光に戻って調べる
          </button>
        )}
      </div>
    </Modal>
  );
}
