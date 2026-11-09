import type { GameState } from "../domain/game";
import { occasionCandidates, type CandidatePart } from "./occasion-candidates";

const partsText = (parts: readonly CandidatePart[]) => parts.map((part) => `${part.label}：${part.value ? "真" : "偽"}`).join("／");

/**
 * Debug's 「この時点の候補」 (the unified event design 4.8; development and Debug sessions only): the
 * running occasion's steps in order with their state and reasons, the hidden choices of the open
 * choice point with their false parts, and the map conditions' parts. Never shown to players.
 */
export function OccasionCandidatesView({ state }: { state: GameState }) {
  const table = occasionCandidates(state);
  return (
    <details className="debug-candidates" data-testid="debug-candidates">
      <summary>Debug：この時点の候補（{table.title}）</summary>
      <ol>
        {table.rows.map((row, index) => (
          <li key={`${row.position}:${row.name}:${index}`}>
            <strong>{row.position}</strong> {row.name} — {row.status}{row.reason ? `（${row.reason}）` : ""}
            {row.parts.length > 0 && <p>{partsText(row.parts)}</p>}
          </li>
        ))}
      </ol>
      {table.hiddenChoices.length > 0 && <>
        <p>隠した選択肢</p>
        <ul>{table.hiddenChoices.map((choice) => <li key={choice.text}>{choice.text}{choice.parts.length ? `：${partsText(choice.parts)}` : ""}</li>)}</ul>
      </>}
      {table.mapConditions.length > 0 && <>
        <p>地図に出る条件</p>
        <ul>{table.mapConditions.map((item) => <li key={item.name}>{item.name}：{partsText(item.parts)}</li>)}</ul>
      </>}
    </details>
  );
}
