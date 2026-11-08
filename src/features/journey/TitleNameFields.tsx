import { balance } from "../../content";

/**
 * The name fields of a journey's title (and of a preparing journey's form): the
 * default names are placeholders, and a field left empty takes its default
 * (nameOrDefault in src/domain/player-names.ts, applied by the form on submit).
 */
export function TitleNameFields({ player, heroine, onPlayer, onHeroine }: {
  player: string;
  heroine: string;
  onPlayer: (name: string) => void;
  onHeroine: (name: string) => void;
}) {
  return <>
    <label>
      主人公の名前
      <input name="playerName" value={player} placeholder={balance.defaultPlayerName} maxLength={balance.maxNameLength}
        autoComplete="off" aria-describedby="title-name-defaults" onChange={(event) => onPlayer(event.target.value)} />
    </label>
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
