import type { Ref } from "react";
import { balance } from "../../content";

/**
 * The name fields of a journey's title (and of a preparing journey's form): the
 * default names are placeholders, and a field left empty takes its default
 * (nameOrDefault in src/domain/player-names.ts, applied by the form on submit).
 * `playerRef`: the title's player-name field, whose reading is captured as it is
 * typed (useNameReading.ts; nothing on the screen says so).
 */
export function TitleNameFields({ player, heroine, onPlayer, onHeroine, playerRef }: {
  player: string;
  heroine: string;
  onPlayer: (name: string) => void;
  onHeroine: (name: string) => void;
  playerRef?: Ref<HTMLInputElement>;
}) {
  return <>
    <label>
      主人公の名前
      <input ref={playerRef} name="playerName" value={player} placeholder={balance.defaultPlayerName} maxLength={balance.maxNameLength}
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
