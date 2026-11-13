import { useId, useRef } from "react";
import { VOICE_RATE_DEFAULT, VOICE_RATE_MAX, VOICE_RATE_MIN, VOICE_RATE_STEP, voiceRateJa } from "../audio/voice-rate";
import "./debug-voice-rate.css";

// Debug's speed of the lines' voices (2026-11-13 user request; Debug mode only): loaded lazily by GameApp's ⚙設定 while
// Debug mode is on, and shown in Debug's 音と演出の見本, so none of it is in the files the title page loads
// (scripts/dist-guard.ts lazyDebugMarkers). The rule is src/audio/voice-rate.ts, the stored value src/app/debug-mode.ts.

/** The slider works in hundredths (75 to 150 by 5), so that its steps are exact. */
const percent = (rate: number) => Math.round(rate * 100);

/**
 * 「台詞の声の速さ（Debug）」: 0.75 to 1.5 times in steps of 0.05 and back to 1, applied to the voice playing at once
 * (useVoice.ts useVoiceRate). `voiceOn` is 「台詞の声を出す」; `message`, a storage that refused the last change.
 */
export default function DebugVoiceRate({ rate, onChange, voiceOn, message }: {
  rate: number;
  onChange: (rate: number) => void;
  voiceOn: boolean;
  message: string;
}) {
  const titleId = useId();
  const slider = useRef<HTMLInputElement>(null);
  const said = voiceRateJa(rate);
  // The reset turns itself off at 1×: the focus goes to the slider, not to the page.
  const reset = () => {
    onChange(VOICE_RATE_DEFAULT);
    slider.current?.focus();
  };
  return <section className="debug-voice-rate" aria-labelledby={titleId} data-testid="debug-voice-rate">
    <h3 id={titleId}>台詞の声の速さ（Debug）</h3>
    <label className="debug-voice-rate-row">
      速さ
      <input ref={slider} type="range" aria-label="台詞の声の速さ" aria-valuetext={said}
        min={percent(VOICE_RATE_MIN)} max={percent(VOICE_RATE_MAX)} step={percent(VOICE_RATE_STEP)} value={percent(rate)}
        onChange={(event) => onChange(Number(event.target.value) / 100)} />
      <span className="debug-voice-rate-value" aria-hidden="true">{said}</span>
    </label>
    <button type="button" className="secondary" disabled={rate === VOICE_RATE_DEFAULT} onClick={reset}>
      {voiceRateJa(VOICE_RATE_DEFAULT)}に戻す
    </button>
    <p className="fine-print">
      録音した声を速く・ゆっくり聞いて、合う速さを確かめるための設定です。声の高さは変わらず、鳴っている声にもすぐ効きます。自動送りとBGMを下げる間も、この速さで声が終わるのに合わせます。この端末だけに残り（セーブ・英語ノート・表示設定とは別）、Debugモードがオフの間は{voiceRateJa(VOICE_RATE_DEFAULT)}で鳴ります。
    </p>
    {!voiceOn && <p className="fine-print">「台詞の声を出す」がオフなので、今は声が鳴りません。</p>}
    {message && <p role="alert">{message}</p>}
  </section>;
}
