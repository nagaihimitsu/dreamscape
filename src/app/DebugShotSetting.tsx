import { useId } from "react";
import "./debug-shot-setting.css";

// Debug's 撮影の形 (2026-11-16; Debug mode only): loaded lazily by GameApp's ゲームの設定 while Debug mode is on, and shown in
// Debug's 場面の確認, so none of it is in the files the title page loads (scripts/dist-guard.ts lazyDebugMarkers). The stored
// value is src/app/debug-mode.ts (useDebugShot); what it hides, GameApp and src/dev/DebugMode.tsx.

/**
 * 「撮影の形（Debug）」: a checkbox that hides Debug's own marks from the play screens at once (and brings them back), so a
 * screenshot looks like play. `heading`: its level where it stands (h3 under ゲームの設定's 「制作者向け」, h2 in 場面の確認);
 * `message`, a storage that refused the last change.
 */
export default function DebugShotSetting({ on, onChange, message, heading = "h3" }: {
  on: boolean;
  onChange: (on: boolean) => void;
  message: string;
  heading?: "h2" | "h3";
}) {
  const titleId = useId();
  const Heading = heading;
  return <section className="debug-shot-setting" aria-labelledby={titleId} data-testid="debug-shot-setting">
    <Heading id={titleId}>撮影の形（Debug）</Heading>
    <label className="debug-shot-row">
      <input type="checkbox" data-testid="debug-shot" checked={on} onChange={(event) => onChange(event.currentTarget.checked)} />
      Debugの表示を隠す
    </label>
    <p className="fine-print">
      オンの間は、遊びの画面にDebugの表示を出しません。関係の変化と場面の条件、鍵のかかった札、ミニゲームの「結果を選ぶ」、≡メニューの「移動画面に戻る（Debug）」、旅の図鑑の「未入手」と、Debugのページの上の帯と「この時点の候補」です。通常の遊びと同じ見た目で撮れます。オフにすると、すぐにまた出ます（Debugのページで場面の選択へ戻るときも、オフにします）。この端末だけに残ります（セーブ・英語ノート・表示設定とは別）。
    </p>
    {message && <p role="alert">{message}</p>}
  </section>;
}
