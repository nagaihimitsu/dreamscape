import { useCallback, useEffect, useId, useState } from "react";
import { Modal } from "./Modal";
import "./dialogue-log.css";

export interface DialogueLogEntry {
  revision: number;
  speaker: string;
  text: string;
}

/** Only completely displayed lines are kept, in memory and for one event. */
export function useDialogueLog(
  eventKey: string,
  revision: number,
  speaker: string,
  text: string,
) {
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
              ? [...entries, { revision, speaker, text }].slice(-100)
              : entries,
        };
      });
    },
    [eventKey, revision, speaker, text],
  );
  return {
    ready: state.eventKey === eventKey && state.readyRevision === revision,
    entries: state.eventKey === eventKey ? state.entries : [],
    onReady,
  };
}

export function DialogueLog({
  entries,
}: {
  entries: readonly DialogueLogEntry[];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        会話ログ
      </button>
      {open && (
        <Modal labelledBy={titleId} onClose={() => setOpen(false)}>
          <h2 id={titleId}>会話ログ</h2>
          {entries.length ? (
            <ol className="vn-log">
              {entries.map((entry) => (
                <li key={entry.revision}>
                  <strong>{entry.speaker}</strong>
                  <p>{entry.text}</p>
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
