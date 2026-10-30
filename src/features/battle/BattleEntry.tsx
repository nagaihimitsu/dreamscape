import { battles } from "../../content";
import { getBattleAvailability } from "../../domain/battle";
import type { GameState } from "../../domain/game";
export function BattleEntry({
  game,
  onStart,
}: {
  game: GameState;
  onStart: (id: string) => void;
}) {
  const availableBattles = battles.filter(
    (battle) => getBattleAvailability(game, battle.id).available,
  );
  const entries = [
    ...availableBattles.filter((battle) => !battle.reasoning),
    ...availableBattles.filter((battle) => battle.reasoning),
  ];
  return (
    <section className="battle-entry" aria-label="クイズバトルの試遊">
      {entries.map((battle, index) => {
        const special = !!battle.reasoning;
        const availability = getBattleAvailability(game, battle.id);
        const record = game.battleRecords.find(
          (item) => item.battleId === battle.id,
        );
        return (
          <div key={battle.id}>
            {special && !entries[index - 1]?.reasoning && (
              <h2 className="special-entry-heading">特別対決</h2>
            )}
            <div className="section-meta">
              <span className="eyebrow">
                {battle.scope === "city_finale"
                  ? "都市フィナーレ · 英語5問"
                  : "旅先の英語3択バトル"}
              </span>
              <span className="pill">
                {battle.format === "B"
                  ? "B型 · 矛盾追及"
                  : battle.format === "C"
                    ? "C型 · 証拠連結"
                    : "A型 · 通常戦"}
              </span>
            </div>
            <h2>{battle.titleJa}</h2>
            <p>{battle.descriptionJa}</p>
            <button
              className="primary"
              data-testid={`revisit-battle-${battle.id}`}
              disabled={!availability.available}
              onClick={() => onStart(battle.id)}
            >
              {battle.format === "B"
                ? "矛盾追及を試す"
                : battle.format === "C"
                  ? "証拠連結を試す"
                  : "クイズバトルを試す"}{" "}
              <span aria-hidden="true">→</span>
            </button>
            {!availability.available && (
              <p className="fine-print">{availability.reason}</p>
            )}
            <p className="fine-print">
              {special
                ? "3問のうち1問で証拠を使います。必要な資料は対決中に読めます。AP・恋愛の進行は変わりません。"
                : "恋愛の進行はそのまま。未達成の好成績ボーナスは、再戦でも一度だけ受け取れます。"}
              {record &&
                ` 挑戦${record.attempts}回 · 最高${record.bestScore}問正解`}
            </p>
          </div>
        );
      })}
    </section>
  );
}
