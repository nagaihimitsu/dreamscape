import "./encounter.css";

export type EncounterMenuEntry = {
  id: string;
  title: string;
  description?: string;
  unavailableReason?: string;
};

/** Small, optional detours alongside the existing free-time destinations. */
export function EncounterMenu({ entries, balance, items, onStart }: {
  entries: EncounterMenuEntry[];
  balance: number;
  items: { id: string; name: string }[];
  onStart: (id: string) => void;
}) {
  return (
    <details className="encounter-menu" aria-label="寄り道">
      <summary className="encounter-menu-heading" data-testid="encounter-menu-toggle">
        <span>寄り道 <span className="encounter-menu-count">{entries.length}件</span></span>
        <span aria-label={`旅の予算 ${balance}ユーロ`}>€{balance}</span>
      </summary>
      {entries.length === 0 && <p className="encounter-inventory">今行ける寄り道はありません。</p>}
      {entries.map((entry) => (
        <div className="encounter-menu-row" key={entry.id}>
          <div>
            <strong>{entry.title}</strong>
            {entry.description && <p>{entry.description}</p>}
            {entry.unavailableReason && <p>{entry.unavailableReason}</p>}
          </div>
          <button
            type="button"
            className="secondary"
            disabled={!!entry.unavailableReason}
            onClick={() => onStart(entry.id)}
          >
            行く
            <span className="sr-only">：{entry.title}</span>
          </button>
        </div>
      ))}
      {items.length > 0 && (
        <p className="encounter-inventory">持ち物：{items.map((item) => item.name).join("、")}</p>
      )}
    </details>
  );
}
