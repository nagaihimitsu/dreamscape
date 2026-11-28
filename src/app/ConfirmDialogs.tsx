import type { ReactNode } from "react";
import { ConfirmActionButton } from "../components/ConfirmActionButton";
import { Modal, ModalAnswers, ModalTitle } from "../components/Modal";

/**
 * A confirmation (UI rules: no 「×」, its two answers at the foot): its question as the title, what it changes, 「戻る」 (or
 * `cancel`) focused first and the action beside it. `settlePresses` when it opens under the finger that opened it (from
 * ≡メニュー's panel). Closing by Esc is the cancel.
 */
export function ConfirmDialog({ id, title, eyebrow, children, cancel = "やめる", action, onCancel, onAction, settlePresses = false }: {
  id: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  cancel?: string;
  action: string;
  onCancel: () => void;
  onAction: () => void;
  settlePresses?: boolean;
}) {
  return <Modal labelledBy={id} onClose={onCancel} settlePresses={settlePresses}>
    <ModalTitle id={id} eyebrow={eyebrow}>{title}</ModalTitle>
    {children}
    <ModalAnswers
      cancel={<button type="button" className="secondary" autoFocus onClick={onCancel}>{cancel}</button>}
      action={<button type="button" className="primary" onClick={onAction}>{action}</button>} />
  </Modal>;
}

/**
 * 保存データの消去's confirmation (from セーブ・ロード or the title): what goes and what stays, by where the save is (`sharedKept`:
 * a slot of a journey whose other slots share the learning record), or Debug's isolated data. The action waits a moment
 * after it opens (ConfirmActionButton), so the second tap of a double tap deletes nothing.
 */
export function DeleteSaveDialog({ debug, journeyJa, slot, sharedKept, offlineNote, onCancel, onConfirm }: {
  debug: boolean;
  journeyJa: string;
  slot: number;
  sharedKept: boolean;
  /** What deleting does not do to the journeys kept for 「オフラインで遊ぶ」 (offline-summary.ts), when there is something to say. */
  offlineNote?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <Modal labelledBy="delete-title" onClose={onCancel}>
    <ModalTitle id="delete-title">{debug ? "Debug用の一時データを消去しますか？" : "保存データを消去しますか？"}</ModalTitle>
    {debug ? <p>Debug用の進行とクイズと旅のことばの記録を消去して、Debugで開いた場面を最初から開き直します。通常のセーブ・クイズと旅のことばの記録・表示設定は消去しません。</p>
      : sharedKept ? <>
        <p>このブラウザに保存された{journeyJa}のセーブ{slot}の名前、旅の進行、AP、恋愛・クイズの記録、旅の記録の写真、旅の思い出を消去します。元には戻せません。</p>
        <p className="fine-print">
          ほかのセーブの枠と、枠で共有するクイズの英語の記録・旅のことば・対訳設定・既読の記録は消去しません。文字の速さなどの表示設定、以前に退避したバックアップ、ほかの旅行編の保存データ、ほかの端末やブラウザにも影響しません。
        </p>
      </> : <>
        <p>このブラウザに保存された{journeyJa}の名前、旅の進行、AP、恋愛・クイズの記録、旅の記録の写真、クイズの英語の記録・旅のことばと対訳設定、既読の記録、旅の思い出を消去します。元には戻せません。</p>
        <p className="fine-print">
          文字の速さなどの表示設定、以前に退避したバックアップ、ほかのサイトのデータは消去しません。ほかの旅行編の保存データ、ほかの端末やブラウザにも影響しません。
          {offlineNote}
        </p>
      </>}
    <ModalAnswers
      cancel={<button type="button" className="secondary" autoFocus onClick={onCancel}>消去せず戻る</button>}
      action={<ConfirmActionButton className="danger-button" onClick={onConfirm}>
        {debug ? "Debug用の一時データを消去する" : "保存データを消去する"}
      </ConfirmActionButton>} />
  </Modal>;
}
