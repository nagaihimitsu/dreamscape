import type { ReactNode } from "react";

/**
 * One checkbox of a settings list (ゲームの設定, セーブ・ロード's 自動保存): the box and its label in one 44-px row, and
 * its note (`note`, when there is one) under the label.
 */
export function SettingCheck({ checked, disabled = false, onChange, note, children }: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  note?: ReactNode;
  children: ReactNode;
}) {
  return <>
    <label className="translation-setting">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /> {children}
    </label>
    {note && <p className="fine-print setting-note">{note}</p>}
  </>;
}

/** A volume under its sound's checkbox: 「大きさ」, a slider in tens from 0 to 100 % (`value` from 0 to 1) and its value. */
export function VolumeSetting({ label, value, disabled = false, onChange }: {
  /** What the slider is named for screen readers (「声の大きさ」). */
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * 100);
  return <label className="translation-setting volume-setting setting-sub">
    <span aria-hidden="true">大きさ</span>
    <input type="range" aria-label={label} aria-valuetext={`${percent}%`} min={0} max={100} step={10}
      value={percent} disabled={disabled} onChange={(event) => onChange(Number(event.target.value) / 100)} />
    <span className="volume-value" aria-hidden="true">{percent}%</span>
  </label>;
}
