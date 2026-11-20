import {
  ECONOMY_LEVELS, ENGLISH_CHOICES, economyLevelLabel, englishLevelLabel,
  type Difficulty, type EconomyLevel, type EnglishChoice,
} from "../../domain/difficulty";

/**
 * The difficulty of a new journey at its title (2026-11-19 user decision): the English of the quizzes and how tight money
 * and AP are, chosen apart. Folded under a line that names both levels, so the start stays in view on a short phone; each
 * select says under it what its level does (romance/balance.json `difficulty`; a journey's own words for a level of money
 * and AP, its manifest `economyLevels`).
 */
export function DifficultyFields({ value, onChange, journeyId }: { value: Difficulty; onChange: (value: Difficulty) => void; journeyId: string }) {
  return <details className="difficulty-fields">
    <summary>
      難易度：英語 {englishLevelLabel(value.english).labelJa}・お金とAP {economyLevelLabel(value.economy).labelJa}
    </summary>
    <div className="difficulty-fields-body">
      <EnglishLevelField value={value.english} onChange={(english) => onChange({ ...value, english })} />
      <label>
        お金とAPのきびしさ
        <select name="economyLevel" value={value.economy} aria-describedby="title-economy-level"
          onChange={(event) => onChange({ ...value, economy: event.target.value as EconomyLevel })}>
          {ECONOMY_LEVELS.map((level) => <option key={level} value={level}>{economyLevelLabel(level).labelJa}</option>)}
        </select>
        <span className="fine-print difficulty-note" id="title-economy-level">
          {economyLevelLabel(value.economy, journeyId).descriptionJa}旅の途中では変えられません。
        </span>
      </label>
    </div>
  </details>;
}

/**
 * The English of the quizzes: at the title, and in ゲームの設定 (where it can be changed during the journey).
 * 「日本語のみ」 (the default) shows a quiz in its Japanese translation only.
 */
export function EnglishLevelField({ value, onChange, note = "あとから「ゲームの設定」で変えられます。", disabled = false }: {
  value: EnglishChoice;
  onChange: (value: EnglishChoice) => void;
  note?: string;
  disabled?: boolean;
}) {
  return <label>
    英語クイズの難しさ
    <select name="englishLevel" value={value} disabled={disabled} aria-describedby="english-level-note"
      onChange={(event) => onChange(event.target.value as EnglishChoice)}>
      {ENGLISH_CHOICES.map((level) => <option key={level} value={level}>{englishLevelLabel(level).labelJa}</option>)}
    </select>
    <span className="fine-print difficulty-note" id="english-level-note">
      {englishLevelLabel(value).descriptionJa}{note}
    </span>
  </label>;
}
