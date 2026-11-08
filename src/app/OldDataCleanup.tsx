import { useEffect, useRef, useState } from "react";
import { ConfirmActionButton, useSettling } from "../components/ConfirmActionButton";
import { Modal } from "../components/Modal";
import {
  formatOldDataSize, readOldData, removeChosenOldData,
  type KeyedStorage, type OldDataContext, type OldDataItem, type OldDataListing,
} from "../persistence/old-data";

type Notice = { role: "status" | "alert"; text: string };

function readList(storage: KeyedStorage, context: OldDataContext): OldDataListing | null {
  try { return readOldData(storage, context); } catch { return null; }
}

const backupTime = (time: number) =>
  new Date(time).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function KeyList({ item }: { item: OldDataItem }) {
  return <ul className="old-data-keys">
    {item.keys.map((entry) => <li key={entry.key}>
      <code>{entry.key}</code>
      <span>{entry.noteJa}{entry.backedUpAt === null ? "" : `・${backupTime(entry.backedUpAt)}に退避`}・{formatOldDataSize(entry.chars)}</span>
    </li>)}
  </ul>;
}

/**
 * 「古い保存データの整理」: lists what old-data.ts says may be removed, removes the chosen items only
 * after a second, explicit confirmation, and only while no other tab has those journeys open.
 */
