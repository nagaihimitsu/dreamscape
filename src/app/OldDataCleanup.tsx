import { useEffect, useRef, useState } from "react";
import { Modal } from "../components/Modal";
import { runWithSlotLocks } from "../persistence/journey-lock";
import {
  formatOldDataSize, oldDataLockNames, readOldData, removeOldData,
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
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // A step change rebuilds the dialog's content: the confirmation and a result start at the
  // heading (read first, scrolled into view); 「消去せず戻る」 returns to the button it came from.
  const [focusRequest, setFocusRequest] = useState<{ target: "heading" | "remove" } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === "remove" && removeButton.current) removeButton.current.focus();
    else {
      heading.current?.closest("dialog")?.scrollTo({ top: 0 });
      heading.current?.focus({ preventScroll: true });
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
    setFocusRequest({ target: "heading" });
  }
  async function remove() {
    if (!listing || working) return;
    setWorking(true);
    const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
    const run = await runWithSlotLocks(locks, oldDataLockNames(chosenItems), () => removeOldData(storage, listing, chosen));
    setWorking(false);
    if (run.status === "busy") {
      const owner = chosenItems.find((item) => item.lockName === run.name)?.ownerJa ?? "選んだ旅行編";
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

  return <Modal labelledBy="old-data-title" className="old-data" onClose={onClose}>
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
      <p className="fine-print">一覧にないデータ（今の版のセーブ、各旅行編の英語ノート、表示設定など）は残ります。ほかの旅行編を別のタブで開いている間は消去できません。</p>
      <button type="button" className="secondary" onClick={() => { setConfirming(false); setFocusRequest({ target: "remove" }); }}>消去せず戻る</button>
      <button type="button" className="danger-button" disabled={working} onClick={() => void remove()}>消去する</button>
    </> : <>
      <h2 id="old-data-title" ref={heading} tabIndex={-1}>古い保存データの整理</h2>
      <p>このブラウザに残っている、今のゲームでは使わない保存データです。消去するものを選んでください。</p>
      {notice && <p className="old-data-notice" role={notice.role}>{notice.text}</p>}
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
      <p className="fine-print">今の版のセーブ、各旅行編の英語ノート、表示設定は一覧に出ず、消去しません。ほかのサイトのデータにも触れません。</p>
      {items.length > 0 && <button type="button" className="danger-button" ref={removeButton} disabled={!chosenItems.length}
        onClick={() => { setNotice(null); setConfirming(true); setFocusRequest({ target: "heading" }); }}>選んだデータを消去する</button>}
      {items.length > 0 && !chosenItems.length && <p className="fine-print old-data-hint">消去するものにチェックを付けると押せます。</p>}
      <button type="button" className="secondary" onClick={onClose}>閉じる</button>
    </>}
  </Modal>;
}
