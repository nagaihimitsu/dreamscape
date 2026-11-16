import { useId } from "react";
import { balance } from "../../content";
import { latinName, spellingAllowed } from "../../domain/name-romaji";
import { nameOrDefault } from "../../domain/player-names";

/**
 * The name fields of a journey's title (and of a preparing journey's form): the
 * default names are placeholders, and a field left empty takes its default
 * (nameOrDefault in src/domain/player-names.ts, applied by the form on submit).
 * With `latin` (the title's; a preparing journey's form has none, the spelling is
 * given later in ゲームの設定), the player's 「ローマ字のつづり」 under the player's name.
 */
export function TitleNameFields({ player, heroine, onPlayer, onHeroine, latin, onLatin }: {
  player: string;
  heroine: string;
  onPlayer: (name: string) => void;
  onHeroine: (name: string) => void;
  latin?: string;
  onLatin?: (spelling: string) => void;
}) {
  return <>
    <label>
      主人公の名前
      <input name="playerName" value={player} placeholder={balance.defaultPlayerName} maxLength={balance.maxNameLength}
        autoComplete="off" aria-describedby="title-name-defaults" onChange={(event) => onPlayer(event.target.value)} />
    </label>
    {latin !== undefined && onLatin &&
      <LatinSpellingField value={latin} playerName={nameOrDefault(player, balance.defaultPlayerName)} onChange={onLatin} />}
    <label>
      ヒロインの名前
      <input name="heroineName" value={heroine} placeholder={balance.defaultHeroineName} maxLength={balance.maxNameLength}
        autoComplete="off" aria-describedby="title-name-defaults" onChange={(event) => onHeroine(event.target.value)} />
    </label>
    <p className="fine-print name-defaults" id="title-name-defaults">
      空欄のままなら「{balance.defaultPlayerName}」「{balance.defaultHeroineName}」になります。
    </p>
  </>;
}

/**
 * The player's optional 「ローマ字のつづり」 (2026-11-16: the Jaipur mehndi draws the name in Latin letters), in the
 * title's and ゲームの設定's name forms: the spelling made from `playerName` (latinName) as its placeholder, what it is
 * for, and a message while what is typed is not in Latin letters (the form then neither starts nor saves:
 * spellingAllowed). Its label never says 「主人公の名前」, so that field's label stays its own (the E2E find it by it).
 */
export function LatinSpellingField({ value, playerName, onChange }: {
  value: string;
  /** The player's name as it would be saved now (the title's default when its field is empty). */
  playerName: string;
  onChange: (spelling: string) => void;
}) {
  const id = useId();
  const automatic = latinName(playerName);
  const invalid = !spellingAllowed(value);
  return <div className="name-latin">
    <label>
      ローマ字のつづり（任意）
      <input name="playerNameLatin" value={value} placeholder={automatic ?? "例：Taichi"} maxLength={balance.maxNameLength}
        autoComplete="off" autoCapitalize="words" spellCheck={false} aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error ${id}-note` : `${id}-note`} onChange={(event) => onChange(event.target.value)} />
    </label>
    {invalid && <p className="name-latin-error" id={`${id}-error`} role="alert">ローマ字（A〜Z）で入れてください。</p>}
    <p className="fine-print name-latin-note" id={`${id}-note`}>
      旅先で主人公の名前を英語の文字で書くときのつづりです。
      {automatic ? "空欄なら、ひらがな・カタカナの名前から作ります。" : "この名前からは作れないので、入れたときだけ使います。"}
    </p>
  </div>;
}
