import { useEffect, useId, useRef, useState } from "react";
import { ConfirmActionButton, useSettling } from "../components/ConfirmActionButton";
import { Modal, ModalAnswers, ModalTitle } from "../components/Modal";
import { offlineController } from "../offline/offline-controller";
import { useOfflineStatus } from "../offline/offline-status";
import {
  keepConfirm, offlineRows, removeConfirm,
  type OfflineAction, type OfflineActionId, type OfflineNotice, type OfflineRow, type OfflineVersionRow,
} from "./offline-rows";
import type { OfflineJourney } from "./offline-summary";
import "./offline.css";

/** The dialog's steps: its list, or the confirmation of keeping or removing (the one place that asks, before anything is loaded or removed). */
type Step = { kind: "list" } | { kind: "keep"; journeyId: string } | { kind: "remove"; target: string | "all" };
/** Where the focus goes after a step change: the confirmation's heading, the button the player came from, or the line that says what happened. */
type FocusRequest = { target: "heading" } | { target: "action"; row: string; action: OfflineActionId } | { target: "line"; row: string };

/** The row of the kept journeys' newer or missing files, and of everything (the removal of a store that cannot be read). */
const VERSION_ROW = "version";
const ALL_ROW = "all";

/** A button that takes no press while `wait` (it stays in the Tab order, shown and announced as disabled): the second tap of a double tap does nothing. */
function GuardedButton({ wait, action, className, onPress }: { wait: boolean; action: OfflineAction; className: string; onPress: () => void }) {
  return <button type="button" className={className} data-action={action.id} aria-disabled={wait || undefined} data-settling={wait || undefined}
    onClick={() => { if (!wait) onPress(); }}>{action.label}</button>;
}

function Notice({ notice }: { notice: OfflineNotice }) {
  return <>
    <p className="offline-notice" role={notice.role} tabIndex={-1}>{notice.text}</p>
    {notice.reload && <button type="button" className="secondary offline-reload" onClick={() => window.location.reload()}>ページを読み込み直す</button>}
  </>;
}

/**
 * One row: a journey, or the kept journeys' newer build. Its state line stays mounted (a status region: its words
 * change with the state and at each quarter of a run; the running numbers beside it are not announced). The first
 * button is one element whose words change (入れる → 止める → 続きを入れる), so the focus stays on it; it waits a moment after each
 * change of the row's state, as the list's buttons do after a confirmation (`wait`).
 */
function Row({ id, heading, row, wait, onAction }: {
  id: string; heading: string; row: OfflineRow | OfflineVersionRow; wait: boolean; onAction: (action: OfflineActionId) => void;
}) {
  const headingId = useId();
  const lineId = useId();
  const changed = useSettling(row.kind);
  const [main, ...others] = row.actions;
  return <section className="offline-row" aria-labelledby={headingId} data-row={id} data-kind={row.kind}>
    <h3 id={headingId}>{heading}</h3>
    <p className="offline-line" id={lineId} role="status" tabIndex={-1}>
      {row.line}
      {row.live && <span className="offline-live" aria-hidden="true">{row.live}</span>}
      {row.spoken && <span className="sr-only">{row.spoken}</span>}
    </p>
    {row.progress && <progress className="offline-progress" max={row.progress.total} value={row.progress.done} aria-labelledby={headingId} aria-describedby={lineId} />}
    {row.notice && <Notice notice={row.notice} />}
    {main && <div className="offline-actions">
      <GuardedButton key="main" wait={wait || changed} action={main} className={main.id === "remove" ? "text-button delete-entry" : "secondary"} onPress={() => onAction(main.id)} />
      {others.map((action) => <GuardedButton key={action.id} wait={wait || changed} action={action} className="text-button delete-entry" onPress={() => onAction(action.id)} />)}
    </div>}
  </section>;
}

/**
 * 「オフラインで遊ぶ」 (user request and decisions 2026-11-17): the one place where a journey is kept on the device,
 * continued, brought to a newer build or removed, opened from the title and from ゲームの設定. It lays out what
 * offline-rows.ts says and holds no rule. Nothing is loaded before the player confirms 「入れる」; closing the dialog
 * never stops a run. It keeps one size in its steps, with a confirmation's two answers at its foot (as 古い保存データの整理).
 * `journeys`: the catalog, in the title's order (given by the game, so that this file brings no content of its own).
 */
