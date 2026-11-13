import { Fragment, useCallback, useEffect, useId, useState } from "react";
import type { LineDelivery } from "../content/tags";
import { emphasisSpans } from "../content/emphasis";
import { Icon } from "./icons";
import { Modal, ModalTitle } from "./Modal";
import "./dialogue-log.css";

export interface DialogueLogEntry {
  revision: number;
  speaker: string;
  text: string;
  /** The line's `# em:` and `# em_shake:` words (2026-11-13): the log shows both in bold, without motion. */
  em?: string;
  emShake?: string;
}

/** Only completely displayed lines are kept, in memory and for one event. */
export function useDialogueLog(
  eventKey: string,
  revision: number,
  speaker: string,
  text: string,
  /** The line's delivery: its emphasised words go into the log with it. */
  delivery?: Pick<LineDelivery, "em" | "emShake">,
) {
  const em = delivery?.em;
  const emShake = delivery?.emShake;
  const [state, setState] = useState<{
    eventKey: string;
    readyRevision: number | null;
    entries: DialogueLogEntry[];
  }>({ eventKey, readyRevision: null, entries: [] });
  useEffect(() => {
    setState((old) =>
      old.eventKey === eventKey
        ? old
        : { eventKey, readyRevision: null, entries: [] },
    );
  }, [eventKey]);
  const onReady = useCallback(
    (ready: boolean) => {
      setState((old) => {
        const entries = old.eventKey === eventKey ? old.entries : [];
        return {
          eventKey,
          readyRevision: ready ? revision : null,
          entries:
            ready && text && !entries.some((entry) => entry.revision === revision)
              ? [...entries, { revision, speaker, text, ...(em ? { em } : {}), ...(emShake ? { emShake } : {}) }].slice(-100)
              : entries,
        };
      });
    },
    [eventKey, revision, speaker, text, em, emShake],
  );
  return {
    ready: state.eventKey === eventKey && state.readyRevision === revision,
    entries: state.eventKey === eventKey ? state.entries : [],
    onReady,
  };
}

/** A logged line: its emphasised and trembling words in bold (no motion in the log). */
function LoggedText({ entry }: { entry: DialogueLogEntry }) {
  if (!entry.em && !entry.emShake) return <>{entry.text}</>;
  return <>{emphasisSpans(entry.text, entry.em, entry.emShake).map((span) => span.kind === "plain"
    ? <Fragment key={span.start}>{span.text}</Fragment>
    : <strong key={span.start} className="vn-log-em">{span.text}</strong>)}</>;
}

export function DialogueLog({
  entries,
  label = "会話ログ",
}: {
  entries: readonly DialogueLogEntry[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <button className="text-button" aria-label="会話ログ" onClick={() => setOpen(true)}>
        <Icon name="log" />{label}
      </button>
      {open && (
        <Modal labelledBy={titleId} onClose={() => setOpen(false)}>
          <ModalTitle id={titleId}>会話ログ</ModalTitle>
          {entries.length ? (
            <ol className="vn-log">
              {entries.map((entry) => (
                <li key={entry.revision}>
                  <strong>{entry.speaker}</strong>
                  <p><LoggedText entry={entry} /></p>
                </li>
              ))}
            </ol>
          ) : (
            <p>まだ読み終えた台詞はありません。</p>
          )}
          <button className="secondary" onClick={() => setOpen(false)}>
            閉じる
          </button>
        </Modal>
      )}
    </>
  );
}
