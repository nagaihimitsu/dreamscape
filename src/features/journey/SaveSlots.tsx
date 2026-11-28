import { useState, type ReactNode } from "react";
import { Modal, ModalAnswers, ModalTitle } from "../../components/Modal";
import { ConfirmActionButton } from "../../components/ConfirmActionButton";
import { Icon } from "../../components/icons";
import { SettingCheck } from "../../components/SettingCheck";
import type { SaveSlot } from "../../persistence/journey-storage";
import { slotSummaries, type SlotSummary } from "../../app/save-slots";
import type { SaveSlots } from "../../app/app-storage";
import { economyLevelLabel, englishLevelLabel } from "../../domain/difficulty";
import "./save-slots.css";

/** What a slot's row says of it (relationship values are never shown): with a save, its difficulty too (2026-11-19). */
function slotLine(summary: SlotSummary): { title: string; detail: string; difficulty?: string } {
  switch (summary.status) {
    case "empty": return { title: "空き", detail: "まだ使っていません" };
    case "unreadable": return { title: "読み込めないセーブ", detail: "開くと、データの案内を確かめられます" };
    default: return {
      title: `${summary.playerName}・${summary.heroineName}`,
      detail: summary.finished ? `旅を終えました（${summary.cityJa}）` : `${summary.cityJa} ${summary.day}日目`,
      difficulty: `英語 ${englishLevelLabel(summary.difficulty.english).labelJa}・お金とAP ${economyLevelLabel(summary.difficulty.economy).labelJa}`,
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
  // names and 「旅をはじめる」 alone. 「メニュー」's 「セーブ・ロード」 always shows the list.
  if (!summaries.some((summary) => summary.slot !== saves.slot && summary.status !== "empty")) return null;
  return <div className="save-slots-title">
    <p className="save-slots-caption">セーブの枠</p>
    <SlotRows summaries={summaries} current={saves.slot} onChoose={onChoose} />
  </div>;
}

function SlotRows({ summaries, current, onChoose }: { summaries: SlotSummary[]; current: SaveSlot; onChoose: (slot: SaveSlot) => void }) {
  return <SlotList summaries={summaries} current={current} action={(summary, line) => summary.slot === current ? null
    : <button type="button" className="secondary" onClick={() => onChoose(summary.slot)}
      aria-label={`セーブ${summary.slot}（${line.title}）${summary.status === "empty" ? "で新しくはじめる" : "を開く"}`}>
      {summary.status === "empty" ? "新しくはじめる" : "開く"}
    </button>} />;
}

/** One row per slot; `action` is the row's button (null: the slot played shows its mark, any other slot nothing). */
function SlotList({ summaries, current, action }: { summaries: SlotSummary[]; current: SaveSlot;
  action: (summary: SlotSummary, line: ReturnType<typeof slotLine>) => ReactNode }) {
  return <ol className="save-slots" aria-label="セーブの枠">
    {summaries.map((summary) => {
      const line = slotLine(summary);
      const playing = summary.slot === current;
      const button = action(summary, line);
      return <li key={summary.slot} className={playing ? "save-slot playing" : "save-slot"} data-testid={`save-slot-${summary.slot}`}>
        <span className="save-slot-number">セーブ{summary.slot}{playing && <span className="save-slot-mark">遊んでいる枠</span>}</span>
        <span className="save-slot-text">
          <strong>{line.title}</strong>
          <span>{line.detail}</span>
          {line.difficulty && <span>{line.difficulty}</span>}
        </span>
        {button}
      </li>;
    })}
  </ol>;
}

export type SaveLoadMode = "save" | "load";

/**
 * 「セーブ・ロード」 (≡メニュー; 2026-11-19 user decision, one item in place of セーブ, ロード and セーブの枠): the journey's slots
 * under 「セーブ」 or 「ロード」, the player choosing the slot to save into or to load. セーブ into the slot played saves the
 * scene; into another slot it copies this play there (an occupied slot asks first; one this version cannot read is never
 * written over), and play goes on in the slot played. ロード of the slot played brings its saved scene back; another
 * slot's opens that slot (an empty one starts a new journey from the title). Debug plays one isolated slot (`summaries`
 * holds it alone). Read once as it opens: only this tab can write the journey's saves (journey-lock.ts). Under the slots,
 * what is about saving (2026-11-20 user decisions, from ゲームの設定): 自動保存 and 保存データの消去 of the slot played,
 * then the rest of the saved data and the journeys (`more`).
 */
export function SaveLoadDialog({ readSlots, current, autoSave, debug = false, notice, onSave, onLoad, onDelete, more, onClose }: {
  readSlots: () => SlotSummary[]; current: SaveSlot;
  /**
   * 「ゲームの進行を自動保存する」 (moved here from ゲームの設定 on 2026-11-20): whether it is on, whether the setting can be
   * changed (the display settings could be read), and while it is on, when it last saved (journey-hud-text's autoSaveLine).
   */
  autoSave: { on: boolean; disabled: boolean; savedLine: string | null; onChange: (on: boolean) => void };
  debug?: boolean;
  /** Why turning automatic saving on or 保存データの消去 could not go on (said here, where it was asked). */
  notice?: { text: string; at: "autosave" | "delete" } | null;
  onSave: (slot: SaveSlot) => void; onLoad: (slot: SaveSlot) => void;
  /** 「保存データの消去」 of the slot played (moved here from ゲームの設定 on 2026-11-20): its confirmation opens over this dialog. */
  onDelete: () => void;
  /**
   * The rest of the saved data, under 保存データの消去 (moved here from ゲームの設定 on 2026-11-20): オフラインで遊ぶ, 古い
   * 保存データの整理 and the switch of journeys (each journey has slots of its own). What they open stacks over this dialog.
   */
  more?: ReactNode;
  onClose: () => void;
}) {
  const [summaries] = useState(readSlots);
  const [mode, setMode] = useState<SaveLoadMode>("save");
  const [overwrite, setOverwrite] = useState<SlotSummary | null>(null);
  const saveAction = (summary: SlotSummary, line: ReturnType<typeof slotLine>) => {
    if (summary.slot !== current && summary.status === "unreadable") return <span className="save-slot-off">上書きできません</span>;
    return <button type="button" className="secondary" aria-label={`セーブ${summary.slot}（${line.title}）にセーブ`}
      onClick={() => summary.slot !== current && summary.status === "saved" ? setOverwrite(summary) : onSave(summary.slot)}>セーブ</button>;
  };
  const loadAction = (summary: SlotSummary, line: ReturnType<typeof slotLine>) => {
    if (summary.slot === current && summary.status === "empty") return <span className="save-slot-off">セーブなし</span>;
    const fresh = summary.status === "empty";
    return <button type="button" className="secondary" aria-label={`セーブ${summary.slot}（${line.title}）${fresh ? "で新しくはじめる" : "をロード"}`}
      onClick={() => onLoad(summary.slot)}>{fresh ? "新しくはじめる" : "ロード"}</button>;
  };
  return <Modal labelledBy="save-load-title" onClose={onClose} closeOnBackdrop settlePresses>
    <ModalTitle id="save-load-title" onClose={onClose}>セーブ・ロード</ModalTitle>
    <div className="save-load-modes" role="group" aria-label="セーブかロードか">
      {(["save", "load"] as const).map((each) => <button key={each} type="button" aria-pressed={mode === each}
        data-testid={`save-load-${each}`} onClick={() => setMode(each)}>
        <Icon name={each} />{each === "save" ? "セーブ" : "ロード"}
      </button>)}
    </div>
    <SlotList summaries={summaries} current={current} action={mode === "save" ? saveAction : loadAction} />
    <p className="fine-print">{debug
      ? "Debug用の一時データです。通常のセーブには保存しません。"
      : mode === "save"
        ? "ほかの枠にセーブすると、今の旅をその枠に写します。遊ぶ枠は変わりません。クイズの英語の記録・旅のことば・既読の記録は、この旅行編のどの枠でも共有します。"
        : "ほかの枠をロードすると、その枠の旅に切り替えます。"}</p>
    <div className="save-load-settings">
      <SettingCheck checked={autoSave.on} disabled={autoSave.disabled} onChange={autoSave.onChange}
        note={autoSave.on ? autoSave.savedLine : "オフの間は、ここで「セーブ」を押したときに保存します。"}>ゲームの進行を自動保存する</SettingCheck>
      {notice?.at === "autosave" && <p role="status">{notice.text}</p>}
      <div className="settings-data-links">
        <button type="button" className="text-button delete-entry" onClick={onDelete}>
          {debug ? "Debug用の一時データの消去" : "保存データの消去"}
        </button>
      </div>
      {notice?.at === "delete" && <p role="status">{notice.text}</p>}
      {more}
    </div>
    {overwrite && <Modal labelledBy="save-overwrite-title" onClose={() => setOverwrite(null)}>
      <ModalTitle id="save-overwrite-title">セーブ{overwrite.slot}に上書きしますか？</ModalTitle>
      <p>{slotLine(overwrite).title}（{slotLine(overwrite).detail}）のセーブは、今の旅に置き換わります。元には戻せません。</p>
      <ModalAnswers
        cancel={<button type="button" className="secondary" autoFocus onClick={() => setOverwrite(null)}>やめる</button>}
        action={<ConfirmActionButton className="primary" onClick={() => { const slot = overwrite.slot; setOverwrite(null); onSave(slot); }}>上書きする</ConfirmActionButton>} />
    </Modal>}
  </Modal>;
}