export function OfflinePlayDialog({ onClose, journeys }: { onClose: () => void; journeys: readonly OfflineJourney[] }) {
  const snapshot = useOfflineStatus();
  const [step, setStep] = useState<Step>({ kind: "list" });
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  // Back on the list (and as the dialog opens), its buttons wait a moment: the second tap of a double tap on an answer lands on none of them.
  const settling = useSettling(step);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    offlineController.setDialogOpen(true);
    void offlineController.refresh();
    return () => offlineController.setDialogOpen(false);
  }, []);
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === "heading") {
      body.current?.scrollTo({ top: 0 });
      heading.current?.focus({ preventScroll: true });
      return;
    }
    const row = body.current?.querySelector<HTMLElement>(`[data-row="${focusRequest.row}"]`);
    const line = row?.querySelector<HTMLElement>(".offline-line, .offline-notice");
    const target = focusRequest.target === "action" ? row?.querySelector<HTMLElement>(`[data-action="${focusRequest.action}"]`) : line;
    (target ?? line ?? heading.current)?.focus();
  }, [focusRequest]);
  // Everything was removed: the row that held the focus is gone, and the line that says so takes it.
  const removedAll = snapshot.result?.journeyId === null && snapshot.result.kind === "removed";
  useEffect(() => {
    if (removedAll) setFocusRequest({ target: "line", row: ALL_ROW });
  }, [removedAll]);

  const view = offlineRows(snapshot, journeys);
  const confirm = step.kind === "keep" ? keepConfirm(snapshot, journeys, step.journeyId) : step.kind === "remove" ? removeConfirm(snapshot, journeys, step.target) : null;
  const stepRow = step.kind === "keep" ? step.journeyId : step.kind === "remove" ? step.target : null;
  const toList = (focus: FocusRequest) => { setStep({ kind: "list" }); setFocusRequest(focus); };
  const back = () => { if (step.kind !== "list") toList({ target: "action", row: stepRow!, action: step.kind === "keep" ? "keep" : "remove" }); };
  // The journey can no longer be kept as asked (the network went, another tab took it up): back to the list, which says why.
  useEffect(() => {
    if (step.kind === "keep" && !confirm) toList({ target: "line", row: step.journeyId });
  // Only when the confirmation's words go.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind, !confirm]);

  function act(row: string, action: OfflineActionId) {
    if (action === "keep") { setStep({ kind: "keep", journeyId: row }); setFocusRequest({ target: "heading" }); }
    else if (action === "remove") { setStep({ kind: "remove", target: row }); setFocusRequest({ target: "heading" }); }
    else if (action === "resume") void offlineController.keep(row);
    else if (action === "update") void offlineController.update();
    else offlineController.stop();
  }
  function confirmed() {
    if (step.kind === "keep") void offlineController.keep(step.journeyId);
    else if (step.kind === "remove") void offlineController.remove(step.target);
    if (stepRow !== null) toList({ target: "line", row: stepRow });
  }

  return <Modal labelledBy="offline-title" className="offline-play" onClose={confirm ? back : onClose} settlePresses>
    {confirm
      ? <ModalTitle id="offline-title" headingRef={heading}>{confirm.title}</ModalTitle>
      : <ModalTitle id="offline-title" headingRef={heading} onClose={onClose} closeTestId="offline-close">オフラインで遊ぶ</ModalTitle>}
    <div className="offline-body" ref={body} data-testid="offline-play">
      {confirm ? <>
        {confirm.body.map((text) => <p key={text}>{text}</p>)}
        <p className="fine-print">{confirm.fine}</p>
      </> : <>
        {view.lead && <p className="fine-print offline-lead">{view.lead}</p>}
        {view.blocked && <section className="offline-row" data-row={ALL_ROW}>
          <p className="offline-line" role={view.blocked.role} tabIndex={-1}>{view.blocked.text}</p>
          {view.notice && <Notice notice={view.notice} />}
          {view.blocked.removeAll && <div className="offline-actions">
            <GuardedButton wait={settling} action={{ id: "remove", label: "端末から消す" }} className="text-button delete-entry" onPress={() => act(ALL_ROW, "remove")} />
          </div>}
        </section>}
        {!view.blocked && view.notice && <div className="offline-row" data-row={ALL_ROW}><Notice notice={view.notice} /></div>}
        {view.version && <Row id={VERSION_ROW} heading={view.version.heading} row={view.version} wait={settling} onAction={(action) => act(VERSION_ROW, action)} />}
        {view.rows.map((row) => <Row key={row.journeyId} id={row.journeyId} heading={row.nameJa} row={row} wait={settling} onAction={(action) => act(row.journeyId, action)} />)}
        {!view.blocked && <p className="fine-print offline-advice">{view.advice}</p>}
        {!view.blocked && view.foot.map((text) => <p key={text} className="fine-print offline-foot">{text}</p>)}
      </>}
    </div>
    {confirm && <div className="offline-answers">
      <ModalAnswers
        cancel={<button type="button" className="secondary" onClick={back}>{confirm.cancel}</button>}
        action={<ConfirmActionButton className={confirm.danger ? "danger-button" : "primary"} onClick={confirmed}>{confirm.action}</ConfirmActionButton>} />
    </div>}
  </Modal>;
}
