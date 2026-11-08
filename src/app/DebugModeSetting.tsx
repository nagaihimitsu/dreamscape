import { useEffect, useRef, useState, type FormEvent } from "react";
import { ConfirmActionButton } from "../components/ConfirmActionButton";
import { holdTaps } from "../components/tap-hold";
import type { useDebugMode } from "./debug-mode";

type Focus = "field" | "start" | "status";

/**
 * 設定 → 「Debugモード」 (user decision 2026-11-08): turned on with the password, off
 * without one. The password is not a secret (src/app/debug-mode.ts), so the field is
 * a plain text field: phones neither hide what was typed nor offer to store it.
 * The section is not shown inside a Debug session (Debug mode is on there by definition).
 */
export function DebugModeSetting({ debugMode }: { debugMode: ReturnType<typeof useDebugMode> }) {
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [turnedOff, setTurnedOff] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  // Where the keyboard focus goes after the change on screen is rendered.
  const focusNext = useRef<Focus | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "field") { field.current?.focus(); field.current?.select(); }
    else if (target === "start") start.current?.focus();
    else if (target === "status") status.current?.focus();
  });

  function ask() {
    setAsking(true);
    setTurnedOff(false);
    focusNext.current = "field";
  }
  function cancel() {
    setAsking(false);
    setPassword("");
    setWrongAttempts(0);
    focusNext.current = "start";
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;
    const result = debugMode.turnOn(password);
    if (result === "wrong") {
      setWrongAttempts((count) => count + 1);
      focusNext.current = "field";
      return;
    }
    if (result === "failed") return;
    // The field's text is not kept once Debug mode is on.
    setAsking(false);
    setPassword("");
    setWrongAttempts(0);
    // 「場面の確認を開く」 and 「オフにする」 appear under the finger: a double tap's second tap must not press them.
    holdTaps();
    focusNext.current = "status";
  }
  function turnOff() {
    if (debugMode.turnOff() !== "ok") return;
    holdTaps();
    setTurnedOff(true);
    focusNext.current = "start";
  }

  return (
    <section className="debug-mode-setting" aria-labelledby="debug-mode-setting-title" data-testid="debug-mode-setting">
      <h3 id="debug-mode-setting-title">Debugモード</h3>
      <p className="fine-print">
        制作・確認用の機能です。オンにすると「場面の確認」から場面を直接開けて、遊びの中で親しさ・信頼・恋愛の意識の変化が画面に出ます。通常のセーブ・英語ノート・表示設定は変わりません。
      </p>
      {/* Always on the page, so screen readers announce the text when it is put in (a status
          region added together with its text is often not read). Empty, it takes no space. */}
      <p className="debug-mode-announcement" role="status">{turnedOff && !debugMode.on ? "Debugモードをオフにしました。" : null}</p>
      {debugMode.on ? <>
        <p ref={status} tabIndex={-1} role="status">Debugモードはオンです（この端末だけ）。</p>
        <a className="secondary debug-mode-link" href={`${import.meta.env.BASE_URL}?debug`}>場面の確認を開く</a>
        <ConfirmActionButton className="secondary" onClick={turnOff}>Debugモードをオフにする</ConfirmActionButton>
      </> : asking ? (
        <form className="debug-mode-password" onSubmit={submit}>
          <label>
            パスワード
            <input
              ref={field}
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
            />
          </label>
          {wrongAttempts > 0 && <p key={wrongAttempts} role="alert">パスワードが違います。</p>}
          <div className="debug-mode-actions">
            <button type="button" className="secondary" onClick={cancel}>やめる</button>
            <button type="submit" className="primary" disabled={!password.trim()}>オンにする</button>
          </div>
        </form>
      ) : <button ref={start} type="button" className="secondary" onClick={ask}>Debugモードをオンにする</button>}
      {debugMode.message && <p role="alert">{debugMode.message}</p>}
    </section>
  );
}
