import { useId, useMemo, useState, type FormEvent } from "react";
import { Modal, ModalTitle } from "../components/Modal";
import type { DebugGameAccess } from "../app/app-storage";
import { weekdayLabel } from "../app/journey-hud-text";
import type { GameState } from "../domain/game";
import { getGameWeekday, getTimePeriod } from "../domain/travel";
import { clockText, debugClockPresets, debugDayRange, debugRomanceStages, debugTimeRange, parseClockText, type DebugRomanceStage, type DebugScene } from "./debug-query";
import {
  debugEditRefusal, debugFlagGroups, setDebugFlag, setDebugStage, withDebugClock, type DebugClueGroup, type DebugEpisode, type DebugFlagGroup,
} from "./debug-edits";

/**
 * Debug's flags, free time's clock (2026-11-15 user request 「〜〜のフラグを得たことにする」「自由時間を指定する」) and 恋の段階
 * (2026-11-16): the parts of 場面の確認 that choose them for the scene to open, and the Debug bar's dialog that changes them in
 * the running Debug game. The clues heard in conversation (2026-11-18): 場面の確認 only (a launch URL's `clues`).
 */

/** The title of the Debug bar's dialog (its button in DebugMode.tsx says the same, with a place to wrap on a phone). */
const debugEditTitle = "フラグ・時刻・段階";

/**
 * What a chosen 恋の段階 does next (debug-edits.ts withDebugStage): Debug sets only the stage, and play raises it again where
 * evaluateProgression runs when the relationship values and completed dates reach a higher one.
 */
const stageNote = "関係の値と終えたデートの数が上の段階に届いていると、次に関係の値が動いたときか、デートを終えたときに上がります。";

