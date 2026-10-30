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
  return (
    <section className="battle-entry" aria-label="クイズバトルの試遊">
      {battles.map((battle) => {
        const availability = getBattleAvailability(game, battle.id);
        const record = game.battleRecords.find(
          (item) => item.battleId === battle.id,
        );
        return (
          <div key={battle.id}>
            <div className="section-meta">
              <span className="eyebrow">ミラノ · 英語3択バトル</span>
              <span className="pill">再訪・復習</span>
            </div>
            <h2>{battle.titleJa}</h2>
            <p>{battle.descriptionJa}</p>
            <button
              className="primary"
              data-testid={`revisit-battle-${battle.id}`}
              disabled={!availability.available}
              onClick={() => onStart(battle.id)}
            >
              クイズバトルを試す <span aria-hidden="true">→</span>
            </button>
            {!availability.available && (
              <p className="fine-print">{availability.reason}</p>
            )}
            <p className="fine-print">
              恋愛の進行はそのまま。未達成の好成績ボーナスは、再戦でも一度だけ受け取れます。
              {record &&
                ` 挑戦${record.attempts}回 · 最高${record.bestScore}問正解`}
            </p>
          </div>
        );
      })}
    </section>
  );
}
