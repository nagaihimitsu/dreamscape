import { useState } from "react";
import { Modal, ModalTitle } from "../../components/Modal";
import type { SaveSlot } from "../../persistence/journey-storage";
import { slotSummaries, type SlotSummary } from "../../app/save-slots";
import type { SaveSlots } from "../../app/app-storage";
import "./save-slots.css";

/** What a slot's row says of it (relationship values are never shown). */
function slotLine(summary: SlotSummary): { title: string; detail: string } {
  switch (summary.status) {
    case "empty": return { title: "空き", detail: "まだ使っていません" };
    case "unreadable": return { title: "読み込めないセーブ", detail: "開くと、データの案内を確かめられます" };
    default: return {
      title: `${summary.playerName}・${summary.heroineName}`,
      detail: summary.finished ? `旅を終えました（${summary.cityJa}）` : `${summary.cityJa} ${summary.day}日目`,
    };
  }
}

/**
 * The journey's save slots (2026-11-19 user decision), one row each: its number, the names and where the journey is
 * (or 「空き」). The slot played now is marked; the others have a button that plays them (a save resumes, an empty slot
 * opens the title for a new journey). Read once as it opens: only this tab can write the journey's saves (journey-lock.ts).
 */
export function SaveSlotList({ saves, onChoose }: { saves: SaveSlots; onChoose: (slot: SaveSlot) => void }) {
  const [summaries] = useState(() => slotSummaries(saves.base, saves.journeyId));
  // On the title (the slot played is empty or unreadable): only once another slot holds a save, so a first visit sees the
  // names and 「旅をはじめる」 alone. 「メニュー」's 「セーブの枠」 always shows the list.
  if (!summaries.some((summary) => summary.slot !== saves.slot && summary.status !== "empty")) return null;
  return <div className="save-slots-title">
    <p className="save-slots-caption">セーブの枠</p>
    <SlotRows summaries={summaries} current={saves.slot} onChoose={onChoose} />
  </div>;
}

function SlotRows({ summaries, current, onChoose }: { summaries: SlotSummary[]; current: SaveSlot; onChoose: (slot: SaveSlot) => void }) {
  return <ol className="save-slots" aria-label="セーブの枠">
    {summaries.map((summary) => {
      const line = slotLine(summary);
      const playing = summary.slot === current;
      return <li key={summary.slot} className={playing ? "save-slot playing" : "save-slot"} data-testid={`save-slot-${summary.slot}`}>
        <span className="save-slot-number">セーブ{summary.slot}</span>
        <span className="save-slot-text">
          <strong>{line.title}</strong>
          <span>{line.detail}</span>
        </span>
        {playing
          ? <span className="save-slot-mark">遊んでいる枠</span>
          : <button type="button" className="secondary" onClick={() => onChoose(summary.slot)}
            aria-label={`セーブ${summary.slot}（${line.title}）${summary.status === "empty" ? "で新しくはじめる" : "を開く"}`}>
            {summary.status === "empty" ? "新しくはじめる" : "開く"}
          </button>}
      </li>;
    })}
  </ol>;
}

/** 「セーブの枠」 (≡メニュー): the list in a dialog for viewing (「× 閉じる」, a tap around, or Esc). */
export function SaveSlotsDialog({ saves, onChoose, onClose }: { saves: SaveSlots; onChoose: (slot: SaveSlot) => void; onClose: () => void }) {
  const [summaries] = useState(() => slotSummaries(saves.base, saves.journeyId));
  return <Modal labelledBy="save-slots-title" onClose={onClose} closeOnBackdrop settlePresses>
    <ModalTitle id="save-slots-title" onClose={onClose}>セーブの枠</ModalTitle>
    <p className="fine-print">枠ごとに名前と旅の進み具合を保存します。英語ノート・既読の記録は、この旅行編の枠で共有します。</p>
    <SlotRows summaries={summaries} current={saves.slot} onChoose={onChoose} />
  </Modal>;
}