/** 場面の確認's 恋の段階: the progress's own (empty) or 1 to 4; the note while one is chosen. */
export function DebugStageField({ stage, onChange }: { stage: DebugRomanceStage | undefined; onChange: (stage: DebugRomanceStage | undefined) => void }) {
  return <div className="debug-stage">
    <label>恋の段階
      <select data-testid="debug-stage" value={stage ?? ""}
        onChange={(event) => onChange(debugRomanceStages.find((item) => String(item) === event.target.value))}>
        <option value="">旅の進行のまま</option>
        {debugRomanceStages.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    {stage !== undefined && <p className="debug-note">{stageNote}</p>}
  </div>;
}

/** Checkboxes by city (the journey's flags or clues): each row's text and ID are its label (44 px or more). */
function DebugCheckList({ groups, cityId, checked, disabled = false, testId, onChange }: {
  groups: readonly { cityId: string | null; nameJa: string; rows: readonly { id: string; text?: string }[] }[];
  cityId: string;
  checked: readonly string[];
  disabled?: boolean;
  testId: string;
  onChange: (id: string, obtained: boolean) => void;
}) {
  return <div className="debug-flag-list">
    {groups.map((group) => <section key={group.cityId ?? ""}>
      <h3>{group.nameJa}{group.cityId === cityId ? "（この都市）" : ""}</h3>
      <ul>
        {group.rows.map((row) => <li key={row.id}>
          <label className="debug-flag">
            <input type="checkbox" data-testid={`${testId}-${row.id}`} checked={checked.includes(row.id)} disabled={disabled}
              onChange={(event) => onChange(row.id, event.currentTarget.checked)} />
            <span>{row.text ?? row.id}{row.text && <code>{row.id}</code>}</span>
          </label>
        </li>)}
      </ul>
    </section>)}
  </div>;
}

/** The journey's flags as checkboxes, by city (debugFlagGroups); each row's note and ID are its label. */
export function DebugFlagList({ groups, ...rest }: {
  groups: readonly DebugFlagGroup[];
  cityId: string;
  checked: readonly string[];
  disabled?: boolean;
  onChange: (id: string, obtained: boolean) => void;
}) {
  return <DebugCheckList {...rest} testId="debug-flag"
    groups={groups.map((group) => ({ ...group, rows: group.flags.map((flag) => ({ id: flag.id, text: flag.noteJa })) }))} />;
}

/** The quick choices of the clock (朝・昼・夕方・夜), the one at `minute` pressed. */
function ClockPresets({ minute, disabled = false, onChoose }: { minute: number | undefined; disabled?: boolean; onChoose: (minute: number) => void }) {
  return <div className="debug-clock-presets" role="group" aria-label="時刻の目安">
    {debugClockPresets.map((preset) => {
      const pressed = preset.minute === minute;
      return <button key={preset.labelJa} type="button" className="secondary" aria-pressed={pressed} disabled={disabled}
        data-testid={`debug-clock-${preset.minute}`} onClick={() => onChoose(preset.minute)}>
        <span>{pressed ? "✓" : ""}{preset.labelJa}</span><span>{clockText(preset.minute)}</span>
      </button>;
    })}
  </div>;
}

const [minMinute, maxMinute] = debugTimeRange;
const [minDay, maxDay] = debugDayRange;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** What 場面の確認's clock is for, by scene: free time's clock, the rest at the hotel, or the start of any other scene (2026-11-16). */
const clockWording: Record<"free" | "hotel" | "other", { legend: string; note: string }> = {
  free: { legend: "街歩きの日時", note: "空欄は旅の進行のまま（多くは1日目 9:00）。夜は18:00から。21:00にすると一日の終わり（夜の画面か、宿で休む）になります。" },
  hotel: { legend: "休む日時", note: "空欄は旅の進行のまま。夜（18:00から）に休むと、遊びと同じく、その夜の場面が先に流れます。" },
  other: { legend: "場面を始める日時", note: "空欄は旅の進行のまま（多くは1日目 9:00）。夜は18:00から。場面の中で時刻によって分かれる所（cond(\"time night\") など）を見るときに使います。" },
};

/** 場面の確認's clock of the scene to open: the quick choices, an exact time and the day; empty keeps the progress's own. */
export function DebugClockFields({ scene, time, day, onChange }: {
  scene: DebugScene;
  time: number | undefined;
  day: number | undefined;
  onChange: (clock: { time: number | undefined; day: number | undefined }) => void;
}) {
  const wording = clockWording[scene === "free" || scene === "hotel" ? scene : "other"];
  return <fieldset className="debug-clock" data-testid="debug-clock">
    <legend>{wording.legend}</legend>
    <ClockPresets minute={time} onChoose={(minute) => onChange({ time: minute, day })} />
    <div className="debug-values">
      <label>時刻を指定
        <input type="time" data-testid="debug-time" min={clockText(minMinute)} max={clockText(maxMinute)} step={60}
          value={time === undefined ? "" : clockText(time)} onChange={(event) => {
            const minute = parseClockText(event.target.value);
            onChange({ time: minute === null ? undefined : clamp(minute, minMinute, maxMinute), day });
          }} />
      </label>
      <label>日（滞在の何日目）
        <input type="number" data-testid="debug-day" min={minDay} max={maxDay} step={1} placeholder="そのまま" value={day ?? ""}
          onChange={(event) => onChange({ time, day: event.target.value === "" ? undefined
            : clamp(Math.trunc(Number(event.target.value)) || minDay, minDay, maxDay) })} />
      </label>
    </div>
    <p className="debug-note">{wording.note}</p>
  </fieldset>;
}

/** 場面の確認's flags: folded until opened (open while some are chosen), the count in its summary. */
export function DebugFlagChooser({ groups, cityId, chosen, onChange }: {
  groups: readonly DebugFlagGroup[];
  cityId: string;
  chosen: readonly string[];
  onChange: (flags: string[]) => void;
}) {
  const [open, setOpen] = useState(chosen.length > 0);
  if (!groups.length) return null;
  return <details className="debug-flags" data-testid="debug-flags" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>フラグを得たことにする（{chosen.length ? `${chosen.length}件を選択中` : "なし"}）</summary>
    <p className="debug-note">チェックしたフラグを得た状態で場面を開きます。旅の進行ですでに得ているフラグは残ります。開いた後は上の帯の「{debugEditTitle}」で付け外しできます。</p>
    <DebugFlagList groups={groups} cityId={cityId} checked={chosen}
      onChange={(id, obtained) => onChange(obtained ? [...chosen, id] : chosen.filter((flag) => flag !== id))} />
  </details>;
}

/**
 * 場面の確認's clues heard in conversation (2026-11-18; debugClueGroups: the journey's clues a scene gives with `# clue:` or
 * `# on_done: clue`), folded like the flags. None in a journey whose scenes give no clue.
 */
export function DebugClueChooser({ groups, cityId, chosen, onChange }: {
  groups: readonly DebugClueGroup[];
  cityId: string;
  chosen: readonly string[];
  onChange: (clues: string[]) => void;
}) {
  const [open, setOpen] = useState(chosen.length > 0);
  if (!groups.length) return null;
  return <details className="debug-flags" data-testid="debug-clues" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>手がかりを得たことにする（{chosen.length ? `${chosen.length}件を選択中` : "なし"}）</summary>
    <p className="debug-note">チェックした手がかりを手がかり帳に記録した状態で場面を開きます（会話で聞いたことにします）。選べるのは、場面が # clue:・# on_done: clue で渡す手がかりだけです。観察で見つける手がかりは、観察を開いて見つけてください。</p>
    <DebugCheckList testId="debug-clue" cityId={cityId} checked={chosen}
      groups={groups.map((group) => ({ ...group, rows: group.clues.map((clue) => ({ id: clue.id, text: clue.titleJa })) }))}
      onChange={(id, obtained) => onChange(obtained ? [...chosen, id] : chosen.filter((clue) => clue !== id))} />
  </details>;
}

/**
 * 場面の確認's episodes of the city to finish first (2026-11-25 user request; debugEpisodes), folded like the flags. Shown with
 * 旅の進行「旅の開始時」 only: a cleared city has finished them all.
 */
export function DebugEpisodeChooser({ episodes, cityNameJa, chosen, onChange }: {
  episodes: readonly DebugEpisode[];
  cityNameJa: string;
  chosen: readonly string[];
  onChange: (episodes: string[]) => void;
}) {
  const [open, setOpen] = useState(chosen.length > 0);
  if (!episodes.length) return null;
  return <details className="debug-flags" data-testid="debug-episodes" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>エピソードを終えたことにする（{chosen.length ? `${chosen.length}件を選択中` : "なし"}）</summary>
    <p className="debug-note">旅の開始時から、チェックしたエピソードを遊びと同じ決まりで終えてから場面を開きます（案内は飛ばし、クイズは正解、選択肢は最初に選べるもの）。エピソードで得るフラグ・品物・時刻の進みもそのまま残り、その後に上で選んだ値・下で選んだフラグと手がかりが入ります。フィナーレを終えた状態は「都市クリア後」で開きます。</p>
    <DebugCheckList testId="debug-episode" cityId="" checked={chosen}
      groups={[{ cityId: null, nameJa: cityNameJa, rows: episodes.map((episode) => ({ id: episode.id, text: episode.nameJa })) }]}
      onChange={(id, finished) => onChange(finished ? [...chosen, id] : chosen.filter((episode) => episode !== id))} />
  </details>;
}

/** 「今：2日目（月） 19:00・夜」 */
function clockNow(game: GameState): string {
  const weekday = getGameWeekday(game.travel.calendar);
  const period = getTimePeriod(game.travel.minute) === "day" ? "昼間" : "夜";
  return `今：${game.travel.day}日目${weekday === undefined ? "" : weekdayLabel(weekday).short} ${clockText(game.travel.minute)}・${period}`;
}

/**
 * The Debug bar's 「フラグ・時刻・段階」 (the running Debug game; memory only, like all of Debug's play): free time's clock,
 * 恋の段階 and the journey's flags, each change put in place at once (DebugGameAccess.replace). Only while no scene is open
 * (debugEditRefusal): during one the dialog shows the stage and the flags as they are, its controls disabled with the reason.
 */
export function DebugEditDialog({ access, onClose }: { access: { current: DebugGameAccess | null }; onClose: () => void }) {
  const id = useId();
  const [game, setGame] = useState(() => access.current?.game() ?? null);
  const groups = useMemo(() => (game ? debugFlagGroups(game.currentCityId) : []), [game?.currentCityId]);
  const [time, setTime] = useState(() => (game ? clockText(game.travel.minute) : ""));
  const [day, setDay] = useState(() => (game ? String(game.travel.day) : ""));
  const [error, setError] = useState("");
  const refusal = game ? debugEditRefusal(game) : "ゲームがまだ始まっていません。";
  function apply(change: (state: GameState) => GameState) {
    try {
      if (!access.current?.replace(change)) throw new Error("変えられませんでした。ゲームの画面の案内を確認してください。");
      const next = access.current.game();
      setGame(next);
      if (next) { setTime(clockText(next.travel.minute)); setDay(String(next.travel.day)); }
      setError("");
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    }
  }
  function submitClock(event: FormEvent) {
    event.preventDefault();
    const minute = parseClockText(time);
    if (minute === null) { setError(`時刻を${clockText(minMinute)}〜${clockText(maxMinute)}で入れてください。`); return; }
    apply((state) => withDebugClock(state, { day: Number(day), minute }));
  }
  return <Modal labelledBy={`${id}-title`} onClose={onClose} className="debug-edit-dialog">
    <ModalTitle id={`${id}-title`} eyebrow="Debug" onClose={onClose} closeTestId="debug-edit-close">{debugEditTitle}</ModalTitle>
    <p className="debug-note">このDebugのゲームだけを、すぐに変えます（通常のセーブは変わりません）。</p>
    {refusal && <p className="debug-edit-refusal" data-testid="debug-edit-refusal">{refusal}</p>}
    <p className="debug-edit-error" role="alert">{error}</p>
    <section className="debug-edit-section" aria-labelledby={`${id}-clock`}>
      <h3 id={`${id}-clock`}>街歩きの日時</h3>
      <p role="status" data-testid="debug-edit-clock">{game ? clockNow(game) : ""}</p>
      <ClockPresets minute={game?.travel.minute} disabled={!!refusal}
        onChoose={(minute) => apply((state) => withDebugClock(state, { minute }))} />
      <form className="debug-clock-exact" onSubmit={submitClock}>
        <label>日
          <input type="number" data-testid="debug-edit-day" min={minDay} max={maxDay} step={1} required value={day} disabled={!!refusal}
            onChange={(event) => setDay(event.target.value)} />
        </label>
        <label>時刻
          <input type="time" data-testid="debug-edit-time" min={clockText(minMinute)} max={clockText(maxMinute)} step={60} required value={time}
            disabled={!!refusal} onChange={(event) => setTime(event.target.value)} />
        </label>
        <button type="submit" className="secondary" data-testid="debug-edit-clock-set" disabled={!!refusal}>この日時にする</button>
      </form>
    </section>
    <section className="debug-edit-section" aria-labelledby={`${id}-stage`}>
      <h3 id={`${id}-stage`}>恋の段階</h3>
      <div className="debug-stage-choices" role="group" aria-labelledby={`${id}-stage`}>
        {debugRomanceStages.map((stage) => {
          const pressed = game?.romanceStage === stage;
          return <button key={stage} type="button" className="secondary" aria-pressed={pressed} disabled={!!refusal}
            data-testid={`debug-edit-stage-${stage}`} onClick={() => apply((state) => setDebugStage(state, stage))}>
            {pressed ? "✓" : ""}{stage}
          </button>;
        })}
      </div>
      <p className="debug-note">{stageNote}</p>
    </section>
    <section className="debug-edit-section" aria-labelledby={`${id}-flags`}>
      <h3 id={`${id}-flags`}>フラグ（チェックで得たことにする）</h3>
      {game && <DebugFlagList groups={groups} cityId={game.currentCityId} checked={game.storyProgress.flags} disabled={!!refusal}
        onChange={(flag, obtained) => apply((state) => setDebugFlag(state, flag, obtained))} />}
    </section>
  </Modal>;
}