export function OldDataCleanup({ storage, context, onClose }: { storage: KeyedStorage; context: OldDataContext; onClose: () => void }) {
  const [listing, setListing] = useState(() => readList(storage, context));
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  // The press already being handled: a second press that reaches 「消去する」 before it re-renders
  // as disabled (two clicks in one task) removes nothing more and leaves the first result shown.
  const pressed = useRef(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // After a result the list's foot waits as well: 「閉じる」 is where 「消去する」 was, so the quick
  // second tap of a double tap on 「消去する」 would close the dialog before the result line is seen.
  // Each result is a new notice, and opening the confirmation clears it, so the list that
  // 「消去せず戻る」 returns to does not wait (its focus goes to 「選んだデータを消去する」).
  const footSettling = useSettling(notice);
  // A step change rebuilds the dialog's content: the confirmation starts at its heading (read first,
  // scrolled into view); a result at its line, which is rendered already filled, so a screen reader
  // reads it from the focus rather than from a live region it never saw change; 「消去せず戻る」
  // returns to the button it came from.
  const [focusRequest, setFocusRequest] = useState<{ target: "heading" | "notice" | "remove" } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const noticeLine = useRef<HTMLParagraphElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === "remove" && removeButton.current) removeButton.current.focus();
    else {
      body.current?.scrollTo({ top: 0 });
      (focusRequest.target === "notice" && noticeLine.current ? noticeLine.current : heading.current)?.focus({ preventScroll: true });
    }
  }, [focusRequest]);
  const items = listing?.items ?? [];
  const chosenItems = items.filter((item) => chosen.includes(item.id));
  const chosenKeys = chosenItems.reduce((count, item) => count + item.keys.length, 0);

  function reread(next: Notice) {
    const fresh = readList(storage, context);
    setListing(fresh);
    setChosen((ids) => ids.filter((id) => fresh?.items.some((item) => item.id === id)));
    setConfirming(false);
    setNotice(next);
    setFocusRequest({ target: "notice" });
  }
  async function remove() {
    if (!listing || pressed.current) return;
    pressed.current = true;
    setWorking(true);
    const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
    const run = await removeChosenOldData(storage, locks, listing, chosen);
    pressed.current = false;
    setWorking(false);
    if (run.status === "busy") {
      const owner = chosenItems.find((item) => item.lock?.name === run.name)?.lock?.ownerJa ?? "選んだ旅行編";
      reread({ role: "alert", text: `${owner}を別のタブで開いているため、何も消去しませんでした。そのタブを閉じてからやり直してください。` });
    } else if (run.status === "unsupported") {
      reread({ role: "alert", text: "このブラウザでは別タブとの競合を防げないため、何も消去しませんでした。" });
    } else if (run.value.ok) {
      setChosen([]);
      reread({ role: "status", text: `消去しました（キー${run.value.removedKeys.length}個）。` });
    } else {
      reread({ role: "alert", text: run.value.message });
    }
  }

  // The dialog keeps one size and its buttons stay at its foot in both steps (styles.css,
  // dialog.old-data), so the confirmation's 「消去せず戻る」 takes the place of 「選んだデータを消去する」
  // and 「消去する」 that of 「閉じる」 (user decision 2026-11-08). The second tap of a double tap on
  // 「選んだデータを消去する」, quick or slow, lands on 「消去せず戻る」 and goes back to the list; nothing
  // is removed. ConfirmActionButton's wait covers a quick tap that does reach 「消去する」. After a
  // result, the list's foot buttons wait too (footSettling).
  return <Modal labelledBy="old-data-title" className="old-data" onClose={onClose}>
    <div className="old-data-body" ref={body}>
      {confirming ? <>
        <h2 id="old-data-title" ref={heading} tabIndex={-1}>選んだ保存データを消去しますか？</h2>
        <p>次の{chosenItems.length}件（キー{chosenKeys}個）を消去します。元には戻せません。</p>
        <ul className="old-data-list">
          {chosenItems.map((item) => <li key={item.id}>
            <strong>{item.titleJa}</strong>
            <p className="old-data-impact">{item.impactJa}</p>
            <KeyList item={item} />
          </li>)}
        </ul>
        <p className="fine-print">一覧にないデータ（開いている旅行編のセーブ、今の版で読み込めるセーブ、この版にある旅行編の英語ノート、表示設定など）は残ります。選んだ旅行編を別のタブで開いている間は消去できません。</p>
      </> : <>
        <h2 id="old-data-title" ref={heading} tabIndex={-1}>古い保存データの整理</h2>
        <p>このブラウザに残っている、今のゲームでは使わない保存データです。消去するものを選んでください。</p>
        {notice && <p className="old-data-notice" role={notice.role} ref={noticeLine} tabIndex={-1}>{notice.text}</p>}
        {!listing ? <p role="alert">保存データを読み取れませんでした。ブラウザの保存設定を確認してください。</p>
          : items.length === 0 ? <p>整理できる古い保存データはありません。</p>
          : <ul className="old-data-list">
            {items.map((item) => <li key={item.id}>
              <label className="translation-setting">
                <input type="checkbox" checked={chosen.includes(item.id)}
                  onChange={(event) => setChosen((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} />
                <span><strong>{item.titleJa}</strong> <span className="old-data-size">（{formatOldDataSize(item.keys.reduce((sum, entry) => sum + entry.chars, 0))}）</span></span>
              </label>
              <p className="old-data-impact">{item.impactJa}</p>
              <KeyList item={item} />
            </li>)}
          </ul>}
        <p className="fine-print">開いている旅行編のセーブ、今の版で読み込めるセーブ、この版にある旅行編の英語ノート、表示設定などは一覧に出ず、消去しません。ほかのサイトのデータにも触れません。</p>
      </>}
    </div>
    <div className="old-data-actions">
      {confirming ? <>
        <button type="button" className="secondary" onClick={() => { setConfirming(false); setFocusRequest({ target: "remove" }); }}>消去せず戻る</button>
        <ConfirmActionButton className="danger-button" disabled={working} onClick={() => void remove()}>消去する</ConfirmActionButton>
      </> : <>
        {items.length > 0 && !chosenItems.length && <p className="fine-print old-data-hint">消去するものにチェックを付けると押せます。</p>}
        {items.length > 0 && <button type="button" className="danger-button" ref={removeButton} disabled={!chosenItems.length || footSettling}
          onClick={() => { setNotice(null); setConfirming(true); setFocusRequest({ target: "heading" }); }}>選んだデータを消去する</button>}
        <button type="button" className="secondary" disabled={footSettling} onClick={onClose}>閉じる</button>
      </>}
    </div>
  </Modal>;
}
