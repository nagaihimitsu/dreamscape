import { battles, landmarks } from "../../content";
import { getBattleAvailability } from "../../domain/battle";
import type { GameState } from "../../domain/game";

export function BattleEntry({
  game,
  onStart,
}: {
  game: GameState;
  onStart: (id: string) => void;
}) {
  const available = battles.filter(
    (battle) => getBattleAvailability(game, battle.id).available,
  );
  const groups = [
    { title: "クイズバトル", items: available.filter((battle) => !battle.reasoning) },
    { title: "特別対決", items: available.filter((battle) => battle.reasoning) },
  ];
  if (!available.length) return null;
  return (
    <section className="battle-entry revisit-group" aria-label="バトルの再戦">
      {groups.filter((group) => group.items.length > 0).map((group) => (
        <div className="revisit-battle-group" key={group.title}>
          <h2>{group.title}</h2>
          <ul className="revisit-list">
            {group.items.map((battle) => {
              const record = game.battleRecords.find((item) => item.battleId === battle.id);
              const landmark = landmarks.find((item) => item.id === battle.landmarkId);
              return (
                <li key={battle.id}>
                  <div>
                    <span>{battle.titleJa}</span>
                    {landmark && <small>{landmark.nameJa}</small>}
                    {battle.reasoning && (
                      <small>{battle.format === "B" ? "矛盾追及" : "証拠連結"}</small>
                    )}
                    {record && <small>挑戦 {record.attempts}回 · 最高 {record.bestScore}問正解</small>}
                  </div>
                  <button
                    className="secondary"
                    data-testid={`revisit-battle-${battle.id}`}
                    aria-label={`${battle.titleJa}に挑む`}
                    onClick={() => onStart(battle.id)}
                  >
                    挑む <span aria-hidden="true">→</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="fine-print revisit-note">
        通常戦の未達成ボーナスは一度だけ獲得できます。
        {groups[1].items.length > 0 && "特別対決はAPや恋愛の進行に影響しません。"}
      </p>
    </section>
  );
}
